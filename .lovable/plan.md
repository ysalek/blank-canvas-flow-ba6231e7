

# Agregar Categorias desde el Formulario de Producto

## Problema
Al crear un nuevo producto, el selector de categoria solo muestra las categorias existentes. Si el usuario necesita una nueva categoria, no puede crearla directamente desde el formulario.

## Solucion
Agregar un boton "+" junto al selector de categoria en `ProductoForm.tsx` que abra un mini-dialogo inline para crear una nueva categoria sin salir del formulario.

## Cambios

### `src/components/contable/products/ProductoForm.tsx`
- Importar `Dialog` de radix y el icono `Plus` de lucide-react
- Agregar estado local para controlar el dialogo de nueva categoria (`showNewCatDialog`, `newCatName`, `newCatDesc`)
- Junto al `Select` de categoria, agregar un boton con icono "+" que abre el dialogo
- El dialogo tendra dos campos: nombre (requerido) y descripcion (opcional)
- Al confirmar, llamar a `crearCategoria` del hook `useSupabaseProductos` (ya existe y funciona con Supabase)
- Tras crear exitosamente, hacer `refetch` para actualizar la lista de categorias y auto-seleccionar la nueva categoria en el formulario
- Actualizar las props del componente para recibir `crearCategoria` y `refetch` desde el padre, o usar `useSupabaseProductos` directamente (ya se importa en linea 11)

### `src/components/contable/ProductosModule.tsx`
- No requiere cambios significativos, ya que `ProductoForm` usa `useSupabaseProductos` internamente

## Detalles Tecnicos

El hook `useSupabaseProductos` ya expone `crearCategoria` que inserta en la tabla `categorias_productos` de Supabase. `ProductoForm` ya importa y usa este hook (linea 22), por lo que solo necesita desestructurar `crearCategoria` y `refetch` adicionalmente.

La interfaz del dialogo sera un `Dialog` simple con:
- Input para nombre de categoria (obligatorio)
- Input para descripcion (opcional)
- Botones Cancelar / Crear

Al crear la categoria, se auto-seleccionara su `id` en el campo `categoria_id` del formulario.

