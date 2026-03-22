import React, { Suspense, useState, useEffect, lazy } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import { adminMenuItems, menuItems } from '@/components/app-sidebar-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Bell, Shield, Sparkles, User, LogOut, Settings, Search, PanelTop } from 'lucide-react';
import NotificationCenter from '@/components/contable/notifications/NotificationCenter';
import PlanGate from '@/components/PlanGate';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import PlanUpgradeModal from '@/components/PlanUpgradeModal';
import { useAdmin } from '@/hooks/useAdmin';

const Dashboard = lazy(() => import('@/components/contable/Dashboard'));
const LibroDiario = lazy(() => import('@/components/contable/LibroDiario'));
const LibroMayor = lazy(() => import('@/components/contable/LibroMayor'));
const BalanceComprobacionModule = lazy(() => import('@/components/contable/BalanceComprobacionModule'));
const PlanCuentasModule = lazy(() => import('@/components/contable/PlanCuentasModule'));
const ComprobantesModule = lazy(() => import('@/components/contable/comprobantes/ComprobantesModule'));
const ProductosModule = lazy(() => import('@/components/contable/ProductosModule'));
const InventarioModule = lazy(() => import('@/components/contable/InventarioModule'));
const FacturacionModule = lazy(() => import('@/components/contable/FacturacionModule'));
const ClientesModule = lazy(() => import('@/components/contable/ClientesModule'));
const ConfiguracionModule = lazy(() => import('@/components/contable/ConfiguracionModule'));
const TutorialModule = lazy(() => import('@/components/contable/TutorialModule'));
const GlobalSearch = lazy(() => import('@/components/contable/search/GlobalSearch'));
const BalanceGeneralModule = lazy(() => import('@/components/contable/BalanceGeneralModule'));
const EstadoResultadosModule = lazy(() => import('@/components/contable/EstadoResultadosModule'));
const PuntoVentaModule = lazy(() => import('@/components/contable/PuntoVentaModule'));
const CreditSalesModule = lazy(() => import('@/components/contable/billing/CreditSalesModule'));
const ComprasModule = lazy(() => import('@/components/contable/ComprasModule'));
const KardexModule = lazy(() => import('@/components/contable/KardexModule'));
const ActivosFijosModule = lazy(() => import('@/components/contable/ActivosFijosModule'));
const BancosModule = lazy(() => import('@/components/contable/BancosModule'));
const AdvancedCashFlowModule = lazy(() => import('@/components/contable/cashflow/AdvancedCashFlowModule'));
const CuentasPorCobrarPagar = lazy(() => import('@/components/contable/CuentasPorCobrarPagar'));
const DeclaracionesTributariasModule = lazy(() => import('@/components/contable/DeclaracionesTributariasModule'));
const CumplimientoNormativoModule = lazy(() => import('@/components/contable/cumplimiento/CumplimientoNormativoModule'));
const AuditoriaContableAvanzada = lazy(() => import('@/components/contable/auditoria/AuditoriaContableAvanzada'));
const PlanCuentasBoliviano2025Module = lazy(() => import('@/components/contable/PlanCuentasBoliviano2025Module'));
const NominaModule = lazy(() => import('@/components/contable/nomina/NominaModule'));
const EmpleadosModule = lazy(() => import('@/components/contable/empleados/EmpleadosModule'));
const ReportesModule = lazy(() => import('@/components/contable/ReportesModule'));
const AnalisisFinanciero = lazy(() => import('@/components/contable/analisis/AnalisisFinanciero'));
const AnalisisInteligente = lazy(() => import('@/components/contable/analisis/AnalisisInteligente'));
const AnalisisRentabilidad = lazy(() => import('@/components/contable/rentabilidad/AnalisisRentabilidad'));
const PresupuestosEmpresariales = lazy(() => import('@/components/contable/presupuestos/PresupuestosEmpresariales'));
const CentrosCostoModule = lazy(() => import('@/components/contable/costos/CentrosCostoModule'));
const FacturacionElectronicaModule = lazy(() => import('@/components/contable/facturacion/FacturacionElectronicaModule'));
const RetencionesModule = lazy(() => import('@/components/contable/retenciones/RetencionesModule'));
const BackupModule = lazy(() => import('@/components/contable/BackupModule'));
const UserManagement = lazy(() => import('@/components/contable/users/UserManagement'));
const NotasCreditoDebitoModule = lazy(() => import('@/components/contable/notas/NotasCreditoDebitoModule'));
const LibroComprasVentasModule = lazy(() => import('@/components/contable/libros/LibroComprasVentasModule'));
const ConciliacionBancaria = lazy(() => import('@/components/contable/bancario/ConciliacionBancaria'));
const ProveedoresModule = lazy(() => import('@/components/contable/proveedores/ProveedoresModule'));
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'));
const UsersManagementAdmin = lazy(() => import('@/components/admin/UsersManagement'));
const SubscriptionsManager = lazy(() => import('@/components/admin/SubscriptionsManager'));
const ActivityLogs = lazy(() => import('@/components/admin/ActivityLogs'));
const PaymentRequestsManager = lazy(() => import('@/components/admin/PaymentRequestsManager'));

const allMenuGroups = [...adminMenuItems, ...menuItems];

const resolveViewMeta = (view: string) => {
  for (const group of allMenuGroups) {
    for (const item of group.items) {
      const itemView = new URLSearchParams(item.url.split('?')[1] || '').get('view');
      if (itemView === view) {
        return {
          title: item.title,
          group: group.group,
        };
      }
    }
  }

  if (view === 'search') {
    return { title: 'Busqueda Global', group: 'Principal' };
  }

  return { title: 'Sistema Contable', group: 'Principal' };
};

const Index = () => {
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const [openNotifications, setOpenNotifications] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('view') || 'dashboard';
  });

  const navigateTo = (view: string) => {
    window.history.pushState({}, '', `/?view=${view}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      setCurrentView(urlParams.get('view') || 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<string | undefined>;
      const view = customEvent.detail || 'dashboard';
      navigateTo(view);
      setOpenNotifications(false);
    };
    window.addEventListener('navigate-to-module', handler as EventListener);
    return () => window.removeEventListener('navigate-to-module', handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = () => setShowUpgradeModal(true);
    window.addEventListener('open-upgrade-modal', handler);
    return () => window.removeEventListener('open-upgrade-modal', handler);
  }, []);

  const viewMeta = resolveViewMeta(currentView);

  const renderCurrentView = () => {
    const adminViews = ['admin-dashboard', 'admin-users', 'admin-subscriptions', 'admin-logs', 'admin-payments'];
    if (adminViews.includes(currentView)) {
      if (!isAdmin) {
        return (
          <div className="flex min-h-[420px] items-center justify-center">
            <Card className="card-modern max-w-md text-center border-destructive/30">
              <CardContent className="space-y-3 py-10">
                <Shield className="mx-auto h-12 w-12 text-destructive" />
                <h3 className="text-xl font-bold">Acceso denegado</h3>
                <p className="text-sm text-muted-foreground">No tienes permisos de administrador para acceder a esta seccion.</p>
              </CardContent>
            </Card>
          </div>
        );
      }
      switch (currentView) {
        case 'admin-dashboard': return <AdminDashboard />;
        case 'admin-users': return <UsersManagementAdmin />;
        case 'admin-subscriptions': return <SubscriptionsManager />;
        case 'admin-logs': return <ActivityLogs />;
        case 'admin-payments': return <PaymentRequestsManager />;
      }
    }

    const proModules: Record<string, React.ReactNode> = {
      'balance-general': <BalanceGeneralModule />,
      'estado-resultados': <EstadoResultadosModule />,
      'punto-venta': <PuntoVentaModule />,
      'credit-sales': <CreditSalesModule />,
      'compras': <ComprasModule />,
      'kardex': <KardexModule />,
      'activos-fijos': <ActivosFijosModule />,
      'bancos': <BancosModule />,
      'flujo-caja': <AdvancedCashFlowModule />,
      'cuentas-cobrar-pagar': <CuentasPorCobrarPagar />,
      'declaraciones-tributarias': <DeclaracionesTributariasModule />,
      'cumplimiento-normativo': <CumplimientoNormativoModule />,
      'auditoria-avanzada': <AuditoriaContableAvanzada />,
      'plan-cuentas-2025': <PlanCuentasBoliviano2025Module />,
      'nomina': <NominaModule />,
      'empleados': <EmpleadosModule />,
      'reportes': <ReportesModule />,
      'analisis-financiero': <AnalisisFinanciero />,
      'analisis-inteligente': <AnalisisInteligente />,
      'rentabilidad': <AnalisisRentabilidad />,
      'presupuestos': <PresupuestosEmpresariales />,
      'centros-costo': <CentrosCostoModule />,
      'facturacion-electronica': <FacturacionElectronicaModule />,
      'retenciones': <RetencionesModule />,
      'backup': <BackupModule />,
      'usuarios': <UserManagement />,
      'notas-credito-debito': <NotasCreditoDebitoModule />,
      'libro-compras-ventas': <LibroComprasVentasModule />,
      'conciliacion-bancaria': <ConciliacionBancaria />,
      'proveedores': <ProveedoresModule />,
    };

    if (proModules[currentView]) {
      return (
        <PlanGate moduleId={currentView}>
          {proModules[currentView]}
        </PlanGate>
      );
    }

    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'diario': return <LibroDiario />;
      case 'mayor': return <LibroMayor />;
      case 'balance-comprobacion': return <BalanceComprobacionModule />;
      case 'plan-cuentas': return <PlanCuentasModule />;
      case 'comprobantes-integrados': return <ComprobantesModule />;
      case 'productos': return <ProductosModule />;
      case 'inventario': return <InventarioModule />;
      case 'facturacion': return <FacturacionModule />;
      case 'clientes': return <ClientesModule />;
      case 'configuracion': return <ConfiguracionModule />;
      case 'tutorial': return <TutorialModule />;
      case 'search': return <GlobalSearch onNavigate={() => {}} />;
      default: return <Dashboard />;
    }
  };

  useEffect(() => {
    document.title = `${viewMeta.title} | ContaBolivia SaaS`;
  }, [viewMeta.title]);

  const UserProfileMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-11 rounded-2xl border border-border/70 bg-white/70 px-2.5 hover:bg-white">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left md:block">
            <p className="text-sm font-semibold leading-none">{user?.nombre}</p>
            <p className="mt-1 text-xs text-muted-foreground">{user?.empresa}</p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.nombre}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.empresa}</p>
            <p className="text-xs font-medium leading-none text-primary">Rol: {user?.rol}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigateTo('configuracion')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configuracion</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Error en logout:', error);
            }
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full">
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset>
            <div className="executive-shell min-h-screen">
              <header className="shell-topbar sticky top-0 z-30 flex flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <SidebarTrigger className="-ml-1 mt-1 rounded-xl border border-border/70 bg-white/80 shadow-sm hover:bg-white" />
                    <div className="min-w-0 space-y-2">
                      <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        {viewMeta.group}
                      </Badge>
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">{viewMeta.title}</h1>
                        <p className="text-sm leading-6 text-muted-foreground">
                          Navegacion comercial, contexto visible y operacion mas intuitiva para tu equipo.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" className="h-11 rounded-2xl border-border/70 bg-white/70" onClick={() => setShowOnboarding(true)}>
                      <PanelTop className="mr-2 h-4 w-4" />
                      Onboarding
                    </Button>
                    <Button variant="outline" className="h-11 rounded-2xl border-border/70 bg-white/70" onClick={() => setOpenNotifications(true)} aria-label="Notificaciones">
                      <Bell className="mr-2 h-4 w-4" />
                      Alertas
                    </Button>
                    <UserProfileMenu />
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
                  <div className="surface-panel rounded-[1.5rem] px-4 py-3">
                    <div className="grid gap-3 lg:grid-cols-[auto_1fr] lg:items-center">
                      <div className="hidden items-center gap-2 lg:flex">
                        <Search className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Busqueda global</span>
                      </div>
                      <Suspense fallback={<div className="h-11 rounded-2xl bg-muted animate-pulse" />}>
                        <GlobalSearch onNavigate={(moduleId) => navigateTo(moduleId)} />
                      </Suspense>
                    </div>
                  </div>

                  <div className="surface-panel flex flex-wrap items-center gap-2 rounded-[1.5rem] px-4 py-3">
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem>
                          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ERP</span>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <span className="text-sm text-muted-foreground">{viewMeta.group}</span>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage className="font-semibold text-foreground">{viewMeta.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                    <Badge className="rounded-full bg-success/10 text-success hover:bg-success/10">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      UX ejecutiva
                    </Badge>
                  </div>
                </div>
              </header>

              <Dialog open={openNotifications} onOpenChange={setOpenNotifications}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Centro de notificaciones</DialogTitle>
                    <DialogDescription>Gestiona alertas, pendientes y eventos importantes del sistema.</DialogDescription>
                  </DialogHeader>
                  <NotificationCenter />
                </DialogContent>
              </Dialog>

              <PlanUpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />

              <main className="flex-1 px-4 py-5 md:px-6 lg:px-8 lg:py-6">
                <Suspense
                  fallback={
                    <div className="page-shell">
                      <div className="hero-panel h-40 animate-pulse rounded-[2rem]" />
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="card-modern h-28 animate-pulse rounded-[1.75rem]" />
                        ))}
                      </div>
                      <div className="card-modern h-[28rem] animate-pulse rounded-[2rem]" />
                    </div>
                  }
                >
                  {renderCurrentView()}
                </Suspense>
              </main>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
