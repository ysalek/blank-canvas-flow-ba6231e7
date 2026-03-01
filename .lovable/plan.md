

# Plan: Corregir Sistema de Roles Admin y Asignacion de Suscripciones

## Problemas Criticos Detectados

### 1. Las suscripciones asignadas por el admin NO tienen efecto
El problema mas grave del sistema: `usePlan.ts` (linea 68) lee el plan desde `localStorage('user_plan')`, **nunca consulta la tabla `subscribers` de Supabase**. Esto significa que cuando un admin cambia el plan de un usuario en el panel, ese cambio se guarda en la base de datos pero el usuario sigue viendo el plan que tiene en su localStorage local. La asignacion de suscripciones es completamente inoperante.

### 2. Las vistas de admin no tienen proteccion de acceso
En `Index.tsx` lineas 141-147, las vistas admin (`admin-dashboard`, `admin-users`, `admin-subscriptions`, etc.) se renderizan sin ningun control de acceso. Cualquier usuario puede navegar directamente a `/?view=admin-dashboard` y ver el panel de administracion completo.

### 3. Falta el tier Enterprise en los selectores de admin
Tanto `UsersManagement.tsx` (linea 261-263) como `SubscriptionsManager.tsx` (linea 214-217) solo muestran las opciones "Basic" y "Pro". El tier "Enterprise" no puede ser asignado por el admin.

### 4. La logica de `subscribed` es incorrecta
En `changePlan`, `subscribed: newTier === 'pro'` marca como "no suscrito" a un usuario Enterprise. Deberia ser `subscribed: newTier !== 'basic'`.

---

## Plan de Implementacion

### Archivo 1: `src/hooks/usePlan.ts` (cambio principal)
Modificar el hook para que cargue el plan del usuario desde la tabla `subscribers` en Supabase en lugar de `localStorage`:

- Importar `supabase` y `useEffect/useState`
- Al montar, consultar `subscribers` con `eq('user_id', user.id)` para obtener `subscription_tier`
- Usar el tier de Supabase como fuente de verdad
- Mantener `localStorage` solo como cache/fallback mientras carga
- Si el usuario es admin (via `user.rol === 'admin'`), darle acceso total sin importar el tier
- Sincronizar: cuando Supabase responde, actualizar localStorage para que la UI sea consistente

```
Flujo:
1. Estado inicial: lee localStorage como cache temporal
2. useEffect: consulta subscribers.subscription_tier desde Supabase
3. Si encuentra dato -> actualiza estado y localStorage
4. Si no encuentra -> mantiene 'basic'
5. Si es admin -> hasAccess() siempre retorna true (ya existe)
```

### Archivo 2: `src/pages/Index.tsx` (proteger vistas admin)
Agregar verificacion de rol admin antes de renderizar vistas administrativas:

- Importar `useAdmin` hook
- En `renderCurrentView()`, las vistas `admin-*` deben verificar `isAdmin` antes de renderizar
- Si no es admin, mostrar un mensaje de acceso denegado o redirigir al dashboard

### Archivo 3: `src/components/admin/UsersManagement.tsx` (enterprise + logica subscribed)
- Agregar opcion "Enterprise" al Select de cambio de plan (lineas 261-263 y 366-379)
- Corregir logica `subscribed`: cambiar `newTier === 'pro'` a `newTier !== 'basic'`
- Agregar conteo de Enterprise en las estadisticas rapidas
- Actualizar Badge para mostrar "Enterprise" ademas de "Pro" y "Basic"

### Archivo 4: `src/components/admin/SubscriptionsManager.tsx` (enterprise + logica subscribed)
- Agregar opcion "Enterprise" al Select de cambio de plan (linea 214-217)
- Corregir logica `subscribed` en `changePlan` (linea 52)
- Actualizar KPIs para contar Enterprise por separado
- Corregir calculo de MRR para incluir Enterprise (699 Bs)

---

## Detalle Tecnico

### usePlan.ts - Nuevo flujo de carga
```text
usePlan()
  |-- lee localStorage('user_plan') como estado inicial (cache)
  |-- useEffect con user.id como dependencia
  |     |-- supabase.from('subscribers')
  |     |     .select('subscription_tier')
  |     |     .eq('user_id', user.id)
  |     |     .maybeSingle()
  |     |-- Si data.subscription_tier existe:
  |     |     setCurrentPlan(data.subscription_tier)
  |     |     localStorage.setItem('user_plan', data.subscription_tier)
  |     |-- Si no existe: mantener 'basic'
  |-- isAdmin bypass: hasAccess() ya retorna true para admin
```

### Index.tsx - Proteccion admin
```text
renderCurrentView()
  |-- case 'admin-*':
  |     |-- if (!isAdmin) return <AccesoDenegado />
  |     |-- else return <AdminComponent />
```

### Impacto
- Los usuarios veran el plan que realmente tienen asignado en Supabase
- El admin podra asignar Basic, Pro o Enterprise
- Las vistas admin estaran protegidas contra acceso no autorizado
- La logica de `subscribed` sera correcta para todos los tiers

