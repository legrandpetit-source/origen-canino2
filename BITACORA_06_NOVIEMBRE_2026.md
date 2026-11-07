# Bitácora de Desarrollo - Origen Canino 2
**Fecha:** 6 de Noviembre de 2026 (Cierre de Jornada Nocturna)  
**Proyecto:** Origen Canino 2 (`https://origencanino.cl`)  
**Servidor de Producción:** Hetzner VPS `167.233.122.18` (Container App Coolify, DB `origen-canino-db`)  
**Repositorio:** `https://github.com/legrandpetit-source/origen-canino2.git` (`main`)

---

## 1. Resumen Ejecutivo de Avances Realizados en la Jornada

### 1.1 Motor Dinámico de Cupones y Promociones
- **PostgreSQL en Producción:**
  - Creación de tabla `coupons` con atributos completos: `code` (único en mayúsculas), `description`, `discount_type` (`percentage` o `fixed`), `discount_value`, `min_order_amount`, `max_discount_amount`, `usage_limit`, `usage_per_customer`, `times_used`, `start_date`, `end_date`, `is_active`.
  - Creación de tabla `coupon_usages` para auditoría contable y control estricto de canjes por cliente/correo.
  - Nuevas columnas: `customer_dogs.photo_url` y `orders.coupon_code`.
- **Backend FastAPI:**
  - Endpoint de validación pública `POST /api/promotions/validate`: verifica vigencia, compra mínima, límite por usuario y calcula el descuento al instante (% o monto fijo en $ CLP).
  - Endpoints CRUD administrativos: `GET`, `POST`, `PUT`, `DELETE /api/admin/promotions`.
  - Integración en `POST /api/orders`: incremento automático de `times_used` y registro en `coupon_usages`.
- **Panel Administrativo (`/admin` -> Promociones y Cupones):**
  - Vista en dos sub-pestañas: *Cupones de Campaña* y *1ra Compra (Automática)*.
  - Modal para crear y editar cupones con selector de tipo (% o $), compra mínima, topes y fechas.
  - Tarjetas visuales de cupones con métricas de uso en vivo, switch de activación rápida y botón de copiado.

### 1.2 Checkout y Corrección de Seguridad Crítica
- **Validación dinámica:** La casilla de cupón en el checkout ahora consulta en tiempo real a la API y refleja el descuento exacto con desglose visual.
- **Blindaje de Códigos (Fix de Seguridad):** Se corrigió de inmediato el *placeholder* de la caja de texto que filtraba códigos de prueba (`Ej: BIENVENIDO10, CANELO15`), sustituyéndolo por un texto neutro y profesional: `"Ingresa tu código aquí"`.
- **Pausa de cupón de prueba:** El cupón de prueba `CANELO15` quedó marcado como inactivo (`is_active = false`) en base de datos.

### 1.3 Perfil de Clientes (`/mi-cuenta`): Limpieza y Fotos de Mascotas
- **Depuración estética del encabezado:** Se eliminó el cuadro contenedor con el logo redundante que estaba junto al saludo, permitiendo que *"¡Hola, Patricio Padilla!"* y el badge de *Cliente Nutrición Real* se alineen elegantemente a la izquierda.
- **Fotografía de perritos en WebP:**
  - Soporte en tarjetas de mascotas para foto de perfil con botón de cámara integrado.
  - Endpoint `POST /api/customer/dogs/{dog_id}/upload-photo`: comprime con Pillow a formato WebP ultraliviano (máx 800x800, calidad 82) y elimina cualquier foto anterior para conservar estrictamente **una sola foto por perrito**.
  - Campo opcional en la ficha para notas de salud y alergias (ej: "Sensible al pollo").

---

## 2. Planificación y Tareas Clave para Mañana

| Prioridad | Tarea / Módulo | Descripción Detallada |
| :---: | :--- | :--- |
| **P1** | **Pruebas Globales End-to-End (QA)** | **Auditoría integral del ciclo de compra:**<br>• Registro y reconocimiento de clientes nuevos vs recurrentes.<br>• Selección de mascota y auto-asignación de raciones en el pedido.<br>• Aplicación de cupones (% y monto fijo) y verificación de compra mínima ($30.000).<br>• Validación de medios de pago: Mercado Pago (Webhooks/Preferencia) y Transferencia Bancaria.<br>• Comprobación de estados en Panel Admin (Logística, preparación con cadena de frío y despacho). |
| **P2** | **Diseño de Acrílicos con Integración NFC** | **Material gráfico para condominios y edificios:**<br>• Diseñar un par de piezas gráficas para los soportes acrílicos con chip NFC integrado.<br>• Incluir llamado a la acción (*Call to Action*), propuesta de valor de nutrición natural y QR de respaldo.<br>• Conectar con las rutas de comunidad existentes (`/c/:slug`) que otorgan el descuento comunitario por edificio. |

---

## 3. Estado de Despliegue e Infraestructura
- **Repositorio:** Sincronizado en rama `main` en GitHub.
- **Bundle Frontend Activo:** `assets/index-BK3B3SNL.js` y `assets/index-DboOrQKK.css`.
- **Servidor:** Hetzner VPS `167.233.122.18` operando con Nginx SSL y PostgreSQL 17 Alpine en `origen-canino-db`.

---

## 4. Jornada Mañana - 6 de Noviembre de 2026: Blindaje Hardware NFC y Formulario Dinámico

### 4.1 Programador y Blindaje NFC en Panel Administrativo (`/admin` -> Puntos NFC)
- **Modal Integrado de Grabación y Blindaje:**
  - Nueva acción principal en tarjetas de edificios: **"Programar Chip NFC"** con acceso directo a hardware.
  - Selección de dos niveles de seguridad según el caso de uso:
    1. **Blindado Total (Solo Lectura Permanente - Quemado por Hardware):** Recomendado para acrílicos instalados en conserjerías de condominios. El chip se convierte irreversiblemente en ROM. Ningún usuario con apps externas (como *NFC Tools* o *Flipper Zero*) puede sobreescribir la URL ni inyectar enlaces fraudulentos.
    2. **Modo Prueba / Protegido por Contraseña:** Para chips de taller/desarrollo que requieran ser regrabados.
- **Seguridad de Contraseñas (Sin Hardcodeo):**
  - La clave de seguridad NFC **NO queda escrita en el código fuente**.
  - Se administra dinámicamente desde un formulario con visualización segura (toggle ver/ocultar) y botón de copiado.
  - Se persiste en la tabla `system_settings` de PostgreSQL a través de los nuevos endpoints `GET /api/admin/nfc-settings` y `POST /api/admin/nfc-settings`.
- **Soporte de Web NFC en el Navegador:**
  - Integración nativa con `NDEFReader` para teléfonos Android (Google Chrome). Permite grabar y aplicar `makeReadOnly()` tocando físicamente el chip con el teléfono desde el panel web de Origen Canino, sin instalar aplicaciones adicionales.
  - En dispositivos de escritorio o sin antena Web NFC, el modal ofrece una guía guiada paso a paso con botones para copiar la URL exacta y la clave para herramientas externas (como *NFC Tools* o *NXP TagWriter*).

### 4.2 Sistema de Referidos y Embajadores por QR ("Vendedores sin Sueldo") - Implementado de Punta a Punta
- **Base de Datos Hetzner PostgreSQL (`origen-canino-db`):**
  - Nuevas columnas en `customers`: `referral_code` (único, ej: `CANELO-742`), `wallet_balance` (billetera virtual), `referred_by_customer_id`.
  - Nueva tabla `referral_transactions`: auditoría contable de recompensas ganadas (`reward_earned`) y saldos utilizados (`wallet_spent`).
  - Columnas en `orders`: `referral_code` y `wallet_discount`.
  - Configuración inicial en `system_settings`: 15% OFF de bienvenida para el amigo, $5.000 CLP de abono por compra para el embajador, $30.000 compra mínima.
  - Asignación de código exclusivo `CANELO-742` para Patricio Padilla.
- **Backend FastAPI:**
  - Auto-generación de códigos mnemotécnicos únicos al registrarse nuevos clientes (`generate_customer_referral_code`).
  - Endpoint de perfil de referidos `GET /api/customer/referral` (datos de QR, enlace compartible, amigos compradores y saldo).
  - Endpoint de validación pública `GET /api/referral/validate/{code}`.
  - Integración en `POST /api/promotions/validate`: detecta automáticamente si el código ingresado en el checkout es de un amigo embajador y aplica el 15% OFF con mensaje personalizado.
  - Deducción de billetera en `POST /api/orders`: si el cliente usa su saldo disponible, se descuenta directamente del total a pagar.
  - Acreditación automática antifraude (`check_and_award_referral`): acredita los $5.000 a la billetera del cliente promotor cuando el pedido del amigo pasa a estado `Pagado` (Mercado Pago o Transferencia confirmada), con notificación en tiempo real a Telegram.
  - Endpoints administrativos: `GET /api/admin/referrals/summary` y `POST /api/admin/referrals/settings`.
- **Frontend y Experiencia de Usuario:**
  - Pestaña **"Invita y Gana 🐾"** en el Portal de Clientes (`/mi-cuenta`):
    - Generador de Códigos QR en alta resolución nativo con `qrcode.react`.
    - Botón de compartir en WhatsApp con 1 toque con mensaje pre-redactado.
    - Tarjeta de Billetera Virtual con saldo disponible y desglose de amigos compradores.
  - Detección en Home (`?ref=CODE`): Banner cálido de bienvenida anunciando el regalo de su amigo y pre-cargando el descuento.
  - Integración en Checkout: Soporte para pagar usando el saldo acumulado de billetera virtual.

## 5. Jornada Tarde - 6 de Noviembre de 2026: Contratos de Cesión (Reymundo y Momo Casanova) y Cierre

### 5.1 Redacción y Generación de Contratos Legales (Ley N° 21.020 y Código Civil)
- **Carpeta Centralizada en Escritorio:** Se estructuró la carpeta `/home/patricio/Escritorio/contratos/` con versiones en Markdown, plantillas de impresión HTML y PDFs de alta fidelidad generados con Chrome Headless.
- **Contrato de Cesión de Reymundo (Fernanda Valcárcel Estrada - RUT 20.107.504-1):**
  - Ejemplar: *Legrand Petit Reymundo* (Chip `991003003617249`, nacido el 20/01/2026).
  - Obligatoriedad de nutrición 100% natural exclusiva (Tasty Barf / `origencanino.cl`), cero pellets procesados.
  - Consulta médica prioritaria a Patricio Padilla para decisiones clínicas consensuadas.
  - Cláusula de entrega formal en el acto: Entrega de **cartilla sanitaria completa** + **Declaración de Origen oficial del Kennel Club de Chile (KCC)** (*entregado con papeles oficiales*).
  - Diagramación optimizada para impresión en **exactamente 2 páginas**.
- **Contrato de Cesión de Momo Casanova (Sergio Francisco San Martín Campos - RUT 15.954.230-0):**
  - Ejemplar: *Legrand Petit Momo Casanova* (Chip `991003002668233`, nacido el 06/11/2023, **Campeón Chileno**).
  - Mismos pilares de bienestar, nutrición natural y consulta médica compartida.
  - **Cláusula Especial de Derechos Reproductivos y Cruzas (Cláusula Quinta):**
    * Patricio Padilla / Legrand Petit conserva el derecho de usar al ejemplar para cruzas cuando lo requiera; Sergio lo facilitará con plena disponibilidad.
    * Compromiso de Patricio de retenerlo el menor tiempo indispensable para resguardar su apego, rutina y salud psicológica (sin pago para Sergio por cruzas de Legrand Petit).
    * Sergio facultado para vender montas a terceros: **50% de los ingresos netos se transfieren a Patricio Padilla**. Chequeo sanitario previo de la hembra.
    * Cláusula de entrega formal en el acto: Entrega de **carné sanitario completo** + **Certificado Oficial de Pedigree**, dejando constancia expresa de que el Pedigree **se mantiene y continuará válidamente a nombre de su criador y propietario, Patricio Padilla**.
  - Diagramación optimizada en **exactamente 2 páginas**.

### 5.2 Estado al Cierre de la Sesión y Documentación Generada
- **Archivos de Contratos Listos en `/home/patricio/Escritorio/contratos/`:**
  - `Contrato_Cesion_Reymundo.pdf` y `.html` (2 páginas).
  - `Contrato_Cesion_Momo_Casanova.pdf` y `.html` (2 páginas).

---

## 6. Jornada Noche - 6 de Noviembre de 2026: Diagnóstico de QA en Terreno y Blindaje Hardware NFC en 2 Pasos Seguros

### 6.1 Diagnóstico del Incidente en Teléfono Android (Prueba de Patricio)
- **Síntoma reportado:** Al intentar grabar y blindar con "Blindado Total", Android arrojó *"Chrome no responde (Cerrar app / Espera)"*, el sensor NFC del teléfono se bloqueó hasta reiniciar, la URL sí se grabó pero el chip quedó abierto y *NFC Tools* lo pudo borrar con la función "Etiqueta borrada !".
- **Causa Raíz Técnica:**
  - En la especificación Web NFC de Android (Chromium), llamar `await ndef.write()` y de inmediato `await ndef.makeReadOnly()` mientras el chip sigue pegado a la antena genera un *deadlock* en el demonio del sistema operativo (`NfcService`), porque `makeReadOnly` espera un nuevo evento de descubrimiento de etiqueta que nunca ocurre si el tag no se retira del campo RF.
  - Al congelarse el proceso, la orden de quemado de bits de hardware nunca llegó al microcontrolador del tag.

### 6.2 Solución Implementada: Arquitectura de 2 Pasos Guiados con `AbortController`
- **Protección Anti-Congelamiento de Chrome:**
  - Se añadieron `AbortController` y timeouts de seguridad de 15 segundos tanto en escritura como en blindaje.
  - Si el usuario retira el chip o transcurren 15s, la antena se cancela de forma controlada y Chrome jamás se congela ni genera avisos de ANR.
- **Flujo Guiado de 2 Pasos (100% Nativo en la App Origen Canino):**
  - **Paso 1: Grabar URL en el Chip.**
    - Usuario presiona *"1. Tocar Teléfono para Grabar URL (Paso 1 de 2)"*.
    - Acerca el sticker/tarjeta al teléfono ➡️ Se escribe `https://origencanino.cl/?nfc=slug` ➡️ Vibración háptica de éxito.
    - La pantalla cambia a verde y emite instrucción clara: *"✅ Paso 1 Listo. Separa el chip de tu teléfono unos centímetros"*.
  - **Paso 2: Sellar y Quemar Blindaje Permanente (ROM).**
    - Usuario presiona el botón destacado *"🔒 Paso 2: Sellar Blindaje Permanente (ROM)"*.
    - Vuelve a acercar el chip a la antena ➡️ Se ejecuta `ndef.makeReadOnly({ signal })` con el chip entrando limpiamente al campo RF ➡️ El microcontrolador del tag sella los bits físicos de memoria.
    - Doble vibración háptica y pantalla de confirmación: *"🔒 ¡CHIP BLINDADO EXITOSAMENTE! Memoria convertida en Solo Lectura irreversible"*.
- **Resultado de Protección:** Al pasar por este Paso 2, si se abre *NFC Tools* e intenta borrarlo, arrojará error de etiqueta bloqueada por hardware.

---

### 6.3 Protocolo para Realizar la Prueba en el Teléfono Celular

1. En el teléfono Android (Chrome), abre: `https://origencanino.cl/admin` (sección *Puntos NFC*).
2. Si la página estaba abierta, realiza un refresco forzado o cierra y abre la pestaña.
3. Toca **"Programar Chip NFC"** en la tarjeta de cualquier edificio (ej: *Edificio quinta avenida*).
4. Asegúrate de tener seleccionado **"Blindado Total"**.
5. Presiona **"1. Tocar Teléfono para Grabar URL (Paso 1 de 2)"** y acerca el chip hasta que vibre.
6. **Separa el chip** de la parte trasera de tu teléfono.
7. Presiona el botón que apareció: **"🔒 Paso 2: Sellar Blindaje Permanente (ROM)"**.
8. **Vuelve a acercar el chip**: el teléfono vibrará dos veces confirmando el blindaje total.
9. **Prueba de QA con NFC Tools:** Abre *NFC Tools* ➡️ Pestaña *Otro* ➡️ *Borrar una etiqueta* ➡️ Acerca el chip. Verás que el chip **ya no se puede borrar**, quedando blindado de por vida para los acrílicos de conserjería.
