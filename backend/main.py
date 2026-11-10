import os
import re
import json
import time
import html
from collections import defaultdict
from threading import Lock
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Form, UploadFile, File, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response, HTMLResponse
from pydantic import BaseModel
from typing import List, Optional
import urllib.request
import urllib.parse
import urllib.error
from server_db import get_connection, init_database
from PIL import Image, UnidentifiedImageError, ImageOps
import io
import uuid
import random
import string
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends
from groq import Groq

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")

app = FastAPI(title="Origen Canino API")

# Mount uploads directory
# Asegurarnos de que el directorio de subidas exista y sincronizar assets predeterminados
os.makedirs("uploads", exist_ok=True)
for _sub in ["products", "testimonials", "blog", "dogs"]:
    os.makedirs(os.path.join("uploads", _sub), exist_ok=True)

# Auto-seed static assets into uploads if missing (prevents broken images on container rebuild)
try:
    import shutil
    base_dir = os.path.dirname(os.path.abspath(__file__))
    source_roots = [
        os.path.join(base_dir, "..", "public", "images"),
        os.path.join(base_dir, "..", "dist", "images")
    ]
    for src_root in source_roots:
        if os.path.isdir(src_root):
            for sub in ["products", "testimonials", "blog", "dogs"]:
                sub_src = os.path.join(src_root, sub)
                sub_dst = os.path.join("uploads", sub)
                if os.path.isdir(sub_src):
                    for fname in os.listdir(sub_src):
                        f_src = os.path.join(sub_src, fname)
                        f_dst = os.path.join(sub_dst, fname)
                        if os.path.isfile(f_src) and not os.path.exists(f_dst):
                            shutil.copy2(f_src, f_dst)
    
    # Symlink/copy legacy hash names for backward compatibility
    legacy_hashes = {
        "products": {
            "6b31b5acd884489c9354b0fa4890af1f.webp": "dieta-barf.webp",
            "6f7f2e611ac84b01bb555523b8f002f1.webp": "dieta-cocinada-cerdo.webp",
            "809cf60f6cd94af396c8e1926d6cc16b.webp": "patitas-pollo.webp",
            "400c8212744044d3a75efd0d77beaabb.webp": "caldo-huesos.webp",
            "80bff89182d34fadad34c9990dc5b821.webp": "dieta-barf-molida.webp",
        }
    }
    for sub, mapping in legacy_hashes.items():
        for hash_name, target_file in mapping.items():
            h_path = os.path.join("uploads", sub, hash_name)
            t_path = os.path.join("uploads", sub, target_file)
            if os.path.exists(t_path) and not os.path.exists(h_path):
                shutil.copy2(t_path, h_path)
except Exception as _e:
    print(f"Warning: could not auto-seed uploads: {_e}")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Inicializar base de datos al arrancar
init_database()

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://origencanino.cl", "https://www.origencanino.cl"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Middleware de Seguridad HTTP (Hardening Defensivo) ---
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://http2.mlstatic.com; "
        "connect-src 'self' https: wss:; "
        "img-src 'self' https: data: blob:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "frame-src 'self' https://www.mercadopago.com https://sdk.mercadopago.com;"
    )
    response.headers["Server"] = "OrigenCanino-Protected-Gateway"
    return response

# --- Motor de Mitigación de Ataques y Rate Limiting en Memoria ---
class RateLimiter:
    def __init__(self):
        self._lock = Lock()
        self._records = defaultdict(list)

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        with self._lock:
            cutoff = now - window_seconds
            self._records[key] = [t for t in self._records[key] if t > cutoff]
            if len(self._records[key]) >= max_requests:
                return True
            self._records[key].append(now)
            return False

rate_limiter = RateLimiter()

# --- Modelos Pydantic ---
class ProductResponse(BaseModel):
    id: int
    name: str
    type: str
    price: int
    weight: str
    description: str
    ingredients: List[str]
    benefits: List[str]
    image: str
    isNew: bool
    fixed_cost: int = 0

class ProductCreate(BaseModel):
    name: str
    type: str = "barf"
    price: int
    weight: str = "1 Kg"
    description: str = ""
    ingredients: List[str] = []
    benefits: List[str] = []
    isNew: bool = True
    image: str = ""
    fixed_cost: int = 0

class ProductUpdate(BaseModel):
    name: str
    type: Optional[str] = None
    price: int
    weight: str
    description: str
    ingredients: List[str]
    benefits: List[str]
    isNew: bool
    image: str
    fixed_cost: int = 0

class IngredientResponse(BaseModel):
    id: int
    name: str
    cost_per_unit: int
    unit: str
    kcal_per_100g: Optional[float] = 0
    protein_g: Optional[float] = 0
    fat_g: Optional[float] = 0
    fiber_g: Optional[float] = 0
    moisture_g: Optional[float] = 0
    ash_g: Optional[float] = 0
    carbs_g: Optional[float] = 0

class IngredientCreateUpdate(BaseModel):
    name: str
    cost_per_unit: int
    unit: str
    kcal_per_100g: Optional[float] = 0
    protein_g: Optional[float] = 0
    fat_g: Optional[float] = 0
    fiber_g: Optional[float] = 0
    moisture_g: Optional[float] = 0
    ash_g: Optional[float] = 0
    carbs_g: Optional[float] = 0

class EstimateNutritionRequest(BaseModel):
    ingredient_name: str

class RecipeItem(BaseModel):
    ingredient_id: int
    quantity: float

class RecipeUpdate(BaseModel):
    items: List[RecipeItem]

class BlogPostResponse(BaseModel):
    id: int
    slug: str
    title: str
    excerpt: str
    content: str
    image: str
    created_at: str

class BlogPostCreateUpdate(BaseModel):
    slug: str
    title: str
    excerpt: str
    content: str
    image: str

class OrderItem(BaseModel):
    id: int
    name: str
    price: int
    quantity: int
    weight: Optional[str] = None

class OrderCreate(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    customer_city: str
    customer_region: str
    customer_password: Optional[str] = None
    items: List[OrderItem]
    is_subscription: bool = False
    dog_name: Optional[str] = None
    dog_weight: Optional[float] = None
    dog_age: Optional[str] = None
    payment_method: Optional[str] = "transferencia"
    transfer_bank: Optional[str] = None
    transfer_receipt_number: Optional[str] = None
    nfc_building_code: Optional[str] = None
    discount_amount: Optional[int] = 0
    coupon_code: Optional[str] = None
    referral_code: Optional[str] = None
    use_wallet_balance: Optional[bool] = False

class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = ""
    discount_type: str = "percentage"  # "percentage" or "fixed"
    discount_value: float
    min_order_amount: Optional[int] = 0
    max_discount_amount: Optional[int] = None
    usage_limit: Optional[int] = None
    usage_per_customer: Optional[int] = 1
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = True

class CouponUpdate(BaseModel):
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_order_amount: Optional[int] = None
    max_discount_amount: Optional[int] = None
    usage_limit: Optional[int] = None
    usage_per_customer: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None

class ValidateCouponRequest(BaseModel):
    code: str
    email: Optional[str] = ""
    subtotal: int

class OrderStatusUpdate(BaseModel):
    payment_status: Optional[str] = None
    delivery_status: Optional[str] = None

class BulkDeleteOrdersRequest(BaseModel):
    order_ids: List[int]

class BuildingCreateUpdate(BaseModel):
    name: str
    slug: str
    address: str
    street_references: str
    discount_percent: int = 15
    contact_info: Optional[str] = None
    active: int = 1

class SettingsUpdate(BaseModel):
    settings: dict

class PromoSettingsUpdate(BaseModel):
    enabled: bool = True
    percent: int = 10
    code: str = "BIENVENIDO10"
    title: str = "¡10% OFF en tu primera compra!"
    description: Optional[str] = "Descuento automático exclusivo para nuevos clientes en su primer pedido."

class TestimonialCreate(BaseModel):
    owner_name: str
    dog_name: str
    content: str
    rating: int

class TestimonialStatusUpdate(BaseModel):
    status: str

class TestimonialUpdate(BaseModel):
    owner_name: str
    dog_name: str
    content: str
    rating: int = 5
    status: str = "approved"
    image_path: Optional[str] = None
    diet_tag: Optional[str] = "🌿 Nutrición 100% Real"
    location: Optional[str] = "Santiago, CL"

class LoginRequest(BaseModel):
    email: str
    password: str

class Verify2FARequest(BaseModel):
    session_id: str
    code: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class AdminUserCreate(BaseModel):
    email: str
    password: str

class AdminUserUpdate(BaseModel):
    email: str
    password: Optional[str] = None

class CustomerRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = "Región Metropolitana"
    dog_name: Optional[str] = None
    dog_weight: Optional[float] = None
    dog_age: Optional[str] = "adulto"

class CustomerLoginRequest(BaseModel):
    email: str
    password: str

class CheckEmailRequest(BaseModel):
    email: str

class CustomerProfileUpdate(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = "Región Metropolitana"

class CustomerDogCreateUpdate(BaseModel):
    name: str
    weight: float
    age_stage: Optional[str] = "adulto"
    favorite_diet: Optional[str] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None

class LeadCreate(BaseModel):
    customer_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    dog_name: Optional[str] = None
    dog_breed: Optional[str] = None
    dog_age: Optional[str] = None
    dog_weight: Optional[float] = None
    activity_level: Optional[str] = None
    diet_type: Optional[str] = None
    daily_grams: Optional[float] = None
    monthly_kilos: Optional[float] = None
    estimated_monthly_cost: Optional[int] = None
    health_notes: Optional[str] = None
    pack_type: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None

# --- Auth Config ---
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-origen")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password, hashed_password)

def get_password_hash(password):
    if isinstance(password, str):
        password = password.encode('utf-8')
    return bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def get_current_customer(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        customer_id = payload.get("customer_id")
        if not customer_id:
            raise HTTPException(status_code=401, detail="Token no corresponde a un cliente")
        return customer_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# --- Endpoints Públicos ---
# --- Utilidades ---
def get_telegram_credentials():
    token = None
    chat_id = None
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM system_settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id')")
            rows = cursor.fetchall()
            for r in rows:
                k = r.get('key')
                v = (r.get('value') or '').strip()
                if k == 'telegram_bot_token' and v:
                    token = v
                elif k == 'telegram_chat_id' and v:
                    chat_id = v
    except Exception as e:
        print("Error obteniendo credenciales de Telegram desde BD:", e)

    if not token:
        if os.path.exists("backend/.env"):
            load_dotenv("backend/.env", override=True)
        elif os.path.exists(".env"):
            load_dotenv(".env", override=True)
        token = os.getenv("TELEGRAM_BOT_TOKEN") or "9089876682:AAFeQDNJLqt7qGodbf7EH3fh5gTHlMH2FSQ"
        if token.startswith("8623970624"):
            token = "9089876682:AAFeQDNJLqt7qGodbf7EH3fh5gTHlMH2FSQ"

    if not chat_id:
        chat_id = os.getenv("TELEGRAM_CHAT_ID") or "1468481915"

    return token.strip() if token else "", chat_id.strip() if chat_id else ""


def sync_telegram_to_env(bot_token: str, chat_id: str):
    env_paths = ["backend/.env", ".env"]
    for env_path in env_paths:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    content = f.read()

                if "TELEGRAM_BOT_TOKEN=" in content:
                    content = re.sub(r"TELEGRAM_BOT_TOKEN=.*", f"TELEGRAM_BOT_TOKEN={bot_token}", content)
                else:
                    content += f"\nTELEGRAM_BOT_TOKEN={bot_token}"

                if "TELEGRAM_CHAT_ID=" in content:
                    content = re.sub(r"TELEGRAM_CHAT_ID=.*", f"TELEGRAM_CHAT_ID={chat_id}", content)
                else:
                    content += f"\nTELEGRAM_CHAT_ID={chat_id}"

                with open(env_path, "w", encoding="utf-8") as f:
                    f.write(content)
            except Exception as e:
                print(f"Error sincronizando Telegram a {env_path}: {e}")

    os.environ["TELEGRAM_BOT_TOKEN"] = bot_token
    os.environ["TELEGRAM_CHAT_ID"] = chat_id


def verify_telegram_bot_token(bot_token: str):
    if not bot_token:
        return {"ok": False, "error": "Token vacío"}
    try:
        url = f"https://api.telegram.org/bot{bot_token}/getMe"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get("ok"):
                bot_result = data.get("result", {})
                return {
                    "ok": True,
                    "bot_id": bot_result.get("id"),
                    "first_name": bot_result.get("first_name"),
                    "username": bot_result.get("username"),
                }
            else:
                return {
                    "ok": False,
                    "error": data.get("description", "Token inválido o bot no encontrado")
                }
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode('utf-8'))
            return {"ok": False, "error": err_data.get("description", str(e))}
        except Exception:
            return {"ok": False, "error": str(e)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def notify_telegram(message: str):
    token, chat_id = get_telegram_credentials()
    if not token or not chat_id:
        print("Credenciales de Telegram faltantes, omitiendo notificación.")
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({'chat_id': chat_id, 'text': message, 'parse_mode': 'Markdown'}).encode('utf-8')
    try:
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req, timeout=10) as response:
            pass
    except Exception as e:
        print("Error enviando notificación a Telegram:", e)

def generate_customer_referral_code(name: str, cursor) -> str:
    base = re.sub(r'[^A-Z0-9]', '', (name or "").upper())[:5]
    if len(base) < 3:
        base = "AMIGO"
    for _ in range(10):
        digits = "".join(random.choices(string.digits, k=3))
        code = f"{base}-{digits}"
        cursor.execute("SELECT id FROM customers WHERE UPPER(referral_code) = %s", (code,))
        if not cursor.fetchone():
            return code
    return f"REF-{int(time.time()) % 100000}"

def check_and_award_referral(cursor, order_id: int):
    """
    Checks if order_id was referred by a customer code and awards the reward if not already awarded.
    """
    try:
        cursor.execute("""
            SELECT o.id, o.customer_name, o.customer_email, o.referral_code, o.coupon_code, o.payment_status, o.customer_id
            FROM orders o
            WHERE o.id = %s
        """, (order_id,))
        o = cursor.fetchone()
        if not o or not o.get('referral_code'):
            return

        ref_code = o['referral_code'].strip().upper()
        coupon_code = (o.get('coupon_code') or '').strip().upper()

        # Regla de negocio estricta: Solo recompensar si el amigo canjeó voluntariamente el código como cupón
        if ref_code != coupon_code:
            print(f"Omitiendo recompensa de referido: el pedido #{order_id} no canjeó el cupón {ref_code} (cupón usado: '{coupon_code}').")
            return
        
        # Verificar si ya se recompensó esta orden
        cursor.execute("SELECT id FROM referral_transactions WHERE order_id = %s AND transaction_type = 'reward_earned'", (order_id,))
        if cursor.fetchone():
            return

        # Buscar al cliente dueño de este código
        cursor.execute("SELECT id, name, email FROM customers WHERE UPPER(referral_code) = %s", (ref_code,))
        referrer = cursor.fetchone()
        if not referrer:
            return

        # Evitar auto-referido
        if referrer['email'].strip().lower() == o['customer_email'].strip().lower():
            return

        # Obtener monto de recompensa configurado (por defecto $5.000)
        cursor.execute("SELECT value FROM system_settings WHERE key = 'referral_reward_amount'")
        rew_row = cursor.fetchone()
        reward_amount = int(rew_row['value']) if rew_row and rew_row.get('value') else 5000

        # Acreditar a la billetera del referidor
        cursor.execute("UPDATE customers SET wallet_balance = COALESCE(wallet_balance, 0) + %s WHERE id = %s", (reward_amount, referrer['id']))

        # Obtener nombre del perrito del amigo comprador si está registrado
        dog_info = ""
        if o.get('customer_id'):
            cursor.execute("SELECT name FROM customer_dogs WHERE customer_id = %s ORDER BY id ASC LIMIT 1", (o['customer_id'],))
            d_row = cursor.fetchone()
            if d_row and d_row.get('name'):
                dog_info = f" (y su perrito 🐶 {d_row['name']})"

        trans_desc = f"Descuento por referido: compra de comida de {o['customer_name']}{dog_info} (Pedido #{order_id})"

        # Registrar transacción
        cursor.execute("""
            INSERT INTO referral_transactions (referrer_customer_id, referee_customer_id, order_id, transaction_type, amount, description, status)
            VALUES (%s, %s, %s, 'reward_earned', %s, %s, 'completed')
        """, (referrer['id'], o.get('customer_id'), order_id, reward_amount, trans_desc))

        # Notificar por Telegram
        msg = f"🎁 *¡Recompensa por Referido Acreditada!* 🐾\n\n"
        msg += f"👤 *Embajador:* {referrer['name']} ({referrer['email']})\n"
        msg += f"🐶 *Amigo Comprador:* {o['customer_name']} (Pedido #{order_id})\n"
        msg += f"💰 *Saldo Abonado a Billetera:* +${reward_amount:,} CLP\n"
        notify_telegram(msg)
    except Exception as e_ref:
        print("Error en check_and_award_referral:", e_ref)

def log_security_event(user_email: str, action: str, status: str = "success", ip_address: str = "127.0.0.1", details: str = ""):
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO admin_audit_logs (user_email, action, status, ip_address, details)
                    VALUES (%s, %s, %s, %s, %s)
                """, (user_email, action, status, ip_address or "127.0.0.1", details or ""))
            conn.commit()

        # Si el evento es anómalo o crítico, despachar alerta inmediata a Telegram
        if status in ["critical", "warning", "danger"]:
            emoji = "🚨" if status in ["critical", "danger"] else "⚠️"
            now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            telegram_alert = (
                f"{emoji} *ALERTA DE SEGURIDAD - ORIGEN CANINO*\n\n"
                f"🛡️ *Evento Anómalo:* {action}\n"
                f"📊 *Nivel de Severidad:* `{status.upper()}`\n"
                f"👤 *Identidad / Origen:* `{user_email or 'Anónimo'}`\n"
                f"🌐 *Dirección IP:* `{ip_address}`\n"
                f"📝 *Detalle Técnico:* {details}\n"
                f"⏰ *Fecha y Hora:* {now_str}"
            )
            try:
                notify_telegram(telegram_alert)
            except Exception as tg_err:
                print("Error enviando alerta de seguridad a Telegram:", tg_err)

    except Exception as e:
        print("Error logging security event:", e)

def get_client_ip(req: Request) -> str:
    forwarded = req.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return req.client.host if req.client else "127.0.0.1"

class ContactMessage(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    message: str

# --- Endpoints Auth Admin ---
@app.post("/api/admin/login")
def login(request: LoginRequest, req: Request):
    ip = get_client_ip(req)
    clean_email = request.email.strip().lower()

    # Rate limiting defensivo contra fuerza bruta: máx 5 intentos por minuto por IP
    if rate_limiter.is_rate_limited(f"login_{ip}", max_requests=5, window_seconds=60):
        log_security_event(clean_email, "Bloqueo por exceso de intentos de login", status="critical", ip_address=ip, details="IP bloqueada temporalmente por 1 minuto")
        raise HTTPException(status_code=429, detail="Demasiados intentos de acceso. Por seguridad, espera 1 minuto.")

    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM admin_users WHERE LOWER(email) = %s", (clean_email,))
            user = cursor.fetchone()
            if not user or not verify_password(request.password, user["password_hash"]):
                log_security_event(clean_email, "Intento de inicio de sesión fallido", status="warning", ip_address=ip, details="Credenciales incorrectas")
                raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
            
            session_id = str(uuid.uuid4())
            code = str(random.randint(10000, 99999))
            expires_at = (datetime.utcnow() + timedelta(minutes=5)).isoformat()
            
            cursor.execute("""
                INSERT INTO admin_2fa_codes (email, session_id, code, expires_at)
                VALUES (%s, %s, %s, %s)
            """, (user["email"], session_id, code, expires_at))
            conn.commit()
            
            msg = f"🔐 *Código de acceso admin Origen Canino*\n\nAlguien está intentando iniciar sesión desde `{ip}` con el usuario `{user['email']}`.\n\nTu código es: *{code}*"
            notify_telegram(msg)
            log_security_event(user["email"], "Código 2FA generado", status="info", ip_address=ip, details="Código enviado a Telegram @OrigenCanino_bot")
            
            return {"requires_2fa": True, "session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/api/admin/verify-2fa")
def verify_2fa(request: Verify2FARequest, req: Request):
    ip = get_client_ip(req)

    # Protección de fuerza bruta: Máx 5 intentos para este session_id
    if rate_limiter.is_rate_limited(f"2fa_{request.session_id}", max_requests=5, window_seconds=300):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM admin_2fa_codes WHERE session_id = %s", (request.session_id,))
            conn.commit()
        log_security_event("Sistema", "Sesión 2FA destruida por fuerza bruta", status="critical", ip_address=ip, details=f"Sesión {request.session_id} invalidada")
        raise HTTPException(status_code=429, detail="Demasiados intentos fallidos. Tu código 2FA ha sido revocado por seguridad. Inicia sesión nuevamente.")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM admin_2fa_codes 
            WHERE session_id = %s AND code = %s
        """, (request.session_id, request.code))
        
        row = cursor.fetchone()
        if not row:
            log_security_event("Desconocido", "Código 2FA inválido", status="warning", ip_address=ip, details="Código incorrecto o sesión expirada")
            raise HTTPException(status_code=401, detail="Código inválido o sesión expirada")
            
        expires_at = row["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
            
        if datetime.utcnow() > expires_at:
            log_security_event(row["email"], "Código 2FA expirado", status="warning", ip_address=ip, details="Tiempo de 5 minutos excedido")
            raise HTTPException(status_code=401, detail="Código expirado")
            
        cursor.execute("DELETE FROM admin_2fa_codes WHERE session_id = %s", (request.session_id,))
        conn.commit()
        
        log_security_event(row["email"], "Inicio de sesión exitoso (2FA)", status="success", ip_address=ip, details="Acceso autorizado al panel de administración")
        access_token = create_access_token(data={"sub": row["email"]})
        return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/admin/change-password")
def change_password(request: ChangePasswordRequest, req: Request, current_user: str = Depends(get_current_admin)):
    ip = get_client_ip(req)
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
        
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admin_users WHERE email = %s", (current_user,))
        user = cursor.fetchone()
        
        if not user or not verify_password(request.old_password, user["password_hash"]):
            log_security_event(current_user, "Intento fallido de cambio de contraseña", status="warning", ip_address=ip, details="Contraseña actual incorrecta")
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
            
        new_hash = get_password_hash(request.new_password)
        cursor.execute("UPDATE admin_users SET password_hash = %s WHERE email = %s", (new_hash, current_user))
        conn.commit()
        
        log_security_event(current_user, "Cambio de contraseña exitoso", status="success", ip_address=ip, details="Contraseña actualizada")
        notify_telegram(f"🔐 *Alerta de Seguridad*\n\nEl usuario `{current_user}` cambió su contraseña de acceso admin.")
        return {"success": True, "message": "Contraseña actualizada exitosamente"}

# --- Endpoints Panel de Seguridad Completo ---
@app.get("/api/admin/security/overview")
def get_security_overview(current_user: str = Depends(get_current_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM admin_users")
        total_admins = cursor.fetchone()["count"]
        
        cursor.execute("SELECT COUNT(*) as count FROM admin_audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours'")
        activity_24h = cursor.fetchone()["count"]
        
        token, chat_id = get_telegram_credentials()
        verification = verify_telegram_bot_token(token) if token else {"ok": False}
        bot_uname = f"@{verification.get('username')}" if verification.get("username") else "@OrigenCanino_bot"
        masked_token = f"{token[:8]}...{token[-4:]}" if len(token) > 12 else "***"
        
        return {
            "current_user": current_user,
            "total_admins": total_admins,
            "activity_24h": activity_24h,
            "telegram": {
                "active": bool(token and chat_id and verification.get("ok")),
                "bot_username": bot_uname,
                "masked_token": masked_token,
                "chat_id": chat_id,
                "verification": verification
            }
        }

@app.get("/api/admin/security/users")
def get_admin_users(current_user: str = Depends(get_current_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, created_at FROM admin_users ORDER BY id ASC")
        users = cursor.fetchall()
        for u in users:
            if isinstance(u.get("created_at"), datetime):
                u["created_at"] = u["created_at"].strftime("%d/%m/%Y %H:%M")
        return users

@app.post("/api/admin/security/users")
def create_admin_user(request: AdminUserCreate, req: Request, current_user: str = Depends(get_current_admin)):
    ip = get_client_ip(req)
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    clean_email = request.email.strip().lower()
    if not clean_email:
        raise HTTPException(status_code=400, detail="El correo o usuario no puede estar vacío")
        
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM admin_users WHERE LOWER(email) = %s", (clean_email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Ya existe un usuario con ese email/nombre")
            
        pwd_hash = get_password_hash(request.password)
        cursor.execute("INSERT INTO admin_users (email, password_hash) VALUES (%s, %s) RETURNING id", (clean_email, pwd_hash))
        new_id = cursor.fetchone()["id"]
        conn.commit()
        
        log_security_event(current_user, f"Creación de usuario: {clean_email}", status="success", ip_address=ip, details="Nuevo administrador añadido")
        notify_telegram(f"👤 *Nuevo Administrador Creado*\n\nCreado por: `{current_user}`\nNuevo usuario: `{clean_email}`")
        return {"success": True, "message": "Usuario administrador creado", "id": new_id}

@app.put("/api/admin/security/users/{user_id}")
def update_admin_user(user_id: int, request: AdminUserUpdate, req: Request, current_user: str = Depends(get_current_admin)):
    ip = get_client_ip(req)
    clean_email = request.email.strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email FROM admin_users WHERE id = %s", (user_id,))
        target = cursor.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        if request.password and len(request.password) < 6:
            raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
            
        if request.password:
            pwd_hash = get_password_hash(request.password)
            cursor.execute("UPDATE admin_users SET email = %s, password_hash = %s WHERE id = %s", (clean_email, pwd_hash, user_id))
            log_security_event(current_user, f"Edición y reseteo de clave: {clean_email}", status="success", ip_address=ip)
            notify_telegram(f"🔑 *Contraseña Reseteada*\n\nUsuario modificado: `{clean_email}` por `{current_user}`")
        else:
            cursor.execute("UPDATE admin_users SET email = %s WHERE id = %s", (clean_email, user_id))
            log_security_event(current_user, f"Edición de usuario: {clean_email}", status="success", ip_address=ip)
            
        conn.commit()
        return {"success": True, "message": "Usuario actualizado exitosamente"}

@app.delete("/api/admin/security/users/{user_id}")
def delete_admin_user(user_id: int, req: Request, current_user: str = Depends(get_current_admin)):
    ip = get_client_ip(req)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM admin_users")
        total = cursor.fetchone()["count"]
        if total <= 1:
            raise HTTPException(status_code=400, detail="No puedes eliminar al único administrador del sistema")
            
        cursor.execute("SELECT id, email FROM admin_users WHERE id = %s", (user_id,))
        target = cursor.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        cursor.execute("DELETE FROM admin_users WHERE id = %s", (user_id,))
        conn.commit()
        
        log_security_event(current_user, f"Eliminación de usuario: {target['email']}", status="warning", ip_address=ip, details="Administrador removido")
        notify_telegram(f"🗑️ *Administrador Eliminado*\n\nUsuario removido: `{target['email']}` por `{current_user}`")
        return {"success": True, "message": "Usuario eliminado"}

@app.get("/api/admin/security/logs")
def get_security_logs(limit: int = 50, current_user: str = Depends(get_current_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, user_email, action, status, ip_address, details, created_at 
            FROM admin_audit_logs 
            ORDER BY created_at DESC 
            LIMIT %s
        """, (limit,))
        logs = cursor.fetchall()
        for log in logs:
            if isinstance(log.get("created_at"), datetime):
                log["created_at"] = log["created_at"].strftime("%d/%m/%Y %H:%M:%S")
        return logs

@app.post("/api/admin/security/telegram-test")
def test_telegram_alert(current_user: str = Depends(get_current_admin)):
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    msg = f"🔔 *Prueba de Alerta de Seguridad*\n\nConexión exitosa verificada por `{current_user}`.\nFecha: {now_str}\nEstado: ✅ Todo operativo"
    notify_telegram(msg)
    return {"success": True, "message": "Alerta de prueba enviada a Telegram"}


@app.get("/api/admin/telegram-settings")
def get_admin_telegram_settings(current_user: str = Depends(get_current_admin)):
    token, chat_id = get_telegram_credentials()
    verification = verify_telegram_bot_token(token) if token else {"ok": False, "error": "Token no configurado"}
    return {
        "bot_token": token,
        "chat_id": chat_id,
        "is_configured": bool(token and chat_id),
        "verification": verification
    }


@app.post("/api/admin/telegram-settings")
def update_admin_telegram_settings(payload: dict, current_user: str = Depends(get_current_admin)):
    bot_token = (payload.get("bot_token") or "").strip()
    chat_id = (payload.get("chat_id") or "").strip()

    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ('telegram_bot_token', %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            """, (bot_token,))
            cursor.execute("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ('telegram_chat_id', %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            """, (chat_id,))
            conn.commit()

        sync_telegram_to_env(bot_token, chat_id)
        verification = verify_telegram_bot_token(bot_token) if bot_token else {"ok": False, "error": "Token vacío"}

        log_security_event(current_user, "Actualización credenciales Telegram", "success", details=f"Chat ID: {chat_id}")

        return {
            "success": True,
            "message": "Credenciales de Telegram guardadas correctamente",
            "bot_token": bot_token,
            "chat_id": chat_id,
            "verification": verification
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/telegram-test")
def test_admin_telegram_settings(payload: dict = None, current_user: str = Depends(get_current_admin)):
    bot_token, chat_id = get_telegram_credentials()
    if not bot_token or not chat_id:
        raise HTTPException(
            status_code=400,
            detail="Debe configurar tanto el Bot Token como el Chat ID antes de enviar una prueba."
        )

    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    custom_text = (payload or {}).get("message")
    if not custom_text:
        text = (
            "🐶 *¡Prueba de Telegram Exitosa en Origen Canino!*\n\n"
            f"Conexión verificada por `{current_user}` el {now_str}.\n\n"
            "✅ Códigos 2FA para inicio de sesión en panel\n"
            "✅ Notificaciones de nuevos pedidos de comida BARF\n"
            "✅ Confirmaciones de pagos aprobados en Mercado Pago\n"
            "✅ Alertas de seguridad del sistema"
        )
    else:
        text = custom_text

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    data = urllib.parse.urlencode({'chat_id': chat_id, 'text': text, 'parse_mode': 'Markdown'}).encode('utf-8')
    try:
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = json.loads(response.read().decode('utf-8'))
            if res_body.get("ok"):
                return {
                    "success": True,
                    "message": f"¡Mensaje de prueba recibido con éxito en el chat {chat_id}!"
                }
            else:
                desc = res_body.get("description", "Error desconocido de Telegram")
                return {"success": False, "error": desc, "message": f"Telegram rechazó el envío: {desc}"}
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode('utf-8'))
            desc = err_data.get("description", str(e))
            return {"success": False, "error": desc, "message": f"Telegram rechazó el envío: {desc}"}
        except Exception:
            return {"success": False, "error": str(e), "message": f"Error HTTP {e.code}: {e.reason}"}
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Error de conexión con Telegram: {str(e)}"
        }

# ==========================================
# --- PORTAL DE CLIENTES & MASCOTAS ---
# ==========================================

@app.post("/api/customer/check-email")
def check_customer_email(req: CheckEmailRequest):
    clean_email = req.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        return {"exists": False}
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, phone, address, city, region FROM customers WHERE LOWER(email) = %s", (clean_email,))
        c = cursor.fetchone()
        if c:
            cursor.execute("SELECT name, weight, age_stage FROM customer_dogs WHERE customer_id = %s ORDER BY id ASC LIMIT 1", (c["id"],))
            dog = cursor.fetchone()
            return {
                "exists": True,
                "customer_name": c["name"],
                "phone": c["phone"] or "",
                "address": c["address"] or "",
                "city": c["city"] or "",
                "region": c["region"] or "Región Metropolitana",
                "dog_name": dog["name"] if dog else "",
                "dog_weight": float(dog["weight"]) if dog and dog["weight"] else "",
                "dog_age": dog["age_stage"] if dog else "adult_normal"
            }
        return {"exists": False}

@app.post("/api/customer/register")
def customer_register(req: CustomerRegisterRequest):
    clean_email = req.email.strip().lower()
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    if not clean_email or not req.name.strip():
        raise HTTPException(status_code=400, detail="Nombre y correo son obligatorios")
        
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM customers WHERE LOWER(email) = %s", (clean_email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Ya existe una cuenta con este correo electrónico. Inicia sesión.")
            
        pwd_hash = get_password_hash(req.password)
        ref_code = generate_customer_referral_code(req.name.strip(), cursor)
        cursor.execute("""
            INSERT INTO customers (name, email, password_hash, phone, address, city, region, referral_code)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, email, phone, address, city, region, referral_code, wallet_balance, created_at
        """, (req.name.strip(), clean_email, pwd_hash, req.phone, req.address, req.city, req.region or "Región Metropolitana", ref_code))
        
        customer = cursor.fetchone()
        customer_id = customer["id"]
        
        # Guardar perrito si fue ingresado
        dogs = []
        if req.dog_name and req.dog_weight:
            cursor.execute("""
                INSERT INTO customer_dogs (customer_id, name, weight, age_stage)
                VALUES (%s, %s, %s, %s)
                RETURNING id, name, weight, age_stage
            """, (customer_id, req.dog_name.strip(), req.dog_weight, req.dog_age or "adulto"))
            dog_row = cursor.fetchone()
            if dog_row and "weight" in dog_row and dog_row["weight"] is not None:
                dog_row["weight"] = float(dog_row["weight"])
            dogs.append(dog_row)
            
        conn.commit()
        
        token = create_access_token(data={"customer_id": customer_id, "sub": clean_email, "type": "customer"})
        if isinstance(customer.get("created_at"), datetime):
            customer["created_at"] = customer["created_at"].isoformat()
            
        return {
            "access_token": token,
            "token_type": "bearer",
            "customer": customer,
            "dogs": dogs
        }

@app.post("/api/customer/login")
def customer_login(req: CustomerLoginRequest):
    clean_email = req.email.strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers WHERE LOWER(email) = %s", (clean_email,))
        customer = cursor.fetchone()
        if not customer or not verify_password(req.password, customer["password_hash"]):
            raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
            
        customer_id = customer["id"]
        cursor.execute("SELECT id, name, weight, age_stage, favorite_diet, notes, photo_url FROM customer_dogs WHERE customer_id = %s ORDER BY id ASC", (customer_id,))
        dogs = cursor.fetchall()
        for d in dogs:
            if "weight" in d and d["weight"] is not None:
                d["weight"] = float(d["weight"])
                
        token = create_access_token(data={"customer_id": customer_id, "sub": clean_email, "type": "customer"})
        
        customer.pop("password_hash", None)
        if isinstance(customer.get("created_at"), datetime):
            customer["created_at"] = customer["created_at"].isoformat()
        if isinstance(customer.get("updated_at"), datetime):
            customer["updated_at"] = customer["updated_at"].isoformat()
            
        return {
            "access_token": token,
            "token_type": "bearer",
            "customer": customer,
            "dogs": dogs
        }

@app.get("/api/customer/me")
def get_customer_profile(customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, phone, address, city, region, referral_code, wallet_balance, created_at FROM customers WHERE id = %s", (customer_id,))
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
            
        if not customer.get("referral_code"):
            ref_code = generate_customer_referral_code(customer["name"], cursor)
            cursor.execute("UPDATE customers SET referral_code = %s WHERE id = %s", (ref_code, customer_id))
            conn.commit()
            customer["referral_code"] = ref_code
            
        customer["wallet_balance"] = float(customer.get("wallet_balance") or 0.0)

        cursor.execute("SELECT id, name, weight, age_stage, favorite_diet, notes, photo_url FROM customer_dogs WHERE customer_id = %s ORDER BY id ASC", (customer_id,))
        dogs = cursor.fetchall()
        for d in dogs:
            if "weight" in d and d["weight"] is not None:
                d["weight"] = float(d["weight"])
                
        if isinstance(customer.get("created_at"), datetime):
            customer["created_at"] = customer["created_at"].strftime("%d/%m/%Y")
            
        return {
            "customer": customer,
            "dogs": dogs
        }

@app.put("/api/customer/profile")
def update_customer_profile(req: CustomerProfileUpdate, customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE customers 
            SET name = %s, phone = %s, address = %s, city = %s, region = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, name, email, phone, address, city, region
        """, (req.name.strip(), req.phone, req.address, req.city, req.region, customer_id))
        updated = cursor.fetchone()
        conn.commit()
        return {"success": True, "customer": updated}

@app.post("/api/customer/dogs")
def add_customer_dog(dog: CustomerDogCreateUpdate, customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO customer_dogs (customer_id, name, weight, age_stage, favorite_diet, notes, photo_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, weight, age_stage, favorite_diet, notes, photo_url
        """, (customer_id, dog.name.strip(), dog.weight, dog.age_stage or "adulto", dog.favorite_diet, dog.notes, dog.photo_url))
        new_dog = cursor.fetchone()
        if "weight" in new_dog and new_dog["weight"] is not None:
            new_dog["weight"] = float(new_dog["weight"])
        conn.commit()
        return {"success": True, "dog": new_dog}

@app.put("/api/customer/dogs/{dog_id}")
def update_customer_dog(dog_id: int, dog: CustomerDogCreateUpdate, customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE customer_dogs 
            SET name = %s, weight = %s, age_stage = %s, favorite_diet = %s, notes = %s, photo_url = COALESCE(%s, photo_url)
            WHERE id = %s AND customer_id = %s
            RETURNING id, name, weight, age_stage, favorite_diet, notes, photo_url
        """, (dog.name.strip(), dog.weight, dog.age_stage or "adulto", dog.favorite_diet, dog.notes, dog.photo_url, dog_id, customer_id))
        updated_dog = cursor.fetchone()
        if not updated_dog:
            raise HTTPException(status_code=404, detail="Perrito no encontrado")
        if "weight" in updated_dog and updated_dog["weight"] is not None:
            updated_dog["weight"] = float(updated_dog["weight"])
        conn.commit()
        return {"success": True, "dog": updated_dog}

@app.post("/api/customer/dogs/{dog_id}/upload-photo")
async def upload_dog_photo(dog_id: int, file: UploadFile = File(...), customer_id: int = Depends(get_current_customer)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, photo_url FROM customer_dogs WHERE id = %s AND customer_id = %s", (dog_id, customer_id))
            dog = cursor.fetchone()
            if not dog:
                raise HTTPException(status_code=404, detail="Perrito no encontrado")
            old_photo_url = dog.get("photo_url")

        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")

        MAX_UPLOAD_SIZE = 8 * 1024 * 1024
        content = await file.read(MAX_UPLOAD_SIZE + 1)
        if not content:
            raise HTTPException(status_code=400, detail="El archivo está vacío.")
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="La foto no debe superar los 8 MB.")

        Image.MAX_IMAGE_PIXELS = 25_000_000
        image = Image.open(io.BytesIO(content))

        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        if image.mode in ("P", "LA"):
            image = image.convert("RGBA")
        elif image.mode != "RGB":
            image = image.convert("RGB")

        # Redimensionar proporcionalmente para foto/avatar de mascota (máx 800x800)
        max_dim = 800
        image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        filename = f"dog_{dog_id}_{uuid.uuid4().hex[:8]}.webp"
        upload_dir = os.path.join("uploads", "dogs")
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)

        # Compresión WebP ultraliviana
        image.save(
            filepath,
            "WEBP",
            quality=82,
            method=6,
            optimize=True
        )

        new_photo_url = f"/uploads/dogs/{filename}"

        # Eliminar foto anterior si existía para que siempre sea UNA sola foto por perrito
        if old_photo_url and old_photo_url.startswith("/uploads/dogs/"):
            old_fn = old_photo_url.replace("/uploads/dogs/", "").strip()
            old_fp = os.path.join(upload_dir, old_fn)
            if os.path.exists(old_fp):
                try:
                    os.remove(old_fp)
                except Exception as _e:
                    print("Warning removing old dog photo:", _e)

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE customer_dogs SET photo_url = %s WHERE id = %s AND customer_id = %s", (new_photo_url, dog_id, customer_id))
            conn.commit()

        return {
            "success": True,
            "photo_url": new_photo_url,
            "message": "Foto optimizada en formato WebP guardada con éxito."
        }
    except HTTPException:
        raise
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="El archivo subido no es una imagen válida.")
    except Exception as e:
        print("Error uploading dog photo:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/customer/dogs/{dog_id}")
def delete_customer_dog(dog_id: int, customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT photo_url FROM customer_dogs WHERE id = %s AND customer_id = %s", (dog_id, customer_id))
        d_row = cursor.fetchone()
        if d_row and d_row.get("photo_url") and d_row["photo_url"].startswith("/uploads/dogs/"):
            old_fn = d_row["photo_url"].replace("/uploads/dogs/", "").strip()
            old_fp = os.path.join("uploads", "dogs", old_fn)
            if os.path.exists(old_fp):
                try:
                    os.remove(old_fp)
                except Exception:
                    pass
        cursor.execute("DELETE FROM customer_dogs WHERE id = %s AND customer_id = %s", (dog_id, customer_id))
        conn.commit()
        return {"success": True, "message": "Perrito eliminado"}

@app.get("/api/customer/orders")
def get_customer_orders(customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT email FROM customers WHERE id = %s", (customer_id,))
        cust = cursor.fetchone()
        cust_email = cust["email"] if cust else ""
        
        cursor.execute("""
            SELECT id, total, subtotal, shipping_cost, payment_status, delivery_status, 
                   payment_method, dog_name, dog_weight, is_subscription, created_at
            FROM orders 
            WHERE customer_id = %s OR LOWER(customer_email) = %s
            ORDER BY id DESC
        """, (customer_id, cust_email.lower()))
        orders = cursor.fetchall()
        
        for o in orders:
            if isinstance(o.get("created_at"), datetime):
                o["created_at"] = o["created_at"].strftime("%d/%m/%Y %H:%M")
            cursor.execute("""
                SELECT oi.product_id, oi.product_name, oi.quantity, oi.price_at_purchase as price, p.weight 
                FROM order_items oi 
                LEFT JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = %s
            """, (o["id"],))
            o["items"] = cursor.fetchall()
            
        return orders

# --- Customer Referral & Ambassadors Program Endpoints ---
@app.get("/api/customer/referral")
def get_customer_referral_info(customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, email, referral_code, wallet_balance 
            FROM customers WHERE id = %s
        """, (customer_id,))
        c = cursor.fetchone()
        if not c:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        ref_code = c.get('referral_code')
        if not ref_code:
            ref_code = generate_customer_referral_code(c['name'], cursor)
            cursor.execute("UPDATE customers SET referral_code = %s WHERE id = %s", (ref_code, customer_id))
            conn.commit()
        
        # Obtener configuracion del programa
        cursor.execute("SELECT key, value FROM system_settings WHERE key IN ('referral_program_active', 'referral_friend_discount_percent', 'referral_reward_amount', 'referral_min_order_amount')")
        settings = {r['key']: r['value'] for r in cursor.fetchall()}
        
        # Historial de transacciones de la billetera
        cursor.execute("""
            SELECT id, transaction_type, amount, description, status, created_at 
            FROM referral_transactions 
            WHERE referrer_customer_id = %s 
            ORDER BY id DESC
        """, (customer_id,))
        txs = cursor.fetchall()
        for t in txs:
            if isinstance(t.get('created_at'), datetime):
                t['created_at'] = t['created_at'].strftime("%d/%m/%Y %H:%M")
            t['amount'] = float(t['amount'])
        
        # Amigos referidos (órdenes realizadas con este código)
        cursor.execute("""
            SELECT o.id, o.customer_name, o.customer_id, o.total, o.payment_status, o.created_at,
                   (SELECT name FROM customer_dogs cd WHERE cd.customer_id = o.customer_id ORDER BY cd.id ASC LIMIT 1) as dog_name
            FROM orders o
            WHERE UPPER(o.referral_code) = %s
            ORDER BY o.id DESC
        """, (ref_code.upper(),))
        friends = cursor.fetchall()
        for f in friends:
            if isinstance(f.get('created_at'), datetime):
                f['created_at'] = f['created_at'].strftime("%d/%m/%Y")
        
        wallet_bal = float(c.get('wallet_balance') or 0.0)
        total_earned = sum(t['amount'] for t in txs if t['transaction_type'] == 'reward_earned' and t['status'] == 'completed')
        
        return {
            "referral_code": ref_code,
            "referral_url": f"https://origencanino.cl/?ref={ref_code}",
            "wallet_balance": wallet_bal,
            "total_earned": total_earned,
            "total_friends": len(friends),
            "discount_percent": int(settings.get('referral_friend_discount_percent', 15)),
            "reward_amount": int(settings.get('referral_reward_amount', 5000)),
            "min_order_amount": int(settings.get('referral_min_order_amount', 30000)),
            "program_active": settings.get('referral_program_active', '1') == '1',
            "transactions": txs,
            "friends": friends
        }

@app.get("/api/referral/validate/{code}")
def validate_referral_slug(code: str):
    clean_code = (code or "").strip().upper()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT c.id, c.name, cd.name as dog_name
            FROM customers c
            LEFT JOIN customer_dogs cd ON cd.customer_id = c.id
            WHERE UPPER(c.referral_code) = %s
            ORDER BY cd.id ASC LIMIT 1
        """, (clean_code,))
        row = cursor.fetchone()
        if not row:
            return {"valid": False, "message": "Código de referido no encontrado"}
        
        cursor.execute("SELECT key, value FROM system_settings WHERE key IN ('referral_program_active', 'referral_friend_discount_percent', 'referral_min_order_amount')")
        s = {r['key']: r['value'] for r in cursor.fetchall()}
        if s.get('referral_program_active', '1') != '1':
            return {"valid": False, "message": "El programa de referidos está temporalmente pausado"}
            
        first_name = (row['name'] or '').split()[0]
        dog_str = f" y {row['dog_name']}" if row.get('dog_name') else ""
        discount_pct = int(s.get('referral_friend_discount_percent', 15))
        min_order = int(s.get('referral_min_order_amount', 30000))
        
        return {
            "valid": True,
            "referral_code": clean_code,
            "referrer_name": first_name,
            "dog_name": row.get('dog_name'),
            "discount_percent": discount_pct,
            "min_order_amount": min_order,
            "welcome_message": f"¡Regalo de {first_name}{dog_str}! Tienes un {discount_pct}% OFF en tu primera compra."
        }

# --- Endpoints ---
@app.get("/api/products", response_model=List[ProductResponse])
def get_products():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE active = 1 ORDER BY id ASC")
        rows = cursor.fetchall()
        
        products = []
        for row in rows:
            products.append(ProductResponse(
                id=row["id"],
                name=row["name"],
                type=row["type"],
                price=row["price"],
                weight=row["weight"],
                description=row["description"],
                ingredients=json.loads(row["ingredients"]),
                benefits=json.loads(row["benefits"]),
                image=row["image"],
                isNew=bool(row["is_new"]),
                fixed_cost=row.get("fixed_cost", 0)
            ))
        return products

@app.post("/api/products")
def create_product(p: ProductCreate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO products (
                    name, type, price, weight, description, 
                    ingredients, benefits, is_new, active, image, fixed_cost
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, %s, %s)
                RETURNING id
            """, (
                p.name, p.type, p.price, p.weight, p.description,
                json.dumps(p.ingredients), json.dumps(p.benefits),
                int(p.isNew), p.image, p.fixed_cost
            ))
            new_id = cursor.fetchone()["id"]
            conn.commit()
            return {"success": True, "id": new_id, "message": "Producto creado exitosamente."}
    except Exception as e:
        print(f"Error creating product: {e}")
        raise HTTPException(status_code=500, detail="Error creando el producto: " + str(e))

@app.put("/api/products/{product_id}")
def update_product(product_id: int, p: ProductUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            conn.cursor().execute("""
                UPDATE products 
                SET name = %s, type = COALESCE(%s, type), price = %s, weight = %s, description = %s, ingredients = %s, benefits = %s, is_new = %s, image = %s, fixed_cost = %s
                WHERE id = %s
            """, (p.name, p.type, p.price, p.weight, p.description, json.dumps(p.ingredients), json.dumps(p.benefits), int(p.isNew), p.image, p.fixed_cost, product_id))
            conn.commit()
        return {"success": True}
    except Exception as e:
        print(f"Error updating product: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando el producto.")

@app.post("/api/admin/products/upload-image")
async def upload_product_image(file: UploadFile = File(...), current_user: str = Depends(get_current_admin)):
    try:
        # Validación de tipo de archivo
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")

        # Límite estricto de tamaño a 10 MB para prevenir DoS por memoria
        MAX_UPLOAD_SIZE = 10 * 1024 * 1024
        content = await file.read(MAX_UPLOAD_SIZE + 1)
        if not content:
            raise HTTPException(status_code=400, detail="El archivo está vacío.")
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="La imagen excede el límite permitido de 10 MB.")

        orig_size_bytes = len(content)
        Image.MAX_IMAGE_PIXELS = 30_000_000  # Protección contra descompresiones masivas (Decompression Bombs)
        image = Image.open(io.BytesIO(content))
        
        # 1. Corregir orientación EXIF (típica en fotos de móviles)
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        # 2. Normalizar modos de color preservando canales y transparencia en WebP
        if image.mode in ("P", "LA"):
            image = image.convert("RGBA")
        elif image.mode == "CMYK":
            image = image.convert("RGB")
        elif image.mode not in ("RGB", "RGBA", "L"):
            image = image.convert("RGB")

        # 3. Redimensionar inteligentemente si supera dimensiones de producto web (máx 1200x1200px)
        max_dim = 1200
        w, h = image.size
        if w > max_dim or h > max_dim:
            image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        # 4. Generar nombre único .webp y guardar comprimido
        filename = f"{uuid.uuid4().hex}.webp"
        upload_dir = os.path.join("uploads", "products")
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)

        # WebP de alta eficiencia: method=6 maximiza compresión manteniendo calidad visual
        image.save(
            filepath,
            "WEBP",
            quality=82,
            method=6,
            optimize=True
        )

        final_size_bytes = os.path.getsize(filepath)
        final_w, final_h = image.size

        return {
            "success": True,
            "url": f"/uploads/products/{filename}",
            "filename": filename,
            "original_size": orig_size_bytes,
            "final_size": final_size_bytes,
            "saved_bytes": max(0, orig_size_bytes - final_size_bytes),
            "width": final_w,
            "height": final_h,
            "format": "webp"
        }
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="El archivo subido no es una imagen válida.")
    except Exception as e:
        print(f"Error uploading product image: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando la imagen: {str(e)}")

# --- Endpoints Ingredientes (Inventario) ---
@app.get("/api/admin/ingredients", response_model=List[IngredientResponse])
def get_ingredients(current_user: str = Depends(get_current_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ingredients ORDER BY name ASC")
        return [dict(r) for r in cursor.fetchall()]

@app.post("/api/admin/ingredients")
def create_ingredient(i: IngredientCreateUpdate, current_user: str = Depends(get_current_admin)):
    try:
        print(f"DEBUG create_ingredient: payload={i.model_dump()}")
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO ingredients (
                    name, cost_per_unit, unit, 
                    kcal_per_100g, protein_g, fat_g, fiber_g, moisture_g, ash_g, carbs_g
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (
                i.name, i.cost_per_unit, i.unit,
                i.kcal_per_100g, i.protein_g, i.fat_g, i.fiber_g, i.moisture_g, i.ash_g, i.carbs_g
            ))
            conn.commit()
            print("DEBUG create_ingredient: commit successful")
            return {"success": True, "id": cursor.fetchone()["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error creando ingrediente")

@app.put("/api/admin/ingredients/{ingredient_id}")
def update_ingredient(ingredient_id: int, i: IngredientCreateUpdate, current_user: str = Depends(get_current_admin)):
    try:
        print(f"DEBUG update_ingredient ID {ingredient_id}: payload={i.model_dump()}")
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE ingredients 
                SET name = %s, cost_per_unit = %s, unit = %s,
                    kcal_per_100g = %s, protein_g = %s, fat_g = %s, fiber_g = %s, moisture_g = %s, ash_g = %s, carbs_g = %s
                WHERE id = %s
            """, (
                i.name, i.cost_per_unit, i.unit,
                i.kcal_per_100g, i.protein_g, i.fat_g, i.fiber_g, i.moisture_g, i.ash_g, i.carbs_g,
                ingredient_id
            ))
            conn.commit()
            print("DEBUG update_ingredient: commit successful")
            return {"success": True}
    except Exception as e:
        print(f"DEBUG update_ingredient: exception {e}")
        raise HTTPException(status_code=500, detail="Error actualizando ingrediente")

@app.delete("/api/admin/ingredients/{ingredient_id}")
def delete_ingredient(ingredient_id: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM ingredients WHERE id = %s", (ingredient_id,))
            conn.commit()
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error eliminando ingrediente")

@app.post("/api/ingredients/estimate-nutrition")
def estimate_nutrition(req: EstimateNutritionRequest, current_user: str = Depends(get_current_admin)):
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="Groq API Key no configurada en el servidor.")
    
    prompt = f"""
    Eres un experto en nutrición animal y de ingredientes. Estima los valores nutricionales promedio por cada 100g para el ingrediente: "{req.ingredient_name}".
    Debes devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura (usa números flotantes sin unidades, 0 si no aplica o es mínimo):
    {{
      "kcal_per_100g": 0.0,
      "protein_g": 0.0,
      "fat_g": 0.0,
      "fiber_g": 0.0,
      "moisture_g": 0.0,
      "ash_g": 0.0,
      "carbs_g": 0.0
    }}
    No devuelvas ningún otro texto, markdown, ni explicaciones. Solo el JSON.
    """
    try:
        client = Groq(api_key=groq_api_key)
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="qwen/qwen3.8-27b",
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        text = response.choices[0].message.content.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        data = json.loads(text.strip())
        return data
    except Exception as e:
        print(f"Error AI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error consultando la IA (Groq): {str(e)}")

# --- Endpoints Recetas ---
@app.get("/api/admin/products/{product_id}/recipe")
def get_recipe(product_id: int, current_user: str = Depends(get_current_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT pi.ingredient_id, pi.quantity, i.name, i.cost_per_unit, i.unit 
            FROM product_ingredients pi
            JOIN ingredients i ON pi.ingredient_id = i.id
            WHERE pi.product_id = %s
        """, (product_id,))
        return [dict(r) for r in cursor.fetchall()]

@app.put("/api/admin/products/{product_id}/recipe")
def update_recipe(product_id: int, r: RecipeUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            # Eliminar la receta anterior
            cursor.execute("DELETE FROM product_ingredients WHERE product_id = %s", (product_id,))
            
            # Insertar la nueva receta
            for item in r.items:
                cursor.execute("""
                    INSERT INTO product_ingredients (product_id, ingredient_id, quantity)
                    VALUES (%s, %s, %s)
                """, (product_id, item.ingredient_id, item.quantity))
            
            conn.commit()
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error actualizando receta")

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE products SET active = 0 WHERE id = %s", (product_id,))
            conn.commit()
        return {"success": True, "message": "Producto eliminado exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error eliminando el producto.")

# --- Endpoints Blog ---
@app.post("/api/admin/blog/upload-image")
async def upload_blog_image(file: UploadFile = File(...), current_user: str = Depends(get_current_admin)):
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")

        MAX_UPLOAD_SIZE = 12 * 1024 * 1024
        content = await file.read(MAX_UPLOAD_SIZE + 1)
        if not content:
            raise HTTPException(status_code=400, detail="El archivo está vacío.")
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="La imagen excede el límite permitido de 12 MB.")

        orig_size_bytes = len(content)
        Image.MAX_IMAGE_PIXELS = 35_000_000
        image = Image.open(io.BytesIO(content))

        # 1. Corregir orientación EXIF (típica en fotos de móviles)
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        # 2. Normalizar modos de color para WebP
        if image.mode in ("P", "LA"):
            image = image.convert("RGBA")
        elif image.mode == "CMYK":
            image = image.convert("RGB")
        elif image.mode not in ("RGB", "RGBA", "L"):
            image = image.convert("RGB")

        # 3. Redimensionar para cabecera editorial de Blog (máx 1400px ancho)
        max_w = 1400
        w, h = image.size
        if w > max_w:
            new_h = int(h * (max_w / w))
            image = image.resize((max_w, new_h), Image.Resampling.LANCZOS)

        # 4. Generar nombre único .webp y guardar comprimido
        filename = f"blog_{uuid.uuid4().hex[:12]}.webp"
        upload_dir = os.path.join("uploads", "blog")
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)

        image.save(
            filepath,
            "WEBP",
            quality=84,
            method=6,
            optimize=True
        )

        final_size_bytes = os.path.getsize(filepath)
        final_w, final_h = image.size

        return {
            "success": True,
            "url": f"/uploads/blog/{filename}",
            "filename": filename,
            "original_size": orig_size_bytes,
            "final_size": final_size_bytes,
            "saved_bytes": max(0, orig_size_bytes - final_size_bytes),
            "width": final_w,
            "height": final_h,
            "format": "webp"
        }
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Formato de imagen corrupto o no reconocido.")
    except Exception as e:
        print(f"Error subiendo imagen de blog: {e}")
        raise HTTPException(status_code=500, detail=f"Error al procesar la imagen del blog: {str(e)}")

@app.get("/api/blog", response_model=List[BlogPostResponse])
def get_blog_posts():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM blog_posts WHERE active = 1 ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [BlogPostResponse(
            id=row["id"],
            slug=row["slug"],
            title=row["title"],
            excerpt=row["excerpt"],
            content=row["content"],
            image=row["image"],
            created_at=row["created_at"].isoformat() if hasattr(row["created_at"], 'isoformat') else str(row["created_at"])
        ) for row in rows]

@app.get("/api/blog/{slug}", response_model=BlogPostResponse)
def get_blog_post_by_slug(slug: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM blog_posts WHERE slug = %s AND active = 1", (slug,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Artículo no encontrado")
        return BlogPostResponse(
            id=row["id"],
            slug=row["slug"],
            title=row["title"],
            excerpt=row["excerpt"],
            content=row["content"],
            image=row["image"],
            created_at=row["created_at"].isoformat() if hasattr(row["created_at"], 'isoformat') else str(row["created_at"])
        )

@app.post("/api/blog")
def create_blog_post(p: BlogPostCreateUpdate):
    try:
        with get_connection() as conn:
            conn.cursor().execute("""
                INSERT INTO blog_posts (slug, title, excerpt, content, image)
                VALUES (%s, %s, %s, %s, %s)
            """, (p.slug, p.title, p.excerpt, p.content, p.image))
            conn.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error creando el artículo.")

@app.put("/api/blog/{post_id}")
def update_blog_post(post_id: int, p: BlogPostCreateUpdate):
    try:
        with get_connection() as conn:
            conn.cursor().execute("""
                UPDATE blog_posts 
                SET slug = %s, title = %s, excerpt = %s, content = %s, image = %s
                WHERE id = %s
            """, (p.slug, p.title, p.excerpt, p.content, p.image, post_id))
            conn.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error actualizando el artículo.")

@app.delete("/api/blog/{post_id}")
def delete_blog_post(post_id: int):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE blog_posts SET active = 0 WHERE id = %s", (post_id,))
            conn.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error eliminando el artículo.")

@app.get("/robots.txt")
def get_robots_txt():
    content = (
        "User-agent: *\n"
        "Allow: /\n"
        "Allow: /blog/\n"
        "Allow: /uploads/\n"
        "Disallow: /admin\n"
        "Disallow: /api/\n"
        "Disallow: /mi-cuenta\n\n"
        "Sitemap: https://origencanino.cl/sitemap.xml\n"
    )
    return Response(content=content, media_type="text/plain; charset=utf-8")

@app.get("/sitemap.xml")
def generate_sitemap():
    base_url = "https://origencanino.cl"
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT slug, created_at FROM blog_posts WHERE active = 1 ORDER BY created_at DESC")
            rows = cursor.fetchall()
    except Exception as e:
        print(f"Error cargando blogs para sitemap: {e}")
        rows = []
        
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>',
        f'    <loc>{base_url}/</loc>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
        '  <url>',
        f'    <loc>{base_url}/#tienda</loc>',
        '    <changefreq>daily</changefreq>',
        '    <priority>0.9</priority>',
        '  </url>',
        '  <url>',
        f'    <loc>{base_url}/#planes</loc>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>0.8</priority>',
        '  </url>',
        '  <url>',
        f'    <loc>{base_url}/#transicion</loc>',
        '    <changefreq>monthly</changefreq>',
        '    <priority>0.8</priority>',
        '  </url>',
    ]
    for row in rows:
        slug = row["slug"]
        lastmod_tag = ""
        created_at = row.get("created_at")
        if created_at:
            try:
                if isinstance(created_at, datetime):
                    lastmod_str = created_at.strftime("%Y-%m-%d")
                else:
                    lastmod_str = str(created_at)[:10]
                lastmod_tag = f"\n    <lastmod>{lastmod_str}</lastmod>"
            except Exception:
                pass
        xml_lines.append(
            f'  <url>\n'
            f'    <loc>{base_url}/blog/{slug}</loc>'
            f'{lastmod_tag}\n'
            f'    <changefreq>weekly</changefreq>\n'
            f'    <priority>0.8</priority>\n'
            f'  </url>'
        )
    xml_lines.append('</urlset>')
    return Response(content="\n".join(xml_lines), media_type="application/xml; charset=utf-8")

# --- Leads & CRO Conversion Engine ---
@app.post("/api/leads")
def create_lead(lead: LeadCreate, req: Request):
    ip = get_client_ip(req)
    if rate_limiter.is_rate_limited(f"leads_{ip}", max_requests=10, window_seconds=300):
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Por favor espera unos minutos.")

    phone_clean = re.sub(r"[^\d+]", "", lead.phone or "").strip()
    if not phone_clean:
        raise HTTPException(status_code=400, detail="El teléfono es obligatorio para contactarte.")

    lead_id = None
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO leads (
                    customer_name, phone, email, dog_name, dog_breed, dog_age,
                    dog_weight, activity_level, diet_type, daily_grams, monthly_kilos,
                    estimated_monthly_cost, health_notes, utm_source, utm_medium,
                    utm_campaign, utm_content, utm_term, ip_address, status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, 'nuevo'
                ) RETURNING id;
            """, (
                (lead.customer_name or "").strip()[:150],
                phone_clean[:50],
                (lead.email or "").strip().lower()[:150],
                (lead.dog_name or "").strip()[:100],
                (lead.dog_breed or "").strip()[:100],
                (lead.dog_age or "").strip()[:50],
                lead.dog_weight,
                (lead.activity_level or "").strip()[:50],
                (lead.diet_type or "").strip()[:50],
                lead.daily_grams,
                lead.monthly_kilos,
                lead.estimated_monthly_cost,
                (lead.health_notes or "").strip()[:255],
                (lead.utm_source or "").strip()[:100],
                (lead.utm_medium or "").strip()[:100],
                (lead.utm_campaign or "").strip()[:100],
                (lead.utm_content or "").strip()[:100],
                (lead.utm_term or "").strip()[:100],
                ip
            ))
            row = cursor.fetchone()
            if row:
                lead_id = row['id']
            conn.commit()
    except Exception as e:
        print(f"Error guardando lead en BD: {e}")

    # Despachar notificación inmediata al bot de Telegram (@OrigenCanino_bot)
    try:
        cost_str = f"${lead.estimated_monthly_cost:,} CLP".replace(",", ".") if lead.estimated_monthly_cost else "A cotizar"
        diet_str = "BARF (Cruda)" if (lead.diet_type or "").lower() == "barf" else "Cocinada al Vapor"
        tg_msg = (
            f"🐶 *¡Nuevo Prospecto Captado en Calculadora Web!*\n\n"
            f"👤 *Cliente:* {lead.customer_name or 'Sin nombre'}\n"
            f"📱 *WhatsApp:* `{phone_clean}`\n"
            f"📧 *Email:* {lead.email or 'No provisto'}\n"
            f"🐾 *Perrito:* *{lead.dog_name or 'Perrito'}* ({lead.dog_breed or 'Raza no especificada'}, {lead.dog_age or 'Adulto'})\n"
            f"⚖️ *Peso:* {lead.dog_weight or 0} kg | *Actividad:* {lead.activity_level or 'Normal'}\n"
            f"🥩 *Dieta:* {diet_str}\n"
            f"🍖 *Ración Diaria:* {lead.daily_grams or 0} g/día (~{lead.monthly_kilos or 0} kg/mes)\n"
            f"💰 *Plan Mensual:* {cost_str}\n"
        )
        if lead.health_notes:
            tg_msg += f"⚠️ *Salud / Alergias:* {lead.health_notes}\n"
        if lead.utm_source or lead.utm_campaign:
            tg_msg += f"📍 *Origen:* {lead.utm_source or '-'} / {lead.utm_medium or '-'} / {lead.utm_campaign or '-'}\n"
        tg_msg += f"🌐 *IP:* `{ip}`"

        notify_telegram(tg_msg)
    except Exception as tg_err:
        print(f"Error notificando lead a Telegram: {tg_err}")

    # Formatear link de WhatsApp directo para el cliente
    business_phone = "56974436590"
    dog_display = lead.dog_name or "mi perro"
    prefilled_text = (
        f"¡Hola Origen Canino! 🐾 Calculé la porción para {dog_display} "
        f"({lead.dog_weight or 0}kg, {lead.dog_breed or 'raza'}), "
        f"su ración estimada es {lead.daily_grams or 0}g/día de {lead.diet_type or 'comida natural'}. "
        f"Quisiera recibir su pauta nutricional y activar el 10% de descuento en mi primer pedido."
    )
    encoded_text = urllib.parse.quote(prefilled_text)
    whatsapp_url = f"https://wa.me/{business_phone}?text={encoded_text}"

    return {
        "success": True,
        "lead_id": lead_id,
        "whatsapp_url": whatsapp_url,
        "message": "¡Excelente! Registramos los datos de tu perrito. Nuestro equipo te enviará la pauta nutricional."
    }

@app.get("/api/admin/leads")
def get_admin_leads(limit: int = 50, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM leads 
                ORDER BY created_at DESC 
                LIMIT %s;
            """, (limit,))
            rows = cursor.fetchall()
            return rows
    except Exception as e:
        print(f"Error consultando leads: {e}")
        return []

@app.post("/api/contact")
def submit_contact(msg: ContactMessage):
    try:
        with get_connection() as conn:
            conn.cursor().execute(
                "INSERT INTO contact_messages (name, email, phone, message) VALUES (%s, %s, %s, %s)",
                (msg.name, msg.email, msg.phone, msg.message)
            )
            conn.commit()
        return {"success": True, "message": "Mensaje recibido correctamente."}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al guardar el mensaje.")

# --- Orders Endpoints ---
MIN_PURCHASE_AMOUNT = 30000

@app.post("/api/orders")
def create_order(order: OrderCreate, req: Request):
    ip = get_client_ip(req)
    # Límite anti-spam: máximo 10 pedidos cada 5 minutos por IP
    if rate_limiter.is_rate_limited(f"orders_{ip}", max_requests=10, window_seconds=300):
        log_security_event(order.customer_email or "Anónimo", "Bloqueo por exceso de pedidos (Flood/Spam)", status="warning", ip_address=ip, details="Límite de 10 pedidos cada 5 minutos excedido")
        raise HTTPException(status_code=429, detail="Has alcanzado el límite de creación de pedidos. Por favor espera unos minutos.")

    # Sanitización de longitudes de campo
    order.customer_name = order.customer_name.strip()[:150]
    order.customer_email = order.customer_email.strip().lower()[:150]
    order.customer_phone = order.customer_phone.strip()[:50]
    order.customer_address = order.customer_address.strip()[:250]
    order.customer_city = order.customer_city.strip()[:100]

    subtotal = sum(item.price * item.quantity for item in order.items)
    if subtotal < MIN_PURCHASE_AMOUNT:
        raise HTTPException(
            status_code=400, 
            detail=f"El monto mínimo de compra es de ${MIN_PURCHASE_AMOUNT:,} CLP. Tu subtotal actual es de ${subtotal:,} CLP."
        )
    discount = order.discount_amount or 0
    subtotal_after_discount = max(0, subtotal - discount)
    
    # Envío gratis si es suscripción, de lo contrario $5000 si es menor a $100.000
    if order.is_subscription:
        shipping_cost = 0
    else:
        shipping_cost = 5000 if subtotal_after_discount < 100000 else 0
        
    total = subtotal_after_discount + shipping_cost

    initial_payment_status = "Pendiente (Mercado Pago)" if order.payment_method == "mercadopago" else "Pendiente (Transferencia)"

    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            
            # Buscar si el cliente ya está registrado por email
            clean_email = order.customer_email.strip().lower()
            cursor.execute("SELECT id FROM customers WHERE LOWER(email) = %s", (clean_email,))
            c_row = cursor.fetchone()
            if c_row:
                linked_customer_id = c_row['id']
            else:
                # Garantizar que NINGÚN cliente se salte la base de datos customers
                import secrets
                raw_pwd = order.customer_password if (order.customer_password and len(order.customer_password) >= 6) else secrets.token_hex(8)
                temp_hash = get_password_hash(raw_pwd)
                cursor.execute("""
                    INSERT INTO customers (name, email, password_hash, phone, address, city, region)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    order.customer_name, clean_email, temp_hash,
                    order.customer_phone, order.customer_address,
                    order.customer_city, order.customer_region or 'Región Metropolitana'
                ))
                new_c = cursor.fetchone()
                linked_customer_id = new_c['id'] if new_c else None
                
                # Auto-guardar perrito en customer_dogs
                if linked_customer_id and order.dog_name:
                    cursor.execute("""
                        INSERT INTO customer_dogs (customer_id, name, weight, age_stage)
                        VALUES (%s, %s, %s, %s)
                    """, (linked_customer_id, order.dog_name, order.dog_weight, order.dog_age or 'adulto'))

            wallet_discount = 0
            if order.use_wallet_balance and linked_customer_id:
                cursor.execute("SELECT wallet_balance FROM customers WHERE id = %s", (linked_customer_id,))
                w_row = cursor.fetchone()
                av_wallet = float(w_row['wallet_balance']) if w_row and w_row.get('wallet_balance') else 0.0
                if av_wallet > 0:
                    wallet_discount = int(min(av_wallet, total))
                    total = max(0, total - wallet_discount)
                    cursor.execute("UPDATE customers SET wallet_balance = wallet_balance - %s WHERE id = %s", (wallet_discount, linked_customer_id))

            coupon_applied = order.coupon_code.strip().upper() if order.coupon_code else None
            raw_ref = order.referral_code.strip().upper() if order.referral_code else None
            # Regla de integridad: el referido solo es válido si fue activamente canjeado como cupón
            ref_applied = raw_ref if (raw_ref and raw_ref == coupon_applied) else None

            cursor.execute("""
                INSERT INTO orders (
                    customer_name, customer_email, customer_phone, customer_address, 
                    customer_city, customer_region, subtotal, shipping_cost, total, 
                    is_subscription, dog_name, dog_weight, dog_age, payment_method, 
                    transfer_bank, transfer_receipt_number, nfc_building_code, 
                    discount_amount, coupon_code, payment_status, customer_id,
                    referral_code, wallet_discount
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
                RETURNING id
            """, (
                order.customer_name, order.customer_email, order.customer_phone, order.customer_address, 
                order.customer_city, order.customer_region, subtotal, shipping_cost, total, 
                int(order.is_subscription), order.dog_name, order.dog_weight, order.dog_age,
                order.payment_method or 'transferencia', order.transfer_bank, order.transfer_receipt_number,
                order.nfc_building_code, discount, coupon_applied, initial_payment_status, linked_customer_id,
                ref_applied, wallet_discount
            ))
            
            order_id = cursor.fetchone()['id']

            if wallet_discount > 0 and linked_customer_id:
                cursor.execute("""
                    INSERT INTO referral_transactions (referrer_customer_id, order_id, transaction_type, amount, description, status)
                    VALUES (%s, %s, 'wallet_spent', %s, %s, 'completed')
                """, (linked_customer_id, order_id, -wallet_discount, f"Uso de saldo en Pedido #{order_id}"))

            # Registrar uso de cupón en la tabla coupon_usages e incrementar times_used si aplica
            if coupon_applied:
                try:
                    cursor.execute("SELECT id FROM coupons WHERE UPPER(code) = %s", (coupon_applied,))
                    c_row = cursor.fetchone()
                    if c_row:
                        c_id = c_row['id']
                        cursor.execute("UPDATE coupons SET times_used = times_used + 1, updated_at = CURRENT_TIMESTAMP WHERE id = %s", (c_id,))
                        cursor.execute("""
                            INSERT INTO coupon_usages (coupon_id, coupon_code, customer_email, order_id, discount_applied)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (c_id, coupon_applied, clean_email, order_id, discount))
                except Exception as _c_err:
                    print("Error tracking coupon usage:", _c_err)
            
            # Si el cliente existe y trajo datos de perrito, auto-guardar si no lo tiene
            if linked_customer_id and order.dog_name and order.dog_weight:
                try:
                    cursor.execute("""
                        SELECT id FROM customer_dogs 
                        WHERE customer_id = %s AND LOWER(name) = %s
                    """, (linked_customer_id, order.dog_name.strip().lower()))
                    if not cursor.fetchone():
                        cursor.execute("""
                            INSERT INTO customer_dogs (customer_id, name, weight, age_stage)
                            VALUES (%s, %s, %s, %s)
                        """, (linked_customer_id, order.dog_name.strip(), float(order.dog_weight), order.dog_age or 'adulto'))
                except Exception as e_dog:
                    print("Error auto-saving dog for customer:", e_dog)
            
            for item in order.items:
                cursor.execute("""
                    INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase)
                    VALUES (%s, %s, %s, %s, %s)
                """, (order_id, item.id, item.name, item.quantity, item.price))
            
            # Si provino de un NFC de edificio, registrar visita/orden
            if order.nfc_building_code:
                cursor.execute("UPDATE nfc_buildings SET visits_count = visits_count + 1 WHERE slug = %s", (order.nfc_building_code,))

            # Manejo de estados y alertas de Telegram según método de pago:
            # 1. MERCADO PAGO: No notificar como venta hasta que el webhook confirme el pago real aprobado
            if order.payment_method == 'mercadopago':
                cursor.execute("UPDATE orders SET payment_status = 'Iniciado (Esperando Pago)' WHERE id = %s", (order_id,))
                conn.commit()
                # NOTA: NO enviamos notificación a Telegram aquí. Se enviará únicamente cuando Mercado Pago confirme el pago aprobado.
            else:
                # 2. TRANSFERENCIA BANCARIA: Notificar como solicitud pendiente de validar comprobante
                cursor.execute("UPDATE orders SET payment_status = 'Pendiente de Transferencia' WHERE id = %s", (order_id,))
                conn.commit()

                msg = f"📋 ¡Nueva Solicitud de Pedido por Transferencia! (#{order_id})\n\n"
                if order.is_subscription:
                    msg = f"🔄 ¡SOLICITUD DE SUSCRIPCIÓN (Transferencia)! (#{order_id})\n\n"
                    
                msg += "⚠️ ESTADO: PENDIENTE DE PAGO (Validar transferencia antes de despachar)\n\n"
                msg += f"👤 Cliente: {order.customer_name}\n"
                msg += f"📞 Teléfono: {order.customer_phone}\n"
                msg += f"📍 Dirección: {order.customer_address}, {order.customer_city}\n"
                msg += f"🏦 Banco: {order.transfer_bank or 'Sin registrar'} | N° Operación: {order.transfer_receipt_number or 'Pendiente'}\n"

                if order.nfc_building_code:
                    msg += f"🏢 Tag NFC Comunidad: {order.nfc_building_code} (Descuento: -${discount:,})\n"
                elif discount > 0:
                    msg += f"🎉 Descuento 1ra Compra: -${discount:,}\n"

                msg += f"💰 Total a Transferir: ${total:,}\n\n"
                
                if order.is_subscription:
                    msg += "⚠️ Importante: Es suscripción por transferencia. Coordinar con el cliente cada mes.\n\n"
                    
                msg += "👉 Revisa tu cuenta bancaria para confirmar la recepción del dinero."
                notify_telegram(msg)
            
            return {"success": True, "order_id": order_id, "total": total, "message": "Orden creada correctamente"}
    except Exception as e:
        print("Error creating order:", e)
        raise HTTPException(status_code=500, detail="Error al crear la orden: " + str(e))

# --- Mercado Pago Preference & Webhook ---
@app.post("/api/payments/mercadopago/create-preference")
def create_mp_preference(payload: dict):
    order_id = payload.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id requerido")
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
        order = cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        
        cursor.execute("SELECT value FROM system_settings WHERE key = 'mercadopago_access_token'")
        row = cursor.fetchone()
        access_token = (row['value'] if row and row['value'] else None) or os.getenv("MERCADOPAGO_ACCESS_TOKEN")

    if not access_token:
        raise HTTPException(
            status_code=503,
            detail="Mercado Pago aún no cuenta con Access Token configurado. Puedes pagar vía Transferencia Bancaria o ingresar la credencial en el panel de administración."
        )

    total = int(order["total"])
    title = f"Origen Canino — Pedido #{order_id}"
    
    mp_url = "https://api.mercadopago.com/checkout/preferences"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    pref_data = {
        "items": [
            {
                "title": title,
                "quantity": 1,
                "currency_id": "CLP",
                "unit_price": total
            }
        ],
        "payer": {
            "name": order["customer_name"],
            "email": order["customer_email"] or "cliente@origencanino.cl"
        },
        "metadata": {
            "order_id": order_id
        },
        "external_reference": str(order_id),
        "notification_url": "https://origencanino.cl/api/webhooks/mercadopago",
        "back_urls": {
            "success": f"https://origencanino.cl/?payment=success&order_id={order_id}",
            "failure": f"https://origencanino.cl/?payment=failure&order_id={order_id}",
            "pending": f"https://origencanino.cl/?payment=pending&order_id={order_id}"
        },
        "auto_return": "approved"
    }
    
    try:
        req = urllib.request.Request(
            mp_url,
            data=json.dumps(pref_data).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            mp_res = json.loads(response.read().decode("utf-8"))
            pref_id = mp_res.get("id")
            
            with get_connection() as conn:
                conn.cursor().execute(
                    "UPDATE orders SET mercadopago_preference_id = %s WHERE id = %s",
                    (pref_id, order_id)
                )
                conn.commit()
                
            return {
                "success": True,
                "init_point": mp_res.get("init_point"),
                "sandbox_init_point": mp_res.get("sandbox_init_point"),
                "preference_id": pref_id
            }
    except Exception as e:
        print("[MercadoPago Error]:", e)
        raise HTTPException(status_code=502, detail=f"Error comunicando con Mercado Pago: {str(e)}")

@app.post("/api/webhooks/mercadopago")
async def mercadopago_webhook(request: Request):
    try:
        payload = await request.json()
    except Exception:
        payload = {}
        
    topic = payload.get("type") or payload.get("topic") or request.query_params.get("type") or request.query_params.get("topic")
    data_id = (payload.get("data") or {}).get("id") or payload.get("id") or request.query_params.get("data.id") or request.query_params.get("id")
    
    if topic == "payment" and data_id:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'mercadopago_access_token'")
            row = cursor.fetchone()
            access_token = (row['value'] if row and row['value'] else None) or os.getenv("MERCADOPAGO_ACCESS_TOKEN")
            
        if access_token:
            try:
                check_url = f"https://api.mercadopago.com/v1/payments/{data_id}"
                req = urllib.request.Request(
                    check_url,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    p_data = json.loads(resp.read().decode("utf-8"))
                    
                status = p_data.get("status")
                ext_ref = p_data.get("external_reference")
                
                if status == "approved" and ext_ref:
                    order_id = int(ext_ref)
                    full_order = None
                    order_items = []
                    with get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE orders 
                            SET payment_status = 'Pagado', mercadopago_payment_id = %s
                            WHERE id = %s
                        """, (str(data_id), order_id))
                        check_and_award_referral(cursor, order_id)
                        
                        # Obtener datos completos de la orden y productos para la notificación
                        cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
                        full_order = cursor.fetchone()
                        
                        cursor.execute("""
                            SELECT product_name, quantity, price_at_purchase 
                            FROM order_items 
                            WHERE order_id = %s
                        """, (order_id,))
                        order_items = cursor.fetchall()
                        conn.commit()

                    # Armar notificación de venta real confirmada a Telegram
                    paid_amount = p_data.get('transaction_amount', full_order.get('total', 0) if full_order else 0)
                    msg = f"🎉 ¡VENTA CONFIRMADA Y PAGADA EN MERCADO PAGO! (#{order_id})\n\n"
                    if full_order:
                        if full_order.get('is_subscription'):
                            msg = f"🔄 ¡SUSCRIPCIÓN PAGADA EN MERCADO PAGO! (#{order_id})\n\n"
                        msg += f"👤 Cliente: {full_order.get('customer_name')}\n"
                        msg += f"📞 Teléfono: {full_order.get('customer_phone')}\n"
                        msg += f"📍 Dirección: {full_order.get('customer_address')}, {full_order.get('customer_city')}\n"
                        msg += f"💳 Método: Mercado Pago Online (Aprobado)\n"
                        msg += f"🆔 Transacción MP: {data_id}\n\n"

                        if order_items:
                            msg += "🛒 Productos Comprados:\n"
                            for it in order_items:
                                msg += f"  • {it.get('quantity')}x {it.get('product_name')} (${it.get('price_at_purchase'):,})\n"
                            msg += "\n"

                        msg += f"💰 Total Pagado: ${int(paid_amount):,}\n\n"
                        msg += "✅ El pago está 100% acreditado. Puedes preparar el pedido."
                    else:
                        msg += f"💰 Monto: ${int(paid_amount):,}\nID Pago MP: {data_id}"

                    notify_telegram(msg)
            except Exception as e:
                print("[MP Webhook Error]:", e)
                
    return {"status": "ok"}

# --- NFC Communities Endpoints ---
@app.get("/api/nfc/validate/{slug}")
def validate_nfc(slug: str):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, slug, address, street_references, discount_percent, active 
                FROM nfc_buildings 
                WHERE slug = %s AND active = 1
            """, (slug.strip().lower(),))
            building = cursor.fetchone()
            if not building:
                return {"valid": False, "message": "Comunidad no encontrada o inactiva"}
            
            cursor.execute("UPDATE nfc_buildings SET visits_count = visits_count + 1 WHERE slug = %s", (slug.strip().lower(),))
            conn.commit()
            
            return {
                "valid": True,
                "name": building["name"],
                "slug": building["slug"],
                "address": building["address"],
                "street_references": building["street_references"],
                "discount_percent": building["discount_percent"]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/nfc-buildings")
def get_admin_buildings(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT b.*, 
                       COUNT(o.id) as orders_count,
                       COALESCE(SUM(o.total), 0) as total_revenue
                FROM nfc_buildings b
                LEFT JOIN orders o ON o.nfc_building_code = b.slug
                GROUP BY b.id
                ORDER BY b.id DESC
            """)
            return [dict(r) for r in cursor.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/nfc-buildings")
def create_building(b: BuildingCreateUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO nfc_buildings (name, slug, address, street_references, discount_percent, contact_info, active)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (b.name, b.slug.strip().lower(), b.address, b.street_references, b.discount_percent, b.contact_info, b.active))
            new_id = cursor.fetchone()['id']
            conn.commit()
            return {"success": True, "id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error creando edificio NFC: " + str(e))

@app.put("/api/admin/nfc-buildings/{b_id}")
def update_building(b_id: int, b: BuildingCreateUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE nfc_buildings
                SET name = %s, slug = %s, address = %s, street_references = %s, discount_percent = %s, contact_info = %s, active = %s
                WHERE id = %s
            """, (b.name, b.slug.strip().lower(), b.address, b.street_references, b.discount_percent, b.contact_info, b.active, b_id))
            conn.commit()
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error actualizando edificio NFC: " + str(e))

@app.delete("/api/admin/nfc-buildings/{b_id}")
def delete_building(b_id: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM nfc_buildings WHERE id = %s", (b_id,))
            conn.commit()
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- NFC Settings (Master Password & Defaults) ---
@app.get("/api/admin/nfc-settings")
def get_admin_nfc_settings(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM system_settings WHERE key IN ('nfc_master_password', 'nfc_default_mode')")
            rows = cursor.fetchall()
            settings = {r['key']: r['value'] for r in rows}
            return {
                "nfc_master_password": settings.get("nfc_master_password", "ORIGEN2026"),
                "nfc_default_mode": settings.get("nfc_default_mode", "burn")
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/nfc-settings")
def update_admin_nfc_settings(payload: dict, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            if "nfc_master_password" in payload:
                pwd = str(payload["nfc_master_password"]).strip()
                cursor.execute("""
                    INSERT INTO system_settings (key, value, updated_at)
                    VALUES ('nfc_master_password', %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
                """, (pwd,))
            if "nfc_default_mode" in payload:
                mode = str(payload["nfc_default_mode"]).strip()
                cursor.execute("""
                    INSERT INTO system_settings (key, value, updated_at)
                    VALUES ('nfc_default_mode', %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
                """, (mode,))
            conn.commit()
            return {"success": True, "message": "Configuración NFC guardada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Public Bank & System Settings ---
@app.get("/api/settings/bank-transfer")
def get_public_bank_settings():
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM system_settings WHERE key LIKE 'bank_%' OR key LIKE 'mercadopago_%'")
            rows = cursor.fetchall()
            settings = {r['key']: r['value'] for r in rows}
            # Mask or check if MP is active
            has_token = bool(settings.get('mercadopago_access_token') or os.getenv("MERCADOPAGO_ACCESS_TOKEN"))
            settings['mercadopago_ready'] = has_token and settings.get('mercadopago_enabled', '1') == '1'
            if 'mercadopago_access_token' in settings:
                del settings['mercadopago_access_token']
            return settings
    except Exception as e:
        return {}

@app.get("/api/admin/settings")
def get_admin_settings(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM system_settings")
            rows = cursor.fetchall()
            settings = {r['key']: r['value'] for r in rows}
            val = settings.get('mercadopago_access_token') or os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
            settings['has_mp_token'] = bool(val)
            settings['mercadopago_access_token_masked'] = (val[:6] + "..." + val[-4:]) if len(val) > 10 else ("***" if val else "")
            return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/settings")
def update_admin_settings(payload: SettingsUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            for k, v in payload.settings.items():
                if v is not None and not (k == 'mercadopago_access_token' and v == '***'):
                    cursor.execute("""
                        INSERT INTO system_settings (key, value, updated_at)
                        VALUES (%s, %s, CURRENT_TIMESTAMP)
                        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
                    """, (k, str(v)))
            conn.commit()
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Configuración de Calculadora de Raciones ---
DEFAULT_CALCULATOR_SETTINGS = {
    # Dieta BARF (Cruda) - Referencia Médica Veterinaria Oficial
    "barf_puppy_2_4": 10.0,
    "barf_puppy_4_6": 8.0,
    "barf_puppy_6_8": 6.0,
    "barf_puppy_8_10": 4.0,
    "barf_puppy_10_12": 3.0,
    "barf_adult_normal": 3.0,
    "barf_adult_medium": 2.5,
    "barf_adult_low": 2.0,
    # Comida Cocinada al Vapor
    "cooked_puppy_small": 8.0,
    "cooked_puppy_large": 5.0,
    "cooked_adult_low": 2.0,
    "cooked_adult_normal": 2.5,
    "cooked_adult_high": 3.5,
}

@app.get("/api/calculator/settings")
def get_public_calculator_settings():
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'calculator_percentages'")
            row = cursor.fetchone()
            if row and row.get('value'):
                data = json.loads(row['value'])
                return {**DEFAULT_CALCULATOR_SETTINGS, **data}
            return DEFAULT_CALCULATOR_SETTINGS
    except Exception:
        return DEFAULT_CALCULATOR_SETTINGS

@app.get("/api/admin/calculator-settings")
def get_admin_calculator_settings(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'calculator_percentages'")
            row = cursor.fetchone()
            if row and row.get('value'):
                data = json.loads(row['value'])
                return {**DEFAULT_CALCULATOR_SETTINGS, **data}
            return DEFAULT_CALCULATOR_SETTINGS
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/calculator-settings")
def update_admin_calculator_settings(payload: SettingsUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            val_json = json.dumps(payload.settings)
            cursor.execute("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ('calculator_percentages', %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            """, (val_json,))
            conn.commit()
            return {"success": True, "settings": payload.settings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- First-Order Promotions Endpoints ---
DEFAULT_PROMO_SETTINGS = {
    "enabled": True,
    "percent": 10,
    "code": "BIENVENIDO10",
    "title": "¡10% OFF en tu primera compra!",
    "description": "Descuento automático exclusivo para nuevos clientes en su primer pedido."
}

@app.get("/api/promotions/first-order")
def get_public_first_order_promo():
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'first_order_promo'")
            row = cursor.fetchone()
            if row and row.get('value'):
                data = json.loads(row['value'])
                return {**DEFAULT_PROMO_SETTINGS, **data}
            return DEFAULT_PROMO_SETTINGS
    except Exception:
        return DEFAULT_PROMO_SETTINGS

@app.get("/api/promotions/check-eligibility")
def check_first_order_eligibility(email: str = Query("")):
    clean_email = email.strip().lower()
    if not clean_email:
        return {"eligible": True, "order_count": 0}
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM orders 
                WHERE LOWER(customer_email) = %s AND payment_status != 'Cancelado'
            """, (clean_email,))
            row = cursor.fetchone()
            order_count = row['cnt'] if row else 0
            return {
                "eligible": order_count == 0,
                "order_count": order_count
            }
    except Exception as e:
        return {"eligible": True, "order_count": 0, "error": str(e)}

@app.get("/api/admin/promotions/first-order")
def get_admin_first_order_promo(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'first_order_promo'")
            row = cursor.fetchone()
            if row and row.get('value'):
                data = json.loads(row['value'])
                return {**DEFAULT_PROMO_SETTINGS, **data}
            return DEFAULT_PROMO_SETTINGS
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/promotions/first-order")
def update_admin_first_order_promo(payload: PromoSettingsUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            val_json = json.dumps(payload.dict())
            cursor.execute("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ('first_order_promo', %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            """, (val_json,))
            conn.commit()
            return {"success": True, "settings": payload.dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Dynamic Coupons Engine Endpoints ---

@app.post("/api/promotions/validate")
def validate_coupon_endpoint(req: ValidateCouponRequest):
    code = (req.code or "").strip().upper()
    if not code:
        return {"valid": False, "message": "Por favor ingresa un código de cupón."}
    
    clean_email = (req.email or "").strip().lower()
    subtotal = req.subtotal or 0

    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Comprobar si coincide con el cupón de 1ra Compra (BIENVENIDO10 o configurado)
        cursor.execute("SELECT value FROM system_settings WHERE key = 'first_order_promo'")
        row = cursor.fetchone()
        first_promo = {**DEFAULT_PROMO_SETTINGS, **(json.loads(row['value']) if row and row.get('value') else {})}
        target_welcome = (first_promo.get('code') or 'BIENVENIDO10').strip().upper()
        
        if first_promo.get('enabled') and code == target_welcome:
            if clean_email:
                cursor.execute("""
                    SELECT COUNT(*) as cnt FROM orders 
                    WHERE LOWER(customer_email) = %s AND payment_status != 'Cancelado'
                """, (clean_email,))
                cnt_row = cursor.fetchone()
                order_cnt = cnt_row['cnt'] if cnt_row else 0
                if order_cnt > 0:
                    return {
                        "valid": False,
                        "code": code,
                        "message": "Este cupón es exclusivo para la primera compra y tu correo ya registra pedidos anteriores."
                    }
            
            percent = float(first_promo.get('percent', 10))
            discount = int(round(subtotal * (percent / 100)))
            return {
                "valid": True,
                "code": code,
                "discount_type": "percentage",
                "discount_value": percent,
                "discount_amount": discount,
                "description": first_promo.get('description') or "Descuento de primera compra",
                "message": f"¡Cupón {code} aplicado! -${discount:,} CLP ({int(percent)}% OFF)".replace(",", ".")
            }

        # 2. Comprobar en la tabla de cupones dinámicos
        cursor.execute("SELECT * FROM coupons WHERE UPPER(code) = %s", (code,))
        c_row = cursor.fetchone()
        if not c_row:
            # 3. Comprobar si es un Código de Referido / Amigo Embajador
            cursor.execute("""
                SELECT c.id, c.name, c.email, c.referral_code, cd.name as dog_name
                FROM customers c
                LEFT JOIN customer_dogs cd ON cd.customer_id = c.id
                WHERE UPPER(c.referral_code) = %s
                ORDER BY cd.id ASC LIMIT 1
            """, (code,))
            ref_row = cursor.fetchone()
            if ref_row:
                cursor.execute("SELECT key, value FROM system_settings WHERE key IN ('referral_program_active', 'referral_friend_discount_percent', 'referral_min_order_amount')")
                s_rows = {r['key']: r['value'] for r in cursor.fetchall()}
                if s_rows.get('referral_program_active', '1') != '1':
                    return {"valid": False, "code": code, "message": "El programa de referidos no está activo en este momento."}
                
                # Anti-auto-referido
                if clean_email and clean_email == ref_row['email'].strip().lower():
                    return {"valid": False, "code": code, "message": "No puedes usar tu propio código de referido."}
                
                # Solo primera compra
                if clean_email:
                    cursor.execute("SELECT COUNT(*) as cnt FROM orders WHERE LOWER(customer_email) = %s AND payment_status != 'Cancelado'", (clean_email,))
                    cnt_row = cursor.fetchone()
                    if cnt_row and cnt_row['cnt'] > 0:
                        return {"valid": False, "code": code, "message": "El código de referido es exclusivo para tu primera compra."}
                
                min_order = int(s_rows.get('referral_min_order_amount', 30000))
                if subtotal < min_order:
                    return {"valid": False, "code": code, "message": f"Este código de referido requiere una compra mínima de ${min_order:,} CLP.".replace(",", ".")}
                
                ref_percent = float(s_rows.get('referral_friend_discount_percent', 15))
                discount = int(round(subtotal * (ref_percent / 100)))
                first_name = (ref_row['name'] or 'un amigo').split()[0]
                dog_str = f" y {ref_row['dog_name']}" if ref_row.get('dog_name') else ""
                
                return {
                    "valid": True,
                    "code": code,
                    "is_referral": True,
                    "discount_type": "percentage",
                    "discount_value": ref_percent,
                    "discount_amount": discount,
                    "description": f"Regalo de {first_name}{dog_str}",
                    "message": f"¡Código de amigo {code} aplicado! -${discount:,} CLP ({int(ref_percent)}% OFF de regalo de {first_name})".replace(",", ".")
                }

            return {"valid": False, "code": code, "message": f"El cupón '{code}' no existe o no es válido."}
        
        coupon = dict(c_row)
        if not coupon.get("is_active"):
            return {"valid": False, "code": code, "message": "Este cupón se encuentra inactivo actualmente."}

        # Validar fechas de vigencia
        now = datetime.now(timezone.utc)
        if coupon.get("start_date"):
            s_date = coupon["start_date"]
            if hasattr(s_date, "tzinfo") and s_date.tzinfo is None:
                s_date = s_date.replace(tzinfo=timezone.utc)
            if now < s_date:
                return {"valid": False, "code": code, "message": "Esta promoción aún no ha comenzado."}
                
        if coupon.get("end_date"):
            e_date = coupon["end_date"]
            if hasattr(e_date, "tzinfo") and e_date.tzinfo is None:
                e_date = e_date.replace(tzinfo=timezone.utc)
            if now > e_date:
                return {"valid": False, "code": code, "message": "Este cupón ha expirado."}

        # Validar compra mínima
        min_order = coupon.get("min_order_amount") or 0
        if subtotal < min_order:
            return {
                "valid": False,
                "code": code,
                "message": f"Este cupón requiere una compra mínima de ${min_order:,} CLP.".replace(",", ".")
            }

        # Validar límite de usos totales en la tienda
        usage_limit = coupon.get("usage_limit")
        times_used = coupon.get("times_used") or 0
        if usage_limit is not None and times_used >= usage_limit:
            return {"valid": False, "code": code, "message": "Este cupón ha alcanzado el límite máximo de usos disponibles."}

        # Validar límite de usos por cliente
        usage_per_cust = coupon.get("usage_per_customer") or 1
        if clean_email:
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM coupon_usages 
                WHERE coupon_id = %s AND LOWER(customer_email) = %s
            """, (coupon["id"], clean_email))
            u_row = cursor.fetchone()
            user_used = u_row['cnt'] if u_row else 0
            if user_used >= usage_per_cust:
                return {
                    "valid": False,
                    "code": code,
                    "message": f"Ya has utilizado este cupón el máximo de veces permitido ({usage_per_cust})."
                }

        # Calcular descuento
        disc_type = coupon.get("discount_type") or "percentage"
        disc_val = float(coupon.get("discount_value") or 0)

        if disc_type == "percentage":
            calculated = int(round(subtotal * (disc_val / 100)))
            max_disc = coupon.get("max_discount_amount")
            if max_disc and calculated > max_disc:
                calculated = max_disc
        else: # "fixed"
            calculated = min(int(disc_val), subtotal)

        return {
            "valid": True,
            "code": code,
            "coupon_id": coupon["id"],
            "discount_type": disc_type,
            "discount_value": disc_val,
            "discount_amount": calculated,
            "description": coupon.get("description") or "",
            "message": f"¡Cupón {code} aplicado! -${calculated:,} CLP".replace(",", ".")
        }

@app.get("/api/admin/promotions")
def get_admin_promotions(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM coupons ORDER BY created_at DESC")
            rows = cursor.fetchall()
            
            coupons_list = []
            for r in rows:
                c = dict(r)
                if "discount_value" in c and c["discount_value"] is not None:
                    c["discount_value"] = float(c["discount_value"])
                if isinstance(c.get("start_date"), datetime):
                    c["start_date"] = c["start_date"].isoformat()
                if isinstance(c.get("end_date"), datetime):
                    c["end_date"] = c["end_date"].isoformat()
                if isinstance(c.get("created_at"), datetime):
                    c["created_at"] = c["created_at"].isoformat()
                if isinstance(c.get("updated_at"), datetime):
                    c["updated_at"] = c["updated_at"].isoformat()
                coupons_list.append(c)
            return {"success": True, "coupons": coupons_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/promotions")
def create_admin_promotion(payload: CouponCreate, current_user: str = Depends(get_current_admin)):
    code = payload.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="El código de cupón es obligatorio.")
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM coupons WHERE UPPER(code) = %s", (code,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail=f"Ya existe un cupón con el código '{code}'.")

            cursor.execute("""
                INSERT INTO coupons (
                    code, description, discount_type, discount_value, 
                    min_order_amount, max_discount_amount, usage_limit, 
                    usage_per_customer, start_date, end_date, is_active
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING *
            """, (
                code, (payload.description or "").strip(), payload.discount_type, payload.discount_value,
                payload.min_order_amount or 0, payload.max_discount_amount, payload.usage_limit,
                payload.usage_per_customer or 1, payload.start_date, payload.end_date, payload.is_active
            ))
            new_row = cursor.fetchone()
            conn.commit()
            new_c = dict(new_row)
            if "discount_value" in new_c and new_c["discount_value"] is not None:
                new_c["discount_value"] = float(new_c["discount_value"])
            return {"success": True, "coupon": new_c}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/admin/promotions/{coupon_id}")
def update_admin_promotion(coupon_id: int, payload: CouponUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM coupons WHERE id = %s", (coupon_id,))
            existing = cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Cupón no encontrado.")

            fields_dict = payload.dict(exclude_unset=True)
            if not fields_dict:
                return {"success": True, "coupon": dict(existing)}

            updates = []
            params = []
            for k, v in fields_dict.items():
                updates.append(f"{k} = %s")
                params.append(v)

            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(coupon_id)

            sql = f"UPDATE coupons SET {', '.join(updates)} WHERE id = %s RETURNING *"
            cursor.execute(sql, tuple(params))
            updated_row = cursor.fetchone()
            conn.commit()

            c = dict(updated_row)
            if "discount_value" in c and c["discount_value"] is not None:
                c["discount_value"] = float(c["discount_value"])
            return {"success": True, "coupon": c}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/promotions/{coupon_id}")
def delete_admin_promotion(coupon_id: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM coupons WHERE id = %s RETURNING id", (coupon_id,))
            deleted = cursor.fetchone()
            if not deleted:
                raise HTTPException(status_code=404, detail="Cupón no encontrado.")
            conn.commit()
            return {"success": True, "message": "Cupón eliminado correctamente."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/orders")
def get_orders(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
            orders_rows = cursor.fetchall()
            
            orders = []
            for row in orders_rows:
                order_dict = dict(row)
                cursor.execute("SELECT * FROM order_items WHERE order_id = %s", (order_dict["id"],))
                order_dict["items"] = [dict(item) for item in cursor.fetchall()]
                orders.append(order_dict)
                
            return orders
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error obteniendo órdenes.")

@app.put("/api/admin/orders/{order_id}")
def update_order(order_id: int, update_data: OrderStatusUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            
            updates = []
            params = []
            if update_data.payment_status is not None:
                updates.append("payment_status = %s")
                params.append(update_data.payment_status)
            if update_data.delivery_status is not None:
                updates.append("delivery_status = %s")
                params.append(update_data.delivery_status)
                
            if not updates:
                return {"success": True, "message": "Nada que actualizar"}
                
            params.append(order_id)
            query = f"UPDATE orders SET {', '.join(updates)} WHERE id = %s"
            cursor.execute(query, tuple(params))
            if update_data.payment_status == 'Pagado':
                check_and_award_referral(cursor, order_id)
            conn.commit()
            return {"success": True, "message": "Orden actualizada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error actualizando la orden.")

@app.delete("/api/admin/orders/{order_id}")
def delete_order(order_id: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            # Eliminar items de la orden primero por FK
            cursor.execute("DELETE FROM order_items WHERE order_id = %s", (order_id,))
            # Eliminar la orden
            cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
            conn.commit()
            return {"success": True, "message": "Orden eliminada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error eliminando la orden.")

@app.post("/api/admin/orders/bulk-delete")
def bulk_delete_orders(req: BulkDeleteOrdersRequest, current_user: str = Depends(get_current_admin)):
    if not req.order_ids:
        return {"success": True, "deleted_count": 0}
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM order_items WHERE order_id = ANY(%s)", (req.order_ids,))
            cursor.execute("DELETE FROM orders WHERE id = ANY(%s)", (req.order_ids,))
            conn.commit()
            return {"success": True, "deleted_count": len(req.order_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error eliminando los pedidos seleccionados.")

# --- Admin Referrals & Ambassadors Endpoints ---
@app.get("/api/admin/referrals/summary")
def get_admin_referrals_summary(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(DISTINCT referee_customer_id) as total_referred_orders, COALESCE(SUM(amount), 0) as total_rewards_paid FROM referral_transactions WHERE transaction_type = 'reward_earned'")
            earned_row = cursor.fetchone()
            
            cursor.execute("SELECT COALESCE(SUM(ABS(amount)), 0) as total_wallet_spent FROM referral_transactions WHERE transaction_type = 'wallet_spent'")
            spent_row = cursor.fetchone()
            
            cursor.execute("SELECT COUNT(*) as total_referral_orders, COALESCE(SUM(total), 0) as total_revenue FROM orders WHERE referral_code IS NOT NULL AND payment_status = 'Pagado'")
            rev_row = cursor.fetchone()
            
            cursor.execute("""
                SELECT c.id, c.name, c.email, c.referral_code, c.wallet_balance,
                       COUNT(DISTINCT rt.id) as rewards_count,
                       COALESCE(SUM(rt.amount), 0) as total_earned
                FROM customers c
                LEFT JOIN referral_transactions rt ON rt.referrer_customer_id = c.id AND rt.transaction_type = 'reward_earned'
                WHERE c.referral_code IS NOT NULL
                GROUP BY c.id, c.name, c.email, c.referral_code, c.wallet_balance
                ORDER BY total_earned DESC, rewards_count DESC
                LIMIT 20
            """)
            top_referrers = cursor.fetchall()
            for tr in top_referrers:
                tr['wallet_balance'] = float(tr.get('wallet_balance') or 0.0)
                tr['total_earned'] = float(tr.get('total_earned') or 0.0)
                
            cursor.execute("SELECT key, value FROM system_settings WHERE key LIKE 'referral_%'")
            settings = {r['key']: r['value'] for r in cursor.fetchall()}

            return {
                "total_referred_orders": rev_row['total_referral_orders'] if rev_row else 0,
                "total_revenue": int(rev_row['total_revenue']) if rev_row else 0,
                "total_rewards_paid": float(earned_row['total_rewards_paid']) if earned_row else 0.0,
                "total_wallet_spent": float(spent_row['total_wallet_spent']) if spent_row else 0.0,
                "top_referrers": top_referrers,
                "settings": {
                    "referral_program_active": settings.get("referral_program_active", "1") == "1",
                    "referral_friend_discount_percent": int(settings.get("referral_friend_discount_percent", 15)),
                    "referral_reward_amount": int(settings.get("referral_reward_amount", 5000)),
                    "referral_min_order_amount": int(settings.get("referral_min_order_amount", 30000))
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/referrals/settings")
def update_admin_referrals_settings(payload: dict, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            for k in ["referral_program_active", "referral_friend_discount_percent", "referral_reward_amount", "referral_min_order_amount"]:
                if k in payload:
                    val = "1" if payload[k] is True else ("0" if payload[k] is False else str(payload[k]))
                    cursor.execute("""
                        INSERT INTO system_settings (key, value, updated_at)
                        VALUES (%s, %s, CURRENT_TIMESTAMP)
                        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
                    """, (k, val))
            conn.commit()
            return {"success": True, "message": "Configuración de referidos guardada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Testimonials Endpoints ---
@app.get("/api/testimonials")
def get_testimonials():
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM testimonials WHERE status = 'approved' ORDER BY id DESC")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al obtener los testimonios")

@app.post("/api/testimonials")
def create_testimonial(
    owner_name: str = Form(...),
    dog_name: str = Form(...),
    content: str = Form(...),
    rating: int = Form(...),
    image: Optional[UploadFile] = File(None)
):
    try:
        image_path = None
        if image and image.filename:
            if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
                raise HTTPException(status_code=400, detail="Formato de imagen inválido. Solo JPG, PNG o WEBP.")
                
            try:
                image_data = image.file.read()
                img = Image.open(io.BytesIO(image_data))
                
                # Crop to square and resize
                width, height = img.size
                min_dim = min(width, height)
                left = (width - min_dim) / 2
                top = (height - min_dim) / 2
                right = (width + min_dim) / 2
                bottom = (height + min_dim) / 2
                
                img = img.crop((left, top, right, bottom))
                img = img.resize((400, 400), Image.Resampling.LANCZOS)
                
                filename = f"{uuid.uuid4().hex}.webp"
                filepath = os.path.join("uploads", "testimonials", filename)
                
                img.save(filepath, format="WEBP", quality=80)
                image_path = f"/uploads/testimonials/{filename}"
            except UnidentifiedImageError:
                raise HTTPException(status_code=400, detail="El archivo subido no es una imagen válida.")
            except Exception as e:
                print("Error processing image:", e)
                raise HTTPException(status_code=500, detail="Error al procesar la imagen.")

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO testimonials (owner_name, dog_name, content, rating, status, image_path)
                VALUES (%s, %s, %s, %s, 'pending', %s)
            """, (owner_name, dog_name, content, rating, image_path))
            conn.commit()
            
            # Notificar por Telegram
            msg = f"⭐ <b>Nuevo Testimonio (Pendiente)</b> ⭐\n"
            msg += f"<b>De:</b> {owner_name} y {dog_name}\n"
            msg += f"<b>Calificación:</b> {rating} estrellas\n"
            msg += f"<b>Comentario:</b> {content}\n"
            if image_path:
                msg += f"🖼️ <b>Foto subida</b>\n"
            msg += f"👉 Revisa el panel de admin para aprobarlo."
            notify_telegram(msg)
            
            return {"success": True, "message": "Testimonio enviado para revisión"}
    except HTTPException as e:
        raise e
    except Exception as e:
        print("Error saving testimonial:", e)
        raise HTTPException(status_code=500, detail="Error al enviar el testimonio")

@app.get("/api/admin/testimonials")
def admin_get_testimonials(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM testimonials ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al obtener los testimonios")

@app.patch("/api/admin/testimonials/{t_id}/status")
def update_testimonial_status(t_id: int, update: TestimonialStatusUpdate, current_user: str = Depends(get_current_admin)):
    if update.status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE testimonials SET status = %s WHERE id = %s", (update.status, t_id))
            conn.commit()
            return {"success": True, "message": "Estado actualizado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al actualizar el estado")

@app.post("/api/admin/testimonials")
def admin_create_testimonial(data: TestimonialUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO testimonials (owner_name, dog_name, content, rating, status, image_path, diet_tag, location)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (data.owner_name, data.dog_name, data.content, data.rating, data.status, data.image_path, data.diet_tag or "🌿 Nutrición 100% Real", data.location or "Santiago, CL"))
            new_id = cursor.fetchone()["id"]
            conn.commit()
            return {"success": True, "id": new_id, "message": "Testimonio creado exitosamente"}
    except Exception as e:
        print("Error creating testimonial:", e)
        raise HTTPException(status_code=500, detail="Error creando el testimonio")

@app.put("/api/admin/testimonials/{t_id}")
def admin_update_testimonial(t_id: int, data: TestimonialUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE testimonials 
                SET owner_name = %s, dog_name = %s, content = %s, rating = %s, status = %s, image_path = %s, diet_tag = %s, location = %s
                WHERE id = %s
            """, (data.owner_name, data.dog_name, data.content, data.rating, data.status, data.image_path, data.diet_tag or "🌿 Nutrición 100% Real", data.location or "Santiago, CL", t_id))
            conn.commit()
            return {"success": True, "message": "Testimonio actualizado correctamente"}
    except Exception as e:
        print("Error updating testimonial:", e)
        raise HTTPException(status_code=500, detail="Error actualizando el testimonio")

@app.post("/api/admin/testimonials/{t_id}/upload-photo")
async def admin_upload_testimonial_photo(t_id: int, file: UploadFile = File(...), current_user: str = Depends(get_current_admin)):
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")

        MAX_UPLOAD_SIZE = 10 * 1024 * 1024
        content = await file.read(MAX_UPLOAD_SIZE + 1)
        if not content:
            raise HTTPException(status_code=400, detail="El archivo está vacío.")
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="La imagen excede el límite permitido de 10 MB.")

        Image.MAX_IMAGE_PIXELS = 30_000_000
        image = Image.open(io.BytesIO(content))
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        if image.mode != "RGB":
            image = image.convert("RGB")

        w, h = image.size
        min_dim = min(w, h)
        left = (w - min_dim) / 2
        top = (h - min_dim) / 2
        image = image.crop((left, top, left + min_dim, top + min_dim))
        image = image.resize((600, 600), Image.Resampling.LANCZOS)

        filename = f"test_{uuid.uuid4().hex[:12]}.webp"
        upload_dir = os.path.join("uploads", "testimonials")
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)

        image.save(filepath, "WEBP", quality=85, method=6, optimize=True)
        image_url = f"/uploads/testimonials/{filename}"

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE testimonials SET image_path = %s WHERE id = %s", (image_url, t_id))
            conn.commit()

        return {
            "success": True,
            "url": image_url,
            "filename": filename
        }
    except Exception as e:
        print("Error uploading testimonial photo:", e)
        raise HTTPException(status_code=500, detail="Error procesando la foto del testimonio")



@app.get("/api/admin/finance/report")
def get_finance_report(month: int, year: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            
            # Fetch all paid orders for the month
            cursor.execute("""
                SELECT id, total, shipping_cost, created_at 
                FROM orders 
                WHERE payment_status = 'Pagado' 
                  AND EXTRACT(MONTH FROM created_at) = %s 
                  AND EXTRACT(YEAR FROM created_at) = %s
            """, (month, year))
            orders_rows = cursor.fetchall()
            
            total_sales = sum(r['total'] for r in orders_rows)
            total_shipping = sum(r['shipping_cost'] for r in orders_rows)
            
            # Calculate total production cost
            # We need to sum up (product_quantity * (fixed_cost + ingredients_cost))
            cursor.execute("""
                SELECT 
                    oi.quantity, 
                    p.fixed_cost,
                    COALESCE((
                        SELECT SUM(pi.quantity * i.cost_per_unit)
                        FROM product_ingredients pi
                        JOIN ingredients i ON pi.ingredient_id = i.id
                        WHERE pi.product_id = p.id
                    ), 0) as recipe_cost
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                WHERE o.payment_status = 'Pagado'
                  AND EXTRACT(MONTH FROM o.created_at) = %s 
                  AND EXTRACT(YEAR FROM o.created_at) = %s
            """, (month, year))
            items_rows = cursor.fetchall()
            
            total_production_cost = 0
            for item in items_rows:
                qty = item['quantity']
                fixed = item['fixed_cost'] or 0
                recipe = item['recipe_cost'] or 0
                total_production_cost += qty * (fixed + recipe)
                
            return {
                "total_sales": total_sales,
                "total_shipping": total_shipping,
                "total_production_cost": total_production_cost,
                "net_profit": (total_sales - total_shipping) - total_production_cost,
                "orders_count": len(orders_rows)
            }
    except Exception as e:
        print(f"Error generating finance report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/products/{product_id}/nutrition")
def get_product_nutrition(product_id: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            
            # Fetch the recipe
            cursor.execute("""
                SELECT 
                    pi.quantity,
                    i.name,
                    i.unit,
                    i.kcal_per_100g,
                    i.protein_g,
                    i.fat_g,
                    i.fiber_g,
                    i.moisture_g,
                    i.ash_g,
                    i.carbs_g
                FROM product_ingredients pi
                JOIN ingredients i ON pi.ingredient_id = i.id
                WHERE pi.product_id = %s
            """, (product_id,))
            
            items = cursor.fetchall()
            
            total_weight_g = 0
            totals = {
                "kcal": 0, "protein": 0, "fat": 0, "fiber": 0, "moisture": 0, "ash": 0, "carbs": 0
            }
            
            for item in items:
                # Convert quantity to grams based on unit
                qty_in_g = 0
                if item["unit"] == "kg" or item["unit"] == "litro":
                    qty_in_g = item["quantity"] * 1000
                elif item["unit"] == "g" or item["unit"] == "ml":
                    qty_in_g = item["quantity"]
                else:
                    # Fallback for 'unidad' or unknown
                    qty_in_g = item["quantity"] * 100 # Wild guess, but better to avoid 'unidad' for nutrition
                    
                total_weight_g += qty_in_g
                
                # multiplier based on per 100g
                mult = qty_in_g / 100.0
                
                totals["kcal"] += (item["kcal_per_100g"] or 0) * mult
                totals["protein"] += (item["protein_g"] or 0) * mult
                totals["fat"] += (item["fat_g"] or 0) * mult
                totals["fiber"] += (item["fiber_g"] or 0) * mult
                totals["moisture"] += (item["moisture_g"] or 0) * mult
                totals["ash"] += (item["ash_g"] or 0) * mult
                totals["carbs"] += (item["carbs_g"] or 0) * mult
                
            # If total_weight_g is 0, return 0s to avoid division by zero
            if total_weight_g == 0:
                return {
                    "total_weight_g": 0,
                    "totals": totals,
                    "per_100g": totals
                }
                
            # Calculate per 100g of the FINAL product
            per_100g_mult = 100.0 / total_weight_g
            per_100g = {
                "kcal": totals["kcal"] * per_100g_mult,
                "protein": totals["protein"] * per_100g_mult,
                "fat": totals["fat"] * per_100g_mult,
                "fiber": totals["fiber"] * per_100g_mult,
                "moisture": totals["moisture"] * per_100g_mult,
                "ash": totals["ash"] * per_100g_mult,
                "carbs": totals["carbs"] * per_100g_mult,
            }
            
            return {
                "total_weight_g": total_weight_g,
                "totals": totals,
                "per_100g": per_100g
            }
            
    except Exception as e:
        print(f"Error calculating nutrition: {e}")
        raise HTTPException(status_code=500, detail="Error calculando nutricion")

# --- Serve Frontend con Pre-renderizado SEO (FastAPI & Googlebot / Redes Sociales) ---
dist_path = os.path.join(os.path.dirname(__file__), "..", "dist")
if os.path.isdir(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # 1. Servir archivo estático exacto si existe en /dist
        file_path = os.path.join(dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        index_file = os.path.join(dist_path, "index.html")
        if not os.path.isfile(index_file):
            return HTMLResponse("<h1>Sitio en mantenimiento</h1>", status_code=503)

        # 2. Inyección SEO dinámica para Googlebot / Redes Sociales en artículos de blog
        clean_path = full_path.strip("/")
        if clean_path.startswith("blog/") or clean_path == "blog":
            parts = clean_path.split("/")
            if len(parts) >= 2 and parts[1]:
                slug = parts[1].strip()
                try:
                    with get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            SELECT id, slug, title, excerpt, content, image, created_at 
                            FROM blog_posts 
                            WHERE slug = %s AND active = 1
                        """, (slug,))
                        post = cursor.fetchone()
                    
                    if post:
                        with open(index_file, "r", encoding="utf-8") as f:
                            html_content = f.read()

                        # Sanitizar datos para inyección HTML
                        post_title = html.escape(post['title'])
                        post_excerpt = html.escape(post['excerpt'] or "")
                        post_image = post['image'] or "https://origencanino.cl/logo.webp"
                        if not post_image.startswith("http"):
                            post_image = f"https://origencanino.cl{post_image}"
                        post_url = f"https://origencanino.cl/blog/{slug}"
                        
                        created_iso = post['created_at'].isoformat() if isinstance(post.get('created_at'), datetime) else str(post.get('created_at', ''))

                        # Structured Data (Schema.org BlogPosting)
                        schema_ld = {
                            "@context": "https://schema.org",
                            "@type": "BlogPosting",
                            "headline": post['title'],
                            "description": post['excerpt'],
                            "image": post_image,
                            "url": post_url,
                            "datePublished": created_iso,
                            "author": {
                                "@type": "Organization",
                                "name": "Origen Canino",
                                "url": "https://origencanino.cl"
                            },
                            "publisher": {
                                "@type": "Organization",
                                "name": "Origen Canino",
                                "logo": {
                                    "@type": "ImageObject",
                                    "url": "https://origencanino.cl/logo.webp"
                                }
                            }
                        }
                        schema_script = f'<script type="application/ld+json">{json.dumps(schema_ld, ensure_ascii=False)}</script>'

                        # Payload pre-cargado para hidratación instantánea de React (cero loading, cero error 404)
                        post_dict = {
                            "id": post["id"],
                            "slug": post["slug"],
                            "title": post["title"],
                            "excerpt": post["excerpt"],
                            "content": post["content"],
                            "image": post["image"],
                            "created_at": created_iso
                        }
                        payload_script = f'<script id="server-blog-post" type="application/json">{json.dumps(post_dict, ensure_ascii=False)}</script>'

                        # Reemplazar título
                        html_content = re.sub(r"<title>.*?</title>", f"<title>{post_title} | Origen Canino Blog</title>", html_content, flags=re.I)
                        
                        # Inyectar Meta Tags en <head>
                        seo_tags = (
                            f'\n    <meta name="description" content="{post_excerpt}">'
                            f'\n    <link rel="canonical" href="{post_url}">'
                            f'\n    <meta property="og:type" content="article">'
                            f'\n    <meta property="og:title" content="{post_title} | Origen Canino">'
                            f'\n    <meta property="og:description" content="{post_excerpt}">'
                            f'\n    <meta property="og:image" content="{post_image}">'
                            f'\n    <meta property="og:url" content="{post_url}">'
                            f'\n    <meta name="twitter:card" content="summary_large_image">'
                            f'\n    <meta name="twitter:title" content="{post_title} | Origen Canino">'
                            f'\n    <meta name="twitter:description" content="{post_excerpt}">'
                            f'\n    <meta name="twitter:image" content="{post_image}">'
                            f'\n    {schema_script}'
                            f'\n    {payload_script}\n  </head>'
                        )
                        html_content = html_content.replace("</head>", seo_tags, 1)

                        # Inyectar contenido en el fallback de <div id="root"> para que Googlebot indexe el texto inmediatamente sin esperar JS
                        pre_rendered_body = (
                            f'<div id="root">'
                            f'<article style="max-width:800px;margin:40px auto;padding:20px;font-family:sans-serif;" data-pre-rendered="true">'
                            f'<h1>{post_title}</h1>'
                            f'<p style="font-weight:bold;color:#555;">{post_excerpt}</p>'
                            f'<img src="{post_image}" alt="{post_title}" style="max-width:100%;height:auto;border-radius:12px;" />'
                            f'<div style="white-space:pre-wrap;line-height:1.7;margin-top:20px;">{html.escape(post["content"])}</div>'
                            f'</article>'
                            f'</div>'
                        )
                        html_content = html_content.replace('<div id="root"></div>', pre_rendered_body, 1)

                        return HTMLResponse(content=html_content, status_code=200)
                except Exception as err:
                    print(f"Error pre-renderizando blog {slug}: {err}")

        # Fallback a index.html estándar (SPA routing)
        return FileResponse(index_file)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
