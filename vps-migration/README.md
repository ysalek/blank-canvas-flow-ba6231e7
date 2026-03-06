# 🚀 Migración a VPS - Sistema Contable Boliviano

## Datos de Conexión Actual (Supabase)

| Campo | Valor |
|-------|-------|
| **Project ID** | `mfhgekyriwabgksreszy` |
| **URL API** | `https://mfhgekyriwabgksreszy.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1maGdla3lyaXdhYmdrc3Jlc3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjEwMjUsImV4cCI6MjA3MDQ5NzAyNX0.zUwsImMyg8vZNeGhZouhFAL6ZDvcjH5vXVOOWXNRbG8` |
| **Región** | South America (São Paulo) |
| **DB Host** | `aws-0-sa-east-1.pooler.supabase.com` |
| **DB Port** | `5432` |
| **DB Name** | `postgres` |
| **DB User** | `postgres.mfhgekyriwabgksreszy` |
| **DB Password** | ⚠️ Obtener del [Dashboard de Supabase](https://supabase.com/dashboard/project/mfhgekyriwabgksreszy/settings/database) |

## Datos de Conexión VPS (Destino)

| Campo | Valor |
|-------|-------|
| **Host** | IP de tu VPS |
| **Puerto** | `5432` |
| **Base de datos** | `contable_boliviano` |
| **Usuario** | `contable_admin` |
| **Contraseña** | `CambiarEstaContraseña2025!` (cambiar!) |
| **pgAdmin** | `http://IP_VPS:5050` |

## Archivos Incluidos

| Archivo | Descripción |
|---------|-------------|
| `docker-compose.yml` | Configuración Docker con PostgreSQL 15 + pgAdmin |
| `init.sql` | Schema completo (~35 tablas, índices) |
| `migrate.sh` | Script automatizado de exportación e importación |
| `README.md` | Esta guía |

## Guía Paso a Paso

### 1. Preparar el VPS

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose -y

# Copiar archivos al VPS
scp -r vps-migration/ usuario@IP_VPS:~/
```

### 2. Levantar PostgreSQL en el VPS

```bash
cd ~/vps-migration

# Cambiar contraseña (editar docker-compose.yml o usar variable)
export DB_PASSWORD="TuContraseñaSegura2025!"

docker-compose up -d
```

### 3. Ejecutar Migración

```bash
# Instalar pg_dump si no está
sudo apt install postgresql-client -y

# Obtener contraseña de Supabase del Dashboard
export SUPABASE_PASSWORD="tu_contraseña_de_supabase"

# Ejecutar migración
chmod +x migrate.sh
./migrate.sh
```

### 4. Verificar en pgAdmin

1. Abrir `http://IP_VPS:5050`
2. Login: `admin@tuempresa.com` / `admin123`
3. Agregar servidor: `contable_db` / `5432` / `contable_admin`
4. Verificar que las tablas tengan datos

### 5. Conectar la Aplicación (Opcional)

Para que la app React apunte al nuevo PostgreSQL, tienes dos opciones:

**Opción A: Supabase Self-Hosted**
```bash
# Montar tu propio Supabase en el VPS
# https://supabase.com/docs/guides/self-hosting/docker
```

**Opción B: API REST directa (requiere refactoring)**
- Reemplazar `@supabase/supabase-js` por Prisma/Drizzle
- Crear un backend Express/Fastify
- Actualizar los hooks de React

## ⚠️ Notas Importantes

- **Contraseña de Supabase**: No está incluida por seguridad. Obtenerla del Dashboard.
- **Cambiar contraseñas**: Las contraseñas por defecto son solo para desarrollo.
- **Backup previo**: Siempre hacer backup antes de migrar.
- **RLS**: El schema del VPS NO incluye políticas RLS. Implementarlas según tu estrategia de seguridad.
- **Auth**: La autenticación de Supabase Auth no se migra automáticamente. Necesitarás configurar tu propio sistema de auth.
