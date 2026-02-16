
import React from 'react';
import {
  Calculator,
  FileText,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Scale,
  BookOpen,
  BookOpenCheck,
  Building2,
  Settings,
  HelpCircle,
  CreditCard,
  Factory,
  Archive,
  ClipboardList,
  Target,
  PiggyBank,
  UserCheck,
  Receipt,
  Home,
  Download,
  DollarSign,
  Shield,
  Brain,
  Zap,
  FileBarChart,
  FileCheck,
  TestTube,
  Lock,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { usePlan } from '@/hooks/usePlan';
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
      { title: 'Libro Diario', url: '/?view=diario', icon: FileText, plan: 'basic' as const },
      { title: 'Libro Mayor', url: '/?view=mayor', icon: BookOpenCheck, plan: 'basic' as const },
      { title: 'Balance Comprobación', url: '/?view=balance-comprobacion', icon: Scale, plan: 'basic' as const },
      { title: 'Balance General', url: '/?view=balance-general', icon: FileBarChart, plan: 'pro' as const },
      { title: 'Estado de Resultados', url: '/?view=estado-resultados', icon: TrendingUp, plan: 'pro' as const },
    ]
  },
  {
    group: 'Operaciones',
    items: [
      { title: 'Facturación', url: '/?view=facturacion', icon: Receipt, plan: 'basic' as const },
      { title: 'Punto de Venta', url: '/?view=punto-venta', icon: CreditCard, plan: 'pro' as const },
      { title: 'Ventas a Crédito', url: '/?view=credit-sales', icon: DollarSign, plan: 'pro' as const },
      { title: 'Compras', url: '/?view=compras', icon: ShoppingCart, plan: 'pro' as const },
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
      { title: 'Flujo de Caja', url: '/?view=flujo-caja', icon: PiggyBank, plan: 'pro' as const },
      { title: 'Cuentas CxC/CxP', url: '/?view=cuentas-cobrar-pagar', icon: CreditCard, plan: 'pro' as const },
      { title: 'Declaraciones IVA', url: '/?view=declaraciones-tributarias', icon: FileText, plan: 'pro' as const },
      { title: 'Cumplimiento', url: '/?view=cumplimiento-normativo', icon: Shield, plan: 'pro' as const },
      { title: 'Retenciones', url: '/?view=retenciones', icon: Receipt, plan: 'pro' as const },
      { title: 'Fact. Electrónica', url: '/?view=facturacion-electronica', icon: Zap, plan: 'pro' as const },
    ]
  },
  {
    group: 'Planificación',
    items: [
      { title: 'Presupuestos', url: '/?view=presupuestos', icon: Target, plan: 'pro' as const },
      { title: 'Centros de Costo', url: '/?view=centros-costo', icon: Factory, plan: 'pro' as const },
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
      { title: 'Análisis Financiero', url: '/?view=analisis-financiero', icon: TrendingUp, plan: 'pro' as const },
      { title: 'Análisis IA', url: '/?view=analisis-inteligente', icon: Brain, plan: 'pro' as const },
      { title: 'Rentabilidad', url: '/?view=rentabilidad', icon: TrendingUp, plan: 'pro' as const },
      { title: 'Auditoría', url: '/?view=auditoria-avanzada', icon: TestTube, plan: 'pro' as const },
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

const AppSidebar = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const { currentPlan, isProFeature } = usePlan();
  
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
      : "hover:bg-accent hover:text-accent-foreground";

  return (
    <Sidebar className="border-r border-border">
      <SidebarContent className="p-3">
        {/* Logo */}
        <div className={`px-4 py-5 mb-4 ${isCollapsed ? 'text-center' : ''}`}>
          {isCollapsed ? (
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center mx-auto">
              <Calculator className="w-5 h-5 text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-foreground">ContaBolivia</h1>
                <p className="text-xs text-muted-foreground">
                  {currentPlan === 'pro' ? 'Plan Profesional' : 'Plan Gratuito'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        {menuItems.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.group}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item, itemIndex) => {
                const locked = item.plan === 'pro' && currentPlan !== 'pro';
                return (
                  <button
                    key={itemIndex}
                    onClick={() => handleNavigation(item.url)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      locked ? 'opacity-60' : ''
                    } ${getNavClasses(isActive(item.url))}`}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate text-sm">{item.title}</span>
                        {locked && (
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        )}
                        {item.plan === 'pro' && currentPlan === 'pro' && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
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
        {!isCollapsed && currentPlan === 'basic' && (
          <div className="mt-auto pt-4 px-3 border-t">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/?view=configuracion');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="w-full p-3 rounded-lg bg-primary/10 border border-primary/20 text-center hover:bg-primary/15 transition-colors"
            >
              <p className="text-sm font-semibold text-primary">Actualizar a Pro</p>
              <p className="text-xs text-muted-foreground">$29/mes • Todo ilimitado</p>
            </button>
          </div>
        )}

        {!isCollapsed && (
          <div className="mt-4 pt-4 px-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              <span>Sistema Activo v3.0</span>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
