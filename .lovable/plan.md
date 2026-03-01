

# Analisis Contable Detallado y Actualizacion Normativa SIN Bolivia

## Errores de Funcionamiento Detectados

### 1. CRITICO: Plan de Cuentas Inconsistente entre Modulos
El `DiaryData.ts` define el plan de cuentas base, pero los codigos no coinciden con lo que usa `useAsientosGenerator.ts`:

- **DiaryData.ts** define `1121` como "Bancos" y `1131` como "Cuentas por Cobrar"
- **useAsientosGenerator.ts** usa `1121` como "Cuentas por Cobrar Comerciales" (linea 151)
- **DiaryData.ts** define `2114` como "IVA Credito Fiscal" (pasivo), pero el generador usa `1142` como "IVA Credito Fiscal" (activo, que es lo correcto)
- Cuenta `5401` (IT Pagado), `5322` (Perdidas de Inventario), `2131` no existen en el plan de cuentas base

**Solucion**: Actualizar `DiaryData.ts` para alinear el plan de cuentas con la normativa boliviana y con lo que usan los generadores de asientos.

### 2. CRITICO: Compras no awaita actualizacion de stock
En `ComprasModule.tsx` linea 90-92, las llamadas a `actualizarStockProducto` no usan `await`, creando condiciones de carrera donde el stock puede no actualizarse antes de guardar la compra.

**Solucion**: Agregar `await` a cada llamada de actualizacion de stock en el bucle.

### 3. CRITICO: Balance General lee productos de localStorage
En `useReportesContables.ts` linea 211, el Balance General todavia usa `localStorage` como fallback para obtener productos:
```
const productosData = productos || JSON.parse(localStorage.getItem('productos') || '[]');
```
Esto causa que el inventario en el Balance General muestre datos incorrectos o vacios.

**Solucion**: Eliminar el fallback de localStorage. Si `productos` es undefined/vacio, usar array vacio.

### 4. MEDIO: Nomina y Declaraciones usan localStorage
- `NominaBoliviana.tsx` (lineas 96-104): empleados y planillas en localStorage
- `DeclaracionesTributariasModule.tsx` (lineas 66-71, 114): declaraciones en localStorage

Estos modulos deberian usar Supabase para persistencia, pero migrarlos es un cambio mayor. Por ahora, documentar como deuda tecnica.

### 5. MEDIO: Asiento de venta no registra Costo de Ventas
`generarAsientoVenta` (linea 140-218) solo genera el asiento de ingreso (Ctas por Cobrar / Ventas / IVA DF) y el asiento de IT. El costo de ventas se genera por separado en `FacturacionModule.tsx` via `generarAsientoInventario`, pero si el producto no tiene `costo_unitario > 0`, no se genera. Esto puede dejar ventas sin su costo asociado.

---

## Actualizaciones Normativas SIN Bolivia 2025-2026

### 6. Porcentajes de Nomina desactualizados (etiquetados "2024")
En `NominaBoliviana.tsx`, los porcentajes estan marcados como "normativa boliviana 2024":
- `minimoNoImponible: 2500` -- El SMN 2026 estimado es Bs 2,500, pero el minimo no imponible para RC-IVA es 4 SMN (Bs 10,000), no 1 SMN
- El calculo de RC-IVA (linea 134-139) resta solo 1 SMN, cuando la normativa establece que la base imponible se calcula restando 2 salarios minimos nacionales y los aportes laborales

**Solucion**: Actualizar constantes a 2026, corregir el calculo de RC-IVA con minimoNoImponible = 4 * SMN.

### 7. DS 5503 abrogado por DS 5516 - Funcion activa
`sinService.ts` linea 370-387 tiene `calcularIncentivosDS5503()` que calcula incentivos (Hecho en Bolivia, Depreciacion Acelerada, Aportes patronales como pago a cuenta IVA). El DS 5516 de enero 2026 abrogo estos incentivos.

**Solucion**: Marcar la funcion como deprecated, retornar siempre incentivos deshabilitados, y agregar nota explicativa sobre DS 5516.

### 8. RND 102500000052 referenciada pero ya sin efecto
La RND 102500000052 reglamentaba los incentivos del DS 5503. Como el DS 5516 abrogo el DS 5503, esta RND tambien queda sin efecto. Sin embargo, `DeclaracionesTributariasModule.tsx` lista `ds_5516` como tipo de declaracion (correcto), pero no refleja que la RND 102500000052 ya no aplica.

### 9. Salario Minimo Nacional 2026
El sistema usa Bs 2,500 como SMN estimado. Actualizar etiquetas de "2024" a "2026".

### 10. UFV y tipo de cambio
Los valores en `sinService.ts` estan correctos para 2026: UFV = 3.05, TC USD = 6.96, ISAE = 464, IEHD max = 10.40.

---

## Plan de Implementacion

### Archivo 1: `src/components/contable/diary/DiaryData.ts`
Actualizar el plan de cuentas para alinearlo con los codigos usados por el sistema:
- `1111` = Caja y Bancos (consolidar)
- `1121` = Cuentas por Cobrar Comerciales
- `1131` = Inventarios
- `1142` = IVA Credito Fiscal (ACTIVO, no pasivo)
- `2113` = IVA Debito Fiscal (pasivo)
- `2114` = IT por Pagar
- Agregar cuentas faltantes: `5322`, `5401`, `4211`

### Archivo 2: `src/components/contable/ComprasModule.tsx`
- Convertir el bucle de actualizacion de stock a `async` con `await` (lineas 90-92)

### Archivo 3: `src/hooks/useReportesContables.ts`
- Eliminar fallback de localStorage en `getBalanceSheetData()` (linea 211)

### Archivo 4: `src/components/contable/nomina/NominaBoliviana.tsx`
- Actualizar etiqueta de "normativa boliviana 2024" a "2026"
- Corregir `minimoNoImponible` de 2500 a 10000 (4 SMN)
- Actualizar calculo de RC-IVA: base = totalGanado - (2 * SMN) - aportes laborales

### Archivo 5: `src/services/sinService.ts`
- Actualizar `calcularIncentivosDS5503` para reflejar abrogacion por DS 5516
- La funcion debe retornar incentivos deshabilitados con mensaje explicativo

### Archivo 6: `src/components/contable/billing/BillingData.ts`
- Actualizar comentario del DS 5503 a DS 5516 en la seccion de sectores especiales

