#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue y Migración Nativa a Docker Compose — Origen Canino 2.0
# Servidor: Hetzner Cloud (167.233.122.18)
# Objetivo: Desmontar el auto-builder de Coolify y operar en Docker Compose nativo.
# ==============================================================================

set -euo pipefail

HETZNER_HOST="167.233.122.18"
REMOTE_DIR="/data/origen-canino"
LOCAL_DIR="/home/patricio/Documentos/origen-canino-2"

echo "=========================================================="
echo "🐾 INICIANDO DESPLIEGUE NATIVO DOCKER COMPOSE: ORIGEN CANINO"
echo "=========================================================="

# 1. Compilar Frontend localmente
echo "📦 1. Compilando frontend localmente con Vite..."
cd "$LOCAL_DIR"
npm run build

# 2. Crear directorio en el servidor Hetzner y respaldar uploads existentes
echo "📁 2. Verificando directorio remoto en $REMOTE_DIR y resguardando uploads..."
ssh -o StrictHostKeyChecking=no root@$HETZNER_HOST "
  mkdir -p $REMOTE_DIR/uploads $REMOTE_DIR/backend $REMOTE_DIR/dist
  OLD_CONTAINER=\$(docker ps -q --filter 'name=t3axkro5sddkevfhqih195r4')
  if [ -n \"\$OLD_CONTAINER\" ]; then
    echo \"Respaldando archivos uploads desde contenedor \$OLD_CONTAINER...\"
    docker cp \$OLD_CONTAINER:/app/backend/uploads/. $REMOTE_DIR/uploads/ 2>/dev/null || true
    docker cp \$OLD_CONTAINER:/app/uploads/. $REMOTE_DIR/uploads/ 2>/dev/null || true
  fi
"

# 3. Sincronizar archivos al servidor
echo "🚀 3. Sincronizando código fuente, backend y dist a Hetzner..."
rsync -avz --delete \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.git' \
  --exclude 'node_modules' \
  "$LOCAL_DIR/Dockerfile.prod" \
  "$LOCAL_DIR/docker-compose.prod.yml" \
  root@$HETZNER_HOST:$REMOTE_DIR/

rsync -avz --delete \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'uploads' \
  "$LOCAL_DIR/backend/" \
  root@$HETZNER_HOST:$REMOTE_DIR/backend/

rsync -avz --delete \
  "$LOCAL_DIR/dist/" \
  root@$HETZNER_HOST:$REMOTE_DIR/dist/

# 4. Construir y levantar el contenedor nativo en Hetzner
echo "🐳 4. Construyendo imagen nativa y levantando contenedor en Hetzner..."
ssh root@$HETZNER_HOST "
  cd $REMOTE_DIR
  docker compose -f docker-compose.prod.yml build --no-cache
  docker compose -f docker-compose.prod.yml up -d
"

# 5. Healthcheck en vivo
echo "🩺 5. Comprobando respuesta HTTP local en el contenedor..."
ssh root@$HETZNER_HOST "
  sleep 4
  docker exec origen-canino-app curl -s http://localhost:8000/api/products | head -c 80
  echo ''
"

# 6. Conmutación limpia de contenedores antiguos de Coolify
echo "🔄 6. Conmutando y apagando contenedor antiguo de Coolify..."
ssh root@$HETZNER_HOST "
  OLD_CONTAINER=\$(docker ps -q --filter 'name=t3axkro5sddkevfhqih195r4')
  if [ -n \"\$OLD_CONTAINER\" ]; then
    echo \"Deteniendo contenedor antiguo de Coolify: \$OLD_CONTAINER...\"
    docker stop \$OLD_CONTAINER
    docker rm \$OLD_CONTAINER
  fi
"

# 7. Apagado de servicios satélite de Coolify para recuperar RAM (manteniendo coolify-proxy y origen-canino-db)
echo "🛑 7. Desactivando servicios redundantes de Coolify (liberando RAM)..."
ssh root@$HETZNER_HOST "
  for s in coolify coolify-db coolify-redis coolify-realtime coolify-sentinel; do
    if docker ps -q -f name=\"^\$s$\" | grep -q .; then
      echo \"Deteniendo \$s...\"
      docker stop \"\$s\" || true
      docker update --restart=no \"\$s\" || true
    fi
  done
"

# 8. Depuración masiva de caché Docker en Hetzner
echo "🧹 8. Depurando caché y capas residuales en Hetzner..."
ssh root@$HETZNER_HOST "
  docker builder prune -a -f > /dev/null 2>&1
  docker image prune -a --filter 'until=1h' -f > /dev/null 2>&1
  echo '=== ESTADO DEL DISCO EN HETZNER ==='
  df -h /
  echo '=== CONTENEDORES ACTIVOS ==='
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
"

# 9. Verificación de producción pública
echo "🌐 9. Verificando tienda pública https://origencanino.cl ..."
curl -I -s https://origencanino.cl | head -n 5

echo "=========================================================="
echo "✅ DESPLIEGUE NATIVO COMPLETADO EXITOSAMENTE"
echo "🌐 URL Producción: https://origencanino.cl"
echo "=========================================================="
