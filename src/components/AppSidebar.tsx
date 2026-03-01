
import React from 'react';
import {
  Calculator, FileText, Package, ShoppingCart, Users, TrendingUp, Scale,
  BookOpen, BookOpenCheck, Building2, Settings, HelpCircle, CreditCard,
  Factory, Archive, ClipboardList, Target, PiggyBank, UserCheck, Receipt,
  Home, Download, DollarSign, Shield, Brain, Zap, FileBarChart, FileCheck,
  TestTube, Lock, Activity, LayoutDashboard, Truck, ArrowLeftRight,
  FileOutput, Crown, FileMinus, Smartphone,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { usePlan } from '@/hooks/usePlan';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLocation } from 'react-router-dom';

const menuItems = [
  {
    group: 'Principal',
    items: [
      { title: 'Dashboard', url: '/?view=dashboard', icon: Home, plan: 'basic' as const },
    ]
  },
  {
    group: 'Contabilidad',
    items: [
      { title: 'Plan de Cuentas', url: '/?view=plan-cuentas', icon: BookOpen, plan: 'basic' as const },
      { title: 'Comprobantes', url: '/?view=comprobantes-integrados', icon: FileCheck, plan: 'basic' as const },
      { title: 'Diario', url: '/?view=diario', icon: FileText, plan: 'basic' as const },
      { title: 'Mayor', url: '/?view=mayor', icon: BookOpenCheck, plan: 'basic' as const },
      { title: 'Balance Comprob.', url: '/?view=balance-comprobacion', icon: Scale, plan: 'basic' as const },
      { title: 'Balance General', url: '/?view=balance-general', icon: FileBarChart, plan: 'pro' as const },
      { title: 'Resultados', url: '/?view=estado-resultados', icon: TrendingUp, plan: 'pro' as const },
    ]
  },
  {
    group: 'Operaciones',
    items: [
      { title: 'Facturación', url: '/?view=facturacion', icon: Receipt, plan: 'basic' as const },
      { title: 'Punto de Venta', url: '/?view=punto-venta', icon: CreditCard, plan: 'pro' as const },
      { title: 'Ventas Crédito', url: '/?view=credit-sales', icon: DollarSign, plan: 'pro' as const },
      { title: 'Notas C/D', url: '/?view=notas-credito-debito', icon: FileMinus, plan: 'pro' as const },
      { title: 'Compras', url: '/?view=compras', icon: ShoppingCart, plan: 'pro' as const },
      { title: 'Proveedores', url: '/?view=proveedores', icon: Truck, plan: 'pro' as const },
      { title: 'Clientes', url: '/?view=clientes', icon: Users, plan: 'basic' as const },
    ]
  },
  {
    group: 'Inventario y Activos',
    items: [
      { title: 'Productos', url: '/?view=productos', icon: Package, plan: 'basic' as const },
      { title: 'Inventario', url: '/?view=inventario', icon: Archive, plan: 'basic' as const },
      { title: 'Kardex', url: '/?view=kardex', icon: ClipboardList, plan: 'pro' as const },
      { title: 'Activos Fijos', url: '/?view=activos-fijos', icon: Building2, plan: 'pro' as const },
    ]
  },
  {
    group: 'Finanzas',
    items: [
      { title: 'Bancos', url: '/?view=bancos', icon: Building2, plan: 'pro' as const },
      { title: 'Conciliación', url: '/?view=conciliacion-bancaria', icon: ArrowLeftRight, plan: 'pro' as const },
      { title: 'Flujo Caja', url: '/?view=flujo-caja', icon: PiggyBank, plan: 'pro' as const },
      { title: 'CxC / CxP', url: '/?view=cuentas-cobrar-pagar', icon: CreditCard, plan: 'pro' as const },
    ]
  },
  {
    group: 'Impuestos SIN',
    items: [
      { title: 'Libro C/V', url: '/?view=libro-compras-ventas', icon: FileOutput, plan: 'pro' as const },
      { title: 'IVA', url: '/?view=declaraciones-tributarias', icon: FileText, plan: 'pro' as const },
      { title: 'Cumplimiento', url: '/?view=cumplimiento-normativo', icon: Shield, plan: 'pro' as const },
      { title: 'Retenciones', url: '/?view=retenciones', icon: Receipt, plan: 'pro' as const },
      { title: 'Fact. Electrónica', url: '/?view=facturacion-electronica', icon: Zap, plan: 'pro' as const },
    ]
  },
  {
    group: 'Planificación',
    items: [
      { title: 'Presupuestos', url: '/?view=presupuestos', icon: Target, plan: 'pro' as const },
      { title: 'Centros Costo', url: '/?view=centros-costo', icon: Factory, plan: 'pro' as const },
    ]
  },
  {
    group: 'Recursos Humanos',
    items: [
      { title: 'Nómina', url: '/?view=nomina', icon: UserCheck, plan: 'pro' as const },
      { title: 'Empleados', url: '/?view=empleados', icon: Users, plan: 'pro' as const },
    ]
  },
  {
    group: 'Reportes',
    items: [
      { title: 'Reportes', url: '/?view=reportes', icon: FileBarChart, plan: 'pro' as const },
      { title: 'Análisis', url: '/?view=analisis-financiero', icon: TrendingUp, plan: 'pro' as const },
      { title: 'IA', url: '/?view=analisis-inteligente', icon: Brain, plan: 'enterprise' as const },
      { title: 'Rentabilidad', url: '/?view=rentabilidad', icon: TrendingUp, plan: 'enterprise' as const },
      { title: 'Auditoría', url: '/?view=auditoria-avanzada', icon: TestTube, plan: 'enterprise' as const },
    ]
  },
  {
    group: 'Configuración',
    items: [
      { title: 'Configuración', url: '/?view=configuracion', icon: Settings, plan: 'basic' as const },
      { title: 'Backup', url: '/?view=backup', icon: Download, plan: 'pro' as const },
      { title: 'Tutorial', url: '/?view=tutorial', icon: HelpCircle, plan: 'basic' as const },
    ]
  }
];

const adminMenuItems = [
  {
    group: 'Administración',
    items: [
      { title: 'Panel Admin', url: '/?view=admin-dashboard', icon: LayoutDashboard },
      { title: 'Gestión Usuarios', url: '/?view=admin-users', icon: Users },
      { title: 'Suscripciones', url: '/?view=admin-subscriptions', icon: CreditCard },
      { title: 'Pagos Bolivia', url: '/?view=admin-payments', icon: Smartphone },
      { title: 'Logs Actividad', url: '/?view=admin-logs', icon: Activity },
    ]
  }
];

const AppSidebar = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const { currentPlan, isProFeature, isAdmin } = usePlan();
  const { user } = useAuth();
  
  const urlParams = new URLSearchParams(location.search);
  const currentView = urlParams.get('view') || 'dashboard';

  const isActive = (url: string) => {
    const viewParam = new URLSearchParams(url.split('?')[1] || '').get('view');
    return viewParam === currentView;
  };

  const handleNavigation = (url: string) => {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const getNavClasses = (active: boolean) => 
    active 
      ? "bg-primary text-primary-foreground font-medium shadow-sm" 
      : "hover:bg-accent text-muted-foreground hover:text-foreground";

  return (
    <Sidebar className="border-r border-border/60">
      <SidebarContent className="p-3 overflow-y-auto scrollbar-thin">
        {/* Logo */}
        <div className={`px-4 py-5 mb-2 ${isCollapsed ? 'text-center' : ''}`}>
          {isCollapsed ? (
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto shadow-md">
              <Calculator className="w-5 h-5 text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-md">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-foreground tracking-tight">ContaBolivia</h1>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? '⚡ Administrador' : currentPlan === 'enterprise' ? '👑 Enterprise' : currentPlan === 'pro' ? 'Plan Profesional' : 'Plan Gratuito'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Admin Section */}
        {isAdmin && adminMenuItems.map((group, groupIndex) => (
          <div key={`admin-${groupIndex}`} className="mb-5">
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  {group.group}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item, itemIndex) => (
                  <button
                   key={itemIndex}
                   onClick={() => handleNavigation(item.url)}
                   className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg nav-item-animated text-sm ${getNavClasses(isActive(item.url))}`}
                   title={isCollapsed ? item.title : undefined}
                 >
                   <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200 ${isActive(item.url) ? 'scale-110' : ''}`} />
                  {!isCollapsed && <span className="flex-1 truncate">{item.title}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Navigation */}
        {menuItems.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-5 animate-fade-in" style={{ animationDelay: `${groupIndex * 0.04}s` }}>
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                  {group.group}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item, itemIndex) => {
                const planHierarchy = { basic: 0, pro: 1, enterprise: 2 };
                const locked = !isAdmin && planHierarchy[item.plan] > planHierarchy[currentPlan];
                const isEnterprise = item.plan === 'enterprise';
                return (
                  <button
                    key={itemIndex}
                    onClick={() => handleNavigation(item.url)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg nav-item-animated text-sm ${
                      locked ? 'opacity-50' : ''
                    } ${getNavClasses(isActive(item.url))}`}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200 ${isActive(item.url) ? 'scale-110' : ''}`} />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.title}</span>
                        {locked && (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                        )}
                        {isEnterprise && !locked && !isAdmin && (
                          <Badge className="text-[10px] px-1.5 py-0 font-medium bg-amber-600 text-white">
                            <Crown className="w-2.5 h-2.5 mr-0.5" />
                          </Badge>
                        )}
                        {item.plan === 'pro' && !isEnterprise && !locked && !isAdmin && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                            Pro
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Plan upgrade CTA */}
        {!isCollapsed && !isAdmin && (currentPlan === 'basic' || currentPlan === 'pro') && (
          <div className="mt-auto pt-4 px-3 border-t border-border/60">
            <button
              onClick={() => window.dispatchEvent(new Event('open-upgrade-modal'))}
              className="w-full p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 text-center hover:from-primary/15 hover:to-primary/10 transition-all duration-300"
            >
              <p className="text-sm font-semibold text-primary">
                {currentPlan === 'basic' ? 'Actualizar a Pro' : 'Actualizar a Enterprise'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentPlan === 'basic' ? 'Bs 199/mes • Funciones avanzadas' : 'Bs 699/mes • Todo ilimitado'}
              </p>
            </button>
          </div>
        )}

        {!isCollapsed && user && (
          <div className="mt-4 pt-4 px-3 border-t border-border/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">
                  {user.nombre?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.nombre}</p>
                <p className="text-xs text-muted-foreground truncate">{user.empresa}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Sistema Activo v3.0</span>
            </div>
          </div>
        )}
        {!isCollapsed && !user && (
          <div className="mt-4 pt-4 px-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Sistema Activo v3.0</span>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
