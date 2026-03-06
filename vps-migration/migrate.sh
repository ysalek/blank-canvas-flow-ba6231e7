#!/bin/bash
# ============================================================
# SCRIPT DE MIGRACIÓN - Supabase → VPS PostgreSQL
# Sistema Contable Boliviano - Fiscal Bloom
# ============================================================
#
# USO:
#   chmod +x migrate.sh
#   ./migrate.sh
#
# REQUISITOS:
#   - pg_dump y psql instalados
#   - Acceso al dashboard de Supabase para obtener credenciales
# ============================================================

set -e

# ── Colores para output ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  MIGRACIÓN: Supabase → VPS PostgreSQL${NC}"
echo -e "${BLUE}  Sistema Contable Boliviano${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# ── CONFIGURACIÓN DE ORIGEN (Supabase) ──
# Obtener estos datos del Dashboard de Supabase:
# Settings → Database → Connection string
echo -e "${YELLOW}📋 DATOS DE CONEXIÓN DE SUPABASE${NC}"
echo -e "${YELLOW}   Ir a: https://supabase.com/dashboard/project/mfhgekyriwabgksreszy/settings/database${NC}"
echo ""

# Valores por defecto - EDITAR con tus credenciales reales
SUPABASE_HOST="${SUPABASE_HOST:-aws-0-sa-east-1.pooler.supabase.com}"
SUPABASE_PORT="${SUPABASE_PORT:-5432}"
SUPABASE_DB="${SUPABASE_DB:-postgres}"
SUPABASE_USER="${SUPABASE_USER:-postgres.mfhgekyriwabgksreszy}"
SUPABASE_PASSWORD="${SUPABASE_PASSWORD:-}"

# ── CONFIGURACIÓN DE DESTINO (VPS) ──
VPS_HOST="${VPS_HOST:-localhost}"
VPS_PORT="${VPS_PORT:-5432}"
VPS_DB="${VPS_DB:-contable_boliviano}"
VPS_USER="${VPS_USER:-contable_admin}"
VPS_PASSWORD="${VPS_PASSWORD:-CambiarEstaContraseña2025!}"

# ── Verificar contraseña de Supabase ──
if [ -z "$SUPABASE_PASSWORD" ]; then
  echo -e "${RED}❌ ERROR: Falta la contraseña de Supabase${NC}"
  echo ""
  echo "Configura la variable SUPABASE_PASSWORD antes de ejecutar:"
  echo ""
  echo "  export SUPABASE_PASSWORD='tu_contraseña_de_supabase'"
  echo "  ./migrate.sh"
  echo ""
  echo "O ejecuta directamente:"
  echo "  SUPABASE_PASSWORD='tu_contraseña' ./migrate.sh"
  echo ""
  echo -e "${YELLOW}📋 Dónde encontrar la contraseña:${NC}"
  echo "   1. Ir a https://supabase.com/dashboard/project/mfhgekyriwabgksreszy/settings/database"
  echo "   2. Sección 'Connection string'"
  echo "   3. Copiar la contraseña del Database Password"
  exit 1
fi

DUMP_FILE="supabase_backup_$(date +%Y%m%d_%H%M%S).sql"

# ── TABLAS A EXPORTAR ──
TABLES=(
  "profiles"
  "user_roles"
  "subscribers"
  "app_settings"
  "clientes"
  "proveedores"
  "categorias_productos"
  "productos"
  "plan_cuentas"
  "plan_cuentas_2025"
  "empleados"
  "cuentas_bancarias"
  "activos_fijos"
  "facturas"
  "items_facturas"
  "compras"
  "items_compras"
  "asientos_contables"
  "cuentas_asientos"
  "comprobantes_integrados"
  "items_comprobantes_integrados"
  "movimientos_inventario"
  "movimientos_bancarios"
  "pagos"
  "depreciaciones_activos"
  "centros_costo"
  "presupuestos"
  "items_presupuestos"
  "ventas_credito"
  "anticipos"
  "configuracion_tributaria"
  "declaraciones_tributarias"
  "normativas_2025"
  "cumplimiento_normativo_2025"
  "registro_bancarizacion"
  "control_existencias_ice"
  "facilidades_pago"
  "facilidades_pago_2025"
  "clasificador_actividades_2025"
)

# ── PASO 1: Exportar datos de Supabase ──
echo -e "${GREEN}📤 PASO 1: Exportando datos de Supabase...${NC}"
echo ""

TABLE_ARGS=""
for table in "${TABLES[@]}"; do
  TABLE_ARGS="$TABLE_ARGS -t public.$table"
done

export PGPASSWORD="$SUPABASE_PASSWORD"

echo "   Conectando a: $SUPABASE_HOST:$SUPABASE_PORT/$SUPABASE_DB"
echo "   Usuario: $SUPABASE_USER"
echo ""

pg_dump \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  --data-only \
  --no-owner \
  --no-privileges \
  --no-comments \
  --inserts \
  $TABLE_ARGS \
  -f "$DUMP_FILE" 2>/dev/null

if [ $? -eq 0 ]; then
  DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
  DUMP_LINES=$(wc -l < "$DUMP_FILE")
  echo -e "   ${GREEN}✅ Exportación completada${NC}"
  echo "   📁 Archivo: $DUMP_FILE"
  echo "   📊 Tamaño: $DUMP_SIZE ($DUMP_LINES líneas)"
else
  echo -e "   ${RED}❌ Error al exportar desde Supabase${NC}"
  exit 1
fi

echo ""

# ── PASO 2: Crear schema en VPS ──
echo -e "${GREEN}🏗️  PASO 2: Creando schema en VPS...${NC}"

export PGPASSWORD="$VPS_PASSWORD"

psql \
  -h "$VPS_HOST" \
  -p "$VPS_PORT" \
  -U "$VPS_USER" \
  -d "$VPS_DB" \
  -f init.sql \
  -q 2>/dev/null

if [ $? -eq 0 ]; then
  echo -e "   ${GREEN}✅ Schema creado correctamente${NC}"
else
  echo -e "   ${YELLOW}⚠️  Schema puede que ya exista (continuando...)${NC}"
fi

echo ""

# ── PASO 3: Importar datos al VPS ──
echo -e "${GREEN}📥 PASO 3: Importando datos al VPS...${NC}"

psql \
  -h "$VPS_HOST" \
  -p "$VPS_PORT" \
  -U "$VPS_USER" \
  -d "$VPS_DB" \
  -f "$DUMP_FILE" \
  -q 2>/dev/null

if [ $? -eq 0 ]; then
  echo -e "   ${GREEN}✅ Datos importados correctamente${NC}"
else
  echo -e "   ${RED}❌ Error al importar datos${NC}"
  echo "   Revisa el archivo $DUMP_FILE manualmente"
  exit 1
fi

echo ""

# ── PASO 4: Verificar migración ──
echo -e "${GREEN}🔍 PASO 4: Verificando migración...${NC}"
echo ""

for table in "${TABLES[@]}"; do
  COUNT=$(psql \
    -h "$VPS_HOST" \
    -p "$VPS_PORT" \
    -U "$VPS_USER" \
    -d "$VPS_DB" \
    -t -c "SELECT COUNT(*) FROM public.$table;" 2>/dev/null | tr -d ' ')
  
  if [ -n "$COUNT" ] && [ "$COUNT" -gt 0 ] 2>/dev/null; then
    echo -e "   ${GREEN}✅${NC} $table: $COUNT registros"
  else
    echo -e "   ${YELLOW}○${NC}  $table: vacía"
  fi
done

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}✅ MIGRACIÓN COMPLETADA${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${YELLOW}📋 PRÓXIMOS PASOS:${NC}"
echo "   1. Actualizar .env de la aplicación con los nuevos datos:"
echo ""
echo "      DATABASE_URL=postgresql://$VPS_USER:****@$VPS_HOST:$VPS_PORT/$VPS_DB"
echo ""
echo "   2. Si usas la app con Supabase Client, necesitarás:"
echo "      - Reemplazar supabase-js por un ORM como Prisma o Drizzle"
echo "      - O montar tu propio Supabase self-hosted"
echo ""
echo "   3. Para Supabase self-hosted en tu VPS:"
echo "      https://supabase.com/docs/guides/self-hosting/docker"
echo ""
echo -e "${YELLOW}📁 Archivo de backup guardado: $DUMP_FILE${NC}"
