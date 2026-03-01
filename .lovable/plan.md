

# Plan: Corregir Procesos del Sistema

## Problemas Detectados

### 1. Error critico en Facturas (Error 25006)
La tabla `facturas` tiene un trigger que ejecuta un INSERT durante una consulta SELECT (lectura), causando el error `"cannot execute INSERT in a read-only transaction"`. Esto impide cargar facturas correctamente. El GET a `/rest/v1/facturas` devuelve status 405.

**Solucion**: En `useFacturas.ts`, el SELECT ya usa columnas explicitas (correcto), pero el trigger en la base de datos sigue causando el problema. Se debe desactivar o corregir el trigger de auditoria en la tabla `facturas` desde Supabase SQL Editor. Ademas, agregar manejo de error mas robusto para que el modulo no se rompa.

### 2. localStorage como fallback en useAsientos.ts
El hook `useAsientos.ts` tiene multiples fallbacks a localStorage:
- Linea 72: Si falla la carga de Supabase, lee de localStorage
- Lineas 116-118: Si no hay usuario, guarda en localStorage
- Lineas 170-172: Despues de guardar en Supabase, duplica en localStorage como "backup"
- Lineas 186-188: Si falla el guardado, cae a localStorage

Esto puede causar datos desincronizados y perdida de integridad.

**Solucion**: Eliminar todos los fallbacks a localStorage. Si no hay usuario o falla Supabase, mostrar error claro al usuario sin guardar datos fantasma en localStorage.

### 3. Modulos que usan localStorage como almacen principal
Varios componentes usan localStorage como almacen principal en lugar de Supabase:
- `ComprobantesIntegrados.tsx`: Lee/escribe comprobantes desde localStorage
- `LibroMayor.tsx`: Lee plan de cuentas de localStorage
- `UserProductionManager.tsx`: Gestiona usuarios en localStorage
- `EnhancedPOSModule.tsx`: Ventas y clientes en localStorage
- `generarAsientosComprobantes.ts`: Genera asientos desde localStorage

Estos modulos operan de forma aislada sin persistir datos en la base de datos.

**Solucion (alcance controlado)**: Para esta iteracion, limpiar los fallbacks criticos en `useAsientos.ts` que mezclan datos de Supabase con localStorage. Los modulos que usan localStorage como almacen principal (comprobantes, POS, etc.) requeriran una migracion mas amplia en el futuro.

### 4. El chart de ingresos en SubscriptionsManager solo cuenta Pro
En `SubscriptionsManager.tsx` linea 36-39, el grafico de tendencia de ingresos solo cuenta suscriptores Pro (`subscription_tier === 'pro'`) y multiplica por $29. Los Enterprise no se reflejan en el grafico.

**Solucion**: Incluir Enterprise en el calculo del chart de ingresos.

---

## Archivos a Modificar

### `src/hooks/useAsientos.ts`
- Eliminar fallback a localStorage en la carga (linea 72-75)
- Eliminar fallback a localStorage cuando no hay usuario (lineas 115-126): retornar false con error
- Eliminar duplicacion en localStorage despues de guardar en Supabase (lineas 170-172)
- Eliminar fallback a localStorage en error de guardado (lineas 186-196): mostrar error real

### `src/hooks/useFacturas.ts`
- Eliminar fallback a localStorage en `guardarFactura` (lineas 130-134)
- Agregar manejo de error mas descriptivo para el error 25006

### `src/components/admin/SubscriptionsManager.tsx`
- Corregir calculo del chart (lineas 36-41): incluir Enterprise en la formula de ingresos
- Calcular: `proInMonth * 29 + enterpriseInMonth * 99`

### SQL a ejecutar manualmente en Supabase
Para resolver el error 25006 en facturas, se necesita identificar y desactivar el trigger problematico. Se proporcionara el SQL necesario.

## Resultado Esperado
- Las facturas se cargaran sin error 25006 (requiere accion en Supabase)
- Los asientos contables funcionaran exclusivamente con Supabase, sin datos fantasma en localStorage
- El grafico de ingresos reflejara correctamente Pro + Enterprise
- Mensajes de error claros cuando no hay conexion en lugar de datos falsos locales

