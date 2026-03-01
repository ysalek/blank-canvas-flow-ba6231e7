
# Simplificar Flujos de Trabajo - Creacion Inline y Reduccion de Pasos

## Problema Actual

El sistema obliga al usuario a navegar entre 3-4 modulos diferentes para completar tareas basicas:

```text
Flujo actual para vender un producto nuevo:
  Productos --> crear producto
  Compras --> crear proveedor --> crear orden de compra (stock)
  Facturacion --> crear cliente --> crear factura
  = 5 pantallas diferentes, navegacion constante
```

Cada modulo esta aislado: no puedes crear un producto desde Compras, ni un proveedor desde Productos. Los formularios son pantallas completas que reemplazan todo el modulo, haciendo perder el contexto.

## Solucion: Creacion Inline con Dialogs

Agregar botones "+" junto a cada selector que permitan crear entidades sin salir del formulario actual, usando dialogs modales. Esto ya existe parcialmente (clientes en facturacion, proveedores en compras, categorias en productos) pero falta en los puntos criticos.

---

## Cambios Concretos

### 1. Boton "+" para crear productos desde CompraForm y InvoiceForm

**Archivos**: `ProductSearchCombobox.tsx`, `CompraForm.tsx`, `InvoiceForm.tsx`

Actualmente `ProductSearchCombobox` solo tiene un combobox de busqueda. Se le agregara:
- Un boton "+" al lado del combobox
- Un callback `onCreateProduct` opcional
- Cuando se hace clic, abre un Dialog con un formulario rapido de producto (nombre, codigo, precio venta, precio compra, costo, unidad, categoria)
- Al guardar, el producto se crea en Supabase y se selecciona automaticamente en el combobox

Esto permite que desde **Compras** y desde **Facturacion** el usuario cree un producto nuevo sin salir del formulario.

### 2. Formulario rapido de producto (QuickProductForm)

**Archivo nuevo**: `src/components/contable/products/QuickProductForm.tsx`

Un formulario simplificado dentro de un Dialog, con solo los campos esenciales:
- Nombre (requerido)
- Codigo (autogenerado)
- Categoria (con su boton "+" existente para crear nueva)
- Precio de venta
- Costo unitario
- Unidad de medida
- Stock inicial (opcional, default 0)

Omite campos secundarios como imagen URL, codigo SIN, descripcion larga. El usuario puede completarlos despues editando el producto.

### 3. Boton "+" para crear proveedor desde ProductoForm

**Archivo**: `ProductoForm.tsx`

Agregar campo opcional "Proveedor principal" con un combobox + boton "+" que abre el `ProveedorForm` existente (ya es un Dialog). Esto permite que al registrar un producto, se asocie un proveedor sin ir al modulo de Compras.

### 4. Stock inicial en ProductoForm mejorado

**Archivo**: `ProductoForm.tsx`

Actualmente el campo "Stock Actual" existe pero esta desconectado del flujo contable. Se agregara una seccion colapsable "Inventario inicial" con:
- Stock inicial (ya existe)
- Proveedor (nuevo, del punto 3)
- Costo de compra (ya existe como precio_compra)

Cuando el usuario crea un producto con stock > 0 y proveedor, el sistema puede generar automaticamente el registro de inventario inicial.

### 5. Conectar InvoiceForm para crear productos inline

**Archivo**: `InvoiceForm.tsx`, `InvoiceItems.tsx`

El componente `InvoiceItems` usa `ProductSearchCombobox`. Se pasara el callback `onCreateProduct` para que el boton "+" funcione desde facturacion tambien. Al crear un producto desde facturacion, se agrega al catalogo y se selecciona inmediatamente en el item de la factura.

---

## Detalle Tecnico

### ProductSearchCombobox.tsx (modificar)
- Agregar prop opcional `onCreateProduct?: () => void`
- Renderizar boton "+" junto al combobox trigger si `onCreateProduct` esta definido
- El contenedor pasa a ser un `div` con `flex gap-2`

### QuickProductForm.tsx (nuevo)
- Dialog modal con formulario de 6 campos esenciales
- Usa `useSupabaseProductos` para `crearProducto` y `generarCodigoProducto`
- Incluye selector de categoria con boton "+" (reutiliza logica de ProductoForm)
- Props: `open`, `onOpenChange`, `onProductCreated(producto)` 
- Al guardar exitosamente, cierra dialog y llama `onProductCreated` con el producto creado

### CompraForm.tsx (modificar)
- Importar `QuickProductForm`
- Agregar estado `showQuickProductForm`
- Pasar `onCreateProduct` a `ProductSearchCombobox`
- Cuando se crea producto, refrescar lista de productos y seleccionarlo en el item actual

### InvoiceForm.tsx + InvoiceItems.tsx (modificar)
- Mismo patron: pasar `onCreateProduct` por props hasta `ProductSearchCombobox`
- Al crear producto, actualizar lista y seleccionarlo en el item

### ProductoForm.tsx (modificar)
- Agregar seccion "Proveedor" con `ProveedorSearchCombobox` + boton "+"
- Reutilizar `ProveedorForm` dialog existente
- Campo opcional, no bloquea el guardado

---

## Resultado Esperado

```text
Flujo nuevo para vender un producto nuevo:
  Facturacion --> "Nueva factura"
    --> "+" crear cliente (ya existe)
    --> "+" crear producto (NUEVO - inline)
    --> Guardar factura
  = 1 sola pantalla, todo inline

Flujo nuevo para comprar inventario de producto nuevo:
  Compras --> "Nueva compra"
    --> "+" crear proveedor (ya existe)
    --> "+" crear producto (NUEVO - inline)
    --> Guardar compra
  = 1 sola pantalla, todo inline
```

## Orden de Implementacion

1. Crear `QuickProductForm.tsx` (formulario rapido de producto en dialog)
2. Modificar `ProductSearchCombobox.tsx` para soportar boton "+" 
3. Conectar en `CompraForm.tsx` (crear producto inline desde compras)
4. Conectar en `InvoiceItems.tsx` y `InvoiceForm.tsx` (crear producto inline desde facturacion)
5. Agregar proveedor opcional en `ProductoForm.tsx`
