
# Corregir Costos en Historial de Movimientos de Inventario

## Problema

El historial de movimientos muestra **Bs. 0.00** en las columnas de Costo Unitario, Costo Promedio y Valor del Movimiento. Esto ocurre porque al registrar movimientos en la base de datos, **no se guarda el costo unitario del producto**.

Hay 3 lugares donde se insertan movimientos sin incluir `costo_unitario`:
- `useSupabaseProductos.ts` (movimientos manuales)
- `useProductosValidated.ts` (movimientos por facturacion)
- `useProductosUnificado.ts` (movimientos generales)

Ademas, falta una columna de **Valor del Stock** (stock nuevo x costo) para que el usuario vea cuanto vale su inventario despues de cada movimiento.

---

## Cambios a Realizar

### 1. Incluir `costo_unitario` al crear movimientos

**Archivos**: `useSupabaseProductos.ts`, `useProductosValidated.ts`, `useProductosUnificado.ts`

En cada lugar donde se hace `insert` a `movimientos_inventario`, agregar el campo `costo_unitario` tomandolo del producto:

```
costo_unitario: producto.costo_unitario || producto.precio_compra || 0
```

Esto asegura que todos los movimientos futuros registren el costo real.

### 2. Agregar columna "Valor Stock" al historial

**Archivo**: `MovementListTab.tsx`

Agregar una columna adicional que muestre el valor del inventario despues del movimiento:
- **Valor Stock** = Stock Nuevo x Costo Promedio Ponderado
- Esto responde directamente a "cuanto en dinero es el inventario"

### 3. Agregar fila de totales al final de la tabla

**Archivo**: `MovementListTab.tsx`

Incluir un `tfoot` con:
- Total de cantidad de movimientos
- Suma total de valores de movimientos
- Mensaje informativo si no hay movimientos

### 4. Mejorar mapeo de datos en el hook

**Archivo**: `useSupabaseMovimientos.ts`

Mejorar `getMovimientosInventario()` para calcular mejor el costo promedio ponderado usando datos del producto asociado cuando `costo_unitario` del movimiento es 0 (para movimientos historicos sin costo guardado).

---

## Detalle Tecnico

### useSupabaseProductos.ts - linea ~258
Agregar `costo_unitario: producto.costo_unitario` al objeto de insert.

### useProductosValidated.ts - linea ~410
Agregar `costo_unitario: producto.costo_unitario` al objeto de insert.

### useProductosUnificado.ts - buscar insert similar
Agregar `costo_unitario` igualmente.

### MovementListTab.tsx
- Nueva columna "Valor Stock" despues de "Valor Mov."
- Fila de totales en `tfoot`
- Mensaje "Sin movimientos registrados" cuando la lista esta vacia
- Formato de numeros mejorado con separador de miles

### useSupabaseMovimientos.ts
- En `getMovimientosInventario()`, si `costo_unitario` es 0, intentar obtener el costo del producto relacionado via el join existente con `productos`
- Agregar `precio_compra` y `costo_unitario` al select del join de productos

## Resultado Esperado

- Todos los movimientos nuevos guardan el costo unitario real
- El historial muestra costos reales en lugar de Bs. 0.00
- Nueva columna "Valor Stock" muestra el valor monetario del inventario tras cada movimiento
- Fila de totales da un resumen rapido
