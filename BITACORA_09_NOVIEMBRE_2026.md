# Bitácora de Desarrollo - 09 de Noviembre de 2026
**Proyecto:** Origen Canino (`origencanino.cl`)  
**Responsable Técnico:** PPV Soluciones (Patricio Padilla V.)  
**Entorno:** Producción (VPS Hetzner `167.233.122.18` / Docker / Coolify / PostgreSQL `origen-canino-db`)

---

## 1. Resumen Ejecutivo de la Jornada
Durante la jornada del 9 de noviembre de 2026 se completó al 100% el **Módulo 0 y la Fase 1 del Plan de Tráfico, SEO y Conversión Web**, resolviendo bloqueos críticos de indexación en Google, optimizando la captura de prospectos (CRO) en portada y blindando el sistema de referidos contra comisiones no ganadas y cuentas falsas.

Todos los cambios fueron verificados, compilados y desplegados en caliente en el contenedor de producción.

---

## 2. Trabajo Realizado y Desplegado en Producción Hoy

### A. Infraestructura Técnica de Indexación y SEO (`backend/main.py`)
1. **Sitemap XML Dinámico (`/sitemap.xml`):**
   - Corrección del encabezado XML que rompía la validación en Google Search Console (`<?xml version="1.0" encoding="UTF-8"?>`).
   - Exclusión de rutas privadas (`/admin`, `/api/`).
   - Inclusión dinámica de artículos de blog con `<lastmod>` sincronizado desde PostgreSQL, frecuencia semanal y prioridad diferenciada.
2. **Robots.txt Dinámico (`/robots.txt`):**
   - Configuración limpia permitiendo indexación de `/`, `/blog/`, `/uploads/` y bloqueando `/admin`, `/api/` y `/mi-cuenta`.
3. **Pre-renderizado SSR y Meta-Tags para Googlebot en el Blog:**
   - Inyección de metadatos dinámicos Open Graph, Twitter Cards y Schema.org (`BlogPosting`) desde FastAPI al servir `/blog/{slug}`.
   - Pre-hidratación semántica en `<div id="root">` y lectura instantánea en `BlogPost.jsx` vía `#server-blog-post`.
   - **Resultado:** Se eliminó de raíz la indexación del mensaje de error *"Artículo no encontrado. Volver a Origen Canino"*.

### B. Conversión en Portada (CRO) y Captura de Leads
1. **Calculadora Interactiva en el Hero (`HeroCalculator.jsx` y `Home.jsx`):**
   - Ración diaria en gramos según peso, raza, actividad y patologías (alergias, digestión sensible, sobrepeso).
   - Presupuesto mensual estimado y promoción del **Pack de Transición (7 a 10 días)** a bajo riesgo ($14.900 CLP).
2. **Captura de Leads y Notificación Dual (`POST /api/leads`):**
   - Creación de tabla relacional `leads` en PostgreSQL con parámetros de atribución UTM.
   - Notificación instantánea enriquecida al bot de Telegram `@OrigenCanino_bot`.
   - Generación de enlace directo a WhatsApp pre-llenado con los datos calculados del perrito.
3. **Compactación Visual del Home:**
   - Reducción del espaciado vertical excesivo entre secciones (`py-16 md:py-24` → `py-6 md:py-8`), mejorando el scroll y la densidad de contenido en dispositivos móviles.

### C. UX Móvil y Seguridad del Club de Clientes
1. **Botón Flotante Draggable (`FloatingFirstOrderPromo.jsx`):**
   - Se habilitó arrastre libre (`drag`, `dragMomentum={false}`) con el dedo o mouse en la pastilla naranja *10% OFF 1RA COMPRA*.
   - Permite al usuario despejar la esquina inferior derecha para leer el pie de página (*"Desarrollado por PPV Soluciones"*) sin estorbar la navegación.
2. **Blindaje de Cuentas y Limpieza de Modal (`CustomerAuthModal.jsx`):**
   - **Eliminación del registro manual de cuentas:** Se suprimió la pestaña *"Unirme al Club"* para erradicar cuentas falsas o bots. Las cuentas ahora se crean **estrictamente de forma automática al completar una compra real**.
   - **Corrección de interfaz móvil:** Se resguardó el margen superior derecho (`pr-9 pl-1`) para que el botón de cerrar (`X`) nunca se superponga con el badge del club.
   - Se mantuvieron las 3 tarjetas de beneficios (10% OFF a amigos, $5.000 CLP de ganancia y Ficha Nutricional).

### D. Auditoría, Blindaje y Limpieza del Sistema de Referidos (Prueba de María)
1. **Diagnóstico del Fallo Detectado en Terreno:**
   - Durante una compra simulada por María, ella no ingresó el código `CANELO-742`, pero el sistema silenciosamente le acreditó $5.000 CLP a Patricio por haber quedado almacenado el parámetro `?ref=` en `sessionStorage`.
2. **Corrección de Código Frontend y Backend:**
   - **Campo de cupón 100% limpio por defecto:** Se eliminó la precarga automática de `localStorage`/`sessionStorage` en `CheckoutModal.jsx` y `FloatingFirstOrderPromo.jsx`. El usuario debe tipear o pegar el código activamente y pulsar *"Aplicar"*.
   - **Validación estricta de referidos:** El campo `referral_code` solo se envía y se procesa si el comprador aplicó efectivamente el código del amigo como su cupón de descuento (`ref_code == coupon_code`).
   - **Botón de Copia en Banner Superior (`Home.jsx`):** Se añadió un botón con ícono de copiar junto al código en el banner verde de bienvenida con feedback visual instantáneo (*"¡Copiado!"*).
3. **Depuración de la Base de Datos (`origen-canino-db`):**
   - Eliminada la transacción de prueba `#1` en `referral_transactions`.
   - Desvinculado el `referral_code` del pedido `#3` (`UPDATE orders SET referral_code = NULL WHERE id = 3;`).
   - Billetera de Patricio Padilla reseteada a `$0.00 CLP` y contador de amigos que compraron reseteado a `0`.

---

## 3. Estado del Despliegue en Producción
* **Último Commit en `main`:** `7bb9456` (*fix(checkout): deshabilitar cupones por defecto, requerir canje activo para referidos y agregar boton de copiar en banner*).
* **Contenedor Activo:** `t3axkro5sddkevfhqih195r4` (Coolify / Traefik / Hetzner).
* **Bundle JS Vite:** `dist/assets/index-CDfhtfMl.js` (HTTP 200 OK verificado en `https://origencanino.cl`).

---

## 4. Próximos Pasos Pendientes (Puntos 2 y 3 del Plan de Crecimiento)

Siguiendo la especificación técnica general, las siguientes fases a implementar son:

### 📌 Pendiente Punto 2: Agente 1 - Vet & Pet Partner Scraper (Alianzas B2B y Nichos)
* **Objetivo:** Prospección y captación automatizada de aliados estratégicos que recomienden Origen Canino en Santiago y la Quinta Región a cambio de beneficios o comisiones de embajadores.
* **Componentes a desarrollar:**
  1. **Scraper de Nichos Específicos (Python / Playwright / Google Maps API):**
     - Clínicas veterinarias integrativas, holísticas y tradicionales.
     - Peluquerías caninas, hoteles caninos, paseadores y adiestradores certificados.
     - Zonas objetivo: Providencia, Las Condes, Vitacura, Ñuñoa, La Reina, Concón, Viña del Mar, Algarrobo.
     - Detección de criadores de razas con alta prevalencia de alergias (Bulldog Francés, Bulldog Inglés, Pug, Westie, Shar Pei).
  2. **Pipeline de Enriquecimiento y Lead Scoring:**
     - Extracción de datos de contacto limpios (WhatsApp comercial, Instagram, email de dirección/compras).
     - Puntuación de afinidad (Lead Score) para priorizar contacto.
  3. **Módulo de Gestión en Admin Panel:**
     - Vista en `/admin` para auditar prospectos veterinarios, cambiar estados (Nuevo, Contactado, Aliado Activo) y asignarles código de embajador oficial.

### 📌 Pendiente Punto 3: Agente 2 - Canine Nutrition SEO Engine (Tráfico Orgánico B2C)
* **Objetivo:** Posicionar a `origencanino.cl` como el referente orgánico #1 en Chile sobre nutrición natural y resolución de patologías caninas (alergias alimentarias, dermatitis, diarreas crónicas por pellet).
* **Componentes a desarrollar:**
  1. **Generador Automatizado de Artículos Técnicos (LLM + RAG de Nutrición Canina):**
     - Creación de artículos optimizados para SEO Local respondiendo búsquedas de alta intención de compra:
       * *"Cómo cambiar de pellet a comida natural o BARF sin diarrea"*
       * *"Dieta natural para bulldog francés con alergia de piel en Chile"*
       * *"Comida cocida vs BARF para perros con estómago sensible"*
  2. **Inyección de Rich Snippets & Enlaces a la Calculadora:**
     - Automatización de esquemas JSON-LD (`Schema.org/Article` y `FAQPage`).
     - Inserción contextual de llamados a la acción (CTAs) que lleven directamente al lector a calcular la ración de su perro en la portada.
  3. **Generador de Guiones de Contenido Social:**
     - Derivación automática de guiones cortos (Reels / TikTok / Instagram Carousels) a partir de cada artículo generado para alimentar la distribución en redes sociales.
