import os
import re
import secrets
import string
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from server_db import get_connection


class CustomerAdminUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    admin_notes: Optional[str] = None
    tags: Optional[str] = None
    marketing_opt_in: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: Optional[str] = None  # Si viene vacío, genera una clave segura aleatoria


class BlockCustomerRequest(BaseModel):
    is_blocked: bool
    reason: Optional[str] = ""


class WalletAdjustRequest(BaseModel):
    amount: int  # Positivo para abonar, negativo para descontar
    reason: str


class CrmEventCreate(BaseModel):
    customer_id: int
    event_type: str = "whatsapp_sent"
    details: str = ""


class SmtpSettingsPayload(BaseModel):
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "Origen Canino"
    smtp_from_email: str = ""
    smtp_use_ssl: bool = False


class EmailCampaignRequest(BaseModel):
    customer_ids: List[int]
    subject: str
    body_text: str


def ensure_crm_schema():
    """Asegura columnas CRM en customers y tabla customer_crm_events (idempotente)."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            alter_cols = [
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS blocked_reason TEXT DEFAULT '';",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT TRUE;",
                "ALTER TABLE customer_dogs ADD COLUMN IF NOT EXISTS birth_date DATE;",
                "ALTER TABLE customer_dogs ADD COLUMN IF NOT EXISTS birth_date_approx BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE customer_dogs ADD COLUMN IF NOT EXISTS weight_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
            ]
            for stmt in alter_cols:
                cursor.execute(stmt)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS customer_crm_events (
                    id SERIAL PRIMARY KEY,
                    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                    event_type TEXT NOT NULL,
                    details TEXT DEFAULT '',
                    created_by TEXT DEFAULT 'system',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_crm_events_customer ON customer_crm_events(customer_id, id DESC);"
            )
            conn.commit()
    except Exception as e:
        print("Error en ensure_crm_schema:", e)


def _fmt_dt(val):
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return val.isoformat()
    return val


def parse_birth_date(raw_val) -> Optional[date]:
    if not raw_val:
        return None
    if isinstance(raw_val, datetime):
        return raw_val.date()
    if isinstance(raw_val, date):
        return raw_val
    try:
        return date.fromisoformat(str(raw_val).strip()[:10])
    except Exception:
        return None


def enrich_dog_dict(row) -> dict:
    """Calcula edad exacta, etapa dinámica (según peso/tamaño), próximo cumpleaños y alerta de peso."""
    d = dict(row)
    if d.get("weight") is not None:
        d["weight"] = float(d["weight"])
    weight_val = float(d.get("weight") or 10.0)
    bdate = parse_birth_date(d.get("birth_date"))
    today = date.today()

    age_months = None
    age_label = None
    days_to_birthday = None
    computed_stage = d.get("age_stage") or "adulto"

    if bdate and bdate <= today:
        total_months = (today.year - bdate.year) * 12 + (today.month - bdate.month)
        if today.day < bdate.day:
            total_months -= 1
        age_months = max(0, total_months)

        years = age_months // 12
        rem_months = age_months % 12
        if years == 0:
            age_label = f"{max(1, age_months)} {'mes' if age_months <= 1 else 'meses'}"
        elif rem_months == 0:
            age_label = f"{years} {'año' if years == 1 else 'años'}"
        else:
            age_label = f"{years} {'año' if years == 1 else 'años'} {rem_months}m"

        # Etapa biológica diferenciada por tamaño/peso (perros grandes >= 25kg maduran más lento y envejecen antes)
        puppy_cutoff_m = 15 if weight_val >= 25 else 12
        senior_cutoff_m = 84 if weight_val >= 25 else 96  # 7 años grandes vs 8 años chicos/medianos
        if age_months < puppy_cutoff_m:
            computed_stage = "cachorro"
        elif age_months >= senior_cutoff_m:
            computed_stage = "senior"
        else:
            computed_stage = "adulto"

        # Próximo cumpleaños
        try:
            next_bday = bdate.replace(year=today.year)
        except ValueError:
            next_bday = date(today.year, 2, 28)
        if next_bday < today:
            try:
                next_bday = bdate.replace(year=today.year + 1)
            except ValueError:
                next_bday = date(today.year + 1, 2, 28)
        days_to_birthday = (next_bday - today).days

    # Alerta de actualización de peso para cachorros (> 30 días sin actualizar peso)
    w_upd = d.get("weight_updated_at")
    needs_weight_update = False
    if computed_stage == "cachorro":
        if w_upd is None:
            needs_weight_update = True
        elif isinstance(w_upd, datetime):
            w_utc = w_upd.replace(tzinfo=timezone.utc) if w_upd.tzinfo is None else w_upd
            needs_weight_update = (datetime.now(timezone.utc) - w_utc).days >= 30

    d["birth_date"] = bdate.isoformat() if bdate else None
    d["birth_date_approx"] = bool(d.get("birth_date_approx"))
    d["weight_updated_at"] = _fmt_dt(w_upd)
    d["age_months"] = age_months
    d["age_label"] = age_label
    d["computed_stage"] = computed_stage
    d["age_stage"] = computed_stage
    d["days_to_birthday"] = days_to_birthday
    d["needs_weight_update"] = needs_weight_update
    d["favorite_diet"] = d.get("favorite_diet") or "barf"
    return d


def create_customer_crm_router(get_current_admin, get_password_hash, log_security_event):
    router = APIRouter(prefix="/api/admin/customers", tags=["Admin Customers CRM"])

    @router.get("")
    def list_customers_crm(
        include_deleted: bool = False,
        current_user: str = Depends(get_current_admin),
    ):
        with get_connection() as conn:
            cursor = conn.cursor()

            where_del = "" if include_deleted else "WHERE COALESCE(c.is_deleted, FALSE) = FALSE"
            cursor.execute(f"""
                SELECT
                    c.id, c.name, c.email, c.phone, c.address, c.city, c.region,
                    c.referral_code, COALESCE(c.wallet_balance, 0) AS wallet_balance,
                    COALESCE(c.is_blocked, FALSE) AS is_blocked,
                    COALESCE(c.blocked_reason, '') AS blocked_reason,
                    c.blocked_at,
                    COALESCE(c.is_deleted, FALSE) AS is_deleted,
                    c.deleted_at,
                    c.last_login_at,
                    COALESCE(c.login_count, 0) AS login_count,
                    COALESCE(c.visit_count, 0) AS visit_count,
                    c.last_seen_at,
                    COALESCE(c.admin_notes, '') AS admin_notes,
                    COALESCE(c.tags, '') AS tags,
                    COALESCE(c.marketing_opt_in, TRUE) AS marketing_opt_in,
                    c.created_at
                FROM customers c
                {where_del}
                ORDER BY c.id DESC
            """)
            cust_rows = cursor.fetchall()

            # Perros por cliente (enriquecidos con edad y cumpleaños)
            cursor.execute("""
                SELECT id, customer_id, name, weight, age_stage, favorite_diet, notes, photo_url,
                       birth_date, birth_date_approx, weight_updated_at
                FROM customer_dogs
                ORDER BY id ASC
            """)
            dogs_by_cust = {}
            for d in cursor.fetchall():
                cid = d["customer_id"]
                dogs_by_cust.setdefault(cid, []).append(enrich_dog_dict(d))

            # Estadísticas de órdenes agrupadas por customer_id y por email (para enlazar compras previas al registro)
            cursor.execute("""
                SELECT
                    id, customer_id, LOWER(TRIM(COALESCE(customer_email, ''))) AS clean_email,
                    customer_name, customer_phone, customer_address, customer_city,
                    dog_name, total, payment_status, delivery_status AS status, referral_code, created_at
                FROM orders
                ORDER BY id DESC
            """)
            all_orders = cursor.fetchall()

            stats_by_cid = {}
            stats_by_email = {}
            referred_counts = {}
            registered_emails = set()

            for c in cust_rows:
                registered_emails.add((c["email"] or "").strip().lower())

            for o in all_orders:
                ref_c = (o.get("referral_code") or "").strip().upper()
                if ref_c and o.get("payment_status") == "Pagado":
                    referred_counts[ref_c] = referred_counts.get(ref_c, 0) + 1

                is_paid = o.get("payment_status") == "Pagado"
                is_cancelled = o.get("payment_status") == "Cancelado" or o.get("status") == "Cancelado"
                total_val = float(o.get("total") or 0)
                created_val = o.get("created_at")

                def _accum(bucket, key):
                    if not key:
                        return
                    st = bucket.setdefault(
                        key,
                        {
                            "orders_count": 0,
                            "paid_orders_count": 0,
                            "total_spent": 0.0,
                            "last_order_at": None,
                        },
                    )
                    if not is_cancelled:
                        st["orders_count"] += 1
                    if is_paid:
                        st["paid_orders_count"] += 1
                        st["total_spent"] += total_val
                        if st["last_order_at"] is None or (created_val and created_val > st["last_order_at"]):
                            st["last_order_at"] = created_val

                if o.get("customer_id"):
                    _accum(stats_by_cid, o["customer_id"])
                if o.get("clean_email"):
                    _accum(stats_by_email, o["clean_email"])

            now = datetime.now(timezone.utc)
            enriched = []
            comunas_set = set()

            active_30d = 0
            no_orders_count = 0
            inactive_35d = 0
            blocked_count = 0
            total_ltv = 0.0
            total_paid_orders = 0
            total_wallet = 0.0

            for c in cust_rows:
                item = dict(c)
                cid = item["id"]
                c_email = (item["email"] or "").strip().lower()
                st = stats_by_cid.get(cid) or stats_by_email.get(c_email) or {
                    "orders_count": 0,
                    "paid_orders_count": 0,
                    "total_spent": 0.0,
                    "last_order_at": None,
                }

                item["wallet_balance"] = float(item["wallet_balance"] or 0.0)
                item["dogs"] = dogs_by_cust.get(cid, [])
                item["orders_count"] = st["orders_count"]
                item["paid_orders_count"] = st["paid_orders_count"]
                item["total_spent"] = round(st["total_spent"])
                item["avg_ticket"] = (
                    round(st["total_spent"] / st["paid_orders_count"])
                    if st["paid_orders_count"] > 0
                    else 0
                )
                item["referred_count"] = referred_counts.get((item.get("referral_code") or "").upper(), 0)

                last_ord = st["last_order_at"]
                days_since_order = None
                if isinstance(last_ord, datetime):
                    lo_utc = last_ord.replace(tzinfo=timezone.utc) if last_ord.tzinfo is None else last_ord
                    days_since_order = max(0, (now - lo_utc).days)
                item["days_since_last_order"] = days_since_order
                item["last_order_at"] = _fmt_dt(last_ord)
                item["created_at"] = _fmt_dt(item.get("created_at"))
                item["last_login_at"] = _fmt_dt(item.get("last_login_at"))
                item["last_seen_at"] = _fmt_dt(item.get("last_seen_at"))
                item["blocked_at"] = _fmt_dt(item.get("blocked_at"))
                item["deleted_at"] = _fmt_dt(item.get("deleted_at"))

                if item.get("city"):
                    comunas_set.add(item["city"].strip())

                # KPIs
                total_ltv += st["total_spent"]
                total_paid_orders += st["paid_orders_count"]
                total_wallet += item["wallet_balance"]
                if item["is_blocked"]:
                    blocked_count += 1
                if st["paid_orders_count"] == 0:
                    no_orders_count += 1
                else:
                    if days_since_order is not None and days_since_order <= 30:
                        active_30d += 1
                    elif days_since_order is not None and days_since_order >= 35:
                        inactive_35d += 1

                enriched.append(item)

            # Compradores invitados (órdenes sin cuenta en customers)
            guests_map = {}
            for o in all_orders:
                c_email = o.get("clean_email") or ""
                if o.get("customer_id") or (c_email and c_email in registered_emails):
                    continue
                if o.get("payment_status") == "Cancelado" or o.get("status") == "Cancelado":
                    continue
                g_key = c_email or (o.get("customer_phone") or "").strip()
                if not g_key:
                    continue
                g = guests_map.setdefault(
                    g_key,
                    {
                        "key": g_key,
                        "name": o.get("customer_name") or "Cliente Invitado",
                        "email": c_email,
                        "phone": o.get("customer_phone") or "",
                        "city": o.get("customer_city") or "",
                        "address": o.get("customer_address") or "",
                        "dog_name": o.get("dog_name") or "",
                        "orders_count": 0,
                        "paid_orders_count": 0,
                        "total_spent": 0,
                        "last_order_at": None,
                    },
                )
                g["orders_count"] += 1
                if o.get("payment_status") == "Pagado":
                    g["paid_orders_count"] += 1
                    g["total_spent"] += int(round(float(o.get("total") or 0)))
                if g["last_order_at"] is None and o.get("created_at"):
                    g["last_order_at"] = _fmt_dt(o.get("created_at"))

            guests_list = sorted(guests_map.values(), key=lambda x: x["total_spent"], reverse=True)

            # Cumpleaños próximos (próximos 30 días) para saludo emocional por WhatsApp
            upcoming_birthdays = []
            for item in enriched:
                if item.get("is_blocked"):
                    continue
                for dg in item.get("dogs", []):
                    dtb = dg.get("days_to_birthday")
                    if dtb is not None and 0 <= dtb <= 30:
                        upcoming_birthdays.append(
                            {
                                "customer_id": item["id"],
                                "customer_name": item["name"],
                                "customer_phone": item.get("phone") or "",
                                "dog_id": dg["id"],
                                "dog_name": dg["name"],
                                "birth_date": dg.get("birth_date"),
                                "age_label": dg.get("age_label"),
                                "days_to_birthday": dtb,
                                "birth_date_approx": dg.get("birth_date_approx", False),
                            }
                        )
            upcoming_birthdays.sort(key=lambda x: x["days_to_birthday"])

            return {
                "kpis": {
                    "total_customers": len(enriched),
                    "active_30d": active_30d,
                    "no_orders": no_orders_count,
                    "inactive_35d": inactive_35d,
                    "blocked": blocked_count,
                    "guests_count": len(guests_list),
                    "total_ltv": round(total_ltv),
                    "avg_ticket": round(total_ltv / total_paid_orders) if total_paid_orders > 0 else 0,
                    "total_wallet_balance": round(total_wallet),
                },
                "customers": enriched,
                "guests": guests_list,
                "comunas": sorted(comunas_set),
                "upcoming_birthdays": upcoming_birthdays,
            }

    @router.get("/smtp-settings")
    def get_smtp_settings(current_user: str = Depends(get_current_admin)):
        keys = (
            "smtp_host",
            "smtp_port",
            "smtp_user",
            "smtp_password",
            "smtp_from_name",
            "smtp_from_email",
            "smtp_use_ssl",
        )
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM system_settings WHERE key = ANY(%s)", (list(keys),))
            s = {r["key"]: r["value"] for r in cursor.fetchall()}
        return {
            "smtp_host": s.get("smtp_host", ""),
            "smtp_port": int(s.get("smtp_port", 587) or 587),
            "smtp_user": s.get("smtp_user", ""),
            "smtp_password_configured": bool(s.get("smtp_password")),
            "smtp_from_name": s.get("smtp_from_name", "Origen Canino"),
            "smtp_from_email": s.get("smtp_from_email", s.get("smtp_user", "")),
            "smtp_use_ssl": s.get("smtp_use_ssl", "0") == "1",
        }

    @router.put("/smtp-settings")
    def save_smtp_settings(payload: SmtpSettingsPayload, current_user: str = Depends(get_current_admin)):
        updates = {
            "smtp_host": payload.smtp_host.strip(),
            "smtp_port": str(payload.smtp_port or 587),
            "smtp_user": payload.smtp_user.strip(),
            "smtp_from_name": payload.smtp_from_name.strip() or "Origen Canino",
            "smtp_from_email": (payload.smtp_from_email or payload.smtp_user).strip(),
            "smtp_use_ssl": "1" if payload.smtp_use_ssl else "0",
        }
        if payload.smtp_password.strip():
            updates["smtp_password"] = payload.smtp_password.strip()

        with get_connection() as conn:
            cursor = conn.cursor()
            for k, v in updates.items():
                cursor.execute(
                    "INSERT INTO system_settings (key, value) VALUES (%s, %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                    (k, v),
                )
            conn.commit()
        return {"status": "ok", "message": "Configuración SMTP guardada correctamente."}

    @router.post("/crm-event")
    def create_crm_event(payload: CrmEventCreate, current_user: str = Depends(get_current_admin)):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO customer_crm_events (customer_id, event_type, details, created_by)
                VALUES (%s, %s, %s, %s)
                """,
                (payload.customer_id, payload.event_type, payload.details, current_user),
            )
            conn.commit()
        return {"status": "ok"}

    @router.post("/send-email-campaign")
    def send_email_campaign(payload: EmailCampaignRequest, current_user: str = Depends(get_current_admin)):
        if not payload.customer_ids:
            raise HTTPException(status_code=400, detail="Debes seleccionar al menos un cliente.")
        if not payload.subject.strip() or not payload.body_text.strip():
            raise HTTPException(status_code=400, detail="Asunto y mensaje son obligatorios.")

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT key, value FROM system_settings WHERE key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from_name', 'smtp_from_email', 'smtp_use_ssl')"
            )
            s = {r["key"]: r["value"] for r in cursor.fetchall()}

            host = (s.get("smtp_host") or os.environ.get("SMTP_HOST") or "").strip()
            port = int(s.get("smtp_port") or os.environ.get("SMTP_PORT") or 587)
            user = (s.get("smtp_user") or os.environ.get("SMTP_USER") or "").strip()
            password = (s.get("smtp_password") or os.environ.get("SMTP_PASSWORD") or "").strip()
            from_name = (s.get("smtp_from_name") or "Origen Canino").strip()
            from_email = (s.get("smtp_from_email") or user).strip()
            use_ssl = s.get("smtp_use_ssl", "0") == "1"

            if not host or not user or not password:
                raise HTTPException(
                    status_code=400,
                    detail="SMTP no configurado todavía. Ingresa tu servidor SMTP, usuario y contraseña en 'Configurar Correo SMTP' arriba.",
                )

            cursor.execute(
                """
                SELECT c.id, c.name, c.email, c.referral_code, COALESCE(c.marketing_opt_in, TRUE) AS marketing_opt_in,
                       (SELECT name FROM customer_dogs cd WHERE cd.customer_id = c.id ORDER BY cd.id ASC LIMIT 1) AS dog_name
                FROM customers c
                WHERE c.id = ANY(%s) AND COALESCE(c.is_deleted, FALSE) = FALSE AND COALESCE(c.is_blocked, FALSE) = FALSE
                """,
                (payload.customer_ids,),
            )
            recipients = cursor.fetchall()

        sent_count = 0
        skipped_opt_out = 0
        errors = []

        try:
            server = smtplib.SMTP_SSL(host, port, timeout=15) if use_ssl else smtplib.SMTP(host, port, timeout=15)
            if not use_ssl:
                server.starttls()
            server.login(user, password)

            with get_connection() as conn:
                cursor = conn.cursor()
                for r in recipients:
                    if not r.get("marketing_opt_in"):
                        skipped_opt_out += 1
                        continue
                    email_addr = (r.get("email") or "").strip()
                    if not email_addr or "@origencanino.local" in email_addr:
                        continue

                    first_name = (r.get("name") or "Amigo").split()[0]
                    dog_name = r.get("dog_name") or "tu perro"
                    ref_code = r.get("referral_code") or ""

                    def _interp(txt):
                        return (
                            txt.replace("{nombre}", first_name)
                            .replace("{perro}", dog_name)
                            .replace("{codigo_embajador}", ref_code)
                        )

                    subj = _interp(payload.subject.strip())
                    body_plain = _interp(payload.body_text.strip())
                    body_html_paragraphs = "".join(
                        f"<p style='margin:0 0 14px 0;line-height:1.6;color:#4A3728;'>{line}</p>"
                        for line in body_plain.splitlines()
                        if line.strip()
                    )
                    html_tpl = f"""
                    <div style="font-family:Arial,sans-serif;background:#FAF7F2;padding:28px 16px;">
                      <div style="max-width:580px;margin:0 auto;background:#FFFFFF;border-radius:20px;border:1px solid #E8DFCE;overflow:hidden;">
                        <div style="background:#556B2F;padding:22px 28px;color:#FFFFFF;">
                          <h2 style="margin:0;font-size:22px;">Origen Canino</h2>
                          <p style="margin:4px 0 0 0;font-size:12px;opacity:0.9;letter-spacing:1px;">COMIDA REAL · VIDA SALUDABLE</p>
                        </div>
                        <div style="padding:28px;">
                          {body_html_paragraphs}
                          <div style="margin-top:24px;text-align:center;">
                            <a href="https://origencanino.cl" style="display:inline-block;background:#DB994B;color:#FFFFFF;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:12px;">Visitar origencanino.cl</a>
                          </div>
                        </div>
                        <div style="background:#F4EFE4;padding:14px 28px;font-size:11px;color:#6B5A4C;text-align:center;">
                          Origen Canino · Santiago y V Región · Si no deseas recibir novedades, respóndenos por WhatsApp.
                        </div>
                      </div>
                    </div>
                    """

                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subj
                    msg["From"] = f"{from_name} <{from_email}>"
                    msg["To"] = email_addr
                    msg.attach(MIMEText(body_plain, "plain", "utf-8"))
                    msg.attach(MIMEText(html_tpl, "html", "utf-8"))

                    try:
                        server.sendmail(from_email, [email_addr], msg.as_string())
                        sent_count += 1
                        cursor.execute(
                            "INSERT INTO customer_crm_events (customer_id, event_type, details, created_by) VALUES (%s, 'email_sent', %s, %s)",
                            (r["id"], f"Campaña Email: {subj}", current_user),
                        )
                    except Exception as e_send:
                        errors.append(f"{email_addr}: {str(e_send)}")
                conn.commit()
            server.quit()
        except Exception as e_smtp:
            raise HTTPException(status_code=500, detail=f"Error conectando con SMTP: {str(e_smtp)}")

        return {
            "status": "ok",
            "sent": sent_count,
            "skipped_opt_out": skipped_opt_out,
            "errors": errors,
        }

    @router.get("/{customer_id}")
    def get_customer_detail_360(customer_id: int, current_user: str = Depends(get_current_admin)):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, name, email, phone, address, city, region, referral_code,
                       COALESCE(wallet_balance, 0) AS wallet_balance,
                       COALESCE(is_blocked, FALSE) AS is_blocked,
                       COALESCE(blocked_reason, '') AS blocked_reason,
                       blocked_at,
                       COALESCE(is_deleted, FALSE) AS is_deleted,
                       deleted_at,
                       last_login_at,
                       COALESCE(login_count, 0) AS login_count,
                       COALESCE(visit_count, 0) AS visit_count,
                       last_seen_at,
                       COALESCE(admin_notes, '') AS admin_notes,
                       COALESCE(tags, '') AS tags,
                       COALESCE(marketing_opt_in, TRUE) AS marketing_opt_in,
                       created_at
                FROM customers
                WHERE id = %s
                """,
                (customer_id,),
            )
            c = cursor.fetchone()
            if not c:
                raise HTTPException(status_code=404, detail="Cliente no encontrado")

            customer = dict(c)
            customer["wallet_balance"] = float(customer["wallet_balance"] or 0.0)
            for dt_field in ("created_at", "last_login_at", "last_seen_at", "blocked_at", "deleted_at"):
                customer[dt_field] = _fmt_dt(customer.get(dt_field))

            cursor.execute(
                """
                SELECT id, name, weight, age_stage, favorite_diet, notes, photo_url,
                       birth_date, birth_date_approx, weight_updated_at
                FROM customer_dogs WHERE customer_id = %s ORDER BY id ASC
                """,
                (customer_id,),
            )
            dogs = [enrich_dog_dict(d) for d in cursor.fetchall()]

            # Historial de pedidos por customer_id o email coincidente
            clean_email = (customer["email"] or "").strip().lower()
            cursor.execute(
                """
                SELECT id, total, COALESCE(discount_amount, 0) AS discount, coupon_code,
                       COALESCE(wallet_discount, 0) AS wallet_discount,
                       payment_status, delivery_status AS status, payment_method, created_at
                FROM orders
                WHERE customer_id = %s OR LOWER(TRIM(COALESCE(customer_email, ''))) = %s
                ORDER BY id DESC
                """,
                (customer_id, clean_email),
            )
            orders = []
            order_ids = []
            for o in cursor.fetchall():
                od = dict(o)
                od["total"] = float(od.get("total") or 0)
                od["discount"] = float(od.get("discount") or 0)
                od["wallet_discount"] = float(od.get("wallet_discount") or 0)
                od["created_at"] = _fmt_dt(od.get("created_at"))
                od["items"] = []
                orders.append(od)
                order_ids.append(od["id"])

            if order_ids:
                cursor.execute(
                    "SELECT order_id, product_name, quantity, price_at_purchase AS price FROM order_items WHERE order_id = ANY(%s)",
                    (order_ids,),
                )
                items_by_order = {}
                for it in cursor.fetchall():
                    items_by_order.setdefault(it["order_id"], []).append(
                        {
                            "product_name": it["product_name"],
                            "quantity": it["quantity"],
                            "price": float(it["price"] or 0),
                        }
                    )
                for od in orders:
                    od["items"] = items_by_order.get(od["id"], [])

            # Transacciones de billetera
            cursor.execute(
                """
                SELECT id, transaction_type, amount, description, status, created_at
                FROM referral_transactions
                WHERE referrer_customer_id = %s
                ORDER BY id DESC LIMIT 30
                """,
                (customer_id,),
            )
            wallet_txs = []
            for t in cursor.fetchall():
                td = dict(t)
                td["amount"] = float(td.get("amount") or 0)
                td["created_at"] = _fmt_dt(td.get("created_at"))
                wallet_txs.append(td)

            # Eventos CRM
            cursor.execute(
                """
                SELECT id, event_type, details, created_by, created_at
                FROM customer_crm_events
                WHERE customer_id = %s
                ORDER BY id DESC LIMIT 40
                """,
                (customer_id,),
            )
            events = []
            for ev in cursor.fetchall():
                ed = dict(ev)
                ed["created_at"] = _fmt_dt(ed.get("created_at"))
                events.append(ed)

            return {
                "customer": customer,
                "dogs": dogs,
                "orders": orders,
                "wallet_transactions": wallet_txs,
                "events": events,
            }

    @router.put("/{customer_id}")
    def update_customer_admin(
        customer_id: int,
        payload: CustomerAdminUpdate,
        current_user: str = Depends(get_current_admin),
    ):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM customers WHERE id = %s", (customer_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Cliente no encontrado")

            fields = []
            values = []
            for col in ("name", "phone", "address", "city", "region", "admin_notes", "tags", "marketing_opt_in"):
                val = getattr(payload, col)
                if val is not None:
                    fields.append(f"{col} = %s")
                    values.append(val.strip() if isinstance(val, str) else val)

            if fields:
                fields.append("updated_at = CURRENT_TIMESTAMP")
                values.append(customer_id)
                cursor.execute(f"UPDATE customers SET {', '.join(fields)} WHERE id = %s", tuple(values))
                cursor.execute(
                    "INSERT INTO customer_crm_events (customer_id, event_type, details, created_by) VALUES (%s, 'profile_updated', %s, %s)",
                    (customer_id, "Datos de perfil / notas CRM actualizados por admin", current_user),
                )
                conn.commit()
        return {"status": "ok", "message": "Cliente actualizado correctamente."}

    @router.post("/{customer_id}/reset-password")
    def reset_customer_password(
        customer_id: int,
        payload: ResetPasswordRequest,
        req: Request,
        current_user: str = Depends(get_current_admin),
    ):
        raw_pass = (payload.new_password or "").strip()
        if not raw_pass:
            alphabet = string.ascii_letters + string.digits
            raw_pass = "OC-" + "".join(secrets.choice(alphabet) for _ in range(7))
        elif len(raw_pass) < 6:
            raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres.")

        hashed = get_password_hash(raw_pass)
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, email, phone FROM customers WHERE id = %s", (customer_id,))
            c = cursor.fetchone()
            if not c:
                raise HTTPException(status_code=404, detail="Cliente no encontrado")

            cursor.execute(
                "UPDATE customers SET password_hash = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (hashed, customer_id),
            )
            cursor.execute(
                "INSERT INTO customer_crm_events (customer_id, event_type, details, created_by) VALUES (%s, 'password_reset', %s, %s)",
                (customer_id, "Contraseña restablecida por administración", current_user),
            )
            conn.commit()

        ip = req.client.host if req.client else "127.0.0.1"
        log_security_event(current_user, "CUSTOMER_PASSWORD_RESET", "success", ip, f"Cliente #{customer_id} ({c['email']})")
        return {
            "status": "ok",
            "temporary_password": raw_pass,
            "customer_name": c["name"],
            "customer_phone": c["phone"],
        }

    @router.post("/{customer_id}/block")
    def toggle_block_customer(
        customer_id: int,
        payload: BlockCustomerRequest,
        req: Request,
        current_user: str = Depends(get_current_admin),
    ):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email FROM customers WHERE id = %s", (customer_id,))
            c = cursor.fetchone()
            if not c:
                raise HTTPException(status_code=404, detail="Cliente no encontrado")

            if payload.is_blocked:
                cursor.execute(
                    "UPDATE customers SET is_blocked = TRUE, blocked_reason = %s, blocked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    ((payload.reason or "").strip(), customer_id),
                )
                ev_type = "blocked"
                ev_detail = f"Cuenta bloqueada. Motivo: {payload.reason or 'Sin especificar'}"
            else:
                cursor.execute(
                    "UPDATE customers SET is_blocked = FALSE, blocked_reason = '', blocked_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (customer_id,),
                )
                ev_type = "unblocked"
                ev_detail = "Cuenta desbloqueada por administración"

            cursor.execute(
                "INSERT INTO customer_crm_events (customer_id, event_type, details, created_by) VALUES (%s, %s, %s, %s)",
                (customer_id, ev_type, ev_detail, current_user),
            )
            conn.commit()

        ip = req.client.host if req.client else "127.0.0.1"
        log_security_event(current_user, f"CUSTOMER_{ev_type.upper()}", "success", ip, f"Cliente #{customer_id} ({c['email']})")
        return {"status": "ok", "is_blocked": payload.is_blocked}

    @router.post("/{customer_id}/wallet")
    def adjust_customer_wallet(
        customer_id: int,
        payload: WalletAdjustRequest,
        req: Request,
        current_user: str = Depends(get_current_admin),
    ):
        if payload.amount == 0:
            raise HTTPException(status_code=400, detail="El monto debe ser distinto de 0.")
        if not payload.reason.strip():
            raise HTTPException(status_code=400, detail="Debes indicar un motivo para el ajuste de saldo.")

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, COALESCE(wallet_balance, 0) AS wb FROM customers WHERE id = %s", (customer_id,))
            c = cursor.fetchone()
            if not c:
                raise HTTPException(status_code=404, detail="Cliente no encontrado")

            new_balance = max(0.0, float(c["wb"]) + float(payload.amount))
            cursor.execute(
                "UPDATE customers SET wallet_balance = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (new_balance, customer_id),
            )
            tx_type = "reward_earned" if payload.amount > 0 else "wallet_used"
            cursor.execute(
                """
                INSERT INTO referral_transactions (referrer_customer_id, transaction_type, amount, description, status)
                VALUES (%s, %s, %s, %s, 'completed')
                """,
                (customer_id, tx_type, abs(payload.amount), f"Ajuste manual admin: {payload.reason.strip()}"),
            )
            cursor.execute(
                "INSERT INTO customer_crm_events (customer_id, event_type, details, created_by) VALUES (%s, 'wallet_adjustment', %s, %s)",
                (customer_id, f"Ajuste saldo {'+' if payload.amount > 0 else ''}${payload.amount:,} CLP · {payload.reason.strip()}", current_user),
            )
            conn.commit()

        ip = req.client.host if req.client else "127.0.0.1"
        log_security_event(current_user, "CUSTOMER_WALLET_ADJUST", "success", ip, f"Cliente #{customer_id} ({payload.amount})")
        return {"status": "ok", "wallet_balance": new_balance}

    @router.delete("/{customer_id}")
    def delete_customer_admin(
        customer_id: int,
        req: Request,
        current_user: str = Depends(get_current_admin),
    ):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email FROM customers WHERE id = %s", (customer_id,))
            c = cursor.fetchone()
            if not c:
                raise HTTPException(status_code=404, detail="Cliente no encontrado")

            clean_email = (c["email"] or "").strip().lower()
            cursor.execute(
                "SELECT COUNT(*) AS cnt FROM orders WHERE (customer_id = %s OR LOWER(TRIM(COALESCE(customer_email, ''))) = %s) AND payment_status = 'Pagado'",
                (customer_id, clean_email),
            )
            paid_cnt = cursor.fetchone()["cnt"]

            if paid_cnt > 0:
                # Soft-delete + anonimización para proteger contabilidad y lotes FIFO
                anon_email = f"deleted_{customer_id}_{int(datetime.now().timestamp())}@origencanino.local"
                cursor.execute(
                    """
                    UPDATE customers
                    SET is_deleted = TRUE, is_blocked = TRUE, deleted_at = CURRENT_TIMESTAMP,
                        email = %s, phone = '', address = '', marketing_opt_in = FALSE,
                        blocked_reason = 'Cuenta desactivada y anonimizada por administración',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    (anon_email, customer_id),
                )
                cursor.execute(
                    "INSERT INTO customer_crm_events (customer_id, event_type, details, created_by) VALUES (%s, 'deleted_soft', %s, %s)",
                    (customer_id, f"Cuenta anonimizada (conserva {paid_cnt} pedidos pagados para contabilidad)", current_user),
                )
                conn.commit()
                mode = "anonymized"
                msg = f"Cuenta desactivada y anonimizada (se preservaron {paid_cnt} pedidos pagados para integridad contable)."
            else:
                cursor.execute("UPDATE orders SET customer_id = NULL WHERE customer_id = %s", (customer_id,))
                cursor.execute("DELETE FROM customers WHERE id = %s", (customer_id,))
                conn.commit()
                mode = "hard_deleted"
                msg = "Cuenta eliminada definitivamente de la base de datos."

        ip = req.client.host if req.client else "127.0.0.1"
        log_security_event(current_user, "CUSTOMER_DELETE", "success", ip, f"Cliente #{customer_id} ({c['email']}) · {mode}")
        return {"status": "ok", "mode": mode, "message": msg}

    return router

