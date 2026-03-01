
# Plan: Corregir Flujo Contable Completo

## Problemas Detectados

### 1. ERROR CRITICO: Facturas no se cargan (Error 405/25006)
El hook `useFacturas.ts` usa `fetch` directo con el header `Prefer: tx=read-write` para evitar un error de triggers en la tabla `facturas`. Sin embargo, este header esta causando un error 405 (Method Not Allowed). Esto significa que **ninguna factura se muestra en el sistema**, bloqueando todo el flujo de facturacion.

**Solucion:** Reemplazar el `fetch` directo por el cliente oficial de Supabase, pero sin `select('*')`. Usar una seleccion explicita de columnas para evitar que los triggers se activen durante la lectura. Si el trigger sigue causando problemas, usar `fetch` con `POST` en lugar de `GET` (PostgREST acepta `Prefer: tx=read-write` solo en peticiones POST/PATCH/DELETE, no en GET).

### 2. Error potencial: `configuracion_tributaria` usa `.single()`
En `FacturacionModule.tsx` linea 72, se usa `.single()` para cargar configuracion tributaria. Si no existe la fila, genera un error 406. Debe cambiarse a `.maybeSingle()`.

### 3. Estado de Resultados usa `localStorage` para comprobantes
En `useReportesContables.ts` linea 309, el Estado de Resultados todavia lee `comprobantes_integrados` de `localStorage`, lo cual es inconsistente con el resto del sistema que ya migro a Supabase.

## Cambios a Implementar

### Archivo 1: `src/hooks/useFacturas.ts`
- Reemplazar el `fetch` directo con `Prefer: tx=read-write` por el cliente Supabase estandar
- Usar seleccion explicita de columnas (ya definida en el fetch actual) pero con el cliente SDK
- Eliminar las constantes hardcodeadas de SUPABASE_URL y SUPABASE_KEY
- Si el SDK sigue fallando por el trigger, usar `fetch` con metodo `POST` y header `Prefer: tx=read-write` via la API RPC

### Archivo 2: `src/components/contable/FacturacionModule.tsx`
- Cambiar `.single()` a `.maybeSingle()` en `loadConfiguracionTributaria`

### Archivo 3: `src/hooks/useReportesContables.ts`
- Eliminar la lectura de `comprobantes_integrados` de localStorage en `getIncomeStatementData()` ya que los datos contables vienen de los asientos en Supabase

## Detalle Tecnico

### Fix principal (useFacturas.ts)
El problema raiz es que PostgREST no acepta `Prefer: tx=read-write` en peticiones GET. La solucion es usar el cliente Supabase con seleccion explicita de columnas:

```text
supabase
  .from('facturas')
  .select('id,numero,cliente_id,fecha,fecha_vencimiento,subtotal,...')
  .eq('user_id', user.id)
  .order('fecha', { ascending: false })
```

Si el trigger sigue interfiriendo, se creara una vista SQL (`facturas_view`) que no ejecute triggers al ser leida.

### Fix secundario (configuracion_tributaria)
Cambiar `.single()` por `.maybeSingle()` para evitar error cuando no existe configuracion.

### Fix terciario (Estado de Resultados)
Eliminar el bloque que lee `comprobantes_integrados` de localStorage (lineas 309 y 333-396 de useReportesContables.ts) ya que todos los datos contables ya estan en los asientos de Supabase.
