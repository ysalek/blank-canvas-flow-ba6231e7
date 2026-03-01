
# Correccion del error 25006 en Facturas y Compras

## Causa raiz

La funcion `validate_financial_access` en la base de datos ejecuta un `INSERT INTO financial_access_log` dentro de las politicas RLS de SELECT. Cuando Supabase usa una replica de solo lectura para las consultas GET, el INSERT falla con error 25006 "cannot execute INSERT in a read-only transaction".

Esto afecta a:
- **Tabla `facturas`**: no se pueden listar (SELECT falla)
- **Tabla `compras`**: no se pueden listar (SELECT falla)
- **Tabla `pagos`**, `cuentas_bancarias`, `movimientos_bancarios`: potencialmente afectadas tambien

## Solucion

### 1. Migracion SQL: Simplificar politicas RLS (archivo nuevo en `supabase/migrations/`)

Reemplazar las politicas RLS "Enhanced" que usan `validate_financial_access` con politicas simples que no hagan INSERT:

```sql
-- Eliminar politicas problematicas de facturas
DROP POLICY IF EXISTS "Enhanced facturas - read access" ON public.facturas;
DROP POLICY IF EXISTS "Enhanced facturas - insert access" ON public.facturas;
DROP POLICY IF EXISTS "Enhanced facturas - update access" ON public.facturas;
DROP POLICY IF EXISTS "Enhanced facturas - delete access" ON public.facturas;

-- Crear politicas simples sin audit logging en SELECT
CREATE POLICY "facturas_select" ON public.facturas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "facturas_insert" ON public.facturas
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "facturas_update" ON public.facturas
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "facturas_delete" ON public.facturas
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

Lo mismo para `compras`, `pagos`, `cuentas_bancarias`, `movimientos_bancarios` y `items_facturas`.

### 2. Tambien en la migracion: Corregir `validate_financial_access`

Reescribir la funcion para que NO haga INSERT en transacciones de solo lectura, o simplemente eliminar el logging del audit trail en operaciones de lectura:

```sql
CREATE OR REPLACE FUNCTION public.validate_financial_access(
    requesting_user_id UUID,
    data_owner_id UUID,
    operation_type TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (requesting_user_id = data_owner_id)
        OR public.has_role(requesting_user_id, 'admin'::app_role);
END;
$$;
```

### 3. Codigo: Corregir `useFacturas.ts` - refetch despues de guardar

Actualmente `guardarFactura` hace `setFacturas(prev => [facturaCompleta, ...prev])` para agregar localmente, pero si el fetchFacturas inicial fallo (por el bug 25006), la lista empieza vacia. Una vez corregida la migracion, agregar `await fetchFacturas()` despues de guardar para refrescar la lista completa desde DB.

### 4. Codigo: Revisar otros hooks con `.select('*')` en inserts

Auditar y corregir cualquier otro hook que use `.select('*')` o `.select()` sin columnas explicitas despues de `.insert()` o `.update()`:
- `useSupabaseProveedores.ts` (ya parcialmente corregido)
- `useAsientos.ts`
- `useSupabaseBancos.ts`
- `useSupabaseEmpleados.ts`
- Otros hooks en `src/hooks/`

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migracion SQL | Reemplazar politicas RLS de facturas, compras, pagos con politicas simples sin INSERT en SELECT |
| `src/hooks/useFacturas.ts` | Agregar `await fetchFacturas()` despues de guardar exitosamente |
| Otros hooks con `.select('*')` | Auditar y corregir seleccion explicita de columnas |

## Resultado esperado

- Las facturas se listaran correctamente al cargar el modulo
- Las facturas guardadas apareceran inmediatamente en "Facturas emitidas"
- Las compras se listaran correctamente
- No mas errores 25006 en ninguna operacion de lectura
