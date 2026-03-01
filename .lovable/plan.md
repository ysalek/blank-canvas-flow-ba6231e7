
# Revision Completa del Sistema - Estado de Conexiones

## Estado General: FUNCIONAL con detalles pendientes

Los hooks criticos de Supabase estan correctamente conectados:
- `useAsientos` - OK (sin localStorage)
- `useFacturas` - OK (select explicito para evitar error 25006)
- `useClientesSupabase` - OK (sin fallback localStorage)
- `useSupabaseProductos` - OK (categorias y productos desde Supabase)
- `useProductosValidated` - OK (reintentos, validacion de conectividad)
- `useSupabasePlanCuentas` - OK (plan de cuentas desde Supabase)
- `usePlan` - OK (plan y contador de transacciones desde Supabase)
- `LibroMayor` - OK (usa useSupabasePlanCuentas)

---

## Problemas Encontrados (por prioridad)

### 1. MEDIO: NotificationCenter lee de localStorage vacio
**Archivo:** `src/components/contable/notifications/NotificationCenter.tsx`

El centro de notificaciones lee productos, facturas, asientos y cuentas por cobrar desde `localStorage` (lineas 40, 65, 87, 112). Como los datos ahora viven en Supabase, todas estas lecturas retornan arrays vacios. Resultado: **las notificaciones de stock bajo, facturas pendientes y alertas contables nunca se generan**.

**Correccion:** Migrar a usar los hooks de Supabase (`useProductosValidated`, `useFacturas`, `useAsientos`) en vez de `localStorage`.

### 2. BAJO: upgradeToPro/upgradeToEnterprise no persisten
**Archivo:** `src/hooks/usePlan.ts` (lineas 122-123)

Las funciones `upgradeToPro()` y `upgradeToEnterprise()` solo hacen `setCurrentPlan()` en estado local. No actualizan la tabla `subscribers` en Supabase. El cambio de plan se pierde al recargar la pagina.

**Correccion:** Actualizar la tabla `subscribers` en Supabase cuando se cambia de plan. Esto asegura que el upgrade persista entre sesiones.

### 3. INFORMATIVO: 44 archivos con localStorage residual
Modulos como Presupuestos, Anticipos, Comprobantes Integrados, POS, Kardex, Nomina y otros siguen usando localStorage como almacenamiento primario. Los datos de estos modulos se pierden al cambiar de navegador/dispositivo. Esto es deuda tecnica conocida que requiere nuevas tablas en Supabase -- fuera de alcance para esta iteracion.

---

## Plan de Correccion

### Archivo 1: `src/components/contable/notifications/NotificationCenter.tsx`
- Importar `useProductosValidated`, `useFacturas`, `useAsientos`
- Reemplazar las 5 lecturas de `localStorage` (lineas 40, 65, 87, 112, 158) por datos de los hooks
- Productos con stock bajo: usar `productos` del hook filtrados por `stock_actual <= stock_minimo`
- Facturas pendientes: usar `facturas` del hook filtradas por `estado === 'enviada'`
- Asientos contables: usar `getAsientos()` del hook
- Cuentas por cobrar: se mantiene sin datos hasta que exista hook dedicado (no hay tabla)
- Backup reminder: mantener en localStorage (es preferencia local, no dato critico)

### Archivo 2: `src/hooks/usePlan.ts`
- Modificar `upgradeToPro` y `upgradeToEnterprise` para hacer `upsert` en la tabla `subscribers` con el nuevo `subscription_tier`
- Si el registro no existe, crearlo con `user_id` y el tier seleccionado
- Mantener la actualizacion local (`setCurrentPlan`) para respuesta inmediata en la UI

## Resultado Esperado
- Las notificaciones de stock bajo, facturas pendientes y alertas contables funcionaran con datos reales de Supabase
- Los cambios de plan (upgrade) persistiran entre sesiones y dispositivos
- El error 25006 en facturas sigue requiriendo accion manual en Supabase SQL Editor (trigger problematico)
