

# Correcciones Pendientes del IT y Consistencia de Cuentas

## Resumen

Los generadores de asientos (donde se hacen los calculos reales) ya estan corregidos. El Libro Diario muestra correctamente los datos porque solo despliega lo que esta guardado. Sin embargo, quedan **3 inconsistencias** en textos de vista previa y catalogos estaticos que pueden causar confusion o errores si se usan esos catalogos.

## Problemas Detectados

### 1. Texto informativo incorrecto en ComprobanteForm
- **Archivo**: `src/components/contable/comprobantes/ComprobanteForm.tsx` (lineas 451-453)
- **Problema**: El desglose visual usa `/1.16` para mostrar al usuario los montos de IVA e IT, mostrando valores erroneos
- **Solucion**: Cambiar a `/1.13` para IVA y `monto * 0.03` para IT, consistente con la logica de calculo real (lineas 171-173)

### 2. Codigo duplicado/incorrecto en catalogos estaticos
- **Archivo**: `src/components/contable/diary/DiaryData.ts` (linea 82)
  - Cambiar `5401` "IT Pagado" por `5261` "Impuesto a las Transacciones"
- **Archivo**: `src/utils/planCuentasBoliviano2025.ts` (linea 111)
  - Cambiar `5401` "IT Pagado" por `5261` "Impuesto a las Transacciones" para consistencia

### 3. Codigos divergentes en planCuentasInicial
- **Archivo**: `src/utils/planCuentasInicial.ts` (lineas 36-38)
  - `2131` "IVA Debito Fiscal" debe ser `2113`
  - `2141` "IT por Pagar" debe ser `2114`
  - Agregar cuenta `2114` si no existe

## Resumen de Cambios

| Archivo | Cambio |
|---|---|
| `ComprobanteForm.tsx` | Corregir texto preview: `/1.16` a `/1.13` y `monto * 0.03` para IT |
| `DiaryData.ts` | `5401` -> `5261` en plan de cuentas estatico |
| `planCuentasBoliviano2025.ts` | `5401` -> `5261` en catalogo boliviano |
| `planCuentasInicial.ts` | `2131` -> `2113`, `2141` -> `2114` para IVA DF e IT |

## Nota Importante

Los asientos **nuevos** que se generen desde facturacion, compras o comprobantes ya se calculan correctamente. Estos cambios son para asegurar que los textos informativos y catalogos de referencia sean coherentes con la logica corregida.

