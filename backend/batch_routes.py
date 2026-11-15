"""Endpoints FastAPI para Lotes Semanales (Batches), Trazabilidad FIFO, Demanda y Links de Pago Directo."""

from __future__ import annotations

import json
import os
import secrets
import urllib.request
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from server_db import get_connection
import batch_service


class BatchIngredientInput(BaseModel):
    ingrediente_id: Optional[int] = None
    nombre_ingrediente: str
    cantidad_gramos: float
    porcentaje_formula: float
    costo_unitario_clp: Optional[int] = None


class BatchCreateRequest(BaseModel):
    producto_id: int
    linea_produccion: str = "BARF"
    fecha_elaboracion: Optional[str] = None
    fecha_consumo_preferente: Optional[str] = None
    peso_crudo_total_gramos: int = 0
    stock_inicial_gramos: int
    extra_cost_clp: int = 0
    indirect_costs: Optional[Dict[str, int]] = None
    kitchen_cost_id: Optional[int] = None
    notas: Optional[str] = None
    ingredientes: List[BatchIngredientInput]


class BatchStatusUpdate(BaseModel):
    estado: str
    notas: Optional[str] = None


class WaitlistCreate(BaseModel):
    producto_id: int
    customer_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None


class DirectLinkItemInput(BaseModel):
    product_id: int
    quantity: int


class DirectPaymentLinkCreate(BaseModel):
    mode: str = "assisted_cart"  # 'assisted_cart' | 'post_delivery_order'
    order_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = "Por confirmar"
    customer_city: Optional[str] = "Santiago"
    items: List[DirectLinkItemInput] = []
    notes: Optional[str] = None
    mark_delivered_now: bool = False


class DirectLinkTransferSubmit(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    transfer_bank: str
    transfer_receipt_number: str
    transfer_receipt_url: str


def create_batch_router(get_current_admin) -> APIRouter:
    router = APIRouter()

    @router.get("/api/admin/batches")
    def list_batches(
        producto_id: Optional[int] = Query(None),
        estado: Optional[str] = Query(None),
        current_user: str = Depends(get_current_admin),
    ):
        with get_connection() as conn:
            cursor = conn.cursor()
            clauses = []
            params: List[Any] = []
            if producto_id is not None:
                clauses.append("bp.producto_id = %s")
                params.append(producto_id)
            if estado:
                clauses.append("bp.estado = %s")
                params.append(estado.upper())
            where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            cursor.execute(
                f"""
                SELECT bp.*, p.name AS producto_nombre, p.weight AS producto_weight, p.price AS producto_price,
                       bn.proteina_pct, bn.grasa_pct, bn.fibra_pct, bn.humedad_pct,
                       bn.cenizas_pct, bn.carbohidratos_pct, bn.calcio_pct, bn.fosforo_pct, bn.kcal_100g
                FROM batch_produccion bp
                JOIN products p ON p.id = bp.producto_id
                LEFT JOIN batch_nutricion bn ON bn.batch_id = bp.id
                {where_sql}
                ORDER BY bp.fecha_elaboracion DESC, bp.id DESC
                """,
                tuple(params),
            )
            batches = [dict(r) for r in cursor.fetchall()]
            batch_ids = [b["id"] for b in batches]
            ing_by_batch: Dict[int, List[Dict[str, Any]]] = {}
            if batch_ids:
                cursor.execute(
                    "SELECT * FROM batch_ingredientes WHERE batch_id = ANY(%s) ORDER BY porcentaje_formula DESC, id ASC",
                    (batch_ids,),
                )
                for ing in cursor.fetchall():
                    ing_by_batch.setdefault(int(ing["batch_id"]), []).append(dict(ing))

            for b in batches:
                b["ingredientes"] = ing_by_batch.get(int(b["id"]), [])
                if b.get("fecha_elaboracion"):
                    b["fecha_elaboracion"] = b["fecha_elaboracion"].isoformat()
                if b.get("fecha_consumo_preferente"):
                    b["fecha_consumo_preferente"] = b["fecha_consumo_preferente"].isoformat()
                if b.get("created_at"):
                    b["created_at"] = b["created_at"].isoformat()
                raw_g = int(b.get("peso_crudo_total_gramos") or 0)
                init_g = int(b.get("stock_inicial_gramos") or 0)
                b["merma_pct"] = round(((raw_g - init_g) / raw_g) * 100.0, 1) if raw_g > init_g and raw_g > 0 else 0.0
            return batches

    @router.post("/api/admin/batches")
    def create_batch(payload: BatchCreateRequest, current_user: str = Depends(get_current_admin)):
        if payload.stock_inicial_gramos <= 0:
            raise HTTPException(status_code=400, detail="El stock inicial envasado debe ser mayor a 0 gramos.")
        if not payload.ingredientes:
            raise HTTPException(status_code=400, detail="Debe incluir al menos un ingrediente en el lote.")

        pct_sum = sum(float(i.porcentaje_formula) for i in payload.ingredientes)
        if abs(pct_sum - 100.0) > 1.5:
            raise HTTPException(
                status_code=400,
                detail=f"La suma de porcentajes de la fórmula debe ser 100% (actual: {pct_sum:.1f}%).",
            )

        fecha_elab = (
            date.fromisoformat(payload.fecha_elaboracion)
            if payload.fecha_elaboracion
            else batch_service.chile_today()
        )
        fecha_exp = (
            date.fromisoformat(payload.fecha_consumo_preferente)
            if payload.fecha_consumo_preferente
            else batch_service.calculate_expiry_date(fecha_elab, payload.linea_produccion)
        )
        semana = batch_service.chile_iso_week(fecha_elab)

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, price, weight FROM products WHERE id = %s", (payload.producto_id,))
            prod = cursor.fetchone()
            if not prod:
                raise HTTPException(status_code=404, detail="Producto no encontrado.")

            codigo_lote = batch_service.generate_batch_code(cursor, fecha_elab)
            ing_dicts = [i.model_dump() for i in payload.ingredientes]
            peso_crudo = payload.peso_crudo_total_gramos or payload.stock_inicial_gramos
            indirect_dict = payload.indirect_costs or {}
            indirect_sum = sum(int(v or 0) for v in indirect_dict.values())
            effective_extra_cost = indirect_sum if indirect_sum > 0 else int(payload.extra_cost_clp or 0)

            snapshot_items, nutrition, total_cost_clp = batch_service.compute_batch_nutrition_and_cost(
                cursor, ing_dicts, peso_crudo, payload.stock_inicial_gramos, effective_extra_cost
            )

            # Registrar automáticamente en kitchen_cost_history para alimentar Finanzas y Cocina
            stock_kg = payload.stock_inicial_gramos / 1000.0
            unit_g = batch_service.parse_weight_grams(prod.get("weight"))
            pvp_per_kg = int(round(int(prod["price"]) / (unit_g / 1000.0))) if unit_g > 0 else int(prod["price"])
            cost_per_kg = int(round(total_cost_clp / stock_kg)) if stock_kg > 0 else total_cost_clp
            margin_clp = pvp_per_kg - cost_per_kg
            margin_pct = round((margin_clp / pvp_per_kg) * 100.0, 2) if pvp_per_kg > 0 else 0.0

            kitchen_cost_id = payload.kitchen_cost_id
            if kitchen_cost_id is None:
                cursor.execute(
                    """
                    INSERT INTO kitchen_cost_history (
                        production_line, batch_total_kg, cost_per_kg, pvp_price,
                        gross_margin_percent, gross_margin_clp, raw_costs, provider_notes
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        payload.linea_produccion.lower(),
                        round(stock_kg, 2),
                        cost_per_kg,
                        pvp_per_kg,
                        margin_pct,
                        margin_clp,
                        json.dumps({"indirect_costs": indirect_dict, "codigo_lote": codigo_lote}),
                        payload.notas or f"Lote {codigo_lote} ({prod['name']})",
                    ),
                )
                kc_row = cursor.fetchone()
                kitchen_cost_id = kc_row["id"] if kc_row else None

            cursor.execute(
                """
                INSERT INTO batch_produccion (
                    codigo_lote, producto_id, linea_produccion, semana_fabricacion,
                    fecha_elaboracion, fecha_consumo_preferente, peso_crudo_total_gramos,
                    stock_inicial_gramos, stock_disponible_gramos, costo_total_batch_clp,
                    kitchen_cost_id, indirect_costs_json, notas, estado
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVO')
                RETURNING id
                """,
                (
                    codigo_lote,
                    payload.producto_id,
                    payload.linea_produccion.upper(),
                    semana,
                    fecha_elab,
                    fecha_exp,
                    peso_crudo,
                    payload.stock_inicial_gramos,
                    payload.stock_inicial_gramos,
                    total_cost_clp,
                    kitchen_cost_id,
                    json.dumps(indirect_dict),
                    payload.notas,
                ),
            )
            batch_id = cursor.fetchone()["id"]

            for item in snapshot_items:
                cursor.execute(
                    """
                    INSERT INTO batch_ingredientes (
                        batch_id, ingrediente_id, nombre_ingrediente,
                        cantidad_gramos, porcentaje_formula, costo_unitario_clp
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        batch_id,
                        item["ingrediente_id"],
                        item["nombre_ingrediente"],
                        item["cantidad_gramos"],
                        item["porcentaje_formula"],
                        item["costo_unitario_clp"],
                    ),
                )

            cursor.execute(
                """
                INSERT INTO batch_nutricion (
                    batch_id, proteina_pct, grasa_pct, fibra_pct, humedad_pct,
                    cenizas_pct, carbohidratos_pct, calcio_pct, fosforo_pct, kcal_100g
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    batch_id,
                    nutrition["proteina_pct"],
                    nutrition["grasa_pct"],
                    nutrition["fibra_pct"],
                    nutrition["humedad_pct"],
                    nutrition["cenizas_pct"],
                    nutrition["carbohidratos_pct"],
                    nutrition["calcio_pct"],
                    nutrition["fosforo_pct"],
                    nutrition["kcal_100g"],
                ),
            )

            cursor.execute(
                "SELECT COUNT(*) AS cnt FROM batch_waitlist WHERE producto_id = %s AND notified = 0",
                (payload.producto_id,),
            )
            waitlist_count = int(cursor.fetchone()["cnt"])
            conn.commit()

            return {
                "success": True,
                "batch_id": batch_id,
                "codigo_lote": codigo_lote,
                "semana_fabricacion": semana,
                "costo_total_batch_clp": total_cost_clp,
                "nutrition": nutrition,
                "waitlist_pending": waitlist_count,
            }

    @router.patch("/api/admin/batches/{batch_id}/status")
    def update_batch_status(
        batch_id: int,
        payload: BatchStatusUpdate,
        current_user: str = Depends(get_current_admin),
    ):
        estado = payload.estado.strip().upper()
        if estado not in ("ACTIVO", "AGOTADO", "CERRADO"):
            raise HTTPException(status_code=400, detail="Estado inválido. Use ACTIVO, AGOTADO o CERRADO.")
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE batch_produccion SET estado = %s, notas = COALESCE(%s, notas) WHERE id = %s RETURNING id",
                (estado, payload.notas, batch_id),
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Lote no encontrado.")
            conn.commit()
            return {"success": True, "estado": estado}

    @router.get("/api/admin/batches/{batch_id}/label")
    def get_batch_label(batch_id: int, current_user: str = Depends(get_current_admin)):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT bp.*, p.name AS producto_nombre, p.type AS producto_type, p.weight AS producto_weight,
                       bn.proteina_pct, bn.grasa_pct, bn.fibra_pct, bn.humedad_pct,
                       bn.cenizas_pct, bn.carbohidratos_pct, bn.calcio_pct, bn.fosforo_pct, bn.kcal_100g
                FROM batch_produccion bp
                JOIN products p ON p.id = bp.producto_id
                LEFT JOIN batch_nutricion bn ON bn.batch_id = bp.id
                WHERE bp.id = %s
                """,
                (batch_id,),
            )
            batch = cursor.fetchone()
            if not batch:
                raise HTTPException(status_code=404, detail="Lote no encontrado.")
            cursor.execute(
                "SELECT nombre_ingrediente, cantidad_gramos, porcentaje_formula FROM batch_ingredientes WHERE batch_id = %s ORDER BY porcentaje_formula DESC",
                (batch_id,),
            )
            ings = [dict(r) for r in cursor.fetchall()]
            result = dict(batch)
            result["fecha_elaboracion"] = result["fecha_elaboracion"].isoformat()
            result["fecha_consumo_preferente"] = result["fecha_consumo_preferente"].isoformat()
            result["ingredientes"] = ings
            return result

    @router.get("/api/admin/batches/recall/{codigo_lote}")
    def recall_batch_traceability(codigo_lote: str, current_user: str = Depends(get_current_admin)):
        code = codigo_lote.strip().upper()
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT bp.*, p.name AS producto_nombre
                FROM batch_produccion bp
                JOIN products p ON p.id = bp.producto_id
                WHERE UPPER(bp.codigo_lote) = %s
                """,
                (code,),
            )
            batch = cursor.fetchone()
            if not batch:
                raise HTTPException(status_code=404, detail=f"No se encontró el lote {code}.")
            cursor.execute(
                """
                SELECT pdb.order_id, pdb.gramos_descontados, pdb.created_at,
                       o.customer_name, o.customer_phone, o.customer_email,
                       o.delivery_status, o.payment_status
                FROM pedido_detalle_batches pdb
                JOIN orders o ON o.id = pdb.order_id
                WHERE pdb.batch_id = %s
                ORDER BY pdb.created_at DESC
                """,
                (batch["id"],),
            )
            affected_orders = []
            for r in cursor.fetchall():
                item = dict(r)
                if item.get("created_at"):
                    item["created_at"] = item["created_at"].isoformat()
                affected_orders.append(item)
            b_dict = dict(batch)
            b_dict["fecha_elaboracion"] = b_dict["fecha_elaboracion"].isoformat()
            b_dict["fecha_consumo_preferente"] = b_dict["fecha_consumo_preferente"].isoformat()
            return {"batch": b_dict, "affected_orders": affected_orders}

    @router.get("/api/admin/orders/{order_id}/batches")
    def get_order_batch_allocations(order_id: int, current_user: str = Depends(get_current_admin)):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT pdb.id, pdb.order_item_id, pdb.batch_id, pdb.codigo_lote, pdb.gramos_descontados,
                       oi.product_name, oi.quantity, bp.fecha_elaboracion, bp.fecha_consumo_preferente
                FROM pedido_detalle_batches pdb
                JOIN order_items oi ON oi.id = pdb.order_item_id
                JOIN batch_produccion bp ON bp.id = pdb.batch_id
                WHERE pdb.order_id = %s
                ORDER BY pdb.id ASC
                """,
                (order_id,),
            )
            rows = []
            for r in cursor.fetchall():
                d = dict(r)
                if d.get("fecha_elaboracion"):
                    d["fecha_elaboracion"] = d["fecha_elaboracion"].isoformat()
                if d.get("fecha_consumo_preferente"):
                    d["fecha_consumo_preferente"] = d["fecha_consumo_preferente"].isoformat()
                rows.append(d)
            return rows

    @router.get("/api/admin/demand-projection")
    def get_demand_projection(current_user: str = Depends(get_current_admin)):
        with get_connection() as conn:
            cursor = conn.cursor()
            return batch_service.build_demand_and_alerts(cursor)

    # --- Lista de Espera para Productos Agotados ---
    @router.post("/api/waitlist")
    def join_waitlist(payload: WaitlistCreate):
        if not payload.contact_phone and not payload.contact_email:
            raise HTTPException(status_code=400, detail="Ingresa un WhatsApp o correo para avisarte.")
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO batch_waitlist (producto_id, customer_name, contact_phone, contact_email)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (payload.producto_id, payload.customer_name, payload.contact_phone, payload.contact_email),
            )
            wid = cursor.fetchone()["id"]
            conn.commit()
            return {"success": True, "id": wid}

    @router.get("/api/admin/waitlist/{producto_id}")
    def list_product_waitlist(producto_id: int, current_user: str = Depends(get_current_admin)):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM batch_waitlist WHERE producto_id = %s AND notified = 0 ORDER BY created_at DESC",
                (producto_id,),
            )
            rows = []
            for r in cursor.fetchall():
                d = dict(r)
                if d.get("created_at"):
                    d["created_at"] = d["created_at"].isoformat()
                rows.append(d)
            return rows

    @router.post("/api/admin/waitlist/{producto_id}/mark-notified")
    def mark_waitlist_notified(producto_id: int, current_user: str = Depends(get_current_admin)):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE batch_waitlist SET notified = 1 WHERE producto_id = %s AND notified = 0", (producto_id,))
            conn.commit()
            return {"success": True}

    # --- Módulo 7: Links de Pago Directo (Pedidos Asistidos y Cobro Post-Entrega) ---
    @router.get("/api/admin/payment-links")
    def list_payment_links(current_user: str = Depends(get_current_admin)):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM direct_payment_links ORDER BY created_at DESC LIMIT 100")
            rows = []
            for r in cursor.fetchall():
                d = dict(r)
                for k in ("opened_at", "paid_at", "created_at"):
                    if d.get(k):
                        d[k] = d[k].isoformat()
                rows.append(d)
            return rows

    @router.post("/api/admin/payment-links")
    def create_payment_link(payload: DirectPaymentLinkCreate, current_user: str = Depends(get_current_admin)):
        mode = payload.mode
        if mode not in ("assisted_cart", "post_delivery_order"):
            raise HTTPException(status_code=400, detail="Modo inválido. Use 'assisted_cart' o 'post_delivery_order'.")

        token = secrets.token_urlsafe(12)
        with get_connection() as conn:
            cursor = conn.cursor()
            order_id = payload.order_id
            cust_name = payload.customer_name
            cust_phone = payload.customer_phone
            cust_email = payload.customer_email
            items_data: List[Dict[str, Any]] = []
            total_clp = 0

            if mode == "post_delivery_order" and order_id:
                cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
                ord_row = cursor.fetchone()
                if not ord_row:
                    raise HTTPException(status_code=404, detail="Pedido no encontrado.")
                cust_name = cust_name or ord_row["customer_name"]
                cust_phone = cust_phone or ord_row["customer_phone"]
                cust_email = cust_email or ord_row["customer_email"]
                cursor.execute(
                    """
                    SELECT oi.product_id, oi.product_name, oi.quantity, oi.price_at_purchase, p.weight, p.image
                    FROM order_items oi
                    LEFT JOIN products p ON p.id = oi.product_id
                    WHERE oi.order_id = %s
                    """,
                    (order_id,),
                )
                for it in cursor.fetchall():
                    items_data.append({
                        "id": it["product_id"],
                        "name": it["product_name"],
                        "quantity": it["quantity"],
                        "price": it["price_at_purchase"],
                        "weight": it.get("weight") or "1 Kg",
                        "image": it.get("image") or "/logo.webp",
                    })
                # Sin descuentos: recalcular precio lista duro
                subtotal = sum(i["price"] * i["quantity"] for i in items_data)
                shipping = 0 if subtotal >= 100000 else int(ord_row.get("shipping_cost") or 0)
                total_clp = subtotal + shipping
                cursor.execute(
                    "UPDATE orders SET discount_amount = 0, coupon_code = NULL, total = %s, is_direct_link = 1 WHERE id = %s",
                    (total_clp, order_id),
                )
            else:
                if not payload.items:
                    raise HTTPException(status_code=400, detail="Debe incluir al menos un producto y cantidad.")
                pids = [i.product_id for i in payload.items]
                cursor.execute("SELECT id, name, price, weight, image FROM products WHERE id = ANY(%s)", (pids,))
                pmap = {int(r["id"]): dict(r) for r in cursor.fetchall()}
                for it in payload.items:
                    p = pmap.get(it.product_id)
                    if not p:
                        raise HTTPException(status_code=404, detail=f"Producto #{it.product_id} no encontrado.")
                    items_data.append({
                        "id": p["id"],
                        "name": p["name"],
                        "quantity": it.quantity,
                        "price": int(p["price"]),
                        "weight": p["weight"],
                        "image": p["image"],
                    })
                subtotal = sum(i["price"] * i["quantity"] for i in items_data)
                shipping = 5000 if subtotal < 100000 else 0
                total_clp = subtotal + shipping

                # Si se marca como pedido ya entregado sin pagar, creamos el pedido y descontamos FIFO una sola vez
                if mode == "post_delivery_order" or payload.mark_delivered_now:
                    mode = "post_delivery_order"
                    cursor.execute(
                        """
                        INSERT INTO orders (
                            customer_name, customer_email, customer_phone, customer_address,
                            customer_city, customer_region, subtotal, shipping_cost, total,
                            payment_method, payment_status, delivery_status, discount_amount,
                            delivered_at, is_direct_link
                        )
                        VALUES (%s, %s, %s, %s, %s, 'Región Metropolitana', %s, %s, %s, 'mercadopago', 'Pendiente (Cobro Directo)', 'Entregado', 0, CURRENT_TIMESTAMP, 1)
                        RETURNING id
                        """,
                        (
                            cust_name or "Cliente Origen Canino",
                            (cust_email or "cobro@origencanino.cl").strip().lower(),
                            cust_phone or "",
                            payload.customer_address or "Por confirmar",
                            payload.customer_city or "Santiago",
                            subtotal,
                            shipping,
                            total_clp,
                        ),
                    )
                    order_id = cursor.fetchone()["id"]
                    for it in items_data:
                        cursor.execute(
                            """
                            INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase)
                            VALUES (%s, %s, %s, %s, %s)
                            """,
                            (order_id, it["id"], it["name"], it["quantity"], it["price"]),
                        )
                    batch_service.deduct_fifo_for_order(cursor, order_id)

            cursor.execute(
                """
                INSERT INTO direct_payment_links (
                    token, mode, order_id, customer_name, customer_phone, customer_email,
                    items_json, total_clp, notes
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    token,
                    mode,
                    order_id,
                    cust_name,
                    cust_phone,
                    cust_email,
                    json.dumps(items_data),
                    total_clp,
                    payload.notes,
                ),
            )
            link_id = cursor.fetchone()["id"]
            conn.commit()
            return {
                "success": True,
                "id": link_id,
                "token": token,
                "mode": mode,
                "order_id": order_id,
                "total_clp": total_clp,
                "url_path": f"/pagar/{token}",
            }

    @router.get("/api/payment-links/{token}")
    def get_payment_link_public(token: str):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM direct_payment_links WHERE token = %s", (token,))
            link = cursor.fetchone()
            if not link:
                raise HTTPException(status_code=404, detail="Link de pago no encontrado o expirado.")
            if link["status"] == "pendiente":
                cursor.execute(
                    "UPDATE direct_payment_links SET status = 'abierto', opened_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (link["id"],),
                )
                conn.commit()
            d = dict(link)
            if isinstance(d.get("items_json"), str):
                d["items_json"] = json.loads(d["items_json"])
            for k in ("opened_at", "paid_at", "created_at"):
                if d.get(k):
                    d[k] = d[k].isoformat()
            return d

    @router.post("/api/payment-links/{token}/pay-transfer")
    def pay_direct_link_transfer(token: str, payload: DirectLinkTransferSubmit):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM direct_payment_links WHERE token = %s FOR UPDATE", (token,))
            link = cursor.fetchone()
            if not link:
                raise HTTPException(status_code=404, detail="Link de pago no encontrado.")
            if not link.get("order_id"):
                raise HTTPException(status_code=400, detail="Este link corresponde a un carrito asistido; usa el checkout estándar.")
            cursor.execute(
                """
                UPDATE orders
                SET customer_name = %s,
                    customer_email = %s,
                    customer_phone = %s,
                    payment_method = 'transferencia',
                    transfer_bank = %s,
                    transfer_receipt_number = %s,
                    transfer_receipt_url = %s,
                    payment_status = 'Pendiente (Transferencia)'
                WHERE id = %s
                """,
                (
                    payload.customer_name.strip(),
                    payload.customer_email.strip().lower(),
                    payload.customer_phone.strip(),
                    payload.transfer_bank.strip(),
                    payload.transfer_receipt_number.strip(),
                    payload.transfer_receipt_url.strip(),
                    link["order_id"],
                ),
            )
            conn.commit()
            return {"success": True, "order_id": link["order_id"]}

    @router.post("/api/payment-links/{token}/mercadopago")
    def pay_direct_link_mercadopago(token: str):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM direct_payment_links WHERE token = %s", (token,))
            link = cursor.fetchone()
            if not link or not link.get("order_id"):
                raise HTTPException(status_code=404, detail="Link de cobro directo sin pedido asociado.")
            order_id = int(link["order_id"])
            cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
            ord_row = cursor.fetchone()
            if not ord_row:
                raise HTTPException(status_code=404, detail="Pedido asociado no encontrado.")

            cursor.execute("SELECT value FROM system_settings WHERE key = 'mercadopago_access_token'")
            mp_row = cursor.fetchone()
            access_token = (mp_row["value"] if mp_row and mp_row["value"] else None) or os.getenv("MERCADOPAGO_ACCESS_TOKEN")
            if not access_token:
                raise HTTPException(status_code=400, detail="Mercado Pago no está configurado en el servidor.")

            items = link["items_json"] if isinstance(link["items_json"], list) else json.loads(link["items_json"])
            mp_items = [
                {
                    "title": it["name"],
                    "quantity": int(it["quantity"]),
                    "unit_price": int(it["price"]),
                    "currency_id": "CLP",
                }
                for it in items
            ]
            if int(ord_row["shipping_cost"] or 0) > 0:
                mp_items.append({
                    "title": "Envío Origen Canino",
                    "quantity": 1,
                    "unit_price": int(ord_row["shipping_cost"]),
                    "currency_id": "CLP",
                })

            frontend_url = os.getenv("FRONTEND_URL", "https://origencanino.cl").rstrip("/")
            pref_payload = {
                "items": mp_items,
                "payer": {
                    "name": ord_row["customer_name"],
                    "email": ord_row["customer_email"],
                },
                "external_reference": str(order_id),
                "back_urls": {
                    "success": f"{frontend_url}/?payment_status=success&order_id={order_id}",
                    "failure": f"{frontend_url}/?payment_status=failure&order_id={order_id}",
                    "pending": f"{frontend_url}/?payment_status=pending&order_id={order_id}",
                },
                "auto_return": "approved",
            }
            req = urllib.request.Request(
                "https://api.mercadopago.com/checkout/preferences",
                data=json.dumps(pref_payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                mp_data = json.loads(resp.read().decode("utf-8"))

            cursor.execute(
                "UPDATE orders SET mercadopago_preference_id = %s WHERE id = %s",
                (mp_data.get("id"), order_id),
            )
            conn.commit()
            return {"init_point": mp_data.get("init_point"), "preference_id": mp_data.get("id"), "order_id": order_id}

    return router

