# 📓 Bitácora de Trabajo — Origen Canino & Ecosistema PPV (`origencanino.cl`)

**Fecha:** Martes 17 de Noviembre de 2026  
**Responsable:** Patricio Padilla (PPV Soluciones)  
**Servidor de Producción:** Hetzner Cloud VPS `167.233.122.18` (Ubuntu 24.04 / 2 vCPUs / 4 GB RAM / 40 GB NVMe)  
**Estado General:** Motor de lotes FIFO, regla de frescura y costos indirectos 100% operativos en producción.

---

## 🎯 Objetivo de la Jornada
Una vez cerrado y estabilizado el ciclo de producción, trazabilidad y stock FIFO semanal, la jornada de hoy se enfoca en dos módulos estratégicos:
1. **Módulo Productos:** Definición y estructuración de recetas base por producto.
2. **Módulo Finanzas:** Cierre del ciclo integral de costos de producción vs. ingresos reales.

---

## 📋 1. Módulo Productos: Recetas Base y Estandarización de Ficha Técnica

### A. Recetas Base por Menú / Producto:
- **Problema Actual:** Al crear un lote nuevo de un producto que no tiene un lote previo, el usuario debe agregar manualmente los ingredientes uno a uno o usar "Copiar Último Lote".
- **Objetivo:**
  - Asociar a cada producto del catálogo (`products`) su **Receta Maestra / Estándar** predeterminada:
    1. **Dieta BARF Cruda Pollo (1 Kg):** Proporciones biológicas estándar (carnes, huesos carnosos, vísceras, frutas/verduras, suplementos).
    2. **Dieta Cocinada Cerdo Suave (1 Kg):** Cortes magros de cerdo, vegetales cocidos, fuente de calcio y omega 3.
    3. **Patitas de Pollo Deshidratadas (400 g):** 100% patitas de pollo con ratio de merma por evaporación (~50%).
    4. **Caldo de Huesos Funcional (500 ml):** Huesos de vacuno/pollo, vinagre de manzana orgánico, agua filtrada y cocción 24h.
    5. **Calugas Articulares / Suplemento (500 g):** Base de gelatina de caldo concentrado, cúrcuma y colágeno natural.
  - Al seleccionar un producto en el formulario de lote, precargar de forma automática la receta base recomendada con sus porcentajes y cantidades sugeridas.

### B. Enriquecimiento de Ficha Comercial:
- Revisión de la información nutricional visible para el cliente final en la tienda.
- Validación de fotos, descripciones de conservación, modos de descongelación y gramajes por paquete.

---

## 💰 2. Módulo Finanzas: Cierre del Ciclo de Stock y Rentabilidad Real

### A. Conciliación de Costo de Ventas (COGS) con Lotes FIFO:
- Conectar los pedidos despachados/entregados con los lotes de donde salieron los kilos.
- Determinar con exactitud milimétrica el costo real de la mercadería vendida en base al costo del batch de origen (insumos + costos indirectos prorrateados).

### B. Balance de Margen Líquido Consolidado:
- Contrastar:
  - **Ingresos Reales:** Cobros efectivos por Mercado Pago y transferencias bancarias.
  - **Costos Variables:** Insumos cárnicos, vegetales y suplementos por lote.
  - **Costos Operativos Indirectos:** Luz de deshidratador, gas de cocción lenta, envases doypack/frascos, desuñado/gelificación artesanal.
  - **Costos de Última Milla:** Despacho refrigerado protegido por el mínimo de $30.000 CLP.
- Presentar en el panel de Finanzas el margen bruto y neto desglosado por línea de negocio (BARF, Cocinado, Snacks, Caldos, Suplementos).

---

## 4. 🛠️ Implementación: Salidas No Comerciales y Ajuste de Stock en Lotes FIFO

### A. Diagnóstico y Caso de Uso Real:
- Tras la validación exitosa del primer lote de *Patitas de Pollo Deshidratadas* (17 bolsas envasadas de 400g, comprobadas en la tienda online con tope de compra exacto), se detectó la necesidad de registrar **salidas no comerciales**:
  1. **Autoconsumo Canino:** Retiro de comida para alimentación de perros propios del taller (ej. Momo, Reina).
  2. **Muestras y Regalos Comerciales:** Degustaciones a veterinarios aliados o clientes fidelizados.
  3. **Mermas Post-Envasado:** Rotura de bolsa/frasco o descarte por control de calidad.
  4. **Ajuste de Conteo Físico:** Cuadratura de existencias tras auditoría en congelador.

### B. Módulos Desarrollados:
1. **Base de Datos (PostgreSQL):**
   - Tabla `batch_ajustes_stock` creada con campos: `batch_id`, `tipo_movimiento`, `cantidad_gramos`, `unidades_equivalentes`, `costo_unitario_kg_clp`, `costo_total_ajuste_clp`, `motivo_detalle`, `usuario`, `created_at`.
2. **Backend FastAPI (`backend/batch_routes.py`):**
   - `POST /api/admin/batches/{batch_id}/adjust-stock`: Descuenta o suma stock con validación de no sobre-descuento, actualiza el estado a `AGOTADO` si llega a 0, calcula el costo atribuido y registra el asiento inmutable.
   - `PATCH /api/admin/batches/{batch_id}`: Actualiza fecha de vencimiento y notas generales.
   - `GET /api/admin/batches`: Ahora incluye el array `ajustes` para cada lote.
3. **Frontend Admin (`BatchProductionManager.jsx`):**
   - Botón **`[✏️ Editar]`** en la columna de acciones de la tabla FIFO.
   - Modal interactivo de ajuste: selector de Kilos vs. Bolsas/Frascos, badges de motivo con 1 clic, cálculo en tiempo real de nuevo stock y costo atribuido.
   - Ficha `Ver Lote`: Sección "Salidas No Comerciales y Ajustes Manuales" para trazabilidad total junto con los despachos a clientes.


### 🏗️ Migración Arquitectónica Hetzner: Docker Compose Nativo (Desmonte de Coolify)
- Configuración de `docker-compose.yml` nativo idéntico al esquema de éxito de TimbrApp.
- Desmontar contenedores de Coolify para recuperar **~700 MB - 1 GB de RAM** y eliminar para siempre las compilaciones residuales en disco.
- Conmutación con cero caída de servicio (*Zero-Downtime*).

---

## 5. 🛡️ Blindaje Integral de Stock en Carrito, Cross-Sell y Límite de Unidades (Incidente Resuelto)

### A. Diagnóstico del Incidente:
- Al armar un pedido con el stock máximo disponible de un producto (ej. 17 bolsas de Patitas de Pollo), el Drawer del Carrito recomendaba en la sección inferior *"¿Te gustaría agregar algo más?"* productos sin lote activo (Calugas Articulares, Dieta Cocinada Cerdo, Caldo de Huesos) con botones `[Agregar]` activos.
- Al agregarlos, el usuario podía además presionar el botón `+` sin límite dentro del carrito.
- **Causa Raíz:**
  1. `CartDrawer.jsx`: El filtro `productsToSuggest` no verificaba `stock_disponible_gramos`.
  2. `CartContext.jsx`: `addItem` y `updateQuantity` tenían la condición `if (product.has_batches && product.stock_disponible_gramos != null)`. Al no tener lotes activos, `has_batches` era `false`, omitiendo el control y asumiendo stock infinito.
  3. Botón `+`: No se deshabilitaba al alcanzar el stock tope de lote.

### B. Solución Desplegada (Commit `d5092fa`):
1. **`backend/main.py` (`/api/products`):** Normalización estricta para devolver siempre `stock_disponible_gramos: 0` (entero, nunca `null`/`None`) cuando no haya lote activo.
2. **`CartContext.jsx`:** Implementación de `catalogStock` reactivo. Bloqueo total en `addItem` si `maxQty <= 0`. Tope estricto en `updateQuantity` a `Math.min(newQuantity, maxQty)`.
3. **`CartDrawer.jsx`:**
   - Filtro estricto en `productsToSuggest`: Solo ofrece productos con `maxAvailable > 0`. Si no hay stock disponible en el catálogo, la sección se oculta automáticamente.
   - Botón `+` deshabilitado visualmente (`opacity-30 cursor-not-allowed`) al alcanzar el tope del lote con leyenda explicativa (`Máximo disponible`).
   - Detección de productos agotados con etiqueta roja `⚠️ Lote semanal agotado` y bloqueo preventivo del botón de pago si existe algún ítem agotado.
4. **Verificación en Producción:**
   - Desplegado en contenedor `282e2a36a8ab` en Hetzner VPS (`origencanino.cl`).
   - Probado: Calugas, Cerdo y Caldo ya no se ofrecen ni se pueden agregar. Patitas de Pollo respeta exactamente sus 17 bolsas de tope.


