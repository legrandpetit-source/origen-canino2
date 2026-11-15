# 📓 Bitácora — Origen Canino (`origencanino.cl`)

**Fecha:** Domingo 15 de Noviembre de 2026  
**Responsable:** Patricio Padilla (PPV Soluciones)

---

## 1. Avances Realizados Hoy
- **Especificación Técnica de Boletas Electrónicas (DTE Tipo 39 — SII):**
  - Documentada en `ESPECIFICACION_BOLETAS_ELECTRONICAS_DTE39.md` (sin escritura de código aún, lista para revisión y arranque).
  - Flujo definido bajo demanda humana desde `DispatchManager.jsx` (`Generar Boleta SII` -> API intermediaria -> PDF + Folio -> envío supervisado al cliente).
  - Definido el criterio multicanal final: **PDF oficial adjunto vía Correo Corporativo (SMTP)** + **aviso cálido por WhatsApp (`wa.me`)** indicando Folio N° y monto total.
  - Resguardos contemplados: cuadratura exacta IVA/despacho/descuento, bloqueo si `payment_status !== 'Pagado'`, idempotencia anti-doble emisión, alerta de Nota de Crédito Tipo 61 ante anulaciones, y fecha local de Chile (`America/Santiago`).

---

## 2. 📅 Pendientes para Mañana — Lunes 16 de Noviembre de 2026
*(Reunión con contador + firma de nueva empresa + preparación de arranque)*

1. **Prerrequisitos SII / Tributarios:**
   - [x] RUT de Origen Canino con inicio de actividades afecto a IVA *(ya disponible en PDF)*.
   - [ ] **Certificado digital vigente** del representante legal *(a obtener mañana al firmar)*.
   - [ ] **Habilitación de Boleta Electrónica (Tipo 39) + folios CAF** y elección/alta de proveedor intermediario DTE (**SimpleAPI**, **OpenFactura/Haulmer**, **Lioren** o **Bsale**) *(a solicitar mañana en reunión con el contador)*.
2. **Correo Corporativo (SMTP):**
   - [ ] Verificar si ya existe casilla corporativa (`contacto@origencanino.cl` / `boletas@origencanino.cl`) y obtener credenciales SMTP (`host`, `puerto`, `usuario`, `clave`), o crear una nueva.
3. **Arranque Técnico (Fase 1):**
   - Con los puntos anteriores definidos, comenzar la implementación en `backend/server_db.py`, `backend/dte_service.py`, `backend/main.py` y `src/components/admin/DispatchManager.jsx`.
