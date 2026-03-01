
# Fix: Categorias no aparecen despues de crearlas en ProductoForm

## Problema Raiz

`ProductoForm` tiene **dos fuentes de datos en conflicto**:

1. **Props del padre** (`categorias` en linea 17) - usadas por el `Select` en linea 247
2. **Hook interno** (`useSupabaseProductos()` en linea 23) - usado por `crearCategoria` y `refetch`

Cuando se crea una categoria:
- Se inserta correctamente en Supabase (toast de exito aparece)
- `refetch()` actualiza las categorias del hook **interno** del form
- Pero el `Select` sigue leyendo las categorias de las **props del padre**, que nunca se actualizan
- Resultado: la categoria existe en la BD pero no aparece en el dropdown

## Solucion

Eliminar la duplicacion de datos. El formulario debe usar **una sola fuente**: las categorias del hook interno. Cambiar el `Select` para que lea de las categorias del hook en vez de las props.

## Cambios

### `src/components/contable/products/ProductoForm.tsx`

1. Desestructurar `categorias` del hook interno (linea 23) con un nombre diferente para evitar conflicto con la prop: `categorias: categoriasHook`
2. Cambiar el `Select` de categorias (linea 247) para usar `categoriasHook` en vez de la prop `categorias`
3. Esto asegura que despues de `crearCategoria` + `refetch`, el dropdown se actualiza inmediatamente

El cambio es minimo: solo renombrar la variable del hook y actualizar el `.map()` del Select.

## Detalles Tecnicos

```text
Linea 23: agregar "categorias: categoriasHook" a la desestructuracion del hook
Linea 247: cambiar "categorias.map" por "categoriasHook.map"
```

La prop `categorias` seguira existiendo en la interfaz por compatibilidad pero no se usara para el renderizado del Select.
