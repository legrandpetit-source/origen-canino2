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

