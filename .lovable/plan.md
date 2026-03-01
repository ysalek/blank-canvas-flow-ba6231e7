
# Optimizacion del Sistema - Errores Detectados y Correcciones

## Problemas Identificados

### 1. CRITICO: Error 400 al cambiar plan de usuario (subscribers)
**Archivo:** `src/components/admin/UsersManagement.tsx` linea 72-78

El modulo de gestion de usuarios usa `.upsert()` con `{ onConflict: 'user_id' }`, pero la tabla `subscribers` no tiene un constraint UNIQUE en la columna `user_id`. Esto genera el error 400 visible en la sesion:

```
"there is no unique or exclusion constraint matching the ON CONFLICT specification"
```

**Solucion:**
- Crear una migracion SQL para agregar un constraint UNIQUE en `subscribers.user_id`
- Esto permitira que el upsert funcione correctamente cuando un admin cambia el plan de un usuario

### 2. CRITICO: Datos de ejemplo en DiaryData.ts tienen codigos incorrectos
**Archivo:** `src/components/contable/diary/DiaryData.ts` lineas 86-117

Los `asientosIniciales` contienen errores de codificacion que confunden al usuario:
- Linea 97: `1121` etiquetado como "Bancos" (deberia ser "Cuentas por Cobrar Comerciales")
- Linea 112: `1141` etiquetado como "Inventarios" (deberia ser `1131` para Inventarios)
- Linea 113: `2114` etiquetado como "IVA Credito Fiscal" (deberia ser `1142` para IVA CF; `2114` es "IT por Pagar")

**Solucion:** Corregir los codigos y nombres en los asientos de ejemplo para que coincidan con el plan de cuentas ya actualizado en la misma seccion del archivo.

### 3. MEDIO: guardarAsiento es async pero no se awaita en ComprobantesIntegrados
**Archivo:** `src/components/contable/comprobantes/ComprobantesIntegrados.tsx`

- Linea 436: `const exito = guardarAsiento(asiento)` - `guardarAsiento` retorna `Promise<boolean>`, pero no se usa `await`. Esto significa que el resultado siempre es truthy (un Promise object) y el asiento puede no haberse guardado realmente.
- Linea 523: `guardarAsiento(asientoReversion)` - mismo problema en la anulacion.

**Solucion:** Agregar `await` a las llamadas y hacer las funciones contenedoras `async`.

### 4. MEDIO: ComprobantesIntegrados valida contra localStorage planCuentas
**Archivo:** `src/components/contable/comprobantes/ComprobantesIntegrados.tsx` linea 356

La funcion `validarIntegridadContable` lee el plan de cuentas de `localStorage` en lugar de Supabase, donde ya estan los 28 cuentas del usuario. Esto causa que la validacion falle si el localStorage no tiene datos sincronizados.

**Solucion:** Obtener el plan de cuentas desde el hook `useSupabasePlanCuentas` en lugar de `localStorage`.

### 5. BAJO: ComprobantesIntegrados persiste todo en localStorage
**Archivo:** `src/components/contable/comprobantes/ComprobantesIntegrados.tsx`

Todo el modulo de comprobantes (lineas 85-93, 404-405, 488, 539) usa exclusivamente `localStorage` para persistencia. Esto es inconsistente con el resto del sistema que ya migro a Supabase, y significa que los datos se pierden al cambiar de dispositivo.

**Solucion:** Documentar como deuda tecnica. No migrar en este ciclo porque requiere una tabla nueva en Supabase y refactorizacion significativa. Sin embargo, los asientos que generan los comprobantes SI se guardan en Supabase via `guardarAsiento`, lo cual es lo importante para la integridad contable.

---

## Plan de Implementacion

### Cambio 1: Migracion SQL - Agregar UNIQUE constraint a subscribers.user_id
Crear migracion:
```sql
ALTER TABLE subscribers ADD CONSTRAINT subscribers_user_id_unique UNIQUE (user_id);
```

### Cambio 2: Corregir asientosIniciales en DiaryData.ts
Actualizar los asientos de ejemplo:
- Asiento 1 (Venta): `1121` -> nombre correcto "Cuentas por Cobrar Comerciales"
- Asiento 2 (Compra): `1141` -> cambiar a `1131` "Inventarios"; `2114` -> cambiar a `1142` "IVA Credito Fiscal"

### Cambio 3: Await en guardarAsiento dentro de ComprobantesIntegrados
- Hacer `generarAsientoContableIntegrado` async y agregar `await guardarAsiento(asiento)`
- Hacer `anularComprobante` async y agregar `await guardarAsiento(asientoReversion)`
- Actualizar las llamadas a estas funciones para que usen await

### Cambio 4: Validacion de cuentas contra Supabase
- Importar `useSupabasePlanCuentas` en ComprobantesIntegrados
- Usar las cuentas de Supabase en `validarIntegridadContable` en lugar de localStorage

---

## Detalle Tecnico

### Migracion SQL
La tabla `subscribers` actualmente tiene `user_id` como columna regular sin constraint unique. El upsert de PostgREST requiere un constraint unique o exclusion para resolver conflictos. Sin este constraint, cualquier intento de usar `onConflict: 'user_id'` falla con error 42P10.

### Impacto de los cambios
- Cambio 1: Resuelve el error toast que el usuario ve al administrar suscripciones
- Cambio 2: Los datos de ejemplo se alinean con el plan de cuentas boliviano correcto
- Cambio 3: Garantiza que los asientos de comprobantes se persistan en Supabase
- Cambio 4: La validacion usa datos reales del plan de cuentas del usuario
