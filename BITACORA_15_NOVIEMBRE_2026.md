# 📓 Bitácora — Origen Canino (`origencanino.cl`)

**Fecha:** Domingo 15 de Noviembre de 2026  
**Responsable:** Patricio Padilla (PPV Soluciones)  
**Servidor de Producción:** Hetzner Cloud VPS `167.233.122.18` (Coolify v4 / PostgreSQL `origen-canino-db`)  
**Commit Actual en Producción:** `58468a1` (Bundle: `index-BVHVDPzF.js`)

---

## 1. 🚀 Avances y Módulos Desplegados Hoy en Producción

### A. Módulo Completo de Lotes Semanales & Trazabilidad FIFO
- **Snapshots Inmutables por Lote (`batch_produccion`, `batch_ingredientes`, `batch_nutricion`):**
  - Registro de lotes semanales con código secuencial estandarizado (`OC-YYYY-Sww-Bxx`).
  - Entrada de ingredientes por **Kilos Reales (Kg)** con cálculo automático de % de fórmula y merma de cocción/envasado.
  - Registro detallado de **Costos Indirectos** (`Luz`, `Gas`, `Agua/Aseo`, `Envases/Etiquetas`, `Mano de Obra/Otros`), calculando el costo real exacto por kilo producido y margen bruto frente al PVP.
  - Sincronización automática de precios: si en la receta se ajusta el precio por kilo de un insumo, se actualiza el catálogo `ingredients` y se inserta el registro histórico en `ingredient_price_history`.
- **Deducción FIFO y Trazabilidad Multi-Lote:**
  - Lógica `SELECT ... FOR UPDATE` en PostgreSQL para descontar automáticamente los lotes más antiguos primero al despachar pedidos.
  - Devolución automática de stock FIFO en caso de anulación/cancelación de pedidos.
  - Módulo de **Trazabilidad / Recall** para rastrear todos los clientes y pedidos afectados ante cualquier lote comprometido.
- **Botón y Endpoint de Eliminación de Lote (`DELETE /api/admin/batches/{id}`):**
  - Permite eliminar un lote erróneo o de prueba con confirmación preventiva, limpiando en cascada sus ingredientes, nutrición, costos asociados en cocina (`kitchen_cost_history`) y recalculando el stock en tiempo real.

### B. Perfil Nutricional Ampliado con IA (Calcio, Fósforo & Micronutrientes)
- **Superación de la tabla rígida:** La IA de estimación nutricional (`/api/ingredients/estimate-nutrition` vía Groq) ahora detecta:
  - Macronutrientes base + Humedad + Cenizas.
  - **Calcio (g)** y **Fósforo (g)** considerando cortes con hueso o harina de cáscara de huevo.
  - **Micronutrientes, Vitaminas y Bioactivos Destacados** específicos del insumo (ej: *Colina*, *Taurina*, *Vitamina K*, *Vitamina A*, *Vitamina B12*, *Magnesio*, *Hierro*, *Zinc*, *Omega-3*, *Polifenoles*).
- **Cálculo ponderado del Lote:** En cada batch, los micronutrientes se suman matemáticamente en base al porcentaje real de cada ingrediente en la receta y se ajustan por el factor de merma/concentración.
- **Casillas numéricas editables:** En el panel de insumos, cada nutriente cuenta con su campo numérico directo para que el administrador pueda ajustar los valores si dispone de análisis de laboratorio propios.

### C. Experiencia de Usuario y Flujo Continuo en Insumos (`IngredientsManager.jsx`)
- **Edición Continua sin Salir:** Al editar un insumo y presionar **Guardar Cambios**, el sistema guarda en la base de datos y se mantiene en la misma pantalla con mensaje de confirmación verde `✓ Insumo "[Nombre]" guardado correctamente`.
- **Selector Rápido y Navegación:**
  - Menú desplegable en la cabecera para saltar directamente a cualquier ingrediente del catálogo.
  - Botones **`← Anterior`** y **`Siguiente →`** para recorrer la lista secuencialmente.
  - Botón **`Guardar y Siguiente ([Nombre])`** para guardar el actual y abrir el siguiente con un solo clic.
  - Botón **`Crear Nuevo Ingrediente`** directamente dentro del formulario de lote semanal (modal emergente sin perder el borrador del lote en curso).

### D. Etiqueta Dinámica de Producto (`ProductLabelGenerator.jsx`)
- **Cumplimiento y Privacidad de Receta:**
  - Eliminado el listado porcentual de ingredientes para no exponer la receta industrial propia.
  - Título limpio: *Pollo & Vegetales* (removida la frase repetitiva *"Vivos con Hueso Carnoso Molido"*).
  - Encabezado: **ESTÁNDAR AAFCO** (removida la mención provisional *"AAFCO / SAG"*).
  - Pie de etiqueta: Removida la leyenda *"Resolución SAG en Trámite"*.
  - Tabla de **Análisis Garantizado (Base Tal Cual)** con valores coherentes de humedad y proteína cruda.
  - Nueva sección: **Micronutrientes & Bioactivos Destacados (por 100g)** con la concentración real ponderada del lote.
  - Código QR dinámico enlazado a la trazabilidad del lote (`https://origencanino.cl/?lote=...`).

### E. Links Directos de Pago (`/pagar/:token`)
- Creador de links de cobro asistido y post-entrega trasladado a la pestaña **Pedidos & Cobros**.
- Desglose transparente del cobro: valor de los productos + línea detallada de despacho (\$5.000) eliminando etiquetas confusas.
- Pago integrado con Mercado Pago y transferencia bancaria directa.

### F. Infraestructura y DevOps (Hetzner VPS `167.233.122.18`)
- Desbloqueo de la cola de despliegues en **Coolify v4**: se purgó un contenedor helper zombi que bloqueaba las compilaciones automáticas.
- Pipeline verificado: Compilación limpia en Vite (`2284 módulos`, 0 errores) y despliegue exitoso al contenedor activo `03b62d68b196`.

---

## 2. 📅 Tareas Pendientes para Mañana — Lunes 16 de Noviembre de 2026

### 🐾 A. Origen Canino (`origencanino.cl`)
1. **Carga del Primer Lote Semanal Real:**
   - Crear el lote de producción definitivo con los ingredientes actualizados y pesajes reales de cocina.
   - Imprimir etiquetas de prueba con el nuevo diseño optimizado para las bolsas de 1 Kg y 500g.
2. **Validación de Deducción de Stock FIFO en Vivo:**
   - Probar un flujo de compra o asignación de pedido para validar que el descuento automático en `batch_produccion` (`stock_disponible_gramos`) y `pedido_detalle_batches` opere exactamente según lo esperado.
3. **Radar de Recompra y Alertas de Quiebre de Stock:**
   - Probar la pestaña **Demanda, Alertas \$30k & BOM** con los datos del nuevo lote para verificar las alertas tempranas de stock mínimo y la lista de compras sugerida.
4. **Trámites Tributarios / Boletas Electrónicas DTE 39 (según reunión con contador):**
   - Obtención de certificado digital del representante legal.
   - Definición del proveedor DTE (SimpleAPI / OpenFactura / Lioren) para arrancar la integración programada en `ESPECIFICACION_BOLETAS_ELECTRONICAS_DTE39.md`.
   - Configuración de credenciales SMTP (`pagos@origencanino.cl`) para el despacho automático de boletas en PDF.

---

### 💼 B. PPV Soluciones (`ppvsoluciones.cl`) — Rediseño y Reactivación
- **Diagnóstico:** El sitio actual no está convirtiendo visitas en consultas ni proyectos.
- **Objetivo:** Rediseño completo bajo un enfoque comercial de alto impacto, orientado a captación B2B, servicios claros de desarrollo de software, automatización, agentes de IA y soluciones cloud.
- **Acción inmediata:** Recepción y análisis del nuevo archivo Markdown con los requerimientos, arquitectura y propuesta de valor de PPV Soluciones para comenzar la reestructuración integral.
