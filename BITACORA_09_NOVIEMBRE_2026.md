# Bitácora de Desarrollo - 09 de Noviembre de 2026
**Proyecto:** Origen Canino (`origencanino.cl`)  
**Fase Ejecutada:** Fase 1 - Hotfixes Críticos de SEO, Indexación Googlebot, Calculadora Interactiva en Hero y Captura de Leads CRO con Notificación Telegram + WhatsApp.

---

## 1. Diagnóstico de Problemas Detectados

1. **Fallo Crítico de Indexación en Google Search Console:**
   - La generación del archivo `sitemap.xml` en `backend/main.py` contenía un error sintáctico (`<?xml version="1.0" encoding="UTF-8"%s>`), lo que invalidaba el XML ante los bots de búsqueda.
   - El sitemap incluía indebidamente la ruta privada `/admin`.
   - No existía endpoint para `/robots.txt`, devolviendo el HTML fallback de la SPA en vez de directivas limpias para motores de búsqueda.
2. **Indexación de Texto "Artículo no encontrado" en el Blog:**
   - Al ser una SPA (Single Page Application) sin Server-Side Rendering (SSR), cuando Googlebot o las redes sociales rastreaban URLs como `/blog/alimentos-prohibidos-perros`, el servidor servía un `index.html` genérico.
   - Si la petición asíncrona `/api/blog/{slug}` tardaba o fallaba en el sandbox del bot, React renderizaba el estado de error por defecto: *"Artículo no encontrado. Volver a Origen Canino"*, el cual quedaba indexado en Google.
3. **Fuga de Conversión en Portada (CRO):**
   - La portada presentaba una imagen estática y un botón que abría un modal secundario, desaprovechando el área más valiosa del viewport (*Above the Fold*).
   - No existía un captador de prospectos (leads) que guardara los datos del perro y del tutor antes de enviar al WhatsApp.

---

## 2. Soluciones e Implementaciones Técnicas (Fase 1)

### A. Corrección de Infraestructura SEO y Robots (`backend/main.py`)
* **Sitemap XML Válido (`GET /sitemap.xml`):**
  - Se corrigió el encabezado XML a estándar estricto: `<?xml version="1.0" encoding="UTF-8"?>`.
  - Se removió `/admin` y se agregaron prioridades y frecuencias diferenciadas:
    - `/` (Prioridad 1.0, semanal)
    - `/#tienda` (Prioridad 0.9, diaria)
    - `/#planes` y `/#transicion` (Prioridad 0.8, mensual)
    - `/blog/{slug}` dinámicos con `<lastmod>` extraído de la base de datos PostgreSQL, `<changefreq>weekly</changefreq>` y `<priority>0.8</priority>`.
* **Robots.txt Dinámico (`GET /robots.txt`):**
  - Configurado con directivas limpias permitiendo `/`, `/blog/` y `/uploads/`, bloqueando `/admin`, `/api/` y `/mi-cuenta`, y enlazando `Sitemap: https://origencanino.cl/sitemap.xml`.

### B. Pre-renderizado SEO y Meta Inyección para Artículos de Blog
* **Intercepción en Backend (`backend/main.py`):**
  - Al recibir una solicitud GET para `/blog/{slug}`, FastAPI consulta el artículo activo en PostgreSQL (`blog_posts`).
  - Inyecta dinámicamente en el `<head>` del HTML:
    - `<title>{title} | Origen Canino Blog</title>`
    - `<meta name="description" content="{excerpt}">`
    - Metadatos Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type=article`)
    - Twitter Card tags
    - Datos Estructurados JSON-LD (`Schema.org/BlogPosting`) con autor, fecha de publicación y logo oficial.
    - Script de datos pre-hidratados: `<script id="server-blog-post" type="application/json">...</script>`.
    - Contenido semántico pre-renderizado dentro de `<div id="root">` para que Googlebot indexe el texto inmediatamente sin requerir ejecución de JavaScript.
* **Hidratación Instantánea en Frontend (`src/components/shop/BlogPost.jsx`):**
  - El componente React ahora lee primero el script `#server-blog-post` inyectado por FastAPI.
  - Si los datos ya están en el DOM, inicializa el estado inmediatamente sin mostrar pantalla de carga (*cero spinners, cero parpadeos y cero posibilidad de mostrar "Artículo no encontrado"*).

### C. Calculadora Interactiva en el Hero (`HeroCalculator.jsx` y `Home.jsx`)
* **Ubicación Estratégica en Portada:**
  - Se reemplazó la tarjeta estática del Hero por un componente interactivo de alta conversión embebido en la portada.
* **Parámetros Médicos Configurables en Tiempo Real:**
  - Nombre y Raza del perro (con selectores rápidos para razas propensas a alergias).
  - Selector de peso interactivo con presets (4kg, 10kg, 15kg, 25kg, 35kg), slider y campo numérico.
  - Tipo de dieta: Dieta BARF Cruda o Dieta Cocinada al Vapor.
  - Etapa de vida: Cachorro (<12m), Adulto, Senior.
  - Nivel de actividad y condiciones de salud (Alergias de piel, Digestión sensible, Sobrepeso).
* **Métricas en Tiempo Real para el Dueño:**
  - Ración diaria en gramos (desglosada en 2 tomas diarias).
  - Consumo mensual estimado en kilogramos y número de packs al vacío.
  - Inversión mensual estimada con 10% de descuento de bienvenida aplicado.
  - **Llamado al Pack de Transición (7 a 10 días):** Oferta de entrada de bajo riesgo ($14.900 CLP) para adaptar la flora digestiva sin diarreas.

### D. Captura de Leads y Flujo Dual Telegram + WhatsApp
* **Nueva Tabla Relacional en Base de Datos (`server_db.py`):**
  - Se creó la tabla `leads` con campos para tutor, teléfono, email, datos del perro (raza, edad, peso, dieta, gramos, costo estimado, patologías), dirección IP, estado y parámetros de atribución UTM (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`).
* **Endpoint de Captura (`POST /api/leads`):**
  - Sanitiza el teléfono, aplica rate limiting defensivo contra spam (máx. 10 peticiones cada 5 minutos por IP) y almacena el prospecto.
  - **Alerta Inmediata a Telegram (`notify_telegram`):** Despacha una notificación con formato enriquecido al bot `@OrigenCanino_bot` para alertar en tiempo real a Patricio y su equipo.
  - **Enlace Directo a WhatsApp:** Genera y retorna una URL pre-llenada (`https://wa.me/56974436590?text=...`) con los datos del perro y la ración calculada para que el cliente continúe la conversación de inmediato con el equipo de ventas.
* **Endpoint de Consulta Administrativa (`GET /api/admin/leads`):**
  - Permite a los administradores y futuros agentes autónomos auditar los prospectos captados.

---

## 3. Verificación y Resultados Técnicos

1. **Compilación de Backend (Python 3.12):**
   - `python3 -m py_compile backend/main.py`: Código de salida `0` (Sintaxis validada).
   - `python3 -m py_compile backend/server_db.py`: Código de salida `0` (Sintaxis validada).
2. **Compilación de Frontend (Vite 5.4):**
   - `npm run build`: Compilación exitosa en `10.16s`.
   - Generados chunks de producción en `dist/`.

