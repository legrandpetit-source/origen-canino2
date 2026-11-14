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

## 5. BLINDAJE DE FLUJO DE TRANSFERENCIA BANCARIA Y GESTIÓN DE COMPROBANTES

### A. Problemática Detectada
En el checkout (`CheckoutModal.jsx`), al seleccionar **Transferencia Bancaria**, el botón *"Confirmar Pedido por Transferencia"* permanecía activo y permitía enviar la orden inmediatamente, sin obligar al usuario a indicar su banco de origen, ingresar el número de comprobante, ni adjuntar la evidencia del pago. Esto provocaba que ingresaran solicitudes sin verificación previa ni respaldo visual.

### B. Implementaciones Realizadas

1. **Selección Estricta de Banco Emisor:**
   - Se reemplazó el campo de texto libre por un selector (`<select>`) con las principales entidades bancarias de Chile:
     - Banco de Chile / Edwards, Banco Santander, BancoEstado (Cuenta RUT / Corriente), BCI, Scotiabank, Banco Itaú, Banco Falabella, Banco Security, Banco BICE, Banco Consorcio, Banco Internacional, Tenpo, Mach, Mercado Pago, Coopeuch y opción "Otro Banco" (con input dinámico emergente).
2. **Número de Comprobante / Operación Obligatorio:**
   - Validación estricta que exige al menos 3 caracteres alfanuméricos.
3. **Subida Segura de Comprobantes de Pago (`POST /api/orders/upload-receipt`):**
   - Componente de subida de archivos con drag-and-drop o selector directo.
   - Validación de formato MIME: sólo imágenes genuinas (`image/png`, `image/jpeg`, `image/webp`), con límite de tamaño hasta 10 MB.
   - Procesamiento y sanitización en backend con **Pillow (`PIL.Image`)**:
     - Corrección automática de orientación mediante metadatos EXIF (`ImageOps.exif_transpose`).
     - Conversión a RGB y redimensionado de seguridad proporcional (máx 1600x1600 px) para preservar nitidez de lectura y reducir consumo de ancho de banda.
     - Compresión ultraliviana en formato WebP con nombrado aleatorio seguro (`receipt_{uuid}.webp`) en `/app/uploads/receipts/`.
4. **Gating Estricto del Botón de Confirmación:**
   - El botón *"Confirmar Pedido por Transferencia"* permanece deshabilitado (`disabled`) hasta que los 3 requisitos estén satisfechos: banco seleccionado, número de operación ingresado y comprobante adjunto.
   - Se despliega una caja de advertencia en color ámbar explicando con precisión los datos pendientes.
5. **Panel de Despacho y Administración (`DispatchManager.jsx`):**
   - Incorporación del botón con icono de ojo **"Ver Comprobante"** en cada fila de pedido por transferencia.
   - Modal de inspección de alta resolución:
     - Resumen completo: Banco Emisor, N° Operación, Total, Estado actual.
     - Visor de la captura del comprobante con enlace para abrir en tamaño original en pestaña nueva.
     - Botón de acción directa **"Validar y Aprobar Transferencia"** que marca la orden como `Pagado` y avanza a `Preparación` en un clic.
6. **Notificación en Telegram:**
   - El mensaje automático a Telegram para transferencias incluye la URL directa del comprobante (`https://origencanino.cl/uploads/receipts/...`) para auditoría rápida en el celular de Patricio.
7. **Migración en Base de Datos:**
   - Ejecutado en PostgreSQL de Hetzner: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS transfer_receipt_url TEXT;`.

---

## 6. ACTUALIZACIÓN SOBRE PEDIDO #5 (EDUARDO PUTZ)
- Mientras se avanzaba en este desarrollo, Eduardo Putz concretó exitosamente el pago de su Pedido #5 ($54.500 CLP por 11x BARF Cruda para Reina) mediante **Mercado Pago** (`mercadopago_payment_id: 188359042057`).
- Los webhooks fueron recibidos y procesados correctamente, el estado cambió a `Pagado` / `Preparación` y las alertas de Telegram se emitieron sin contratiempos.

---

## 7. MÓDULO DE RECHAZO DE TRANSFERENCIA BANCARIA Y RECUPERACIÓN VÍA WHATSAPP

Para cerrar el ciclo de auditoría de pagos en el panel administrativo (`src/components/admin/DispatchManager.jsx`), se construyó el flujo de **Rechazo de Transferencias**:

### A. Funcionalidad y Reglas de Negocio
1. **Doble Punto de Control:** El administrador dispone del botón rojo **"Rechazar"** tanto en la fila del pedido en la tabla de despachos como dentro del modal de inspección en alta resolución del comprobante.
2. **Modal de Rechazo con Motivos Tipificados:**
   - Despliega selector con los 4 casos más comunes en transferencias en Chile:
     - *"Monto no coincide con el total del pedido"*
     - *"Comprobante ilegible / borroso"*
     - *"Transferencia no recibida en cartola bancaria"*
     - *"Motivo personalizado"* (con campo de texto libre para detalle clínico o comercial).
3. **Actualización de Estados en Base de Datos:**
   - `payment_status = 'Rechazado (Transferencia)'`
   - `delivery_status = 'Cancelado'`
4. **Notificación Directa y Automática al WhatsApp del Cliente:**
   - El sistema abre de forma inmediata un enlace `https://wa.me/{telefono}?text=...` con un mensaje cordial y profesional pre-redactado:
     ```
     Hola Eduardo Putz, te escribimos de Origen Canino respecto a tu Pedido #7. 
     Tuvimos un inconveniente al validar tu comprobante de transferencia bancaria.
     Motivo: Monto no coincide con el total del pedido.
     Por favor, si puedes responder a este mensaje enviándonos el comprobante correcto o confirmando los datos de la transferencia para procesar tu despacho. ¡Muchas gracias!
     ```
   - **Beneficio Comercial:** Elimina el roce con el cliente, previene la pérdida de pedidos legítimos y permite corregir errores de digitación o de monto en minutos sin fricciones.

### B. Pruebas y Despliegue en Producción
- Validado con el **Pedido de Prueba #7** ($35.000 CLP, 7 unidades, Banco de Chile).
- Subido comprobante de prueba WebP, inspeccionado en el modal y aprobado/rechazado de punta a punta.
- Desplegado en producción en el servidor Hetzner VPS (`167.233.122.18`) mediante commit sincronizado a Coolify.

---

## 8. FORMALIZACIÓN LEGAL CANINA Y TRAZABILIDAD SANITARIA (LEGRAND PETIT)

En paralelo al e-commerce, se estructuró, normalizó y compiló la documentación oficial para dos ejemplares de alta alcurnia del criadero **Legrand Petit**:

### 8.1. Contrato de Cesión y Tenencia Responsable — Legrand Petit Reina Elegida
- **Ejemplar:** Pug (Carlina hembra nacida el 24/04/2026, Microchip `991003003617500`).
- **Tutor Receptor:** Don Eduardo Ignacio Pultz de la Fuente (R.U.T. 16.661.916-5).
- **Criador:** Don Patricio Padilla (R.U.T. 14.554.502-1, Legrand Petit).
- **Cláusulas Formalizadas (Marco Ley N° 21.020):**
  - **Primera:** Individualización oficial, aporte por crianza responsable ($900.000 CLP), cartilla sanitaria, Declaración de Origen KCC ("con papeles") y ración de inicio BARF Origen Canino.
  - **Segunda:** Propósito de compañía familiar exclusiva, proscripción absoluta de explotación o reproducción comercial y no aislamiento.
  - **Tercera:** Nutrición biológicamente apropiada 100% natural obligatoria (Tasty Barf / Origen Canino) y exclusión total de ultraprocesados industriales.
  - **Cuarta:** Fundamento veterinario de **No Esterilización Temprana** (preservación de placas epifisarias de crecimiento óseo, ligamento cruzado y densidad articular) y acompañamiento médico vitalicio con Patricio Padilla.
  - **Quinta:** Destino, custodia responsable y prohibición de venta o cesión arbitraria.
  - **Sexta y Séptima:** Inscripción oficial del microchip en el Registro Nacional de Mascotas, buena fe y resguardo final.
- **Compilación Tipográfica:**
  - Se eliminó un salto de página artificial que dejaba un vacío en blanco en la primera carilla.
  - Recompilado con motor **Google Chrome / Skia**, generando un documento PDF de 2 páginas perfectamente equilibrado (88 KB), homogéneo con los contratos de Momo Casanova y Reymundo.

### 8.2. Hoja Sanitaria Oficial — Legrand Petit Reina Elegida
- **Formato:** Certificado clínico oficial en **1 carilla exacta** de alta resolución (WeasyPrint).
- **R.U.T. Veterinario Oficial:** Se incorporó formalmente el R.U.T. del Médico Veterinario Responsable **Dr. Jorge Castro (`12.244.287-K`)**.
- **Ergonomía de Stickers de Vacunación:**
  - A solicitud de Patricio, se rediseñó la columna de stickers: ancho ampliado al **35% de la página** (~6.8 cm de ancho útil) y altura duplicada a **72px (~1.9 cm de alto)**.
  - Incorpora guía visual punteada interior `[ Pegar Sticker de Vacuna Aquí ]` y línea inferior para `Firma y Timbre Médico Veterinario`.
- **Esquema Clínico:** 4 dosis de vacunas (3 de cachorro aplicadas + refuerzo anual programado) y 7 dosis de desparasitación (4 de cachorro con Drontal Puppy al día + mantención trimestral Drontal Plus al día).

### 8.3. Hoja Sanitaria Oficial — Legrand Petit Momo Casanova (Campeón Chileno)
- **Trazabilidad de Ejemplar Adulto (3 Años):**
  - Nacimiento: 06 de Noviembre de 2023.
  - Raza y Sexo: Bulldog Francés macho reproductor activo.
  - Microchip ISO: `991003002668233` (Pedigree KCC de Campeón Chileno).
  - Filiación Genealógica: Padre **Legrand Petit Monito Canelo** y Madre **Legrand Petit Matilde**.
  - Tutor / Custodio: **Sergio Francisco San Martín Campos** (R.U.T. 15.954.230-0).
  - Criador Propietario: **Patricio Padilla** (R.U.T. 14.554.502-1).
  - Médico Veterinario: **Dr. Jorge Castro** (R.U.T. 12.244.287-K).
- **Calendario Completo de Vacunación (Página 1):**
  - 3 dosis de cachorro (Puppy DP a los 30d, Séxtuple/Óctuple a los 51d, Óctuple + Antirrábica a los 72d).
  - 3 refuerzos anuales de adulto: 2024, 2025 y el **reciente de 2026 aplicado por Patricio** (06/Nov/2026) marcados como **APLICADA**.
  - Refuerzo Noviembre 2027 marcado como **PROGRAMADA**.
  - Recuadros amplios adaptados para stickers físicos de vacunas y timbres.
- **Calendario Completo de Desparasitación (Página 2):**
  - 4 dosis de cachorro con Drontal Puppy suspensión oral cada 15 días (Nov 2023 - Ene 2024) **Al Día**.
  - 11 controles trimestrales correlativos de adulto con Drontal Plus comprimidos (desde Abril 2024 hasta el **05 de Octubre de 2026** previo a hoy) todos marcados **AL DÍA**.
  - Control de mantención Enero 2027 como **PROGRAMADA**.
  - Directrices clínicas de preservación genital (no castración por estatus de semental activo y Campeón Chileno) y alimentación natural BARF Origen Canino.
  - Bloque oficial de firmas para Patricio Padilla, Dr. Jorge Castro y Sergio San Martín.

---

## 9. ORGANIZACIÓN Y ESTANDARIZACIÓN DE ARCHIVOS EN ESCRITORIO

Para facilitar la manipulación física, revisión e impresión en el día a día de Patricio, todos los documentos fueron sincronizados y estandarizados en la carpeta:  
**`/home/patricio/Escritorio/contratos/`**

- `Contrato_Cesion_Momo_Casanova.pdf` & `Contrato_Cesion_Momo_Casanova.html`
- `Hoja_Sanitaria_Momo_Casanova.pdf` & `Hoja_Sanitaria_Momo_Casanova.html`
- `Contrato_Cesion_Reymundo.pdf` & `Contrato_Cesion_Reymundo.html`
- `Contrato_Cesion_Reina.pdf` & `Contrato_Cesion_Reina.html`
- `Hoja_Sanitaria_Reina.pdf` & `Hoja_Sanitaria_Reina.html`

Todos los cambios, plantillas y fuentes quedaron respaldados en el repositorio Git (`https://github.com/legrandpetit-source/origen-canino2.git`, rama `main`).

---

**Firmado y auditado por:**  
Patricio Padilla Legrand Petit & Antigravity Multi-Agent System

