"""Lógica de negocio para Lotes Semanales (Batches), Stock FIFO, Nutrición, Demanda y Links de Pago Directo."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

CHILE_TZ = ZoneInfo("America/Santiago")
MIN_SELLABLE_CLP = 30000


def chile_now() -> datetime:
    """Retorna la fecha y hora actual en zona horaria de Chile (America/Santiago)."""
    return datetime.now(CHILE_TZ)


def chile_today() -> date:
    """Retorna la fecha local de hoy en Chile."""
    return chile_now().date()


def chile_iso_week(d: Optional[date] = None) -> str:
    """Retorna la semana ISO en formato YYYY-Www según fecha de Chile."""
    target = d or chile_today()
    iso_year, iso_week, _ = target.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def parse_weight_grams(weight_str: Optional[str]) -> int:
    """Convierte cadenas como '1 Kg', '500g', '2.5 kg' a gramos enteros."""
    if not weight_str:
        return 1000
    text = str(weight_str).strip().lower().replace(",", ".")
    match = re.search(r"(\d+(?:\.\d+)?)\s*(kg|k|g|gr|grs)?", text)
    if not match:
        return 1000
    value = float(match.group(1))
    unit = match.group(2) or ""
    if unit.startswith("k"):
        return max(1, int(round(value * 1000)))
    if unit.startswith("g"):
        return max(1, int(round(value)))
    # Sin unidad explícita: valores pequeños suelen ser kg (ej. 1, 2)
    return max(1, int(round(value * 1000))) if value <= 20 else max(1, int(round(value)))


def calculate_expiry_date(fecha_elab: date, linea_produccion: str) -> date:
    """Calcula la fecha de consumo preferente según línea (BARF: 180 días, COCIDO: 120 días)."""
    linea = (linea_produccion or "BARF").strip().upper()
    days = 120 if linea == "COCIDO" else 180
    return fecha_elab + timedelta(days=days)


def generate_batch_code(cursor, fecha_elab: date) -> str:
    """Genera un código de lote único semanal tipo OC-2026-S46-B01."""
    iso_year, iso_week, _ = fecha_elab.isocalendar()
    semana = f"{iso_year}-W{iso_week:02d}"
    prefix = f"OC-{iso_year}-S{iso_week:02d}-B"
    cursor.execute(
        "SELECT codigo_lote FROM batch_produccion WHERE semana_fabricacion = %s ORDER BY id DESC",
        (semana,),
    )
    rows = cursor.fetchall()
    max_seq = 0
    for r in rows:
        code = r["codigo_lote"] if isinstance(r, dict) else r[0]
        m = re.search(r"-B(\d+)$", str(code))
        if m:
            max_seq = max(max_seq, int(m.group(1)))
    return f"{prefix}{max_seq + 1:02d}"


def compute_batch_nutrition_and_cost(
    cursor,
    ingredients_payload: List[Dict[str, Any]],
    peso_crudo_total_gramos: int,
    stock_inicial_gramos: int,
    extra_cost_clp: int = 0,
) -> Tuple[List[Dict[str, Any]], Dict[str, float], int]:
    """Calcula snapshot de ingredientes, perfil nutricional por 100g y costo total del batch."""
    ing_ids = [item["ingrediente_id"] for item in ingredients_payload if item.get("ingrediente_id")]
    db_ing_map: Dict[int, Dict[str, Any]] = {}
    if ing_ids:
        cursor.execute(
            """
            SELECT id, name, cost_per_unit, unit,
                   COALESCE(kcal_per_100g, 0) AS kcal_per_100g,
                   COALESCE(protein_g, 0) AS protein_g,
                   COALESCE(fat_g, 0) AS fat_g,
                   COALESCE(fiber_g, 0) AS fiber_g,
                   COALESCE(moisture_g, 0) AS moisture_g,
                   COALESCE(ash_g, 0) AS ash_g,
                   COALESCE(carbs_g, 0) AS carbs_g,
                   COALESCE(calcium_g, 0) AS calcium_g,
                   COALESCE(phosphorus_g, 0) AS phosphorus_g
            FROM ingredients
            WHERE id = ANY(%s)
            """,
            (ing_ids,),
        )
        for row in cursor.fetchall():
            db_ing_map[row["id"]] = dict(row)

    total_grams = sum(float(i.get("cantidad_gramos") or 0) for i in ingredients_payload)
    if total_grams <= 0:
        total_grams = float(peso_crudo_total_gramos or stock_inicial_gramos or 1)

    snapshot_items: List[Dict[str, Any]] = []
    totals = {
        "proteina_pct": 0.0,
        "grasa_pct": 0.0,
        "fibra_pct": 0.0,
        "humedad_pct": 0.0,
        "cenizas_pct": 0.0,
        "carbohidratos_pct": 0.0,
        "kcal_100g": 0.0,
        "calcio_pct": 0.0,
        "fosforo_pct": 0.0,
    }
    ingredients_cost_clp = 0.0

    for item in ingredients_payload:
        ing_id = item.get("ingrediente_id")
        db_ing = db_ing_map.get(ing_id, {})
        qty_g = float(item.get("cantidad_gramos") or 0)
        pct = float(item.get("porcentaje_formula") or 0)
        if pct <= 0 and total_grams > 0:
            pct = round((qty_g / total_grams) * 100.0, 2)
        unit_cost = int(item.get("costo_unitario_clp") if item.get("costo_unitario_clp") is not None else db_ing.get("cost_per_unit", 0))
        unit = str(db_ing.get("unit") or "kg").lower()
        if unit in ("kg", "litro", "l"):
            ingredients_cost_clp += (qty_g / 1000.0) * unit_cost
        else:
            ingredients_cost_clp += (qty_g / 1000.0) * unit_cost

        weight_ratio = pct / 100.0
        totals["proteina_pct"] += float(db_ing.get("protein_g", 0)) * weight_ratio
        totals["grasa_pct"] += float(db_ing.get("fat_g", 0)) * weight_ratio
        totals["fibra_pct"] += float(db_ing.get("fiber_g", 0)) * weight_ratio
        totals["humedad_pct"] += float(db_ing.get("moisture_g", 0)) * weight_ratio
        totals["cenizas_pct"] += float(db_ing.get("ash_g", 0)) * weight_ratio
        totals["carbohidratos_pct"] += float(db_ing.get("carbs_g", 0)) * weight_ratio
        totals["kcal_100g"] += float(db_ing.get("kcal_per_100g", 0)) * weight_ratio
        totals["calcio_pct"] += float(db_ing.get("calcium_g", 0)) * weight_ratio
        totals["fosforo_pct"] += float(db_ing.get("phosphorus_g", 0)) * weight_ratio

        snapshot_items.append({
            "ingrediente_id": ing_id,
            "nombre_ingrediente": item.get("nombre_ingrediente") or db_ing.get("name") or "Ingrediente",
            "cantidad_gramos": round(qty_g, 2),
            "porcentaje_formula": round(pct, 2),
            "costo_unitario_clp": unit_cost,
        })

    # Ajuste por concentración de cocción si hubo merma real (peso_crudo > stock_inicial)
    concentration = 1.0
    if peso_crudo_total_gramos > 0 and stock_inicial_gramos > 0 and peso_crudo_total_gramos > stock_inicial_gramos:
        concentration = min(1.45, peso_crudo_total_gramos / float(stock_inicial_gramos))

    nutrition = {k: round(v * (1.0 if k == "humedad_pct" else concentration), 2) for k, v in totals.items()}
    if concentration > 1.0 and nutrition["humedad_pct"] > 0:
        # La evaporación reduce humedad proporcionalmente
        water_loss_pct = (1.0 - (1.0 / concentration)) * 100.0
        nutrition["humedad_pct"] = round(max(10.0, nutrition["humedad_pct"] - water_loss_pct * 0.5), 2)

    total_cost_clp = int(round(ingredients_cost_clp)) + int(extra_cost_clp or 0)
    return snapshot_items, nutrition, total_cost_clp


def get_products_live_stock(cursor) -> Dict[int, Dict[str, Any]]:
    """Retorna por producto_id si usa batches y su stock disponible vivo en gramos."""
    cursor.execute(
        """
        SELECT producto_id,
               COUNT(*) AS total_batches,
               COALESCE(SUM(CASE WHEN estado = 'ACTIVO' THEN stock_disponible_gramos ELSE 0 END), 0) AS live_grams
        FROM batch_produccion
        GROUP BY producto_id
        """
    )
    stock_map: Dict[int, Dict[str, Any]] = {}
    for row in cursor.fetchall():
        stock_map[int(row["producto_id"])] = {
            "has_batches": int(row["total_batches"]) > 0,
            "stock_disponible_gramos": int(row["live_grams"]),
        }
    return stock_map


def validate_cart_stock(cursor, items: List[Any]) -> None:
    """Valida que cada ítem del carrito no supere el stock disponible en lotes activos."""
    if not items:
        return
    product_ids = list({int(getattr(i, "id", None) or i["id"]) for i in items})
    cursor.execute("SELECT id, name, weight FROM products WHERE id = ANY(%s)", (product_ids,))
    prod_rows = {int(r["id"]): r for r in cursor.fetchall()}
    stock_map = get_products_live_stock(cursor)

    requested_by_product: Dict[int, int] = {}
    for item in items:
        pid = int(getattr(item, "id", None) or item["id"])
        qty = int(getattr(item, "quantity", None) or item["quantity"])
        prod = prod_rows.get(pid)
        unit_grams = parse_weight_grams(prod["weight"] if prod else getattr(item, "weight", "1 Kg"))
        requested_by_product[pid] = requested_by_product.get(pid, 0) + (unit_grams * qty)

    for pid, needed_grams in requested_by_product.items():
        info = stock_map.get(pid)
        if not info or not info["has_batches"]:
            continue
        available = info["stock_disponible_gramos"]
        if needed_grams > available:
            pname = prod_rows.get(pid, {}).get("name", f"Producto #{pid}")
            if available <= 0:
                raise ValueError(f"'{pname}' tiene su lote semanal agotado por frescura. Pronto tendremos nuevo lote disponible.")
            raise ValueError(
                f"Stock insuficiente para '{pname}': solicitaste {needed_grams / 1000:.2f} kg y quedan {available / 1000:.2f} kg del lote semanal."
            )


def deduct_fifo_for_order(cursor, order_id: int) -> Dict[str, Any]:
    """Descuenta stock FIFO multi-lote usando bloqueo SELECT ... FOR UPDATE (idempotente)."""
    cursor.execute("SELECT id, COALESCE(fifo_deducted, 0) AS fifo_deducted FROM orders WHERE id = %s FOR UPDATE", (order_id,))
    ord_row = cursor.fetchone()
    if not ord_row:
        return {"deducted": False, "reason": "order_not_found", "allocations": []}
    if int(ord_row["fifo_deducted"]) == 1:
        return {"deducted": False, "reason": "already_deducted", "allocations": []}

    cursor.execute(
        """
        SELECT oi.id AS order_item_id, oi.product_id, oi.product_name, oi.quantity, p.weight
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = %s
        ORDER BY oi.id ASC
        """,
        (order_id,),
    )
    items = cursor.fetchall()
    allocations: List[Dict[str, Any]] = []
    shortfalls: List[Dict[str, Any]] = []

    for item in items:
        pid = int(item["product_id"])
        unit_grams = parse_weight_grams(item.get("weight"))
        remaining = unit_grams * int(item["quantity"])

        cursor.execute(
            """
            SELECT id, codigo_lote, stock_disponible_gramos
            FROM batch_produccion
            WHERE producto_id = %s AND estado = 'ACTIVO' AND stock_disponible_gramos > 0
            ORDER BY fecha_elaboracion ASC, id ASC
            FOR UPDATE
            """,
            (pid,),
        )
        batches = cursor.fetchall()
        for b in batches:
            if remaining <= 0:
                break
            avail = int(b["stock_disponible_gramos"])
            take = min(remaining, avail)
            new_avail = avail - take
            new_estado = "AGOTADO" if new_avail == 0 else "ACTIVO"
            cursor.execute(
                "UPDATE batch_produccion SET stock_disponible_gramos = %s, estado = %s WHERE id = %s",
                (new_avail, new_estado, b["id"]),
            )
            cursor.execute(
                """
                INSERT INTO pedido_detalle_batches (order_id, order_item_id, batch_id, codigo_lote, gramos_descontados)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (order_id, item["order_item_id"], b["id"], b["codigo_lote"], take),
            )
            allocations.append({
                "order_item_id": item["order_item_id"],
                "product_id": pid,
                "batch_id": b["id"],
                "codigo_lote": b["codigo_lote"],
                "gramos_descontados": take,
            })
            remaining -= take

        if remaining > 0 and batches:
            shortfalls.append({"product_id": pid, "product_name": item["product_name"], "missing_grams": remaining})

    cursor.execute("UPDATE orders SET fifo_deducted = 1 WHERE id = %s", (order_id,))
    return {"deducted": True, "allocations": allocations, "shortfalls": shortfalls}


def restore_fifo_for_order(cursor, order_id: int) -> int:
    """Reintegra al mismo batch_id los gramos descontados si un pedido se anula antes de despacho."""
    cursor.execute("SELECT COALESCE(fifo_deducted, 0) AS fifo_deducted FROM orders WHERE id = %s FOR UPDATE", (order_id,))
    ord_row = cursor.fetchone()
    if not ord_row or int(ord_row["fifo_deducted"]) != 1:
        return 0

    cursor.execute(
        "SELECT batch_id, gramos_descontados FROM pedido_detalle_batches WHERE order_id = %s",
        (order_id,),
    )
    rows = cursor.fetchall()
    restored_grams = 0
    for r in rows:
        grams = int(r["gramos_descontados"])
        cursor.execute(
            """
            UPDATE batch_produccion
            SET stock_disponible_gramos = stock_disponible_gramos + %s,
                estado = CASE WHEN estado = 'AGOTADO' THEN 'ACTIVO' ELSE estado END
            WHERE id = %s
            """,
            (grams, r["batch_id"]),
        )
        restored_grams += grams

    cursor.execute("DELETE FROM pedido_detalle_batches WHERE order_id = %s", (order_id,))
    cursor.execute("UPDATE orders SET fifo_deducted = 0 WHERE id = %s", (order_id,))
    return restored_grams


def _estimate_daily_ration_grams(weight_kg: float, age_stage: Optional[str]) -> float:
    """Estima ración diaria en gramos según peso y etapa de vida si no hay dato explícito."""
    if not weight_kg or weight_kg <= 0:
        return 300.0
    stage = (age_stage or "adulto").lower()
    factor = 0.04 if "cachorro" in stage else (0.02 if "senior" in stage else 0.025)
    return round(weight_kg * 1000.0 * factor, 1)


def build_demand_and_alerts(cursor) -> Dict[str, Any]:
    """Construye alertas de stock < $30.000 CLP, vencimientos, proyección de recompra y explosión BOM."""
    today = chile_today()

    # 1. Alerta stock mínimo vendible ($30.000 CLP) por producto
    cursor.execute("SELECT id, name, type, price, weight FROM products WHERE active = 1 ORDER BY id ASC")
    products = cursor.fetchall()
    stock_map = get_products_live_stock(cursor)

    low_stock_alerts: List[Dict[str, Any]] = []
    for p in products:
        pid = int(p["id"])
        s_info = stock_map.get(pid, {"has_batches": False, "stock_disponible_gramos": 0})
        unit_g = parse_weight_grams(p["weight"])
        unit_kg = unit_g / 1000.0
        price_per_kg = (int(p["price"]) / unit_kg) if unit_kg > 0 else int(p["price"])
        stock_kg = s_info["stock_disponible_gramos"] / 1000.0
        stock_value_clp = int(round(stock_kg * price_per_kg))
        if s_info["has_batches"] and stock_value_clp < MIN_SELLABLE_CLP:
            low_stock_alerts.append({
                "producto_id": pid,
                "producto_nombre": p["name"],
                "stock_disponible_kg": round(stock_kg, 2),
                "stock_disponible_gramos": s_info["stock_disponible_gramos"],
                "valor_stock_clp": stock_value_clp,
                "umbral_clp": MIN_SELLABLE_CLP,
                "estado": "AGOTADO" if s_info["stock_disponible_gramos"] < unit_g else "BAJO_UMBRAL",
            })

    # 2. Alerta temprana de vencimiento
    cursor.execute(
        """
        SELECT bp.id, bp.codigo_lote, bp.producto_id, p.name AS producto_nombre,
               bp.fecha_elaboracion, bp.fecha_consumo_preferente, bp.stock_disponible_gramos
        FROM batch_produccion bp
        JOIN products p ON p.id = bp.producto_id
        WHERE bp.estado = 'ACTIVO' AND bp.stock_disponible_gramos > 0
          AND bp.fecha_consumo_preferente <= %s
        ORDER BY bp.fecha_consumo_preferente ASC
        """,
        (today + timedelta(days=14),),
    )
    expiry_alerts = []
    for r in cursor.fetchall():
        days_left = (r["fecha_consumo_preferente"] - today).days
        expiry_alerts.append({
            "batch_id": r["id"],
            "codigo_lote": r["codigo_lote"],
            "producto_nombre": r["producto_nombre"],
            "fecha_consumo_preferente": r["fecha_consumo_preferente"].isoformat(),
            "dias_restantes": days_left,
            "stock_disponible_kg": round(r["stock_disponible_gramos"] / 1000.0, 2),
            "nivel": "critico" if days_left <= 7 else "advertencia",
        })

    # 3. Proyección de recompra por cliente y radar de deserción
    cursor.execute(
        """
        SELECT o.id AS order_id, o.customer_id, o.customer_name, o.customer_phone, o.customer_email,
               o.dog_name, o.dog_weight, o.dog_age,
               COALESCE(o.delivered_at, o.created_at) AS base_date
        FROM orders o
        WHERE (o.payment_status = 'Pagado' OR o.delivery_status = 'Entregado')
          AND o.delivery_status NOT IN ('Anulado', 'Cancelado')
        ORDER BY COALESCE(o.delivered_at, o.created_at) DESC
        """
    )
    all_paid_orders = cursor.fetchall()
    latest_by_customer: Dict[str, Dict[str, Any]] = {}
    for o in all_paid_orders:
        key = str(o["customer_id"] or o["customer_email"] or o["customer_phone"]).lower()
        if key not in latest_by_customer:
            latest_by_customer[key] = dict(o)

    order_ids = [o["order_id"] for o in latest_by_customer.values()]
    items_by_order: Dict[int, List[Dict[str, Any]]] = {}
    if order_ids:
        cursor.execute(
            """
            SELECT oi.order_id, oi.product_id, oi.product_name, oi.quantity, p.weight
            FROM order_items oi
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ANY(%s)
            """,
            (order_ids,),
        )
        for it in cursor.fetchall():
            items_by_order.setdefault(int(it["order_id"]), []).append(dict(it))

    dogs_by_customer: Dict[int, List[Dict[str, Any]]] = {}
    cust_ids = [int(o["customer_id"]) for o in latest_by_customer.values() if o.get("customer_id")]
    if cust_ids:
        cursor.execute("SELECT customer_id, name, weight, age_stage FROM customer_dogs WHERE customer_id = ANY(%s)", (cust_ids,))
        for d in cursor.fetchall():
            dogs_by_customer.setdefault(int(d["customer_id"]), []).append(dict(d))

    upcoming_reorders: List[Dict[str, Any]] = []
    churn_radar: List[Dict[str, Any]] = []
    projected_grams_by_product: Dict[int, int] = {}

    for o in latest_by_customer.values():
        oid = int(o["order_id"])
        o_items = items_by_order.get(oid, [])
        total_grams = sum(parse_weight_grams(it.get("weight")) * int(it["quantity"]) for it in o_items)
        if total_grams <= 0:
            continue

        cid = o.get("customer_id")
        dogs = dogs_by_customer.get(int(cid), []) if cid else []
        if dogs:
            daily_ration = sum(_estimate_daily_ration_grams(float(d["weight"]), d.get("age_stage")) for d in dogs)
            dog_label = ", ".join(d["name"] for d in dogs)
        else:
            daily_ration = _estimate_daily_ration_grams(float(o.get("dog_weight") or 12), o.get("dog_age"))
            dog_label = o.get("dog_name") or "Mascota"

        autonomy_days = max(1, int(round(total_grams / max(50.0, daily_ration))))
        base_dt = o["base_date"]
        base_date = base_dt.date() if isinstance(base_dt, datetime) else base_dt
        reorder_date = base_date + timedelta(days=max(1, autonomy_days - 4))
        days_until = (reorder_date - today).days

        entry = {
            "order_id": oid,
            "customer_name": o["customer_name"],
            "customer_phone": o["customer_phone"],
            "dog_name": dog_label,
            "racion_diaria_g": round(daily_ration, 0),
            "ultimo_pedido_kg": round(total_grams / 1000.0, 2),
            "dias_autonomia": autonomy_days,
            "fecha_recompra_estimada": reorder_date.isoformat(),
            "dias_restantes": days_until,
        }

        if -5 <= days_until <= 7:
            upcoming_reorders.append(entry)
            for it in o_items:
                pid = int(it["product_id"])
                projected_grams_by_product[pid] = projected_grams_by_product.get(pid, 0) + (
                    parse_weight_grams(it.get("weight")) * int(it["quantity"])
                )
        elif days_until < -5:
            churn_radar.append(entry)

    upcoming_reorders.sort(key=lambda x: x["dias_restantes"])
    churn_radar.sort(key=lambda x: x["dias_restantes"])

    # 4. Sugerencia consolidada de producción + Explosión BOM de compras
    prod_lookup = {int(p["id"]): p for p in products}
    production_suggestions = []
    for pid, g in projected_grams_by_product.items():
        p = prod_lookup.get(pid)
        if not p:
            continue
        cur_g = stock_map.get(pid, {}).get("stock_disponible_gramos", 0)
        net_to_produce_g = max(0, g - cur_g)
        if net_to_produce_g > 0:
            production_suggestions.append({
                "producto_id": pid,
                "producto_nombre": p["name"],
                "demanda_proyectada_kg": round(g / 1000.0, 2),
                "stock_actual_kg": round(cur_g / 1000.0, 2),
                "kg_sugeridos_producir": round(net_to_produce_g / 1000.0, 2),
            })

    bom_shopping_list: List[Dict[str, Any]] = []
    if production_suggestions:
        sug_pids = [s["producto_id"] for s in production_suggestions]
        cursor.execute(
            """
            SELECT pi.product_id, pi.ingredient_id, pi.percentage, i.name, i.cost_per_unit, i.unit
            FROM product_ingredients pi
            JOIN ingredients i ON i.id = pi.ingredient_id
            WHERE pi.product_id = ANY(%s)
            """,
            (sug_pids,),
        )
        ing_agg: Dict[int, Dict[str, Any]] = {}
        sug_kg_map = {s["producto_id"]: s["kg_sugeridos_producir"] for s in production_suggestions}
        for r in cursor.fetchall():
            pid = int(r["product_id"])
            iid = int(r["ingredient_id"])
            kg_needed = sug_kg_map.get(pid, 0) * (float(r["percentage"]) / 100.0)
            if iid not in ing_agg:
                ing_agg[iid] = {
                    "ingrediente_id": iid,
                    "nombre": r["name"],
                    "unit": r["unit"],
                    "cost_per_unit": int(r["cost_per_unit"]),
                    "cantidad_kg": 0.0,
                }
            ing_agg[iid]["cantidad_kg"] += kg_needed

        for item in ing_agg.values():
            qty_kg = round(item["cantidad_kg"], 2)
            bom_shopping_list.append({
                **item,
                "cantidad_kg": qty_kg,
                "presupuesto_estimado_clp": int(round(qty_kg * item["cost_per_unit"])),
            })
        bom_shopping_list.sort(key=lambda x: x["cantidad_kg"], reverse=True)

    return {
        "generated_at": chile_now().isoformat(),
        "low_stock_alerts": low_stock_alerts,
        "expiry_alerts": expiry_alerts,
        "upcoming_reorders": upcoming_reorders,
        "churn_radar": churn_radar,
        "production_suggestions": production_suggestions,
        "bom_shopping_list": bom_shopping_list,
    }

