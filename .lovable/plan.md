

# Analisis Profundo del Sistema - Hallazgos y Correcciones

## Estado Actual

### Modulos con Supabase correctamente integrado (sin problemas)
- `useAsientos.ts` - Limpio, sin localStorage
- `useFacturas.ts` - Limpio, sin localStorage (pero tiene el error 25006 del trigger)
- `useProductosValidated.ts` - Funciona correctamente (26 categorias, 1 producto cargados)
- `useSupabaseProductos.ts` - Funciona correctamente
- `usePlan.ts` - Plan cargado desde Supabase correctamente
- `SubscriptionsManager.tsx` - Chart de ingresos ya incluye Pro + Enterprise (corregido previamente)

---

## Problemas Detectados

### CRITICO: Error 25006 en tabla `facturas` (persiste)
El GET a `/rest/v1/facturas` sigue devolviendo **status 405** con error `"cannot execute INSERT in a read-only transaction"`. Esto significa que hay un **trigger en la tabla facturas** en Supabase que ejecuta un INSERT durante una lectura. El modulo de facturacion esta completamente roto - no carga ninguna factura.

**Accion requerida (manual en Supabase SQL Editor):**
```text
-- Paso 1: Identificar triggers en la tabla facturas
SELECT tgname, tgenabled, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgrelid = 'public.facturas'::regclass;

-- Paso 2: Desactivar el trigger problematico (reemplazar NOMBRE_TRIGGER)
ALTER TABLE public.facturas DISABLE TRIGGER NOMBRE_TRIGGER;
```
Este problema no se puede resolver desde el codigo, requiere accion directa en la base de datos.

### MEDIO: localStorage residual en hooks de datos

**1. `useClientesSupabase.ts` (linea 37-38)**
Tiene fallback a localStorage cuando falla Supabase. Debe eliminarse para mantener consistencia.

**2. `useInventarioBolivia.ts` (lineas 208-209)**
La funcion `validarIntegridadContable` lee asientos y productos desde localStorage en vez de usar los hooks de Supabase. Los datos siempre estaran vacios o desactualizados.

**3. `usePlan.ts` (lineas 125-140)**
El contador de transacciones mensuales (`txn_count_YYYY-MM`) usa localStorage. Esto significa que el limite de 100 transacciones del plan basico se puede evadir limpiando el navegador. Deberia persistirse en Supabase para ser confiable.

### BAJO: Modulos completos operando solo con localStorage
Los siguientes modulos funcionan pero sus datos no persisten en Supabase (se pierden al cambiar navegador/dispositivo):

| Modulo | Archivo | Impacto |
|--------|---------|---------|
| Comprobantes Integrados | `ComprobantesIntegrados.tsx` | 61 usos de localStorage |
| Libro Mayor | `LibroMayor.tsx` | Lee planCuentas de localStorage |
| Punto de Venta (POS) | `EnhancedPOSModule.tsx` | Ventas y clientes en localStorage |
| Kardex | `KardexModule.tsx` | Productos y movimientos en localStorage |
| Nomina Boliviana | `NominaBoliviana.tsx` | Empleados y planillas en localStorage |
| Retenciones | `RetencionesModule.tsx` | Retenciones en localStorage |
| Declaraciones Tributarias | `DeclaracionesTributariasModule.tsx` | Declaraciones en localStorage |
| Datos de Ejemplo | `datosEjemplo.ts` | Inicializa localStorage con datos vacios |

---

## Plan de Correccion (esta iteracion)

### 1. Eliminar localStorage en `useClientesSupabase.ts`
- Remover lineas 37-38: el fallback a localStorage en el catch
- Si Supabase falla, dejar el array vacio (consistente con useFacturas y useAsientos)

### 2. Corregir `useInventarioBolivia.ts` 
- Modificar `validarIntegridadContable` para recibir asientos y productos como parametros desde los hooks existentes, en vez de leer localStorage

### 3. Corregir `LibroMayor.tsx`
- Actualmente lee `planCuentas` de localStorage (linea 49)
- Debe usar el hook `useSupabasePlanCuentas` que ya existe e importa datos desde Supabase

### 4. Migrar contador de transacciones en `usePlan.ts`
- Reemplazar localStorage por una consulta a Supabase que cuente los asientos del mes actual
- Esto hace el limite del plan basico realmente efectivo

### Fuera de alcance (iteracion futura)
- Migracion completa de ComprobantesIntegrados, POS, Kardex, Nomina, Retenciones y Declaraciones a Supabase (requieren nuevas tablas y logica extensa)

## Archivos a Modificar
1. `src/hooks/useClientesSupabase.ts` - Eliminar fallback localStorage
2. `src/hooks/useInventarioBolivia.ts` - Usar datos de hooks en vez de localStorage
3. `src/components/contable/LibroMayor.tsx` - Usar useSupabasePlanCuentas
4. `src/hooks/usePlan.ts` - Migrar contador de transacciones a Supabase

## Resultado Esperado
- Tres hooks criticos (clientes, inventario, plan) dejaran de depender de localStorage
- El Libro Mayor mostrara datos reales del plan de cuentas en Supabase
- El limite de transacciones del plan basico sera confiable
- El error 25006 de facturas requiere accion manual del usuario en Supabase SQL Editor

