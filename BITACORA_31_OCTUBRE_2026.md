# 🐾 BITÁCORA DE TRABAJO — ORIGEN CANINO
**Fecha:** Sábado, 31 de Octubre de 2026  
**Responsables:** Patricio Padilla (PPV Soluciones) & Antigravity  
**Ambiente:** Producción (VPS Hetzner `167.233.122.18` / Dominio: `https://origencanino.cl`)  
**Base de Datos:** Neon PostgreSQL Serverless (AWS US-East-2 Pooler)  
**Repositorio:** `https://github.com/legrandpetit-source/origen-canino2.git` (Rama: `main`)

---

## 📌 Resumen Ejecutivo de la Jornada
Durante esta sesión se completó la modernización integral del flujo comercial, seguridad, pasarelas de pago y experiencia del cliente para Origen Canino, logrando que la plataforma esté 100% operativa, conectada y probada en producción:

1. **Seguridad Administrativa & 2FA con Bot Oficial de Telegram.**
2. **Pasarela de Pago Mercado Pago con Webhook IPN en Producción.**
3. **Portal de Clientes (`/mi-cuenta`), Perfiles de Mascotas y Repetición de Pedidos en 1 Clic.**
4. **Autocompletado Inteligente en Checkout y Selector Rápido de Perritos Guardados.**
5. **Transparencia en el Modelo de Suscripción Mensual Recurrente.**
6. **Corrección de Pesos y Unidades Dinámicas en Carrito (`400 g`, `500 ml`, `1 Kg`).**
7. **Despliegue Exitoso en Contenedor Docker de Producción y Sincronización en Git.**

---

## 🚀 1. Seguridad de Acceso: Bot de Telegram & 2FA Oficial

### Contexto
Se requería desacoplar el acceso administrativo de bots genéricos anteriores y asegurar que todo intento de inicio de sesión estuviese protegido por un segundo factor dinámico enviado directamente a Patricio.

### Implementaciones Realizadas
- **Creación del Bot Oficial:** Se configuró el bot `@OrigenCanino_bot` en Telegram (Token: `9089876682:AAFeQDNJLqt7qGodbf7EH3fh5gTHlMH2FSQ`).
- **Chat ID Oficial:** Vinculado al Chat ID de Patricio (`1468481915`).
- **Mecanismo 2FA:** 
  - Al ingresar credenciales correctas en `/admin`, el backend genera un código criptográfico de 6 dígitos numéricos con expiración estricta de 5 minutos.
  - El código se despacha instantáneamente vía Telegram con detalles de IP y hora.
  - Al validar el código, se emite un JWT firmado para la sesión de administrador.
- **Panel de Seguridad (`SecurityManager.jsx`):**
  - Cambio seguro de contraseña de administrador.
  - Visualización del registro de auditoría (`admin_security_logs`) con IP, User-Agent, fecha y evento (login exitoso, intento fallido, etc.).

---

## 💳 2. Integración Oficial de Mercado Pago

### Contexto
Se activaron las credenciales de producción comerciales de la empresa bajo el nombre comercial **TASTYBARF**.

### Implementaciones Realizadas
- **Credenciales de Producción en Base de Datos (`system_settings`):**
  - **ID de Aplicación / Colector:** `2223011524`
  - **Access Token:** `APP_USR-4144595041885166-103118-bcbc9b3400092209b991236c0251dc4b-2223011524`
  - **Public Key:** `APP_USR-a1644d75-2a1c-48bc-8513-ca18540c04d1`
- **Creación de Preferencias (`/api/payments/mercadopago/create-preference`):**
  - Genera la preferencia con `items` desglosados, costo de envío, y URLs de retorno (`back_urls` a `https://origencanino.cl/?payment=success`).
  - Redirecciona de forma segura a Checkout Pro (débito, crédito, prepago o dinero en cuenta MP).
- **Configuración de Webhooks IPN:**
  - URL configurada en Mercado Pago Developers: `https://origencanino.cl/api/webhooks/mercadopago`
  - Al recibir la notificación de pago aprobado, el backend actualiza la orden a `Pagado (Mercado Pago)` y envía un mensaje de confirmación con emoji y detalle a Telegram.
- **Doble Opción de Pago:** El checkout mantiene ambas alternativas: Mercado Pago (aprobación automática) o Transferencia Bancaria Directa (validación manual con datos de cuenta corriente).

---

## 🐶 3. Portal de Clientes, Gestión de Mascotas y Repetición de Pedidos ("Paso 2")

### Contexto
A través de audio, Patricio señaló que los clientes habituales que compran cada 15 o 30 días no debían verse obligados a rellenar manualmente su nombre, teléfono, dirección, comuna, datos del perro y peso cada vez que compran. Se aprobó la implementación de una arquitectura robusta de cuentas de cliente.

### Base de Datos (Neon PostgreSQL)
Se crearon las tablas relacionales:
- `customers`: `id`, `name`, `email` (único, lowercase), `password_hash` (bcrypt), `phone`, `address`, `city`, `region`, `created_at`, `updated_at`.
- `customer_dogs`: `id`, `customer_id` (FK), `name`, `weight` (numérico), `age_stage` (etapa), `favorite_diet`, `notes`, `created_at`.
- `orders.customer_id`: Columna añadida para vincular automáticamente órdenes históricas al perfil del cliente según coincidencia de email.

### Backend (`backend/main.py`)
- `POST /api/customer/register`: Registro de cliente + mascota inicial + generación de token JWT.
- `POST /api/customer/login`: Autenticación por email y contraseña.
- `GET /api/customer/me`: Carga del perfil completo del cliente y todas sus mascotas registradas.
- `PUT /api/customer/profile`: Actualización de datos de despacho y contacto.
- `POST /api/customer/dogs`, `PUT /api/customer/dogs/{id}`, `DELETE /api/customer/dogs/{id}`: CRUD de perritos.
- `GET /api/customer/orders`: Historial detallado de pedidos con desglose de ítems, precios y estado.
- `POST /api/orders`: Auto-vinculación de pedidos con `customer_id` y auto-guardado de la mascota si no estaba registrada.

### Frontend
- **`src/context/CustomerContext.jsx`:** Gestión global de sesión del cliente con persistencia en `localStorage`.
- **`src/components/customer/CustomerAuthModal.jsx`:** Modal con pestañas de Login y Registro (con campos amigables para datos de mascota).
- **`src/components/customer/CustomerPortal.jsx` (`/mi-cuenta`):**
  - **Historial de Pedidos:** Tarjetas de cada compra con montos, fechas y productos.
  - **Botón "🛒 Repetir este Pedido":** Al hacer clic, carga exactamente los productos y cantidades al carrito y abre el checkout para pagar en segundos.
  - **Mis Mascotas:** Tarjetas interactivas con cálculo estimado del consumo diario (2.5% del peso corporal) y botón *"Comprar Menú para [Nombre]"*.
  - **Datos de Despacho:** Formulario editable para guardar cambios de dirección o teléfono.
- **Navbar (`src/components/layout/Navbar.jsx`):** Botón verde *"Hola, [Nombre]"* si está autenticado o *"Mi Cuenta"* si es visitante.

---

## ⚡ 4. Autocompletado en el Checkout (`CheckoutModal.jsx`)

- **Para Clientes Logueados:**
  - Al abrir el modal de compra, el formulario precarga inmediatamente nombre, teléfono (WhatsApp), email, dirección, comuna y región.
  - Si el cliente tiene mascotas guardadas, se despliega una barra de botones tipo *chip* arriba de los campos del perrito (`🐾 Rocky (14.5 kg)`). Con 1 solo clic se cargan el nombre, peso y etapa de ese perrito.
- **Para Visitantes / No Logueados:**
  - Banner destacado en tono ámbar: *«¿Ya has comprado antes en Origen Canino? Inicia sesión para autocompletar tus datos y los de tu peludo en 1 clic»*. Al iniciar sesión, se precargan los datos sin perder los productos del carrito.

---

## 🔄 5. Clarificación de la Suscripción Mensual Recurrente

### Contexto
En el carrito lateral (`CartDrawer.jsx`), el checkbox anterior decía escuetamente *"Suscribirme a este pedido"*. Patricio requirió especificar que se trata de una suscripción **mensual programada**, con aviso previo antes de despachar y cobro correspondiente.

### Implementaciones Realizadas
- **Nuevo texto del checkbox:**
  **«🔄 Suscribirme a entrega mensual con este pedido»** acompañada del badge visible `10% OFF + Envío Gratis`.
  Subtítulo: *"Recibe este mismo pedido automáticamente cada 30 días sin preocuparte de volver a comprar."*
- **Caja explicativa transparente:**
  > ℹ️ **¿Cómo funciona tu suscripción mensual?**  
  > *Usted se está suscribiendo a una mensualidad donde se le avisará previamente por WhatsApp para coordinar el despacho del pedido y se generará el cobro correspondiente con su 10% de descuento y despacho gratis garantizados.*  
  > ✓ *Sin contratos ni ataduras* &nbsp;|&nbsp; ✓ *Pausa o cancela cuando quieras*
- **Reflejo en Checkout:** Al proceder al pago, se muestra un banner verde confirmando que la orden incluye suscripción mensual programada.

---

## ⚖️ 6. Corrección de Pesos y Unidades Dinámicas en Carrito

### Contexto
Patricio detectó que en el carrito las **Patitas de Pollo Deshidratadas** aparecían con el texto fijo `$6.000 / kg`, a pesar de que en el mantenedor de productos estaban configuradas como **`400 g`** (y el caldo de huesos como **`500 ml`**).

### Diagnóstico y Solución
- Se identificó que la línea 84 de `CartDrawer.jsx` tenía hardcodeado el texto `/ kg`.
- Se reemplazó por la lectura dinámica del atributo `item.weight`:
  `${item.price.toLocaleString('es-CL')} {item.weight ? \`/ \${item.weight}\` : ''}`
- Se implementó la función helper `parseWeightToKg(weightStr)` para que productos de `400 g`, `500 g`, etc. se conviertan matemáticamente a su equivalente en kilogramos (0.4 kg, 0.5 kg).
- El umbral de **10 kg mínimos** para la suscripción mensual ahora evalúa el peso real de los alimentos de dietas (evitando que snacks deshidratados se contabilicen erróneamente como kilos completos de comida).
- En el checkout y en el mensaje de Telegram ahora se detalla el peso de cada producto: `1x Patitas de Pollo Deshidratadas (400 g)`.

---

## 📦 7. Resumen de Commits y Despliegues

| Commit | Descripción |
| :--- | :--- |
| `1768a8b` | `feat: portal de clientes, gestión de mascotas y autocompletado en checkout` |
| `66b7d51` | `fix(cart): clarificar suscripción mensual con cobro recurrente y explicación detallada` |
| `2ccf7c0` | `fix(cart): mostrar peso dinamico del producto en carrito y calcular kilos reales para suscripcion` |

- **Hash del Bundle en Producción:** `index-CTc7pRbn.js` / `index-sAyQP9y6.css`.
- **Servidor:** Hetzner Cloud `167.233.122.18`, contenedor Coolify activo.
- **Verificación:** HTTP 200 OK en `https://origencanino.cl` con certificados SSL válidos emitidos por Let's Encrypt.
