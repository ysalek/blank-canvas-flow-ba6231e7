
# Corregir Busqueda en Libro Mayor

## Problema

El Libro Mayor no muestra cuentas al buscar debido a dos errores:

1. **Los datos no se cargan a tiempo**: La funcion `generarLibroMayor()` se ejecuta antes de que los asientos contables terminen de cargar desde Supabase. El `useEffect` depende de `[fechaInicio, fechaFin, planCuentasSupabase]` pero NO depende de `asientos`, asi que cuando los asientos llegan de la base de datos, la funcion nunca se vuelve a ejecutar. El resultado: el libro mayor se genera con una lista vacia de asientos.

2. **La busqueda solo muestra cuentas con movimientos**: El selector "Cuenta Especifica" y el campo "Buscar Cuenta" solo filtran cuentas que ya tienen asientos registrados. Si una cuenta existe en el Plan de Cuentas pero no tiene movimientos, no aparece en la busqueda.

## Solucion

### Cambio 1: Agregar `asientos` como dependencia del useEffect

**Archivo**: `src/hooks/useAsientos.ts`
- Exponer el array `asientos` directamente (ademas de `getAsientos`)

**Archivo**: `src/components/contable/LibroMayor.tsx`
- Importar `asientos` del hook ademas de `getAsientos`
- Agregar `asientos` a las dependencias del `useEffect` que llama `generarLibroMayor()`
- Esto garantiza que el libro mayor se regenera cada vez que los asientos terminan de cargar

### Cambio 2: Incluir todas las cuentas del Plan en la busqueda

**Archivo**: `src/components/contable/LibroMayor.tsx`
- En la lista `cuentasDisponibles`, combinar las cuentas que tienen movimientos con TODAS las cuentas del Plan de Cuentas de Supabase
- Eliminar duplicados por codigo
- Ordenar por codigo
- Esto permite buscar y seleccionar cualquier cuenta, incluso si no tiene movimientos (mostraria "Sin movimientos" en ese caso)

### Cambio 3: Agregar indicador de carga

**Archivo**: `src/components/contable/LibroMayor.tsx`
- Usar el `loading` de `useAsientos` para mostrar un indicador mientras se cargan los datos
- Evitar que el usuario piense que no hay datos cuando en realidad estan cargando

## Detalle Tecnico

En `useAsientos.ts`, agregar `asientos` al return:
```
return { getAsientos, asientos, guardarAsiento, ... }
```

En `LibroMayor.tsx`:
```
const { getAsientos, asientos, loading } = useAsientos();

useEffect(() => {
  generarLibroMayor();
}, [fechaInicio, fechaFin, planCuentasSupabase, asientos]);
```

Para cuentas disponibles, al final de `generarLibroMayor`:
```
// Combinar cuentas con movimientos + todas las del plan
const todasLasCuentas = new Map();
planCuentasSupabase.forEach(c => todasLasCuentas.set(c.codigo, c.nombre));
cuentasMayorData.forEach(c => todasLasCuentas.set(c.codigo, c.nombre));

const cuentasUnicas = Array.from(todasLasCuentas.entries())
  .map(([codigo, nombre]) => ({ codigo, nombre }))
  .sort((a, b) => a.codigo.localeCompare(b.codigo));
setCuentasDisponibles(cuentasUnicas);
```

## Resultado Esperado

- Al abrir el Libro Mayor, los datos se cargan correctamente despues de que Supabase responda
- La busqueda encuentra cualquier cuenta del Plan de Cuentas, tenga o no movimientos
- Se muestra un indicador de carga mientras se obtienen los datos
