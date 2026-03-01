
# Verificacion de Integridad de Modulos Contables

## Estado General: FUNCIONAL con 2 problemas identificados

### Modulos que funcionan correctamente (Supabase)

| Modulo | Fuente de datos | Estado |
|--------|----------------|--------|
| Libro Diario | `useAsientos` (Supabase) | OK |
| Libro Mayor | `useAsientos` + `useSupabasePlanCuentas` (Supabase) | OK |
| Balance de Comprobacion (Modulo dedicado) | `useReportesContables` -> `useAsientos` (Supabase) | OK |
| Balance General | `useContabilidadIntegration` -> `useReportesContables` (Supabase) | OK |
| Estado de Resultados | `useReportesContables` -> `useAsientos` (Supabase) | OK |
| Declaracion IVA | `useContabilidadIntegration` -> `useAsientos` (Supabase) | OK |
| Facturacion | `useFacturas` (Supabase) | OK |

### Flujo contable verificado

```text
Factura/Compra/Movimiento Inventario
        |
        v
useAsientosGenerator (genera asientos con cuentas correctas)
        |
        v
useAsientos.guardarAsiento() (persiste en Supabase: asientos_contables + cuentas_asientos)
        |
        v
useReportesContables (lee asientos de Supabase via useAsientos)
        |
        +---> getLibroMayor() --> Libro Mayor
        +---> getTrialBalanceData() --> Balance de Comprobacion
        +---> getBalanceSheetData() --> Balance General (Activos = Pasivos + Patrimonio)
        +---> getIncomeStatementData() --> Estado de Resultados
        +---> getDeclaracionIVAData() --> Declaracion IVA (Debito - Credito Fiscal)
```

### Verificacion de integridad contable

- **Partida doble**: Cada asiento se valida con `validarTransaccion()` que verifica `|Debe - Haber| < 0.01` antes de guardar.
- **Ecuacion contable**: El Balance General verifica `Activos = Pasivos + Patrimonio` y muestra indicador visual (Badge verde/rojo).
- **IVA Bolivia**: Ventas se desglosan correctamente: Total/1.13 = Base Imponible, diferencia = IVA 13%. IT al 3% se registra como asiento separado.
- **Codificacion de cuentas**: Consistente en todo el sistema (1111=Caja, 1121=Ctas Cobrar, 1131=Inventarios, 1142=IVA Credito, 2113=IVA Debito, 4111=Ventas, 5111=Costo Ventas).
- **Anulaciones**: Generan asientos de reversion correctos (debito a Ventas, credito a Ctas Cobrar) + reversion de IT.

---

## Problemas encontrados

### 1. CRITICO: BalanceComprobacion.tsx usa datos de ejemplo hardcodeados

**Archivo:** `src/components/contable/BalanceComprobacion.tsx`

Este componente (usado dentro de `ImprovedReportsModule` en la seccion "Reportes y Analisis") muestra datos ficticios hardcodeados (lineas 33-118) en lugar de datos reales de Supabase. Siempre muestra las mismas 7 cuentas con montos inventados (60,000, 55,000, 105,000, etc.) sin importar los asientos reales.

**Nota:** Existe otro componente `BalanceComprobacionModule.tsx` que SI usa `useReportesContables` correctamente con datos reales de Supabase. El problema es que `BalanceComprobacion.tsx` (el componente antiguo) es el que se renderiza dentro de la pestana "Balance Comprobacion" del modulo de Reportes.

**Correccion:** Reemplazar `BalanceComprobacion` con `BalanceComprobacionModule` dentro de `ImprovedReportsModule.tsx`, o reescribir `BalanceComprobacion.tsx` para usar `useReportesContables` en lugar de datos de ejemplo.

### 2. MEDIO: Balance General no filtra por fechas

**Archivo:** `src/components/contable/BalanceGeneralModule.tsx`

El modulo tiene selectores de fecha (Fecha Inicio y Fecha Corte) pero NO pasa esas fechas a `getBalanceSheetData()`. La funcion se llama sin parametros (linea 32), por lo que siempre muestra todos los asientos de todos los tiempos, ignorando las fechas seleccionadas por el usuario.

Lo mismo ocurre con `getBalanceSheetData()` en `useReportesContables.ts` (linea 202): internamente llama a `getTrialBalanceData()` sin filtros de fecha.

**Correccion:** Modificar `getBalanceSheetData()` para que acepte filtros de fecha y los propague a `getTrialBalanceData()`. Actualizar `BalanceGeneralModule.tsx` para pasar las fechas seleccionadas.

---

## Plan de correccion

### Archivo 1: `src/components/contable/reports/ImprovedReportsModule.tsx`
- Reemplazar el import de `BalanceComprobacion` por `BalanceComprobacionModule`
- Actualizar el JSX para renderizar `BalanceComprobacionModule` en la pestana correspondiente

### Archivo 2: `src/hooks/useReportesContables.ts`
- Modificar `getBalanceSheetData()` para aceptar un parametro opcional `filtros?: { fechaInicio?: string, fechaFin?: string }`
- Propagar esos filtros a la llamada interna `getTrialBalanceData(filtros)`

### Archivo 3: `src/hooks/useContabilidadIntegration.ts`
- Actualizar la interfaz `ContabilidadIntegrationHook` para que `getBalanceSheetData` acepte filtros opcionales
- Propagar los filtros en la implementacion

### Archivo 4: `src/components/contable/BalanceGeneralModule.tsx`
- Pasar las fechas seleccionadas (`fechaInicio`, `fechaCorte`) a `getBalanceSheetData()` al generar el reporte
- Convertir las fechas a formato `yyyy-MM-dd` antes de pasarlas

## Resultado esperado
- El Balance de Comprobacion en Reportes mostrara datos reales de Supabase en lugar de datos ficticios
- El Balance General respetara las fechas seleccionadas por el usuario
- Todos los reportes contables estaran conectados al mismo flujo de datos real desde Supabase
