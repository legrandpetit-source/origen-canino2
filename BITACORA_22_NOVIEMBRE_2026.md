# Bitácora de Desarrollo — Origen Canino (`origencanino.cl`)
**Fecha:** Domingo 22 de Noviembre de 2026

## 1. Sección "Familia Origen Canino — Comparte Salud Real" en el Home
- **Archivo nuevo:** `src/components/shop/AmbassadorCommunitySection.jsx`
- **Ubicación:** Insertada en `src/components/shop/Home.jsx` inmediatamente después de `<Testimonials />`.
- **Enfoque y tono:** Firme, educativo y empático — crea conciencia sobre los alimentos ultraprocesados sin culpar a tutores, celebrando a todos los perros por igual.
- **Separación clara de beneficios (cero confusión entre % y kilos):**
  - **Primera compra:** `10% de Descuento` en el total del primer pedido (`BIENVENIDO10` o código de amigo).
  - **Club de Embajadores:** Invita amigos con código/QR personal → el amigo recibe **10% de descuento** (mínimo `$30.000` CLP) y el embajador acumula **`$5.000` CLP** ilimitados en su billetera.
- **Navegación directa:** CTA hacia `/mi-cuenta?tab=referrals` (con soporte de query param `?tab=` agregado en `src/components/customer/CustomerPortal.jsx`).

## 2. Regla Diferenciada de Referidos (`10%` General vs `15%` Código Fundador `CANELO-742`)
- **Backend (`backend/main.py`):**
  - Nueva función centralizada `get_referral_terms(ref_code, settings)` y constante `SPECIAL_FOUNDER_REFERRAL_CODES = {"CANELO-742"}`.
  - **Embajadores generales:** `10% OFF` para el amigo referido + `$5.000 CLP` en billetera para el embajador (pedido mínimo `$30.000`).
  - **Código fundador `CANELO-742`:** `15% OFF` exclusivo para el amigo referido y `$0` de comisión (`check_and_award_referral` omite abono a billetera).
  - Aplicado de forma consistente en `/api/customer/referral`, `/api/referral/validate/{code}`, `/api/coupons/validate` y `system_settings` (`referral_friend_discount_percent = '10'` en producción).
- **Limpieza UX en Home (`src/components/shop/Home.jsx` & `FloatingFirstOrderPromo.jsx`):**
  - Cuando un visitante ingresa con `?ref=...` (`referralBanner` activo), se oculta automáticamente `<FloatingFirstOrderPromo />` para evitar colisión visual entre dos descuentos distintos.
  - En `FloatingFirstOrderPromo.jsx` se explicita **"10% de Descuento en tu primera compra"** y **"10% DESCUENTO · 1RA COMPRA"**.

## 3. Vista Previa Corporativa en Redes (Open Graph Dinámico) y Tarjeta Vertical para Historias
- **Imágenes OG corporativas (1200×630 JPEG optimizado, renderizadas con Chrome Headless + Outfit / Plus Jakarta Sans):**
  - `public/images/og-familia-origen-canino.jpg` (10% OFF / Home y embajadores generales).
  - `public/images/og-embajador-canelo.jpg` (15% OFF Exclusivo para `CANELO-742`).
  - Copy corregido con rigor nutricional a **"100% Natural · Sin Ultraprocesados"** en OG, Home Embajadores y tarjeta Story (reservando "grado humano" exclusivamente para dieta cocinada).
- **Meta tags Open Graph base y dinámicos (`index.html` + `backend/main.py`):**
  - `index.html` incorpora meta tags `og:*` y `twitter:*` corporativos por defecto.
  - `serve_frontend` en `backend/main.py` detecta `?ref=CODIGO` en la raíz e inyecta dinámicamente `og:title`, `og:description`, `og:image` y `og:url` personalizados con el nombre del embajador, su perro y el porcentaje exacto (`15%` o `10%`).
- **Portal de Clientes (`src/components/customer/CustomerPortal.jsx`):**
  - Textos dinámicos para `10%` vs `15%` (modo Embajador Fundador para `CANELO-742`).
  - Mensaje de WhatsApp 1-Toque corregido para usar `${referralInfo?.discount_percent || 10}%` con redacción cálida y empática.
  - Nuevo botón **"Descargar Tarjeta para Historia (WhatsApp / IG)"** que renderiza un PNG vertical `1080×1920` con branding de Origen Canino, el descuento del embajador, su código y su QR escaneable.

## 4. Nuevo Módulo Admin: Clientes (CRM, Soporte & Marketing Directo)
- **Planificación documentada:** `PLAN_MODULO_CLIENTES_CRM.md`.
- **Backend modular (`backend/customer_crm_routes.py` + `backend/main.py`):**
  - Migración automática segura en `customers` (`is_blocked`, `blocked_reason`, `blocked_at`, `is_deleted`, `deleted_at`, `last_login_at`, `login_count`, `visit_count`, `last_seen_at`, `admin_notes`, `tags`, `marketing_opt_in`) y tabla `customer_crm_events`.
  - Tracking real en `/api/customer/login` (logins + visitas), `/api/customer/me` (1 visita por día activo con sesión recordada) y bloqueo efectivo en `get_current_customer` (`HTTP 403`).
  - Endpoints protegidos bajo `/api/admin/customers`: directorio enriquecido con KPIs e Invitados sin cuenta, Ficha 360°, edición de soporte/notas/tags, restablecimiento de contraseña con clave temporal, bloqueo/desbloqueo, ajuste manual de billetera, eliminación/anonimización con blindaje contable, configuración SMTP y envío de campañas Email HTML.
- **Frontend (`src/components/admin/CustomersManager.jsx` + `AdminPanel.jsx`):**
  - Integrado como primera opción del grupo **Marketing y Clientes** en `/admin`.
  - 5 KPIs clicables, buscador global, chips de segmentación, filtro por comuna, ordenamiento, exportación CSV, Ficha 360° lateral, pestaña de Compradores Invitados y centro de Marketing Directo (Cola Asistida de WhatsApp con plantillas editables + Campañas Email HTML con SMTP configurable).

## 5. Evolución de Fichas de Mascotas: Fecha de Nacimiento, Etapa Dinámica y Cumpleaños en CRM
- **Base de Datos (`customer_dogs`):** Nuevas columnas `birth_date` (`DATE`), `birth_date_approx` (`BOOLEAN`) y `weight_updated_at` (`TIMESTAMP`).
- **Motor Dinámico (`backend/customer_crm_routes.py` + `backend/main.py`):** `enrich_dog_dict()` calcula en tiempo real edad exacta (`age_months`, `age_label`), etapa biológica diferenciada por peso/tamaño (Cachorro `<12m` chicos/medianos o `<15m` grandes `>=25kg`; Senior `>=8` años chicos/medianos o `>=7` años grandes), días para el próximo cumpleaños (`days_to_birthday`) y alerta `needs_weight_update` (>30 días sin actualizar peso en cachorros).
- **Portal de Clientes (`CustomerPortal.jsx`):** Modal con **Fecha de Nacimiento** + modo 1-clic *"¿No sabes la fecha exacta?"* (edad aproximada en meses/años), selector de **Dieta Habitual (BARF vs Cocinada)** con cálculo diferenciado de porción diaria, aviso suave para completar fecha en perros antiguos y recordatorio mensual de peso para cachorros.
- **CRM Admin (`CustomersManager.jsx`):** Muestra edad exacta y dieta de cada perro en tabla/Ficha 360°, más bloque **🎂 Próximos Cumpleaños Perrunos (30 días)** con botón de saludo por WhatsApp en 1 clic.

## 6. Motor de Cupones Avanzados, Kit de Difusión QR/Story, `?promo=` Directo y Lámina 10×15 SELPHY NFC
- **Cupones Avanzados (`coupons` + `backend/main.py` + `PromotionsManager.jsx`):**
  - Nuevas reglas opcionales: `min_kg` (suma solo dietas BARF + Cocinada, excluye snacks), `applicable_scope` (`all`, `diets`, `barf`, `cocinada`, `snack`), `customer_eligibility` (`all`, `first_order`, `returning`), `campaign_title` y `story_theme`.
  - Nuevo endpoint público `GET /api/promotions/public/{code}` + Open Graph dinámico en `serve_frontend` para `?promo=CODIGO`.
  - Pre-aplicación automática en `Home.jsx` / `CartContext.jsx` / `CheckoutModal.jsx` al entrar por `?promo=CODIGO` (ocultando `BIENVENIDO10`).
- **Kit de Difusión en 1 Clic (`src/utils/promoGraphics.js`):**
  - En cada cupón: link directo `?promo=CODIGO`, QR descargable PNG, Tarjeta Vertical Story `1080×1920` (4 temas visuales) y botón compartir por WhatsApp.
  - Integrado en **Clientes (CRM) → Marketing Directo** con selector **"Cargar Promoción Activa"** que rellena WhatsApp y Email HTML automáticamente.
- **Lámina Imprimible 10×15 cm (`NfcManager.jsx`):**
  - Botón **Lámina 10×15** en cada edificio NFC con vista previa y descarga PNG `1200×1800 px` (300 DPI) para **Canon SELPHY CP1500** (pedestal acrílico en L vertical), con círculo guía exacto de **25 mm (`300 px`)** arriba a la derecha para tag NTAG213, foto editorial, descuento exclusivo y QR de respaldo.

