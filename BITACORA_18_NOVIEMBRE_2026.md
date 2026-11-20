# 📓 Bitácora de Trabajo — Origen Canino & Ecosistema PPV (`origencanino.cl`)

**Fecha:** Miércoles 18 de Noviembre de 2026 (Madrugada 00:15 AM)  
**Responsable:** Patricio Padilla (PPV Soluciones)  
**Servidor de Producción:** Hetzner Cloud VPS `167.233.122.18` (Ubuntu 24.04 / 2 vCPUs / 4 GB RAM / 40 GB NVMe)  
**Hito:** Migración Exitosa a Docker Compose Nativo & Desmonte Definitivo de Coolify (*Zero-Downtime*)  

---

## 🎯 1. Resumen de la Operación

En la ventana de mantenimiento nocturna acordada (00:08 - 00:15 AM), sin presencia de clientes activos en la tienda, se ejecutó con éxito total la migración arquitectónica del stack de Origen Canino desde el motor de auto-construcción de Coolify (Nixpacks) hacia un entorno nativo y profesional de **Docker Compose**, idéntico al estándar de alta eficiencia utilizado por TimbrApp.

---

## 🚀 2. Métricas y Beneficios Inmediatos

| Métrica | Antes (Coolify Nixpacks) | Ahora (Docker Compose Nativo) | Impacto / Ganancia |
| :--- | :---: | :---: | :---: |
| **Espacio Libre en Disco** | 8.3 GB libres (77% uso) | **15.0 GB libres (61% uso)** | **+6.7 GB SSD recuperados** |
| **Memoria RAM Disponible** | ~1.1 GB disponible | **2.2 GB disponibles (58% libre)** | **+1.1 GB RAM libre** |
| **Uso de RAM Contenedor App** | ~180 MB - 1.5 GB en builds | **49.2 MB (constante)** | **Reducción de >70% de consumo** |
| **Tiempo de Despliegue** | 3 - 5 min con picos de disco | **< 30 seg (compilación local + rsync)** | **Cero estrés para el VPS** |
| **Comportamiento en `git push`** | Disparaba auto-build en servidor | **Inerte (no sobrecarga el servidor)** | **Eliminación total de picos al 100%** |
| **Disponibilidad de Servicio** | Conmutación instantánea | **0 segundos de caída (Zero-Downtime)** | **HTTP 200 verificado** |

---

## 🛠️ 3. Componentes Desplegados

1. **Ubicación en Servidor:** `/data/origen-canino/`
   - `docker-compose.prod.yml`: Define el servicio `origen-canino-app`, conectado a la red externa `coolify` con labels de Traefik v3.6.
   - `Dockerfile.prod`: Imagen base `python:3.12-slim` (~150 MB).
   - `/backend`: Código FastAPI montado en volumen.
   - `/dist`: Distribución frontend Vite pre-renderizada montada en volumen.
   - `/uploads`: Resguardo íntegro de imágenes (`blog`, `dogs`, `products`, `receipts`, `testimonials`).
2. **Proxy Inverso & SSL:**
   - Se preservó `coolify-proxy` (Traefik v3.6), el cual gestiona los certificados Let's Encrypt de forma compartida para todos los proyectos (`origencanino.cl`, `timbraapp.cl`, `legrandpetit.cl`).
   - Los certificados SSL no sufrieron ninguna interrupción.
3. **Servicios Satélite Coolify Apagados:**
   - Se apagaron y deshabilitaron del auto-arranque los contenedores ociosos: `coolify`, `coolify-db`, `coolify-redis`, `coolify-realtime`, `coolify-sentinel`.
4. **Base de Datos:**
   - `origen-canino-db` (PostgreSQL 17 en Docker) continúa intacta, saludable y conectada.

---

## 🧪 4. Verificación de Endpoints en Vivo

- `https://origencanino.cl` -> **HTTP 200 OK**
- `https://origencanino.cl/api/products` -> **HTTP 200 OK**
- `https://origencanino.cl/admin` -> **HTTP 200 OK**

