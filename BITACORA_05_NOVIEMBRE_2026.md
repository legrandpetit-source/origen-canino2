# Bitácora de Desarrollo - Origen Canino 2
**Fecha:** 4 y 5 de Noviembre de 2026  
**Proyecto:** Origen Canino 2 (`https://origencanino.cl`)  
**Servidor de Producción:** Hetzner VPS `167.233.122.18` (Container App `2ac9544a5b52`, DB `origen-canino-db`)  
**Repositorio:** `https://github.com/legrandpetit-source/origen-canino2.git` (`main`)

---

## 1. Resumen Ejecutivo de Avances Realizados en la Jornada

### 1.1 Flujo de Registro y Checkout Inteligente
- **Reconocimiento instantáneo de clientes:** Al escribir el correo en el checkout, el sistema detecta en milisegundos si el correo ya está registrado para asociar la compra de inmediato.
- **Transición suave para nuevos clientes:** Si el cliente no existe, se despliega de forma armónica el formulario para completar datos de contacto, perrito y creación de contraseña.
- **Validación robusta con Debounce y Regex:** Se corrigió la validación para que al borrar o escribir texto incompleto no se active erróneamente la oferta de nuevo usuario, activándose únicamente con correos sintácticamente válidos.
- **Prevención de usuarios spam:** Se acordó y aplicó que el registro de nuevos usuarios ocurra desde el checkout real vinculado a una compra, evitando usuarios fantasmas creados sin comprar.
- **Modal de Acceso (`CustomerAuthModal`):** Rediseñado con la estética de marca (colores tierra, verde oliva `#677333`, tipografía `Outfit`), enfocado exclusivamente en ingreso con credenciales.

### 1.2 Gestión y Eliminación Masiva de Pedidos en Panel Admin
- **Backend seguro (`POST /api/admin/orders/bulk-delete`):** Endpoint atómico en FastAPI que elimina en cascada los registros en `order_items` y `orders` dentro de PostgreSQL.
- **Interfaz en Logística y Despacho (`DispatchManager.jsx`):**
  - Checkboxes por pedido con resaltado ámbar en pedidos seleccionados.
  - Selección rápida en la barra superior ("Seleccionar Visibles") y por bloque geográfico ("Seleccionar Comuna").
  - Barra flotante de acciones masivas fija en la parte inferior con contador de pedidos seleccionados, botón rojo `[ Eliminar Seleccionados (X) ]` con confirmación de seguridad y botón `Cancelar`.
  - Botón individual de papelera por pedido.

### 1.3 Rediseño Profundo del Portal de Clientes (`/mi-cuenta`)
- **Eliminación del avatar genérico "P":** Sustituido por el imagotipo oficial de Origen Canino (`/logo.webp`) con respaldo SVG.
- **Desbloqueo de Zonas y Región:**
  - El campo de Región se desbloqueó y transformó en un selector `<select>` activo con soporte para:
    - `Región Metropolitana (Santiago)`
    - `Región de Valparaíso (Litoral y Costa)`
  - Corrección directa en la base de datos de producción para el usuario Patricio (`legrandpetit@gmail.com`), asignando formalmente **Algarrobo (Región de Valparaíso)**.
- **Nuevo Hero Card de Bienvenida:**
  - Distintivo `✨ Cliente Nutrición Real`.
  - Datos de contacto y entrega con chips de correo, teléfono, comuna y región.
  - Mini-tarjetas métricas: Mascotas registradas, Zona de despacho y Seguridad en Cadena de Frío (-18°C).
- **Segmented Control Tabs:** Barra de navegación moderna para alternar entre *Mis Mascotas*, *Datos de Despacho* e *Historial de Pedidos*.
- **Tarjetas Nutricionales de Mascotas:**
  - Fichas para Canelo (14 kg) y Morocha (12 kg).
  - Cálculo dinámico de porción diaria sugerida (~350 g/día y ~300 g/día calculados al 2.5% de peso corporal).
  - Cálculo de consumo mensual estimado (~10.5 kg/mes y ~9.0 kg/mes).
  - Botón de compra directa: `[ 🛒 Comprar Menú para {nombre} → ]`.

### 1.4 Generación y Optimización de Creatividades de Producto
- Generación de fotografía profesional para **Calugas Articulares / Gomitas de Colágeno** (`calugas_articulares_huellas.webp` y `calugas_colageno_huellas_huesitos.webp`), en cuenco cerámico, con patas de pollo, arándanos, kiwi y cúrcuma fresca, en formato WebP ultraliviano.

---

## 2. Temas Pendientes y Planificación para Mañana

| Prioridad | Módulo / Tarea | Descripción Detallada |
| :---: | :--- | :--- |
| **P1** | **Módulo Avanzado de Promociones y Cupones Dinámicos** | **Crear instancia en el sistema para cupones promocionales adicionales:**<br>• No limitarse a la primera compra (10% OFF).<br>• Permitir en `/admin` -> "Promociones & 1ra Compra" crear cupones personalizados (ej: `VERANO2026`, `CANELO15`, `AMIGOBARF`, `DESPACHOGRATIS`).<br>• Parámetros del cupón: Tipo (% de descuento o monto fijo $ CLP), fecha de inicio y vencimiento, límite de usos totales o por cliente, monto mínimo de compra opcional.<br>• Integración en base de datos PostgreSQL (`promotions` / `coupons`).<br>• Validación y aplicación en tiempo real en el Checkout (`CheckoutModal.jsx`) y Carrito (`CartDrawer.jsx`). |
| **P2** | **Fotos de Mascotas y Personalización en Mi Cuenta** | Permitir al cliente subir o seleccionar un avatar/foto para sus perritos (Canelo y Morocha) en `/mi-cuenta`, además de notas dietéticas especiales (alergias, premios favoritos). |
| **P3** | **Seguimiento de Estado de Despacho en Tiempo Real** | Visualización en el portal del cliente del estado logístico del pedido (Recibido, En Preparación con Cadena de Frío, En Ruta, Entregado) con fecha estimada de entrega según zona (RM vs V Región). |

---

## 3. Estado de la Infraestructura y Repositorio
- **Rama:** `main` al día en GitHub (`06a658e`).
- **Build de Producción:** Vite 5.4.14 compilado exitosamente. Bundle activo: `assets/index-CpFJFUdI.js` y `assets/index-AtLl18V_.css`.
- **Servidor:** Hetzner VPS `167.233.122.18` operando con Nginx SSL y Docker containers saludables.
- **Base de Datos:** PostgreSQL 17 Alpine en container `origen-canino-db`.
