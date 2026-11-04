# Bitácora de Desarrollo - Origen Canino 2
**Fecha:** 3 de Noviembre de 2026  
**Proyecto:** Origen Canino 2 (`https://origencanino.cl`)  
**Servidor de Producción:** Hetzner VPS `167.233.122.18` (Container `5bdfecb7cd53`, DB `origen-canino-db`)  
**Repositorio:** `https://github.com/legrandpetit-source/origen-canino2.git` (`main`)

---

## 1. Resumen Ejecutivo de Avances Realizados Hoy

### 1.1 Migración e Infraestructura de Base de Datos
- Migración exitosa de SQLite local a PostgreSQL 17 Alpine en Hetzner (`origen_canino`, usuario `origen_user`).
- Vinculación a través de red interna Docker `coolify` con persistencia de volumen `origen_canino_postgres_data`.
- Tablas activas y operativas: `products`, `orders`, `ingredients`, `recipes`, `posts`, `testimonials`, `nfc_buildings`, `system_settings`, `admins`, `customers`, `dogs`.

### 1.2 Panel de Administración `/admin` 100% Aislado
- Se separó la ruta `/admin` en `App.jsx`, eliminando del panel de administración todos los elementos de la tienda (`TopBanner`, `Navbar`, `CartDrawer` y `Footer`).
- Sidebar administrativo propio con cabecera de marca, logotipo y enlace rápido "Ver Tienda ↗".
- Implementación del botón y modal **"+ Agregar Nuevo Producto"** con selector de categoría (*BARF*, *Comida Cocinada*, *Snacks*), selector de imágenes con compresión WebP, ingredientes y beneficios.
- Implementación del endpoint backend `POST /api/products` con inserción directa en PostgreSQL.

### 1.3 Motor de Optimización y Compresión de Imágenes a WebP
- **Compresión en Navegador:** Redimensionamiento proporcional a máx. 1200px y transcodificación directa a formato WebP (`quality: 0.82`) mediante HTML5 Canvas antes de transferir datos.
- **Compresión en Servidor:** Función en FastAPI con Pillow (`ImageOps.exif_transpose`, `Resampling.LANCZOS`, modo RGB/RGBA y guardado `.webp` optimizado).
- **Optimización de Assets Críticos del Sitio:**
  - `logo.jpg` / `logo_origen_canino.jpg` → `logo.webp`: Reducción del **60.4%** (de 99.7 KB a 39.5 KB). Referencias actualizadas en `index.html`, `Navbar`, `Home`, `SplashScreen`, `ProductCard` y `AdminPanel`.
  - `delivery_map.jpg` → `delivery_map.webp`: Reducción del **96.1%** (de 331.4 KB a 12.8 KB). Referencia actualizada en `DeliveryArea.jsx`.

### 1.4 Reglas de Compra Mínima ($30.000 CLP)
- **Carrito (`CartDrawer`):** Barra de progreso interactiva que calcula en tiempo real cuánto resta para alcanzar el umbral de $30.000 CLP. Bloquea el botón de "Ir al Pago" si no se cumple el requisito.
- **Checkout (`CheckoutModal`):** Validación frontal que impide el procesamiento de órdenes inferiores a $30.000 CLP.
- **Backend (`POST /api/orders`):** Validación estricta con rechazo HTTP 400 Bad Request si `subtotal < 30000`.

### 1.5 Auditoría y Explicación del 10% de Primera Compra
- Módulo administrable desde `/admin` en la sección **"Promociones & 1ra Compra"** respaldado en `system_settings`.
- Validación dual: verificación en cliente vía `localStorage` y validación estricta en base de datos mediante `GET /api/promotions/check-eligibility?email=...` comprobando si el cliente posee órdenes previas distintas de 'Cancelado'.
- Exclusión no acumulativa para evitar duplicidad si el cliente opta por suscripción mensual.

### 1.6 Fotografía de Dieta BARF Molida y Preparación de Medios
- Generación de nueva fotografía profesional de **Dieta BARF Cruda Molida** con textura de carne de vacuno triturada con vísceras y hueso carnoso, vegetales picados y yema de huevo en el cuenco cerámico oficial.
- Creación de carpeta accesible para el usuario en:  
  📁 `/home/patricio/Descargas/fotos_productos_origen_canino/` con:
  - `dieta-barf-molida.jpg`
  - `dieta-cocinada-cerdo.jpg`
  - `patitas-pollo.jpg`
  - `caldo-huesos.jpg`
  - `pack-inicia-cerdo.jpg`

---

## 2. Temas Pendientes y Orden de Prioridad para Mañana

| Prioridad | Tarea / Módulo | Descripción Detallada |
| :---: | :--- | :--- |
| **P1** | **Rediseño de la Calculadora de Ración Canina (`CalculatorModal.jsx`)** | Implementar la maqueta Stitch aprobada por el usuario:<br>• Selector de tipo: BARF vs Cocinada al vapor.<br>• Paso 1: Input de peso con etiquetas de tamaño (*Toy*, *Pequeño*, *Mediano*, *Grande*, *Gigante*).<br>• Paso 2: Selector de etapa: Cachorros (2-4m 10%, 4-6m 8%, 6-8m 6%, 8-10m 4%, 10-12m 3%) y Adultos/Senior (Normal 3%, Media 2.5%, Baja 2%).<br>• Tarjeta de resultados: Ración diaria en gramos (tomas recomendadas) e inversión mensual sugerida.<br>• **Excluir** elementos tachados por el usuario (no incluir badge 15% OFF suscripción ni la lista de 4 viñetas de suscripción). |
| **P2** | **Rediseño de "Planes Sugeridos - Guía de Compra Mensual" (`SuggestedPlans.jsx`)** | Integrar tarjetas de planes mensuales para:<br>• Perro Pequeño (1 a 10 kg, 3 a 6 kg/mes, Desde $24.000 CLP).<br>• Perro Mediano (11 a 25 kg, 9 a 15 kg/mes, Desde $72.000 CLP) - Destacado *Más Común*.<br>• Perro Grande (26+ kg, 18+ kg/mes, Desde $144.000 CLP). |
| **P3** | **Actualización de "Nuestras Especialidades" (`Especialidades.jsx`)** | Aplicar el diseño de dos columnas con badges de temperatura/características biológicas y desglose de composición SAG (60% huesos carnosos, 30% carne magra, 10% vísceras) vs cocción suave al vapor a 85°C. |
| **P4** | **Actualización de "Criterio Nutricional" (`ComparisonTable.jsx`)** | Reflejar la tabla comparativa oficial entre Pellet Comercial, Origen Canino Cocinada y Origen Canino BARF (Humedad Natural, Digestibilidad, Grado Humano, Conservantes, Salud Dental). |
| **P5** | **Optimización y Estilo de "Zonas de Despacho" (`DeliveryArea.jsx`)** | Ajustar visualización del mapa WebP junto con las tarjetas detalladas de días de entrega para Región Metropolitana (Lunes, Miércoles, Viernes) y V Región (Martes y Jueves). |
| **P6** | **Carga final de fotos de productos en WebP desde `/admin`** | Apoyar al usuario en la edición/guardado de los productos existentes para que la base de datos apunte definitivamente a los archivos `.webp` en `/uploads/products/`. |

---

## 3. Estado de la Rama Git y Despliegue
- **Rama:** `main` al día con `origin/main` (últimos commits: `6079fac`, `91710b8`, `24835c2`).
- **Servidor:** Docker container `5bdfecb7cd53` actualizado y corriendo con el último bundle compilado.
