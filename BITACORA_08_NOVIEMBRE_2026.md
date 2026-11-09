# BITÁCORA DE DESARROLLO Y PRUEBAS - ORIGEN CANINO 2.0
**Fecha:** Domingo, 08 de Noviembre de 2026  
**Responsable:** Patricio Padilla / Antigravity Assistant  
**Estado General:** ✅ Desplegado y Operativo en Producción (Hetzner VPS + Coolify)

---

## 1. Resumen Ejecutivo de Requerimientos y Soluciones

A partir de las pruebas de campo, capturas de pantalla y audios enviados, se abordaron y completaron los siguientes 4 frentes críticos:

### A. Optimización Móvil del Administrador NFC (`/admin`)
* **Problema:** Los 4 KPI cards (`Puntos Instalados`, `Lecturas`, `Pedidos`, `Ventas`) se mostraban en una sola columna vertical gigante en pantallas móviles, obligando a hacer scroll excesivo y empujando fuera de vista la tarjeta del edificio y los botones "Programar Chip NFC" y "Copiar Link".
* **Solución Implementada:**
  - Se transformaron los 4 KPI a una cuadrícula compacta responsiva de **2x2 en móviles** (`grid-cols-2 md:grid-cols-4`) con espaciado y tipografía optimizados (`p-2.5 sm:p-3.5`).
  - La tarjeta de conserjería/edificio ahora queda visible inmediatamente sin scroll incómodo.

### B. Corrección de Pestañas en Portal del Cliente (`/mi-cuenta`)
* **Problema:** En teléfonos móviles, la 4ta pestaña (`Invita y Gana 🐾`) se salía del ancho de la pantalla y quedaba cortada a la derecha.
* **Solución Implementada:**
  - Se estructuró el selector de pestañas en una cuadrícula responsiva de **2x2** (`grid grid-cols-2 md:grid-cols-4`).
  - Las 4 secciones (`Mis Mascotas`, `Datos de Despacho`, `Historial de Pedidos`, `Invita y Gana 🐾`) ahora encajan al 100% en cualquier pantalla de smartphone sin scroll horizontal ni desbordes.

### C. Recuperación y Blindaje de la Foto de Canelo (`dog_2_5eabdc59.webp`)
* **Problema:** La foto de perfil del perrito Canelo no cargaba y mostraba un ícono de imagen rota (`404 Not Found`).
* **Causa Raíz:** El contenedor de producción no incluía la carpeta `dogs` en el auto-seed inicial al recrearse el contenedor Docker.
* **Solución Implementada:**
  - Se recuperó la imagen original desde el repositorio de respaldo y se colocó en:
    - `/public/images/dogs/dog_2_5eabdc59.webp`
    - `/backend/static/images/dogs/dog_2_5eabdc59.webp`
    - `/app/backend/uploads/dogs/dog_2_5eabdc59.webp` (en el contenedor activo).
  - Se agregó `"dogs"` permanentemente a la rutina de verificación/auto-seed de `backend/main.py`.
  - Se añadió en React un manejador `onError` que sustituye automáticamente cualquier foto faltante por un avatar elegante con patita (`🐶`), impidiendo que vuelva a verse un ícono de imagen rota.

### D. Mantenedor Dinámico de Embajadores & Referidos QR (Cero Código Duro)
* **Requerimiento:** Mantener el modelo de recompensa fija por compra efectiva del amigo pero **sin nada embebido en código duro**. Poder cambiar libremente:
  1. Recompensa al Embajador (ej: $5.000, $4.000, $10.000).
  2. Compra Mínima requerida para el amigo (ej: $30.000, $35.000).
  3. Descuento de Bienvenida para el amigo (ej: 15% OFF).
  4. Estado del Programa (Activo / Pausado).
  5. Mostrar con claridad quién compró y su perrito (ej: *"Bono por compra de comida de María y su perrito 🐶 Rocky"*).
* **Solución Implementada:**
  - Nueva sub-pestaña en el panel de administración: **`Promociones > Embajadores & Referidos QR`**.
  - Formulario conectado a la tabla `system_settings` de PostgreSQL (`GET /api/admin/referrals/summary` y `POST /api/admin/referrals/settings`).
  - Panel con 4 métricas en vivo:
    - *Pedidos Referidos Captados*
    - *Ventas Generadas ($ CLP)*
    - *Recompensas Billetera ($ CLP)*
    - *Saldo Canjeado en Checkout ($ CLP)*
  - Tabla de **Ranking de Embajadores (Top 20)** con desglose de amigos y saldo acumulado.
  - Atribución en backend que extrae el nombre del perrito del amigo comprador y lo registra en la descripción de la transacción para que el embajador sepa que su recomendación funcionó.

---

## 2. Guía de Pruebas (Test Plan)

### Prueba 1: Grabación y Bloqueo NFC desde Móvil
1. Entrar desde el celular a `https://origencanino.cl/admin`.
2. Ir a la sección **Puntos NFC (Edificios)**.
3. Verificar que los 4 indicadores están organizados en 2x2 y que el botón **Programar Chip NFC** se ve en pantalla.
4. Presionar **Programar Chip NFC**:
   - Paso 1: Escribir URL del edificio en el chip.
   - Paso 2: Aplicar blindaje por hardware (Total o Clave según tu elección).
   - Verificar que no hay ANR ("Chrome no responde") gracias al nuevo flujo de 2 pasos con timeout de 15s.

### Prueba 2: Portal de Clientes Móvil y Foto de Canelo
1. Entrar desde el móvil a `https://origencanino.cl/mi-cuenta`.
2. Verificar que las 4 pestañas se distribuyen uniformemente (2 arriba y 2 abajo), sin cortes ni desbordes.
3. En la pestaña **Mis Mascotas**, verificar que la foto de **Canelo** carga correctamente y con nitidez.
4. En caso de cargar una mascota sin foto, verificar que muestra el avatar estilizado de patita sin romper el layout.

### Prueba 3: Mantenedor de Embajadores y Referidos
1. Entrar a `https://origencanino.cl/admin`.
2. Ir al menú **Promociones**.
3. Seleccionar la 3ra sub-pestaña: **Embajadores & Referidos QR**.
4. Modificar cualquiera de los valores (por ejemplo, cambiar la recompensa a $5.000 o el mínimo a $35.000).
5. Presionar **"Guardar Parámetros en Base de Datos"**.
6. Recargar la página: los nuevos valores deben persistir directamente desde PostgreSQL sin requerir ningún despliegue de código.
7. Comprobar que en el portal del cliente (`/mi-cuenta > Invita y Gana`), el valor del bono se actualiza automáticamente con el nuevo monto guardado.

---

## 3. Registro de Despliegue Git
* **Commit:** `8ee07dd` - *feat(referrals): mantenedor dinamico de embajadores en admin y atribucion con perrito*
* **Build Vite:** Exitoso (`built in 12.10s`).
* **Deploy VPS:** Activo en Hetzner Cloud (`167.233.122.18`).

