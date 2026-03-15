
import React, { Suspense, useState, useEffect, lazy } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, User, LogOut, Settings, Shield } from 'lucide-react';
import NotificationCenter from '@/components/contable/notifications/NotificationCenter';
import PlanGate from '@/components/PlanGate';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import PlanUpgradeModal from '@/components/PlanUpgradeModal';
import { useAdmin } from '@/hooks/useAdmin';
// Lazy load components - Core (Basic plan)
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

// Lazy load components - Pro plan
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

// Admin components
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'));
const UsersManagementAdmin = lazy(() => import('@/components/admin/UsersManagement'));
const SubscriptionsManager = lazy(() => import('@/components/admin/SubscriptionsManager'));
const ActivityLogs = lazy(() => import('@/components/admin/ActivityLogs'));
const PaymentRequestsManager = lazy(() => import('@/components/admin/PaymentRequestsManager'));
const Index = () => {
  const { hasPermission, user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const [openNotifications, setOpenNotifications] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const UserProfileMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span className="hidden md:inline text-sm">{user?.nombre}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.nombre}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.empresa}</p>
            <p className="text-xs leading-none text-primary font-medium">Rol: {user?.rol}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => {
          window.history.pushState({}, '', '/?view=configuracion');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configuración</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={async () => {
            try { await logout(); } catch (error) { console.error('Error en logout:', error); }
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const [currentView, setCurrentView] = React.useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('view') || 'dashboard';
  });

  React.useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      setCurrentView(urlParams.get('view') || 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const view = e.detail || 'dashboard';
      window.history.pushState({}, '', `/?view=${view}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      setOpenNotifications(false);
    };
    window.addEventListener('navigate-to-module', handler as EventListener);
    return () => window.removeEventListener('navigate-to-module', handler as EventListener);
  }, []);

  const renderCurrentView = () => {
    // Admin views - protected
    const adminViews = ['admin-dashboard', 'admin-users', 'admin-subscriptions', 'admin-logs', 'admin-payments'];
    if (adminViews.includes(currentView)) {
      if (!isAdmin) {
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md w-full text-center border-destructive/30">
              <CardContent className="pt-8 pb-8 space-y-3">
                <Shield className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-xl font-bold">Acceso Denegado</h3>
                <p className="text-muted-foreground text-sm">No tienes permisos de administrador para acceder a esta sección.</p>
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

    // Pro-gated modules
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

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      'dashboard': 'Panel de Control',
      'admin-dashboard': 'Panel de Administración',
      'admin-users': 'Gestión de Usuarios',
      'admin-subscriptions': 'Suscripciones',
      'admin-logs': 'Logs de Actividad',
      'admin-payments': 'Pagos Bolivia',
      'diario': 'Libro Diario',
      'mayor': 'Libro Mayor',
      'balance-comprobacion': 'Balance de Comprobación',
      'balance-general': 'Balance General',
      'estado-resultados': 'Estado de Resultados',
      'plan-cuentas': 'Plan de Cuentas',
      'comprobantes-integrados': 'Comprobantes',
      'productos': 'Productos',
      'inventario': 'Inventario',
      'kardex': 'Kardex',
      'facturacion': 'Facturación',
      'compras': 'Compras',
      'clientes': 'Clientes',
      'bancos': 'Bancos',
      'flujo-caja': 'Flujo de Caja',
      'cuentas-cobrar-pagar': 'Cuentas por Cobrar/Pagar',
      'declaraciones-tributarias': 'Declaraciones Tributarias',
      'cumplimiento-normativo': 'Cumplimiento Normativo',
      'auditoria-avanzada': 'Auditoría Avanzada',
      'plan-cuentas-2025': 'Plan de Cuentas 2025',
      'nomina': 'Nómina',
      'empleados': 'Empleados',
      'reportes': 'Reportes',
      'analisis-financiero': 'Análisis Financiero',
      'analisis-inteligente': 'Análisis Inteligente',
      'rentabilidad': 'Rentabilidad',
      'presupuestos': 'Presupuestos',
      'centros-costo': 'Centros de Costo',
      'activos-fijos': 'Activos Fijos',
      'punto-venta': 'Punto de Venta',
      'credit-sales': 'Ventas a Crédito',
      'facturacion-electronica': 'Facturación Electrónica',
      'retenciones': 'Retenciones',
      'configuracion': 'Configuración',
      'backup': 'Backup',
      'tutorial': 'Tutorial',
      'usuarios': 'Usuarios',
      'notas-credito-debito': 'Notas de Crédito/Débito',
      'libro-compras-ventas': 'Libro Compras/Ventas IVA',
      'conciliacion-bancaria': 'Conciliación Bancaria',
      'proveedores': 'Proveedores',
    };
    return titles[currentView] || 'Sistema Contable';
  };

  useEffect(() => {
    document.title = `${getPageTitle()} | ContaBolivia SaaS`;
  }, [currentView]);

  // Listen for upgrade modal events
  useEffect(() => {
    const handler = () => setShowUpgradeModal(true);
    window.addEventListener('open-upgrade-modal', handler);
    return () => window.removeEventListener('open-upgrade-modal', handler);
  }, []);

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-3 px-5 border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-30">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 max-w-md">
              <Suspense fallback={<div className="h-8 bg-muted rounded animate-pulse" />}>
                <GlobalSearch onNavigate={(moduleId) => {
                  window.history.pushState({}, '', `/?view=${moduleId}`);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }} />
              </Suspense>
            </div>
            <h1 className="font-semibold text-lg mx-4">{getPageTitle()}</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpenNotifications(true)} aria-label="Notificaciones">
                <Bell className="w-4 h-4" />
              </Button>
              <UserProfileMenu />
            </div>
          </header>

          <Dialog open={openNotifications} onOpenChange={setOpenNotifications}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Centro de Notificaciones</DialogTitle>
                <DialogDescription>Gestiona tus alertas y notificaciones del sistema</DialogDescription>
              </DialogHeader>
              <NotificationCenter />
            </DialogContent>
          </Dialog>

          <PlanUpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />

          <main className="flex-1 p-6">
            <Suspense fallback={
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-64 bg-muted rounded animate-pulse" />
              </div>
            }>
              {renderCurrentView()}
            </Suspense>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
