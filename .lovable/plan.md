
# Correccion de errores en modulo de Compras

## Problemas encontrados (3 bugs)

### Bug 1: "Producto no encontrado" al actualizar stock
`ComprasModule` usa `actualizarStockProducto` de `useContabilidadIntegration`, que internamente usa `useProductosUnificado` -- una instancia separada del hook con su propia lista de productos. Esta lista puede no estar sincronizada con la de `useSupabaseProductos` que ya se usa en el mismo componente.

**Solucion**: Usar `actualizarStockProducto` directamente de `useSupabaseProductos` en lugar de pasarlo por `useContabilidadIntegration`.

### Bug 2: Error 25006 "read-only transaction" al insertar compra
La tabla `compras` tiene triggers de auditoria. Usar `.select('*')` despues de `.insert()` causa conflicto con transacciones de solo lectura.

**Solucion**: En `useSupabaseProveedores.ts`, cambiar `.select()` a `.select('id, numero, proveedor_id, fecha, fecha_vencimiento, subtotal, descuento_total, iva, total, estado, tipo_pago, monto_pagado, saldo_pendiente, observaciones, created_at, updated_at')` en las operaciones de insert y update de compras.

### Bug 3: Error de flujo - el fallo en stock no detiene la creacion de la compra
Cuando `actualizarStockProducto` falla (Bug 1), el error se lanza pero `handleSaveCompra` no lo captura correctamente porque el loop `for...of` continua y luego `crearCompra` se ejecuta igual. Al reintentar, el numero de compra ya existe (error 23505 "duplicate key").

**Solucion**: Reestructurar `handleSaveCompra` para que primero guarde la compra en DB, y luego actualice el stock. Si el stock falla, la compra queda registrada y se muestra un aviso parcial. Ademas, generar el numero de compra consultando las compras existentes en DB correctamente.

---

## Archivos a modificar

### 1. `src/components/contable/ComprasModule.tsx`
- Importar `actualizarStockProducto` de `useSupabaseProductos` en vez de `useContabilidadIntegration`
- Reorganizar `handleSaveCompra`: primero asiento contable, luego guardar compra en DB, luego actualizar stock (con try/catch individual para stock)
- Manejar errores de stock como advertencia sin abortar toda la operacion

### 2. `src/hooks/useSupabaseProveedores.ts`
- Cambiar `.select()` a seleccion explicita de columnas en `crearCompra` (linea 198) y `actualizarCompra` (linea 236)
- Usar `.maybeSingle()` en lugar de `.single()` como medida defensiva

### 3. `src/components/contable/purchases/CompraForm.tsx`
- Mejorar la generacion de numero de compra para evitar duplicados: usar timestamp o UUID parcial como sufijo unico

## Resultado esperado
- Las compras se guardaran sin errores de "Producto no encontrado"
- No habra errores de transaccion de solo lectura (25006)
- No habra errores de clave duplicada (23505) al reintentar
