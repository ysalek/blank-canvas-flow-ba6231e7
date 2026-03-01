
# Correccion: Estado de Resultados no filtra por fechas

## Verificacion completa de modulos contables

### Modulos verificados OK

| Modulo | Fuente | Filtro fechas | Estado |
|--------|--------|---------------|--------|
| Libro Diario | useAsientos (Supabase) | Si | OK |
| Libro Mayor | useAsientos + useSupabasePlanCuentas (Supabase) | Si | OK |
| Balance Comprobacion (Reportes) | useReportesContables (Supabase) | Si | OK |
| Balance Comprobacion (Modulo dedicado) | useReportesContables (Supabase) | Si | OK |
| Balance General | useContabilidadIntegration (Supabase) | Si (corregido) | OK |
| Declaracion IVA | useContabilidadIntegration (Supabase) | Si | OK |

### Problema encontrado

**Estado de Resultados** (`EstadoResultadosModule.tsx`) tiene selectores de fecha (Fecha Inicio y Fecha Fin) pero NO los pasa a las funciones de datos:

- Linea 34: `getIncomeStatementData()` se llama sin parametros
- Linea 37: `getTrialBalanceData()` se llama sin parametros
- `getIncomeStatementData()` en `useReportesContables.ts` no acepta filtros de fecha

Resultado: el Estado de Resultados siempre muestra datos de todos los periodos, ignorando las fechas seleccionadas.

---

## Plan de correccion

### Archivo 1: `src/hooks/useReportesContables.ts`
- Modificar `getIncomeStatementData()` para aceptar parametro opcional `filtros?: { fechaInicio?: string, fechaFin?: string }`
- Propagar filtros a `getTrialBalanceData(filtros)` internamente

### Archivo 2: `src/hooks/useContabilidadIntegration.ts`
- Actualizar la interfaz `ContabilidadIntegrationHook` para que `getIncomeStatementData` acepte filtros opcionales

### Archivo 3: `src/components/contable/EstadoResultadosModule.tsx`
- Pasar las fechas seleccionadas a `getIncomeStatementData()` y `getTrialBalanceData()` en formato `yyyy-MM-dd`
- Cambiar linea 34: `getIncomeStatementData({ fechaInicio: format(fechaInicio, 'yyyy-MM-dd'), fechaFin: format(fechaFin, 'yyyy-MM-dd') })`
- Cambiar linea 37: `getTrialBalanceData({ fechaInicio: format(fechaInicio, 'yyyy-MM-dd'), fechaFin: format(fechaFin, 'yyyy-MM-dd') })`

## Resultado esperado
- El Estado de Resultados respetara las fechas seleccionadas por el usuario
- Todos los reportes contables (Balance General, Balance Comprobacion, Estado de Resultados, Declaracion IVA) filtraran correctamente por periodo
