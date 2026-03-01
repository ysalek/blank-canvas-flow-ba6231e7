

# Limpieza de Codigo Muerto y Mejoras de Interfaz

## Parte 1: Eliminacion de Codigo Muerto

### Archivos sin ninguna referencia (a eliminar)

| Archivo | Razon |
|---------|-------|
| `src/App.css` | No importado en ningun archivo |
| `src/components/contable/BalanceComprobacion.tsx` | Reemplazado por `BalanceComprobacionModule.tsx`, sin imports |
| `src/components/contable/NotificationsCenter.tsx` | Sin imports (se usa `notifications/NotificationCenter.tsx`) |
| `src/components/debug/AuthDebugInfo.tsx` | Sin imports |
| `src/components/contable/dashboard/OnboardingTour.tsx` | Sin imports |
| `src/components/contable/dashboard/AlertsDemo.tsx` | Sin imports |
| `src/components/contable/dashboard/SystemStats.tsx` | Sin imports |
| `src/components/contable/dashboard/SystemValidation.tsx` | Sin imports |
| `src/components/contable/dashboard/SearchableSidebar.tsx` | Sin imports |
| `src/components/contable/reports/ReportesContablesAvanzados.tsx` | Sin imports |
| `src/components/contable/billing/NotasEntregaModule.tsx` | Sin imports |
| `src/components/contable/inventory/EnhancedInventoryHeader.tsx` | Sin imports |
| `src/components/contable/tutorial/TutorialInteractivo.tsx` | Sin imports |
| `src/components/contable/auditoria/AuditoriaIntegral.tsx` | Sin imports |
| `src/components/contable/auditoria/AuditoriaTransacciones.tsx` | Sin imports |
| `src/components/contable/finanzas/FlujoCaja.tsx` | Sin imports (se usa `cashflow/AdvancedCashFlowModule`) |
| `src/components/contable/nomina/RecursosHumanosUnificado.tsx` | Sin imports |
| `src/components/contable/nomina/NominaBoliviana.tsx` | Sin imports |
| `src/services/sinService.ts` | Sin imports |
| `src/hooks/useProductosSimple.ts` | Sin imports |
| `src/hooks/useProductos.ts` | Sin imports |
| `src/hooks/usePWA.ts` | Sin imports |
| `src/utils/inicializarDatosDemo.ts` | Sin imports |
| `src/utils/inicializarSistema.ts` | Solo importa otros archivos muertos, nunca se usa |

**Total: 24 archivos muertos a eliminar**

---

## Parte 2: Mejoras de Interfaz - Animaciones e Interactividad

### 2.1 Sidebar con animaciones de hover y transiciones

**Archivo:** `src/components/AppSidebar.tsx`
- Agregar animacion `scale-in` al cargar los grupos del menu
- Efecto hover mas pronunciado con `transition-all duration-200` y `hover:translate-x-1`
- Icono activo con animacion `pulse` sutil
- Animacion de expansion/colapso suave en los grupos

### 2.2 Dashboard con entradas escalonadas

**Archivo:** `src/components/contable/Dashboard.tsx`
- Agregar entrada escalonada (staggered) a las tarjetas KPI usando `animate-fade-in` con `animation-delay`
- Efecto `hover:scale-[1.02]` en las tarjetas de acceso rapido
- Animacion de entrada para las alertas
- Numeros que se animan al cargar (counter animation via CSS)

### 2.3 Tablas interactivas con hover mejorado

**Archivos:** `ProveedoresModule.tsx`, `ClientesModule.tsx`, `LibroDiario.tsx`, `LibroMayor.tsx`
- Agregar `hover:bg-accent/50 transition-colors duration-150` a las filas
- Efecto de highlight al hacer clic en una fila
- Animacion de entrada `animate-fade-in` para filas nuevas
- Mejor feedback visual al eliminar (animacion de salida)

### 2.4 Formularios con transiciones

**Archivos:** Dialogos de creacion (ClienteForm, ProveedorForm, etc.)
- Agregar `animate-scale-in` al abrir dialogos
- Feedback visual en inputs con `focus:ring-2 focus:ring-primary/20 transition-all`
- Boton de guardar con estado de carga animado (spinner)

### 2.5 Tarjetas metricas con micro-interacciones

**Archivo:** `src/components/contable/dashboard/EnhancedMetricCard.tsx`
- Hover con sombra elevada `hover:shadow-lg transition-shadow duration-300`
- Icono que rota sutilmente al hover
- Indicador de tendencia con animacion pulsante

### 2.6 Tabs con transicion de contenido

**Archivos:** Modulos con Tabs (Reportes, Cumplimiento, etc.)
- Agregar `animate-fade-in` al contenido de cada tab al cambiar
- Transicion suave entre pestanas

### 2.7 CSS global: nuevas utilidades de animacion

**Archivo:** `src/index.css`
- Agregar clases de animacion escalonada: `.stagger-1`, `.stagger-2`, etc. con `animation-delay`
- Clase `.animate-slide-up` para entradas desde abajo
- Clase `.animate-number` para contadores
- Clase `.hover-lift` para efecto de elevacion hover

---

## Secuencia de implementacion

1. Eliminar los 24 archivos muertos
2. Agregar utilidades CSS de animacion en `index.css`
3. Mejorar el Dashboard con entradas escalonadas y hover
4. Mejorar el Sidebar con transiciones
5. Mejorar tablas y formularios con feedback interactivo
6. Mejorar tarjetas metricas con micro-interacciones

