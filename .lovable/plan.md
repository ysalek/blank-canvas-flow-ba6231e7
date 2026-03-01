

# Corregir Visibilidad de Usuarios para el Administrador

## Problema Raiz

Las politicas de seguridad (RLS) en la base de datos impiden que el administrador vea los datos de otros usuarios:

- **Tabla `profiles`**: La politica `"Profiles are viewable by owner"` solo permite `USING (id = auth.uid())`, por lo que el admin solo ve su propio perfil.
- **Tabla `subscribers`**: La politica `"select_own_subscription"` solo permite `USING (user_id = auth.uid() OR email = auth.email())`, por lo que el admin solo ve su propia suscripcion.

Esto explica por que el panel de administracion muestra solo 1 usuario en lugar de todos.

## Solucion

Crear una migracion SQL que agregue politicas de lectura para administradores en ambas tablas, usando la funcion `has_role` que ya existe en el sistema.

### Migracion SQL

Se creara una nueva migracion con las siguientes politicas:

```sql
-- Admins pueden ver TODOS los perfiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins pueden ver TODAS las suscripciones
CREATE POLICY "Admins can view all subscribers"
ON public.subscribers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins pueden actualizar suscripciones de cualquier usuario
CREATE POLICY "Admins can update all subscribers"
ON public.subscribers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins pueden insertar suscripciones para cualquier usuario
CREATE POLICY "Admins can insert subscribers"
ON public.subscribers
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
```

### Impacto

- El admin vera la lista completa de usuarios registrados en el panel de gestion
- El admin podra cambiar planes de suscripcion de cualquier usuario
- Los usuarios normales seguiran viendo solo sus propios datos (las politicas existentes no se modifican)
- No se requieren cambios en el codigo frontend; `UsersManagement.tsx` y `SubscriptionsManager.tsx` ya estan preparados para mostrar todos los usuarios

