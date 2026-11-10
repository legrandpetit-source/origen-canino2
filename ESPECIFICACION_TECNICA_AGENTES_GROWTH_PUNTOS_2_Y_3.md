# Especificación Técnica y Plan de Implementación
## Sistema de Crecimiento: Agentes de Prospección de Alianzas y Motor SEO (Puntos 2 y 3)

**Proyecto:** Origen Canino (`origencanino.cl`)  
**Fecha de Documentación:** 10 de Noviembre de 2026  
**Autor:** PPV Soluciones (Patricio Padilla V.)  
**Estado:** ✅ IMPLEMENTADO Y OPERATIVO EN PRODUCCIÓN (10 de Noviembre de 2026)  

---

## 1. Visión General y Objetivos de Negocio

Tras haber completado con éxito la **Fase 1 (Infraestructura SEO, Pre-renderizado SSR, Calculadora en Hero, Captura de Leads y Blindaje de Referidos)**, este documento detalla la arquitectura, modelos de datos, endpoints y componentes frontend para ejecutar los dos módulos pendientes:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                ARQUITECTURA DE CRECIMIENTO                              │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│   PUNTO 2: AGENTE 1                      │   PUNTO 3: AGENTE 2                         │
│   VET & PARTNER SCRAPER (ALIANZAS)       │   CANINE NUTRITION SEO ENGINE (TRÁFICO B2C) │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ • Prospección de Clínicas, Peluquerías, │ • Motor de Artículos Técnicos Veterinarios  │
│   Hoteles Caninos y Criadores de Razas.  │ • Enfoque en Alergias, BARF y Transición.   │
│ • Algoritmo de Lead Scoring (0 a 100).   │ • Rich Snippets (Schema Article + FAQPage). │
│ • Enriquecimiento de WhatsApp e IG.      │ • Widget CTA directo a Calculadora de Hero. │
│ • Gestión y Asignación en /admin.        │ • Generador de Guiones para Reels / TikTok. │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 2. PUNTO 2: Agente 1 - Vet & Pet Partner Scraper (Alianzas Estratégicas)

### 2.1. Propósito
Automatizar la prospección de negocios y profesionales del mundo canino en zonas geográficas de alto poder adquisitivo y con logística de despacho activa (Santiago y V Región), para convertirlos en **Embajadores Comerciales de Origen Canino** que recomienden la comida a cambio de una comisión recurrente o beneficios.

### 2.2. Nichos y Zonas Objetivo
* **Categorías:**
  1. `veterinaria`: Clínicas veterinarias (énfasis en dermatología, gastroenterología y medicina holística/integrativa).
  2. `grooming`: Peluquerías caninas y centros de estética canina.
  3. `hotel_guarderia`: Hoteles caninos, guarderías de día y adiestradores.
  4. `criador`: Criadores responsables de razas con alta prevalencia de alergias alimentarias y dermatitis (Bulldog Francés, Bulldog Inglés, Pug, Westie, Shar Pei, Golden Retriever).
* **Zonas Prioritarias:**
  * **Santiago:** Las Condes, Vitacura, Lo Barnechea, Providencia, Ñuñoa, La Reina, Chicureo/Colina.
  * **V Región:** Concón, Viña del Mar, Algarrobo, Valparaíso.

### 2.3. Modelo de Datos PostgreSQL (`partner_prospects`)
Se creará la siguiente tabla relacional en `backend/server_db.py`:

```sql
CREATE TABLE IF NOT EXISTS partner_prospects (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'veterinaria', 'grooming', 'hotel_guarderia', 'criador', 'adiestrador'
    zone_comuna VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    email VARCHAR(150),
    instagram VARCHAR(100),
    website TEXT,
    google_rating NUMERIC(3, 2),
    reviews_count INT DEFAULT 0,
    lead_score INT DEFAULT 50, -- Puntaje de afinidad 0-100
    status VARCHAR(50) DEFAULT 'nuevo', -- 'nuevo', 'contactado', 'en_conversacion', 'aliado_activo', 'descartado'
    notes TEXT,
    ambassador_code VARCHAR(50), -- Código asignado si se convierte en embajador
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_category ON partner_prospects(category);
CREATE INDEX IF NOT EXISTS idx_partner_comuna ON partner_prospects(zone_comuna);
CREATE INDEX IF NOT EXISTS idx_partner_status ON partner_prospects(status);
```

### 2.4. Algoritmo de Lead Scoring (Puntaje de Afinidad 0 - 100)
El agente calcula automáticamente un puntaje para priorizar los mejores prospectos:
* **Comuna Premium / Zona de Cobertura (+25 pts):** Providencia, Las Condes, Vitacura, Concón, Algarrobo.
* **Especialidad / Nicho Crítico (+25 pts):** Veterinaria holística, dermatología o razas alérgicas.
* **Reputación (+15 pts):** Calificación en Google Maps ≥ 4.6 estrellas y más de 20 reseñas.
* **Contacto Directo (+20 pts):** WhatsApp móvil verificado o Instagram activo disponible.
* **Presencia Digital (+15 pts):** Sitio web propio activo.

### 2.5. Arquitectura del Agente Scraper (`backend/agents/scraper_partners.py`)
* Motor basado en Python con búsqueda semántica y parseo estructurado de Google Maps / Places API pública.
* Limpieza y normalización de números telefónicos a formato internacional chileno (`+569XXXXXXXX`).
* Detección de perfiles de Instagram para contacto por mensaje directo.
* Evita duplicados verificando teléfono, nombre comercial o dirección antes de insertar.

### 2.6. Endpoints FastAPI para Gestión de Prospectos
* `POST /api/admin/partners/scrape`: Dispara una ronda de búsqueda para una comuna y categoría seleccionada.
* `GET /api/admin/partners`: Lista prospectos con filtros por nicho, comuna, score y estado.
* `PUT /api/admin/partners/{id}/status`: Actualiza estado y notas de seguimiento.
* `POST /api/admin/partners/{id}/assign-code`: Asigna o genera un código de embajador con 1 clic (`VET-ALGARROBO`, `GROOMING-CONCON`) sincronizándolo con el sistema de comisiones.

### 2.7. Interfaz en el Admin Panel (`src/components/admin/PartnersManager.jsx`)
* **Barra de Métricas:** Total Prospectos, Alta Prioridad (Score > 75), En Conversación, Aliados Activos.
* **Lanzador de Búsqueda:** Selector interactivo de Comuna + Nicho con botón *"Buscar Prospectos con IA"*.
* **Tabla de Contactos:** Muestra nombre, rating, WhatsApp, Instagram y score de afinidad.
* **Acciones Rápidas con 1 Toque:**
  * Botón **"WhatsApp"**: Abre chat con mensaje pre-redactado personalizado según el nombre del negocio:
    > *«Hola [Nombre Negocio], te escribo de Origen Canino en [Comuna]. Vemos que atienden a muchos perritos con problemas de piel y digestión sensible. Nos gustaría presentarles nuestro programa de recomendación médica y dejarles muestras de nuestras dietas naturales...»*
  * Botón **"Crear Código Embajador"**: Vincula al aliado inmediatamente.

---

## 3. PUNTO 3: Agente 2 - Canine Nutrition SEO Engine (Tráfico Orgánico B2C)

### 3.1. Propósito
Convertir a `origencanino.cl` en la autoridad #1 de Chile en búsquedas de nutrición canina, problemas digestivos y transición de pellet a comida natural, atrayendo visitas gratuitas y altamente cualificadas que conviertan en clientes recurrentes.

### 3.2. Banco de Intenciones de Búsqueda de Alta Conversión (Keywords Long-Tail)
1. **Problemas Digestivos y Transición:**
   * *"Cómo hacer la transición de pellet a comida natural cocida sin diarrea"*
   * *"Mi perro no quiere comer pellet: soluciones y comida real"*
2. **Alergias y Dermatitis:**
   * *"Mejor alimentación para bulldog francés con alergia a la piel en Chile"*
   * *"Perro se rasca mucho y tiene granitos: comida hipoalergénica vs dieta natural"*
3. **BARF vs Cocinada:**
   * *"Diferencia entre Dieta BARF cruda y comida cocinada al vapor: ¿cuál elegir?"*
   * *"Beneficios del caldo de huesos para perros senior y articulaciones"*

### 3.3. Arquitectura del Generador de Contenido (`backend/agents/seo_content_engine.py`)
El agente utiliza el cliente LLM configurado en el backend (`Groq` / `Gemini`) con un System Prompt especializado en nutrición de carnívoros, veterinaria integrativa y copywriting de conversión médica.

**Entradas del Prompt:**
* Tema o Dolor Clínico (ej: "Dermatitis por comida en razas braquicéfalas").
* Raza objetivo y Comuna/Región (ej: Bulldog Francés, Providencia / Viña del Mar).
* Tipo de Dieta recomendada (BARF o Cocinada).

**Salidas Estructuradas que Produce el Agente (JSON):**
```json
{
  "title": "Dieta Natural para Bulldog Francés con Alergia de Piel en Chile: Guía Definitiva",
  "slug": "dieta-natural-bulldog-frances-alergia-piel-chile",
  "excerpt": "¿Tu Bulldog Francés sufre de alergias constantes, picazón y heces blandas? Descubre por qué los ultraprocesados empeoran su piel y cómo la comida real elimina los síntomas.",
  "category": "Salud y Alergias",
  "read_time": "5 min",
  "content_html": "<article>...</article>",
  "meta_title": "Comida Natural para Bulldog Francés con Alergia | Origen Canino",
  "meta_description": "Tratamiento nutricional para alergias en Bulldog Francés. Dietas 100% naturales libres de harinas y químicos en Santiago y V Región.",
  "faq_schema": [
    {
      "question": "¿Por qué el Bulldog Francés es tan propenso a las alergias de piel?",
      "answer": "Debido a su predisposición genética y a la sensibilidad digestiva ante carbohidratos y conservantes artificiales presentes en los pellets comerciales..."
    }
  ],
  "social_script": {
    "hook": "Si tu Bulldog Francés vive con las patas rojas o rascándose las orejas, no es solo calor: es su comida.",
    "problem": "El 80% de las alergias de piel son inflamación digestiva por harinas y químicos del pellet.",
    "solution": "Al cambiar a proteína real grado humano, la piel se desinflama en menos de 21 días.",
    "cta": "Calcula la porción exacta de tu perrito en origencanino.cl y pide tu pack de transición."
  }
}
```

### 3.4. Inserción de Widget Interactivo en el Artículo
Cada artículo generado incluye automáticamente un componente visual con llamado a la acción:
* **Caja de Diagnóstico Rápido:**
  > *«¿Quieres saber cuántos gramos de comida real necesita tu perrito según su peso y alergias? [Calcular Ración Diaria en 1 Clic →]»*
* Al hacer clic, redirige al usuario a `https://origencanino.cl/#calculadora`, conectando el lector del blog con el captador de leads del Hero.

### 3.5. Automatización de Rich Snippets SEO (Google Search Console)
Al publicarse el artículo, el sistema genera automáticamente:
* Marcado estructurado **`Schema.org/Article`** (autor, fechas, imagen).
* Marcado estructurado **`Schema.org/FAQPage`** con las preguntas y respuestas generadas, lo que permite a Google mostrar **menús desplegables con respuestas directamente en los resultados de búsqueda**, multiplicando el CTR (tasa de clics).
* Inyección instantánea en el `sitemap.xml` para indexación prioritaria por Googlebot.

### 3.6. Interfaz Editorial en `/admin` (`BlogManager.jsx` Mejorado)
* **Pestaña "Generador IA de Artículos":**
  * Campo de palabra clave o selección de tema recomendado.
  * Selector de tono (Médico/Técnico, Cercano/Educativo).
  * Botón *"Generar Artículo Completo con IA"*.
* **Editor y Vista Previa:**
  * Revisión del texto, imágenes sugeridas y metadatos.
  * Vista previa del acordeón de FAQs (Preguntas Frecuentes).
  * Tarjeta con el **Guion de Redes Sociales (Reels/TikTok)** listo para copiar y grabar.
* **Estados de Publicación:** Guardar como `Borrador` o `Publicar Inmediatamente`.

---

## 4. Plan de Ejecución Paso a Paso

Para garantizar orden, calidad y cero interrupciones en la tienda activa, el desarrollo se ejecutará en 3 etapas:

```
[ PASO 1: Base de Datos y Backend de Alianzas (Agente 1) ]
  ├── 1.1 Crear tabla `partner_prospects` en server_db.py
  ├── 1.2 Implementar servicio scraper_partners.py con scoring
  └── 1.3 Crear endpoints REST en main.py (/api/admin/partners/*)

[ PASO 2: Motor SEO y Generador de Artículos (Agente 2) ]
  ├── 2.1 Implementar servicio seo_content_engine.py (LLM + Rich Snippets)
  ├── 2.2 Integrar Schema FAQPage en renderizado SSR del blog
  └── 2.3 Crear endpoints REST en main.py (/api/admin/blog/generate-ai)

[ PASO 3: Interfaz de Control en Admin Panel ]
  ├── 3.1 Crear componente PartnersManager.jsx (Prospección y WhatsApp)
  ├── 3.2 Extender BlogManager.jsx con generación IA y guiones de redes
  └── 3.3 Compilar frontend, pruebas de integración y despliegue a producción
```

---

## 5. Medición del Retorno de Inversión (KPIs)
1. **Agente 1 (Alianzas):** Meta de 50 clínicas/peluquerías prospectadas por semana; tasa de conversión a embajador activo del 8-12%.
2. **Agente 2 (SEO):** Meta de 4 artículos técnicos mensuales indexados con FAQPage; incremento progresivo del tráfico orgánico no de marca (+25% mensual) y aumento de uso de la Calculadora de Raciones.

---

---

## 6. Estado de Ejecución y Despliegue (Auditado 10 Noviembre 2026)

- [x] **Paso 1 (Agente 1 - Alianzas):** Completado. Scraper de alianzas con lead scoring, generación de códigos embajador (`VET-CONDES-77`), pitch adaptado a WhatsApp e integración visual en `PartnersManager.jsx`.
- [x] **Paso 2 (Agente 2 - Motor SEO):** Completado. Generador de artículos con Groq LLaMA 3.3 70B, Schema.org FAQPage para Rich Snippets, guiones para TikTok/Reels de 45s con gancho copiable y estado de aprobación humana.
- [x] **Paso 3 (Admin Panel & Producción):** Completado. Pestañas `"Alianzas Vet & Pet"` y `"Blog SEO IA"` activas y operativas en `https://origencanino.cl/admin`.

> ✅ **Hito Cumplido:** Ambos agentes de crecimiento se encuentran 100% operativos en el panel administrativo de producción.

