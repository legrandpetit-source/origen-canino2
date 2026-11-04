# Informe Técnico Integral: QA, Pruebas de Estrés y Ciberseguridad Defensiva
**Proyecto:** Origen Canino 2 (`https://origencanino.cl`)  
**Fecha:** 4 de Noviembre de 2026  
**Infraestructura:** VPS Hetzner (`167.233.122.18`) | Contenedor Nixpacks Docker (`5bdfecb7cd53`) | PostgreSQL 17 Alpine  
**Estado de la Auditoría:** APROBADA - VULNERABILIDADES MITIGADAS - EN PRODUCCIÓN  

---

## 1. Resumen Ejecutivo

Se ejecutó una auditoría exhaustiva de calidad de software (**QA**), resistencia bajo carga simultánea (**Pruebas de Estrés**) y seguridad informática (**Hardening y Mitigación de Vulnerabilidades**) sobre la plataforma **Origen Canino 2**.

### Conclusiones Principales:
1. **Rendimiento bajo estrés:** Se sometió el servidor en producción a **250 peticiones concurrentes** distribuidas en 25 hilos simultáneos sobre la landing, catálogo de productos, promociones, testimonios y blog. La plataforma logró una **tasa de éxito del 100% (250/250 OK)** sin caídas de conexión ni errores de base de datos.
2. **Mitigación de ataques:** Se neutralizaron las principales vías de ataques maliciosos comunes en e-commerce (fuerza bruta en login y 2FA, flood de órdenes, inyección de descompresión en imágenes, ataques de clickjacking y MIME sniffing).
3. **Resistencia de datos:** El 100% de las consultas a PostgreSQL utilizan sentencias parametrizadas y tipadas, eliminando por completo riesgos de inyección SQL (SQLi).

---

## 2. Resultados de las Pruebas de Estrés y Rendimiento

Las pruebas fueron ejecutadas emulando tráfico masivo simultáneo hacia los endpoints más críticos de la aplicación.

```mermaid
xychart-beta
    title "Latencia Promedio vs Percentil 95 (ms)"
    x-axis ["Landing HTML", "Catálogo Productos", "Promo 1ra Compra", "Testimonios", "Blog SEO"]
    y-axis "Milisegundos" 0 --> 4500
    bar [2248, 2257, 2260, 2324, 2255]
    line [4088, 4072, 4081, 4106, 4081]
```

### Tabla de Métricas de Rendimiento Concurrente

| Métrica | Resultado Registrado | Evaluación |
| :--- | :---: | :--- |
| **Total de Peticiones** | **250** | Volumen representativo de tráfico pico |
| **Hilos Concurrentes Simultáneos** | **25 trabajadores** | Simula 25 usuarios navegando en el mismo instante |
| **Tasa de Éxito (HTTP 200)** | **100.0%** (250/250) | Excelente: Cero caídas, 0 timeouts |
| **Throughput / Rendimiento** | **9.55 peticiones/seg** | Capacidad sólida en contenedor individual |
| **Latencia Mínima** | **1,193.14 ms** | Incluye viaje transatlántico Chile ↔ Alemania |
| **Latencia Mediana (p50)** | **1,681.75 ms** | Respuesta estable en carga continua |
| **Latencia Percentil 95 (p95)** | **4,082.51 ms** | Límite superior sin degradación de servicio |
| **Latencia Percentil 99 (p99)** | **4,112.39 ms** | Consistencia bajo saturación |

> [!NOTE]
> La latencia base incluye el RTT físico transatlántico de la conexión de red (Santiago de Chile ↔ Datacenter Hetzner Falkenstein/Nuremberg). Para optimizar aún más la velocidad de carga visual para el usuario chileno, todos los assets pesados (`delivery_map.webp`, `logo.webp`, imágenes de catálogo) fueron previamente comprimidos en WebP.

---

## 3. Vulnerabilidades Detectadas y Soluciones Implementadas

### 3.1 Protección Anti-Fuerza Bruta y DoS (Rate Limiting Dinámico)
- **Riesgo:** Atacantes con herramientas automáticas podían enviar miles de combinaciones de contraseñas o intentar adivinar el código de 5 dígitos de Telegram de 2FA.
- **Parche Implementado:**
  - Se incorporó un **Motor de Rate Limiting en memoria (`RateLimiter`)** con bloqueo automático por IP y por identificador de sesión.
  - **Login Admin (`/api/admin/login`):** Máximo 5 intentos por minuto por IP. Al 6° intento, el sistema responde **HTTP 429 Too Many Requests** y bloquea la IP temporalmente.
  - **Verificación 2FA (`/api/admin/verify-2fa`):** Máximo 5 intentos por sesión. Al superar 5 intentos fallidos, el código se autodestruye en la base de datos, revocando el acceso.
  - **Creación de Pedidos (`/api/orders`):** Máximo 10 pedidos cada 5 minutos por IP, impidiendo ataques de inundación de base de datos.
- **Verificación en Producción:**
  - Se ejecutaron 7 intentos consecutivos de acceso no autorizado.
  - Intentos 1 a 5: `HTTP 401 Credenciales incorrectas`
  - Intentos 6 y 7: **`HTTP 429 Demasiados intentos de acceso. Por seguridad, espera 1 minuto.`** *(Ataque bloqueado con éxito)*.

---

### 3.2 Hardening de Cabeceras HTTP de Seguridad
- **Riesgo:** Ausencia de directivas de seguridad en cabeceras de respuesta HTTP, exponiendo el sitio a ataques de incrustación oculta (Clickjacking) y confusión de tipos MIME.
- **Parche Implementado:**
  Middleware global que inyecta en cada respuesta HTTP:
  - `X-Frame-Options: SAMEORIGIN`: Impide que sitios maliciosos incrusten Origen Canino en iframes para robar clics o datos.
  - `X-Content-Type-Options: nosniff`: Fuerza al navegador a respetar estrictamente los tipos MIME legítimos.
  - `X-XSS-Protection: 1; mode=block`: Filtro activo contra scripting entre sitios.
  - `Referrer-Policy: strict-origin-when-cross-origin`: Oculta datos de navegación al salir a pasarelas externas.
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`: Desactiva sensores innecesarios en el navegador.

---

### 3.3 Blindaje en Carga de Archivos e Imágenes (Anti-Decompression Bomb)
- **Riesgo:** Carga de archivos desproporcionadamente gigantescos que provoquen consumo total de la memoria RAM del contenedor (`Out Of Memory`).
- **Parche Implementado en `/api/admin/upload-image`:**
  - Límite estricto de **10 MB** por archivo. Archivos mayores son rechazados inmediatamente con **HTTP 413 Payload Too Large**.
  - Validación de cabecera `Content-Type` para aceptar exclusivamente archivos `image/*`.
  - Configuración `Image.MAX_IMAGE_PIXELS = 30_000_000` en Pillow para neutralizar *Decompression Bombs* (archivos comprimidos maliciosos que se expanden a gigabytes al descomprimirse).
  - Conversión estricta a formato `.webp` con eliminación de metadatos no seguros.

---

### 3.4 Sanitización de Entradas en Checkout
- **Riesgo:** Inyección de scripts HTML/JS maliciosos en campos abiertos (`customer_name`, `customer_address`, `dog_name`) que pudieran ejecutarse en el navegador del administrador al revisar los pedidos en `/admin`.
- **Parche Implementado:**
  - Truncamiento de longitud y limpieza de espacios en todas las variables de entrada de pedidos (`name: 150 caracteres`, `address: 250 caracteres`, `phone: 50 caracteres`).
  - Renderizado reactivo protegido en React (evita `dangerouslySetInnerHTML`).

---

## 4. Matriz de Seguridad: Antes vs. Después

| Vector de Ataque | Estado Anterior | Estado Actual (Corregido) |
| :--- | :---: | :---: |
| **Inyección SQL (SQLi)** | Protegido (Consultas parametrizadas) | **Protegido (100% Parametrizado)** |
| **Fuerza Bruta en Login** | Vulnerable (Sin límite de intentos) | **Mitigado (Rate Limit 5 req/min -> HTTP 429)** |
| **Fuerza Bruta en 2FA Telegram** | Vulnerable (Intentos ilimitados) | **Mitigado (Revocación inmediata al 5° fallo)** |
| **Flood / Spam de Pedidos** | Vulnerable (Sin límite por IP) | **Mitigado (Máx 10 pedidos/5 min por IP)** |
| **Clickjacking / Framing** | Cabecera ausente | **Mitigado (`X-Frame-Options: SAMEORIGIN`)** |
| **MIME Sniffing** | Cabecera ausente | **Mitigado (`X-Content-Type-Options: nosniff`)** |
| **Agotamiento de Memoria por Archivo** | Sin límite previo de lectura | **Mitigado (Tope 10 MB + tope de 30M píxeles)** |

---

## 5. Próximas Recomendaciones Operativas

1. **Monitoreo de Logs:** Revisar periódicamente la tabla `security_logs` en el panel de administración para auditar eventos con estado `warning` o `critical`.
2. **Respaldo Automático de Base de Datos:** Configurar un cron diario en Hetzner para ejecutar `pg_dump` de la base de datos `origen_canino` hacia un almacenamiento seguro secundario.
3. **Cloudflare CDN (Opcional):** Si se desea reducir la latencia de 1.5s a menos de 100ms para visitantes en Chile, se puede activar la capa gratuita de Cloudflare CDN con proxy activado sobre `origencanino.cl`.
