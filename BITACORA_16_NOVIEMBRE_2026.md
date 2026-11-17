# 📓 Bitácora — Origen Canino & Ecosistema PPV (`origencanino.cl`)

**Fecha:** Lunes 16 de Noviembre de 2026  
**Responsable:** Patricio Padilla (PPV Soluciones)  
**Servidor de Producción:** Hetzner Cloud VPS `167.233.122.18` (Ubuntu 24.04 / 2 vCPUs / 4 GB RAM / 40 GB NVMe)  
**Commit Actual en Producción:** `4e39776` (Bundle: `index-Cwbt80R_.js`, CSS: `index-mQqxGc36.css`)

---

## 1. 🚀 Avances y Módulos Desplegados Hoy en Producción

### A. Estandarización Visual de "Dictamen Técnico" (`BatchProductionManager.jsx`)
- **Eliminación del Bloque Oscuro:** Se removió el contenedor negro (`bg-stone-900 / bg-stone-950`) que desentonaba con la estética limpia y orgánica de Origen Canino.
- **Diseño Orgánico Armonizado:**
  - Contenedor blanco con borde suave esmeralda (`border-2 border-emerald-300/80 rounded-2xl p-4 shadow-xs`).
  - Subpanel de **Evaluación Biológica & Nutricional** en verde menta claro (`bg-emerald-50/70 border-emerald-200`).
  - Subpanel de **Evaluación Financiera & Margen** en azul cielo claro (`bg-sky-50/70 border-sky-200`).
  - Conclusión técnica en `bg-stone-50 border border-stone-200` con textos cálidos en café tierra (`text-secondary-brown`).
- **Botón "Copiar Último Lote" Preservado y Mejorado:**
  - Ubicado en la barra superior al lado del selector de Producto/Menú.
  - Auto-detección inteligente: si el menú está en `-- Seleccionar Menú --`, carga automáticamente el lote más reciente (`batches[0]`) precargando producto, línea, kilos brutos, stock final, costos indirectos y todos los ingredientes.

---

### B. Comparador Bromatológico y de Calidad-Precio (`IngredientsManager.jsx`)
- **Filtros por Categoría y Buscador en Vivo:**
  - Pestañas rápidas: `Todos los Insumos`, `🥩 Cárnicos & Vísceras`, `🥦 Frutas & Verduras` y `💊 Suplementos & Otros`.
  - Permite filtrar y seleccionar insumos de la misma naturaleza funcional para contrastes válidos.
- **Selección Cara a Cara (Checkboxes):**
  - Checkbox en cada fila del catálogo con resaltado esmeralda (`bg-emerald-50/70`).
  - Botón superior `[⚖️ Comparar Insumos (X)]` y barra flotante inferior al marcar 2 o más insumos.
- **Modal de Comparación Técnica:**
  - **Eficiencia Económica:**
    - Costo por gramo de proteína neta ($\frac{\text{Costo/kg}}{\text{Proteína g/100g} \times 10}$), coronando automáticamente al corte más rentable biológicamente.
    - Kcal entregadas por cada \$1.000 CLP invertidos.
  - **Tabla Bromatológica Completa (por 100g):** Energía, Proteína cruda, Grasa, Fibra, Humedad, Cenizas, Carbohidratos, Calcio, Fósforo y Ratio Ca:P.
  - **Separación de Micronutrientes Comunes vs. Bioactivos Exclusivos:**
    - Los micronutrientes compartidos (Selenio, Fósforo, Vitaminas, etc.) se contrastan en tabla paralela destacando el de mayor aporte.
    - Los bioactivos exclusivos (ej. *Curcumina* en Cúrcuma, *Gingeroles* en Jengibre) se presentan en tarjetas independientes con su dosis y beneficio destacado.
  - **Dictamen Técnico Heurístico de Materia Prima:** Sugerencia analítica sobre qué corte priorizar según el objetivo del lote (menor costo proteico o enriquecimiento fitoquímico).

---

### C. Resolución de Incidencia Crítica de Almacenamiento & Hardening Hetzner
- **Diagnóstico del Incidente:**
  - El disco del servidor Hetzner (`/dev/sda1`) alcanzó el **100% de uso (0 bytes libres)** debido a la acumulación de 10 imágenes pesadas de compilaciones previas de Coolify (~3.5 GB c/u) y ~4 GB de build cache.
  - PostgreSQL (`origen-canino-db`) abortó por seguridad con `PANIC: could not write to file replorigin_checkpoint.tmp: No space left on device`, dejando las APIs temporalmente sin conexión a BD.
- **Remediación Inmediata:**
  - Purga de Docker Build Cache (`docker builder prune -a -f`): **3.98 GB liberados**.
  - Eliminación de imágenes obsoletas no asociadas a contenedores activos: **~10 GB liberados**.
  - Disco recuperado: pasó de 100% a **63% de uso con 14 GB disponibles**.
  - Reinicio y recuperación limpia de PostgreSQL sin pérdida de datos (`total_ingredientes: 20`).
- **Implementación de Fase 1 de Estabilidad (Completada):**
  1. **Memoria Swap de 4 GB:** Creado `/swapfile` (4 GiB) en NVMe persistido en `/etc/fstab` con `vm.swappiness = 10` como colchón de estabilidad de RAM.
  2. **Cron Job Diario de Auto-Limpieza (04:00 AM):**
     ```bash
     0 4 * * * docker image prune -a -f --filter "until=72h" >/dev/null 2>&1 && docker builder prune -f --filter "until=72h" >/dev/null 2>&1
     ```

---

## 2. 📅 Tareas Programadas para el Miércoles 18 de Noviembre de 2026

### 🏗️ Migración Arquitectónica de Origen Canino a Docker Compose Nativo (Desmonte de Coolify)

#### Contexto y Justificación:
- En **TimbrApp**, todo el stack (`timbraapp-backend`, `timbraapp-frontend`, `timbraapp-evolution`, `timbraapp-db`, `timbraapp-landing`) corre con **Docker Compose nativo**, de forma ultra-eficiente, estable y sin capas intermedias.
- Coolify en este servidor solo gestiona Origen Canino, pero consume por sí solo **~700 MB de memoria RAM** (PHP/Laravel, Redis propio, PostgreSQL propio para Coolify, Soketi WebSockets, Sentinel, Traefik) y genera imágenes pesadas de compilación que saturaron el disco.

#### Plan de Trabajo para el Miércoles 18 de Noviembre:
1. **Creación de Stack Nativo `docker-compose.yml` para Origen Canino:**
   - Configurar en `/data/origen-canino/docker-compose.yml` los servicios:
     - `origen-canino-backend`: FastAPI / Uvicorn conectado a `origen-canino-db`.
     - `origen-canino-frontend`: Nginx sirviendo la build estática de Vite (`dist/`).
     - Proxy Nginx / Caddy nativo para gestión de certificados SSL Let's Encrypt para `origencanino.cl`.
2. **Pruebas de Conectividad y Zero-Downtime:**
   - Levantar el stack nativo en un puerto local y validar endpoints `/api/...` y la base de datos `origen_canino`.
   - Conmutar el tráfico hacia el nuevo stack sin interrumpir el servicio.
3. **Desmantelamiento y Desinstalación de Coolify:**
   - Detener y eliminar los contenedores auxiliares de Coolify:
     - `coolify` (~511 MB RAM)
     - `coolify-realtime` (~69 MB RAM)
     - `coolify-proxy` (~53 MB RAM)
     - `coolify-db` (~43 MB RAM)
     - `coolify-redis` (~8 MB RAM)
     - `coolify-sentinel` (~9 MB RAM)
     - Helpers huérfanos (`yrddcn...`, `yqvez...`, etc.)
4. **Beneficios Obtenidos al Finalizar la Jornada:**
   - **Liberación inmediata de ~700 MB a 1 GB de RAM física**, dejando el servidor con más del 50% de memoria libre.
   - **Eliminación definitiva del problema de compilaciones gigantes en disco.**
   - **Arquitectura 100% homogénea:** Todo el servidor (TimbrApp + Origen Canino + PPV Soluciones) quedará administrado bajo la misma lógica limpia de Docker Compose nativo.


---

## 3. 🛡️ Implementación de Regla de Frescura, Bloqueo de Stock FIFO y Nuevas Líneas de Producción (Commit `fc3c271`)

### 3.1. Estado de Stock y Regla de Disponibilidad en Catálogo:
- **Diagnóstico:** Los productos sin lotes registrados en `batch_produccion` (`Dieta Cocinada Cerdo`, `Caldo de Huesos`, `Calugas Articulares` y `Patitas de Pollo Deshidratadas`) permitían la compra abierta porque `hasBatchControl` evaluaba en falso.
- **Solución Implementada en `src/components/shop/ProductCard.jsx`:**
  - Se modificó la regla a: `isSoldOut = liveGrams < unitGrams`.
  - Todo producto sin lote semanal activo con saldo suficiente para al menos 1 unidad pasa automáticamente a estado **"Lote semanal agotado por frescura"**.
  - Se desactiva el botón de compra `[+ Agregar]` y se activa el botón interactivo **`[🔔 Avísame próximo lote]`** que registra el WhatsApp del cliente en lista de espera de preventa.
  - **Dieta BARF Cruda:** Mantiene stock activo con 99 kg disponibles (post-deducción FIFO de 21 kg de pedidos #5 y #9).

### 3.2. Blindaje de Integridad en Backend (`backend/batch_service.py`):
- Se actualizó `validate_cart_stock(cursor, items)`: Si un producto no tiene lote activo o `available <= 0`, rechaza la transacción con `ValueError: '[Producto]' no cuenta con lote semanal activo en este momento por frescura. Pronto tendremos nuevo lote disponible.`.
- Verificado en producción con pruebas automatizadas en contenedor Hetzner:
  - Intento de compra Cerdo (0 stock) $\rightarrow$ Bloqueado exitosamente.
  - Compra 10 kg BARF (99 kg stock) $\rightarrow$ Aprobado exitosamente.
  - Compra 150 kg BARF (99 kg stock) $\rightarrow$ Bloqueado por sobrestock exitosamente.

### 3.3. Nuevas Líneas de Producción y Costos Indirectos Dinámicos (`BatchProductionManager.jsx`):
- **Líneas Habilitadas en Selector:**
  1. `BARF (180 días)`
  2. `COCINADA (120 días)`
  3. `SNACK DESHIDRATADO (180 días)`
  4. `CALDO DE HUESOS (180 días congelado)`
  5. `SUPLEMENTO ARTICULAR (180 días congelado)`
- **Auto-detección inteligente:** Al elegir el menú en el formulario de lote, el sistema preselecciona automáticamente la línea correspondiente.
- **Costos Indirectos Adaptativos por Línea:**
  - *Snack:* Destaca `Luz (Deshidratador 24h)` y `Mano de Obra (Desuñado manual)`.
  - *Caldo:* Destaca `Gas (24h fuego corona)` y `Frascos y Tapas`.
  - *Suplemento:* Destaca `Mano de Obra (Gelificación)` y `Moldes y Bolsas`.

### 3.4. Decisión Comercial de Pedido Mínimo:
- **Confirmado Opción A:** Se mantiene el pedido mínimo universal de **$30.000 CLP** para proteger la rentabilidad y viabilidad del despacho en frío en Santiago.
