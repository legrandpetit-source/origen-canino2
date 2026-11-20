# BITÁCORA TÉCNICA Y DE CONTROL OPERACIONAL
**Fecha:** 20 de Noviembre de 2026  
**Proyecto:** Origen Canino (ERP Cocina & Lotes Semanales)  
**Autor:** Patricio Padilla / Antigravity Agent  

---

## 1. RESUMEN EJECUTIVO: FINANZAS Y RENTABILIDAD DEL LOTE (LOTE OC-2026-S47-B03)

En la auditoría del lote envasado de **Dieta Cocinada Cerdo (23.00 Kg envasados, 32.10 Kg crudos, merma 28.3%)**, se identificó que la vista inmutable suprimía el bloque de rentabilidad comercial y proyección de ganancias para todos los formatos de 1 Kg debido a una condición restrictiva (`if (vUnitKg === 1) return null;`).

Se refactorizó el componente de modal de lote para exponer el desglose financiero granular exigido:
- **Total Materia Prima (Ingredientes Reales Utilizados):** $67.250 CLP
- **Total Costos Indirectos Prorrateados:** $50.000 CLP (Gas $5.000, Luz $20.000, Agua $5.000, Envases $5.000, Mano de Obra $15.000)
- **Costo Total del Batch:** **$117.250 CLP**
- **Costo Real por Kilo Envasado:** **$5.098 CLP / kg**
- **PVP Menú Vigente:** **$8.500 CLP / kg**
- **Margen Bruto Unitario:** **+$3.402 CLP / kg (+40.0% sobre venta / +66.7% sobre costo)**
- **Rendimiento Comercial del Batch:** **23 unidades de 1 Kg**
- **Ventas Totales Proyectadas:** **$195.500 CLP**
- **Ganancia Líquida Proyectada del Lote:** **+$78.250 CLP**

---

## 2. NORMALIZACIÓN DE UNIDADES DE MEDIDA EN INSUMOS (KG, L, U, ML, G)

### Problema:
El sistema asumía implícitamente que todo insumo se ingresaba en kilogramos (`/ kg`, `{kg} kg`), forzando conversiones manuales para ingredientes en unidades (betarragas, huevos) o líquidos (aceite de oliva en ml o litros).

### Solución Implementada:
1. **Backend (`batch_routes.py`):**
   - En `list_batches` y `get_batch`, se incorporó `LEFT JOIN ingredients i ON bi.ingrediente_id = i.id` para devolver `COALESCE(i.unit, 'kg') AS unit`.
2. **Cálculo de Costo en Cocina (`batch_service.py`):**
   - Normalización de unidades: para `unidad`/`u`, el valor `cantidad_gramos / 1000.0` representa exactamente la cantidad de unidades multiplicada por el precio por unidad, asegurando que insumos unitarios no se distorsionen.
3. **Frontend (`BatchProductionManager.jsx`):**
   - En la vista inmutable, las cantidades se renderizan dinámicamente con su sufijo respectivo (`20.60 kg`, `1 u`, `500 ml`, `2 L`) y el precio se expresa como `$precio / u`, `$precio / L` o `$precio / kg`.
   - En el formulador en vivo de nuevos lotes, cada fila muestra el badge de la unidad correspondiente y el placeholder de costo unitario por esa unidad.

---

## 3. HISTORIAL DE PRECIOS DE PRODUCTOS DE CATÁLOGO (`product_price_history`)

### Contexto:
Al detectarse que el margen del menú cocinado de cerdo era bajo con el precio anterior de $8.000, se requirió ajustar el PVP a $8.500. Para tener trazabilidad completa equivalente a la de los insumos (`ingredient_price_history`), se implementó el registro histórico de precios de productos finales.

### Implementación Técnica:
1. **Base de Datos (`server_db.py`):**
   - Creación de tabla `product_price_history` con llaves foráneas a `products(id)`, campos `previous_price`, `price`, `changed_by`, `notes` y marca temporal `created_at`.
2. **Endpoints (`main.py`):**
   - Detección automática en `PUT /api/products/{product_id}`: si el nuevo precio difiere del precio vigente en BD, se almacena una entrada histórica inmutable.
   - Registro en `POST /api/products` para el precio inicial de catálogo.
   - Endpoint `GET /api/admin/products/history` para consultar el historial filtrado por producto.
3. **Panel Administrativo (`AdminPanel.jsx`):**
   - Botón directo **"Historial"** con icono `History` en la tabla de productos.
   - Modal interactivo con línea de tiempo de variaciones, diferencial CLP (+/-), responsable y notas de ajuste.

---

## 4. INCIDENTE OPERACIONAL Y PROTOCOLO DE INOCUIDAD: ZAPALLO CAMOTE

### Descripción del Incidente (Batch 99 Kg):
En la producción del primer batch de 99 kg, el zapallo camote fue cocido conjuntamente con el mix de vegetales. Debido a su alta concentración de carbohidratos solubles (sacarosa, glucosa, fructosa) y elevada actividad de agua, al no ser abatido térmicamente de inmediato, experimentó una **fermentación bacteriana acelerada en menos de 3 horas**, desprendiendo un olor ácido/picante característico tras la descongelación. El lote debió ser retenido y descartado para consumo comercial.

### Protocolo Obligatorio POES (Inocuidad Cocina Origen Canino):
1. **Cocción Aislada:** El zapallo camote se debe cocinar **SIEMPRE en olla independiente**, separado de cárnicos y otros vegetales.
2. **Abatimiento Forzado Inmediato:** Una vez finalizada la cocción, no debe dejarse reposar a temperatura ambiente por más de 45 minutos. Debe ingresar a túnel de abatimiento o cámara de congelación a -18°C de forma inmediata.
3. **Alerta en Sistema:** Se integró un banner preventivo permanente en el módulo de lotes semanales para alertar al personal de cocina ante cualquier preparación que involucre zapallo camote o vegetales fermentables.
