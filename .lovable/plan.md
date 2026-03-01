
Objetivo: eliminar el congelamiento al abrir “Nueva factura” cuando aparece “Cargando productos…”, asegurando que la pantalla nunca quede bloqueada por recargas de auth o cargas concurrentes.

Diagnóstico confirmado en código
1) Bloqueo de UI demasiado estricto en facturación:
- En `src/components/contable/FacturacionModule.tsx` se muestra el loader con:
  `if (productosLoading && !productosError)`.
- Eso bloquea la pantalla incluso si ya hay productos en memoria (carga en segundo plano), y puede dejar al usuario “atrapado”.

2) Riesgo de recarga infinita/concurrente en auth:
- En `src/hooks/useProductosValidated.ts` hay `onAuthStateChange(async (...) => { await loadData(true) })` para `SIGNED_IN` y `TOKEN_REFRESHED`.
- `force=true` salta la protección de “ya cargando”, lo que permite cargas solapadas.
- Si hay refresh de token o eventos repetidos, el estado `loading` puede quedarse reactivándose continuamente.

3) Arquitectura con hooks de productos duplicados:
- `useContabilidadIntegration` instancia `useProductosValidated` y `useProductosUnificado`.
- `useAsientosGenerator` también usa `useProductosUnificado`.
- Esto agrega listeners y cargas duplicadas, incrementando probabilidad de estados inconsistentes.

4) Bug adicional en `useProductosUnificado`:
- En su `loadData`, el guard `if (!force && loading) return;` con `loading=true` inicial puede impedir la primera carga.
- No es el único causante del congelamiento de “Nueva factura”, pero sí un foco de inestabilidad.

Plan de implementación (orden recomendado)
Fase 1 — Desbloquear la pantalla de “Nueva factura” (impacto inmediato)
Archivo: `src/components/contable/FacturacionModule.tsx`
- Cambiar condición de loader a modo “solo bloquear si no hay cache”:
  - De: `productosLoading && !productosError`
  - A: `productosLoading && !productosError && productos.length === 0`
- Añadir acción visible de recuperación en esa vista:
  - Botón “Reintentar carga de productos” que invoque `refetch()` del hook.
- Mantener botón “Cancelar” para salida segura.
Resultado esperado: si ya hay productos cargados, el formulario abre aunque haya refresh en segundo plano.

Fase 2 — Estabilizar `useProductosValidated` contra recargas en bucle
Archivo: `src/hooks/useProductosValidated.ts`
- Reemplazar callback async en `onAuthStateChange` por callback no bloqueante (`setTimeout` interno) para evitar deadlocks.
- Evitar recargar en cada `TOKEN_REFRESHED` de forma agresiva:
  - Opción A: recargar solo en `SIGNED_IN`.
  - Opción B: throttling (ej. mínimo 20–30s entre recargas por token).
- Endurecer control de concurrencia:
  - No permitir nuevo `loadData` si `loadingRef.current` ya está activo (incluso con force, salvo excepción controlada).
  - Usar `requestIdRef` para ignorar respuestas viejas (race condition safe).
- Mejorar timeout:
  - Si vence timeout, además de `setLoading(false)`, establecer `setError("Tiempo de espera agotado...")` para sacar al usuario del spinner a una vista accionable.
Resultado esperado: desaparece el loading perpetuo por eventos de auth/reintentos superpuestos.

Fase 3 — Quitar duplicidad de hooks de productos (hardening)
Archivos:
- `src/hooks/useContabilidadIntegration.ts`
- `src/hooks/useAsientosGenerator.ts`
- `src/hooks/useProductosUnificado.ts` (si sigue vigente)
Acciones:
- Unificar una sola fuente de verdad para productos (preferible `useProductosValidated`).
- Evitar que `useContabilidadIntegration` y `useAsientosGenerator` monten hooks de productos por su cuenta cuando el módulo ya los tiene.
- Corregir guard inicial en `useProductosUnificado` (si se mantiene) para no impedir la primera carga.
Resultado esperado: menos listeners/auth callbacks duplicados, menos estados loading inconsistentes.

Fase 4 — Verificación E2E (obligatoria)
Escenarios de prueba:
1) Abrir Facturación → clic “Nueva factura” con sesión activa:
   - Debe abrir formulario sin congelarse.
2) Simular recarga de token/sesión:
   - No debe reaparecer bloqueo completo si ya existen productos en memoria.
3) Usuario sin productos:
   - Debe verse mensaje “No hay productos disponibles”, no spinner infinito.
4) Error de conectividad:
   - Debe mostrarse estado de error con botón “Reintentar”.
5) Reintento manual:
   - “Reintentar carga de productos” debe recuperar el flujo sin recargar toda la app.

Riesgos y mitigación
- Riesgo: cambios en onAuthStateChange impacten refresco de datos.
  Mitigación: mantener `SIGNED_IN` + refetch manual + throttling en `TOKEN_REFRESHED`.
- Riesgo: contabilidad dependa de hook antiguo.
  Mitigación: transición gradual, tipado explícito y pruebas de generación de asientos al guardar factura.

Resultado funcional esperado final
- “Nueva factura” deja de quedarse congelado en “Cargando productos…”.
- El usuario siempre tiene salida: abrir formulario con cache, ver error accionable o reintentar carga.
- Se reduce inestabilidad por recargas concurrentes y listeners duplicados.
