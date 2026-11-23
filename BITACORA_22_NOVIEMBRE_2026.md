# Bitácora de Desarrollo — Origen Canino (`origencanino.cl`)
**Fecha:** Domingo 22 de Noviembre de 2026  
**Estado:** 100% Desplegado en Producción (Hetzner VPS) y Respaldado en GitHub (`main`)

---

## 1. Sección "Familia Origen Canino — Comparte Salud Real" en el Home
- **Archivo nuevo:** `src/components/shop/AmbassadorCommunitySection.jsx`
- **Ubicación:** Insertada en `src/components/shop/Home.jsx` inmediatamente después de `<Testimonials />`.
- **Enfoque y tono:** Firme, educativo y empático sobre dejar los ultraprocesados sin culpar a tutores, celebrando a todos los perros por igual.
- **Separación clara de beneficios (cero confusión entre % y kilos):**
  - **Primera compra:** `10% de Descuento` en el total del primer pedido (`BIENVENIDO10` o código de amigo).
  - **Club de Embajadores:** Invita amigos con código/QR personal → el amigo recibe **10% de descuento** (mínimo `$30.000` CLP) y el embajador acumula **`$5.000` CLP** ilimitados en su billetera.
- **Navegación directa:** CTA hacia `/mi-cuenta?tab=referrals` (con soporte de query param `?tab=` en `src/components/customer/CustomerPortal.jsx`).

## 2. Regla Diferenciada de Referidos (`10%` General vs `15%` Fundador `CANELO-742`)
- **Backend (`backend/main.py`):**
  - Función centralizada `get_referral_terms(ref_code, settings)` y constante `SPECIAL_FOUNDER_REFERRAL_CODES = {"CANELO-742"}`.
  - **Embajadores generales:** `10% OFF` para el amigo referido + `$5.000 CLP` en billetera (`referral_friend_discount_percent = '10'` actualizado en PostgreSQL de producción).
  - **Código fundador `CANELO-742`:** `15% OFF` exclusivo para amigos y **`$0` de comisión** (`check_and_award_referral` omite abono a billetera).
- **Limpieza UX en Home (`Home.jsx` & `FloatingFirstOrderPromo.jsx`):**
  - Cuando un visitante llega con `?ref=...` o `?promo=...`, se oculta automáticamente `<FloatingFirstOrderPromo />` para evitar colisión visual de descuentos.
  - Copy actualizado a **"10% de Descuento en tu primera compra"** y rigor nutricional **"100% Natural · Sin Ultraprocesados"** (reservando "grado humano" solo para dieta cocinada).

## 3. Open Graph Dinámico en Redes + Tarjetas OG Corporativas (1200×630)
- **Imágenes OG editoriales (renderizadas con Chrome Headless + Outfit / Plus Jakarta Sans):**
  - `public/images/og-familia-origen-canino.jpg` (10% OFF / Home y embajadores generales).
  - `public/images/og-embajador-canelo.jpg` (15% OFF Exclusivo para `CANELO-742`).
- **Meta tags dinámicos (`index.html` + `backend/main.py`):** `serve_frontend` inyecta `og:title`, `og:description`, `og:image` y `og:url` personalizados tanto para enlaces de embajadores (`?ref=CODIGO`) como para campañas promocionales (`?promo=CODIGO`).
- **Portal de Clientes (`CustomerPortal.jsx`):** Textos y WhatsApp 1-Toque dinámicos (`10%` vs `15%` Fundador) + botón **"Descargar Tarjeta para Historia (WhatsApp / IG)"** (`1080×1920` PNG con QR escaneable).

## 4. Nuevo Módulo Admin: Clientes (CRM, Soporte & Marketing Directo)
- **Documento de planificación:** `PLAN_MODULO_CLIENTES_CRM.md`.
- **Backend modular (`backend/customer_crm_routes.py` + `backend/main.py`):**
  - Migración automática segura en `customers` (`is_blocked`, `blocked_reason`, `blocked_at`, `is_deleted`, `deleted_at`, `last_login_at`, `login_count`, `visit_count`, `last_seen_at`, `admin_notes`, `tags`, `marketing_opt_in`) y tabla `customer_crm_events`.
  - Tracking real en `/api/customer/login` (logins + visitas), `/api/customer/me` (1 visita por día activo con sesión recordada) y bloqueo efectivo `HTTP 403` en `get_current_customer`.
  - Endpoints protegidos bajo `/api/admin/customers`: directorio + KPIs + Compradores Invitados sin cuenta, Ficha 360°, edición de soporte/notas/tags, restablecimiento de clave temporal con envío directo por WhatsApp, bloqueo/desbloqueo, ajuste manual de billetera, eliminación/anonimización con blindaje contable, configuración SMTP, campañas Email HTML y gestión de eventos CRM (`DELETE /api/admin/customers/crm-event/{id}`).
  - **Confirmación real de envío WhatsApp:** `whatsapp_sent` solo se registra cuando administración confirma explícitamente haber enviado el mensaje (eliminando falsos positivos al abrir `wa.me`).
- **Frontend (`src/components/admin/CustomersManager.jsx` + `AdminPanel.jsx`):**
  - Ubicado como primera opción del grupo **Marketing y Clientes** en `/admin`.
  - 5 KPIs clicables, buscador global, chips de segmentación, filtro por comuna, exportación CSV, pestaña de Invitados, Ficha 360° lateral, acceso directo con ojito a ficha/edición de mascotas desde tabla y Ficha 360°, y centro de Marketing Directo (Cola Asistida de WhatsApp + Campañas Email HTML + selector **"Cargar Promoción Activa"**).

## 5. Evolución de Fichas de Mascotas: Fecha de Nacimiento, Etapa Dinámica y Cumpleaños
- **Base de Datos (`customer_dogs`):** Nuevas columnas `birth_date` (`DATE`), `birth_date_approx` (`BOOLEAN`) y `weight_updated_at` (`TIMESTAMP`).
- **Motor Dinámico (`enrich_dog_dict`):** Calcula edad exacta, etapa biológica diferenciada por peso/tamaño (Cachorro `<12m` chicos/medianos o `<15m` grandes `>=25kg`; Senior `>=8` años chicos/medianos o `>=7` años grandes), días para el próximo cumpleaños y alerta mensual de actualización de peso en cachorros (`needs_weight_update`).
- **Portal de Clientes (`CustomerPortal.jsx`) y CRM Admin (`CustomersManager.jsx`):**
  - Modal completo conservando **Etapa de Vida** editable + **Dieta Habitual** (`BARF Cruda` / `Cocinada al Vapor`) + **🎂 Fecha de Nacimiento** (exacta o aproximada en meses/años), con cálculo diferenciado de porción diaria BARF vs Cocinada.
  - Bloque **🎂 Próximos Cumpleaños Perrunos (30 días)** en Clientes (CRM) con saludo WhatsApp en 1 clic.

## 6. Motor de Cupones Avanzados, Kit de Difusión Editorial y Lámina 10×15 SELPHY NFC
- **Reglas Avanzadas en `coupons` (`backend/main.py` + `PromotionsManager.jsx`):**
  - Nuevas columnas: `campaign_title`, `story_theme`, `min_kg` (suma solo dietas BARF + Cocinada, excluye snacks), `applicable_scope` (`all`, `diets`, `barf`, `cocinada`, `snack`) y `customer_eligibility` (`all`, `first_order`, `returning`).
  - Endpoint público `GET /api/promotions/public/{code}` + pre-aplicación directa al carrito al ingresar por `?promo=CODIGO` (`CartContext.jsx`, `Home.jsx`, `CheckoutModal.jsx`).
- **Tarjetas Verticales Story (`1080×1920` PNG) en 4 Temas Editoriales (`src/utils/promoGraphics.js`):**
  - Rediseño editorial full-bleed con una sola fuente (`Outfit`), medallón protagonista del logo, foto personalizable y 4 temas (*Oliva Origen*, *Naranjo Miel*, *Especial Navidad*, *VIP Oscuro & Dorado*), vista previa en vivo en `PromotionsManager.jsx`.
  - Copy corregido para explicar claramente **Dieta BARF y Comida Cocinada** sin repetir el porcentaje ni exponer descripciones internas del cupón, más campo opcional editable *"Texto descriptivo en la Story"*.
- **Lámina Imprimible 10×15 cm para Canon SELPHY CP1500 (`NfcManager.jsx` + `promoGraphics.js`):**
  - Rediseño editorial full-bleed `1200×1800 px` (`10×15 cm` @ 300 DPI) vertical para pedestal acrílico en L, con margen seguro de `5.5 mm`, logo circular grande arriba izquierda, **círculo guía exacto de 25 mm (`300 px`)** en naranjo dorado arriba derecha para sticker `NTAG213` y QR de respaldo abajo.
  - Rutas fijas editables + subida en vivo desde el modal:
    - Foto principal: `public/images/nfc-lamina-hero.jpg` (`1200 × 1120 px`).
    - Logo oficial: `public/logo.webp` (`512 × 512 px` cuadrado).

---

## Commits Desplegados en la Jornada (`origin/main`)
- `4ef596b` — Familia Origen Canino en Home, 10% general vs 15% `CANELO-742`, OG dinámico y tarjeta Story PNG.
- `88c492e` — Rediseño editorial OG 1200×630 con Chrome Headless y corrección de rigor nutricional (*100% Natural*).
- `6bad473` — Módulo Admin `Clientes (CRM)` 360°, control de cuentas, visitas/logins, WhatsApp asistido y Email SMTP.
- `3b062c2` — Fix nombres de columnas SQL (`delivery_status`, `discount_amount`, `price_at_purchase`) en queries CRM.
- `215a719` — Fecha de nacimiento, etapa dinámica, ración BARF vs Cocinada, recordatorio de peso cachorros y cumpleaños CRM.
- `104ead8` — Confirmación explícita de envío WhatsApp en CRM, borrado de eventos y formato limpio de etapa.
- `4126b46` — Acceso directo con ojito a ficha/edición de mascotas desde tabla CRM y Ficha 360°.
- `736dc95` — Restitución del campo `Etapa de Vida` editable junto a `Fecha de Nacimiento` y `Dieta Habitual`.
- `d1c7458` — Motor de cupones avanzados (`min_kg`, alcance, elegibilidad), Kit de Difusión QR/Story, `?promo=` directo, CRM promo loader y Lámina 10×15 SELPHY NFC.
- `5ae8380` — Ajuste padding sello lámina NFC 10×15 y bitácora.
- `14c8a67` — Rediseño editorial full-bleed de Lámina 10×15 SELPHY con foto y logo intercambiables.
- `ff123b3` — Rediseño editorial full-bleed de Tarjetas Story 1080×1920 en 4 temas con vista previa en vivo.
- `60b1bee` — Copy comercial claro (Dieta BARF y Comida Cocinada) en Story sin repetir % ni mostrar descripciones internas.

## Pendientes / Sugerencias para Continuar Mañana
1. Cargar en **Clientes (CRM)** las fechas exactas de nacimiento de los perros de Legrand Petit (`Momo`, `Reina`, `Máximo`, `Canelo`, `Morocha`) usando el acceso directo con ojito.
2. Hacer una impresión de prueba de la **Lámina 10×15** en la **Canon SELPHY CP1500** para validar calce físico del tag `NTAG213` (25 mm) en el pedestal en L.
3. Revisar si se desea crear los primeros cupones avanzados reales (ej. *Mayorista +50 kg* o campaña de temporada) y probar su difusión en WhatsApp/Instagram.
