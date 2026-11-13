# BITÁCORA DE DESARROLLO E IMPLEMENTACIÓN TÉCNICA - ORIGEN CANINO
**Fecha:** 13 de Noviembre de 2026  
**Responsables:** Patricio Padilla Legrand Petit & Antigravity AI  
**Proyecto:** Origen Canino Chile (`origencanino.cl`)  
**Entorno:** Producción Docker / Hetzner Cloud (`167.233.122.18`)  
**Caso de Estudio Real:** Detección y Resolución de Incidencia en Checkout Mercado Pago (Caso Eduardo Putz - Pedido #5)

---

## 1. DESCRIPCIÓN DEL INCIDENTE ("ORO PURO" EN QA & UX)

El cliente **Eduardo Putz** (tutor de la cachorrita *Reina*, nacida en Legrand Petit) intentó adquirir la alimentación mensual BARF Cruda (11 kg, total $54.500 CLP) a través de `https://origencanino.cl`.

Durante el flujo de pago con Mercado Pago:
1. La pasarela retornó un fallo o cancelación, redirigiendo al cliente a:  
   `https://origencanino.cl/?payment=failure&order_id=5&status=null...`
2. El frontend de la tienda no capturaba los parámetros `?payment=failure` ni emitía ningún aviso o mensaje de alerta al usuario.
3. El cliente ingresó a su panel de **Mi Cuenta** (`/mi-cuenta`) y visualizó su orden registrada con dos anomalías graves:
   - **"Invalid Date"** en la fecha de compra.
   - **"Estado: Preparación"**, junto al pill amarillo *"Iniciado (Esperando Pago)"*.
4. **Consecuencia de Negocio:** El cliente asumió que la falla fue solo un error visual de pantalla y creyó que la comida ya estaba en preparación y sería despachada, cuando en realidad la transacción no fue acreditada, no ingresó dinero a Mercado Pago y Patricio no recibió alerta en Telegram.

---

## 2. ANÁLISIS DE CAUSA RAÍZ (ROOT CAUSE ANALYSIS)

1. **Inconsistencia de Estados (`delivery_status` vs `payment_status`):**
   - En `server_db.py`, la tabla `orders` fue creada con `delivery_status TEXT DEFAULT 'Preparación'`.
   - Cuando se creaba una orden con `payment_method == 'mercadopago'`, el backend insertaba el pedido sin especificar `delivery_status`, heredando automáticamente `'Preparación'` antes de que el dinero fuera validado.
   - En `CustomerPortal.jsx`, el componente renderizaba `{o.delivery_status || 'Preparación'}`.
2. **Bug de Parseo de Fecha ("Invalid Date"):**
   - El endpoint `GET /api/customer/orders` formateaba `created_at` con `strftime("%d/%m/%Y %H:%M")` (ej. `13/11/2026 14:51`).
   - El estándar ECMAScript en `new Date("13/11/2026 ...")` no reconoce el mes 13 como válido (espera ISO 8601 o formato anglosajón), arrojando `Invalid Date`.
3. **Silencio Frontend en Retorno de Pasarela:**
   - Mercado Pago redirecciona a las `back_urls` (`?payment=failure`, `?payment=success`, `?payment=pending`), pero ninguna vista escuchaba estos parámetros para orientar al cliente.
4. **Cero Alertas de Abandono/Fallo en Pasarelas:**
   - El backend solo notificaba a Telegram cuando el webhook recibía `status == "approved"`. Si el cliente experimentaba un rechazo bancario o cancelaba, el negocio perdía la visibilidad y la oportunidad de recuperar la venta.

---

## 3. SOLUCIONES IMPLEMENTADAS Y DESPLEGADAS

### A. Módulo Global de Retorno de Pasarela (`PaymentStatusModal.jsx`)
- Se creó un modal reactivo de alta fidelidad montado en `src/App.jsx` que escucha activamente los parámetros de retorno de Mercado Pago:
  - **Fallo / Cancelación (`?payment=failure`):**
    - Muestra aviso claro: *"Tu pago en Mercado Pago no se procesó. Tu Pedido #{id} quedó guardado de forma segura esperando tu confirmación."*
    - Botón **"Reintentar Pago con Mercado Pago"**: Regenera la preferencia en 1 clic y reconecta al checkout.
    - Botón **"Pagar con Transferencia Bancaria Directa"**: Despliega los datos bancarios oficiales (Banco, Cta Vista, RUT, Titular, Email) con botón de copiado rápido.
    - Botón **"Asistencia por WhatsApp"**: Abre chat directo con Patricio pre-cargando los datos del pedido para asistencia personalizada.
  - **Aprobado (`?payment=success`):** Mensaje de confirmación verde y enlace directo al seguimiento en Mi Cuenta.
  - **Pendiente (`?payment=pending`):** Aviso informativo de validación bancaria en curso.
- Limpieza automática de URL mediante `window.history.replaceState` para evitar re-aperturas involuntarias al refrescar la página.

### B. Notificación Proactiva a Telegram ante Fallos de Pasarela
- Se creó el endpoint `POST /api/payments/mercadopago/notify-failure`.
- Al detectar un fallo en el retorno, el sistema actualiza el pedido a `delivery_status = 'Esperando Pago'` y dispara una alerta inmediata al bot de Telegram:
  ```
  ⚠️ ALERTA: INTENTO DE PAGO NO COMPLETADO (Mercado Pago)
  📦 Pedido #5 — Monto: $54.500 CLP
  👤 Cliente: Eduardo Putz
  📞 Teléfono: +56999479439
  📍 Comuna: Ñuñoa
  🐶 Perro: Reina
  👉 Escríbele por WhatsApp: https://wa.me/56999479439
  ```
- **Impacto Comercial:** Convierte carritos abandonados o tarjetas rechazadas en ventas asistidas inmediatas vía WhatsApp.

### C. Corrección Integral de Estados y Fechas en el Portal del Cliente
- **Alineación de Estados en BD:**
  - Órdenes nuevas nacen con `delivery_status = 'Esperando Pago'` (Mercado Pago) o `'Esperando Comprobante'` (Transferencia).
  - Solo tras la acreditación efectiva (`approved` en webhook o validación manual de transferencia en admin) el pedido avanza a `delivery_status = 'Preparación'`.
- **Resolución de "Invalid Date":**
  - Backend serializa `created_at` en formato estándar ISO 8601 (`isoformat()`).
  - Frontend incorpora la función `formatOrderDate` que procesa tanto ISO como fechas con formato local chileno de manera infalible.
- **Acción "Completar Pago Ahora" en el Historial:**
  - Si un cliente tiene pedidos impagos en su historial, ahora ve un botón ámbar destacado **"Completar Pago Ahora"** que le permite pagar directamente con Mercado Pago o Transferencia sin tener que rearmar su carrito ni crear pedidos duplicados.

---

## 4. VERIFICACIÓN Y ESTADO EN PRODUCCIÓN

1. **Base de Datos PostgreSQL (VPS Hetzner):**
   - Pedido #5 de Eduardo Putz actualizado a `delivery_status = 'Esperando Pago'`.
2. **Frontend Compilado con Vite:**
   - Bundle generado: `dist/assets/index-DCa1KHIa.js` y `dist/assets/index-DK_TON3f.css`.
3. **Despliegue en Docker:**
   - Sincronizado en contenedor `f248a0182993`, servicio Uvicorn reiniciado y operativo.
   - Endpoint de prueba de notificación ejecutado con éxito HTTP 200.
   - Verificado con respuesta HTTP 200 en `https://origencanino.cl`.

---

**Firmado y auditado por:**  
Patricio Padilla Legrand Petit & Antigravity Multi-Agent System
