

# Correccion definitiva del error 25006 y prueba de flujo completo

## Problema confirmado

La solicitud GET a `facturas` sigue devolviendo **Status 405** con error `25006: cannot execute INSERT in a read-only transaction`. Esto significa que las politicas RLS "Enhanced" **no fueron eliminadas** correctamente de la base de datos.

Ademas, hay codigo que aun usa `.select('*')` en tablas que podrian tener el mismo problema y `.select().single()` en inserts que puede fallar con triggers.

## Solucion en 2 partes

### Parte 1: SQL definitivo (el usuario debe ejecutar en Supabase SQL Editor)

Un script SQL completo y robusto que:

1. **Lista y elimina TODAS las politicas existentes** en `facturas`, `compras`, `items_facturas`, `pagos`, `cuentas_bancarias`, `movimientos_bancarios` usando `DROP POLICY IF EXISTS` para cada politica conocida
2. **Reescribe `validate_financial_access`** para eliminar el INSERT en el audit log
3. **Crea politicas simples** basadas solo en `user_id = auth.uid()` sin llamar a funciones que hagan INSERT

```text
Tablas afectadas:
- facturas (confirmado fallando)
- items_facturas (usa select('*'), potencialmente afectada)
- compras (corregida parcialmente pero podria fallar en SELECT)
- pagos
- cuentas_bancarias
- movimientos_bancarios
```

### Parte 2: Correcciones de codigo restantes

**Archivo: `src/hooks/useFacturas.ts`**
- Linea 42: Cambiar `select('*')` en consulta de clientes a columnas explicitas
- Linea 53: Cambiar `select('*')` en consulta de items_facturas a columnas explicitas

**Archivo: `src/hooks/useClientesSupabase.ts`**
- Linea 60-61: Cambiar `.select().single()` en insert a `.select('id, nombre, nit, email, telefono, direccion, activo, created_at, user_id').maybeSingle()`

**Archivo: `src/hooks/useSupabaseProveedores.ts`**
- Linea 67: Cambiar `select('*')` en consulta de proveedores a columnas explicitas

## SQL que el usuario debera ejecutar

```sql
-- 1. Eliminar TODAS las politicas de facturas
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'facturas' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.facturas', pol.policyname);
    END LOOP;
END $$;

-- 2. Eliminar TODAS las politicas de items_facturas
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'items_facturas' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.items_facturas', pol.policyname);
    END LOOP;
END $$;

-- 3. Eliminar TODAS las politicas de compras
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'compras' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.compras', pol.policyname);
    END LOOP;
END $$;

-- 4. Eliminar TODAS las politicas de pagos
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'pagos' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.pagos', pol.policyname);
    END LOOP;
END $$;

-- 5. Corregir la funcion validate_financial_access (sin INSERT)
CREATE OR REPLACE FUNCTION public.validate_financial_access(
    requesting_user_id UUID,
    data_owner_id UUID,
    operation_type TEXT DEFAULT 'read'
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (requesting_user_id = data_owner_id)
        OR public.has_role(requesting_user_id, 'admin'::app_role);
END;
$$;

-- 6. Crear politicas simples para facturas
CREATE POLICY "facturas_select" ON public.facturas FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "facturas_insert" ON public.facturas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "facturas_update" ON public.facturas FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "facturas_delete" ON public.facturas FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 7. Crear politicas simples para items_facturas
CREATE POLICY "items_facturas_select" ON public.items_facturas FOR SELECT TO authenticated USING (
    factura_id IN (SELECT id FROM public.facturas WHERE user_id = auth.uid())
);
CREATE POLICY "items_facturas_insert" ON public.items_facturas FOR INSERT TO authenticated WITH CHECK (
    factura_id IN (SELECT id FROM public.facturas WHERE user_id = auth.uid())
);
CREATE POLICY "items_facturas_update" ON public.items_facturas FOR UPDATE TO authenticated USING (
    factura_id IN (SELECT id FROM public.facturas WHERE user_id = auth.uid())
);
CREATE POLICY "items_facturas_delete" ON public.items_facturas FOR DELETE TO authenticated USING (
    factura_id IN (SELECT id FROM public.facturas WHERE user_id = auth.uid())
);

-- 8. Crear politicas simples para compras
CREATE POLICY "compras_select" ON public.compras FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "compras_insert" ON public.compras FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "compras_update" ON public.compras FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "compras_delete" ON public.compras FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 9. Crear politicas simples para pagos
CREATE POLICY "pagos_select" ON public.pagos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "pagos_insert" ON public.pagos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "pagos_update" ON public.pagos FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pagos_delete" ON public.pagos FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 10. Asegurar RLS habilitado
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
```

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useFacturas.ts` | Cambiar 2 `select('*')` a columnas explicitas (clientes e items_facturas) |
| `src/hooks/useClientesSupabase.ts` | Cambiar `.select().single()` a `.select('columnas').maybeSingle()` en insert |
| `src/hooks/useSupabaseProveedores.ts` | Cambiar `select('*')` en consulta de proveedores a columnas explicitas |

## Resultado esperado

Despues de ejecutar el SQL y aplicar los cambios de codigo:
- Las facturas se listaran correctamente sin error 25006
- Los clientes, proveedores y compras se registraran y mostraran sin errores
- El flujo completo (cliente -> proveedor -> compra -> factura) funcionara de extremo a extremo

