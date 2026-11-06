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


