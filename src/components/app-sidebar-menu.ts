import {
  Activity,
  Archive,
  ArrowLeftRight,
  BookOpen,
  BookOpenCheck,
  Brain,
  Building2,
  Calculator,
  ClipboardList,
  CreditCard,
  DollarSign,
  Download,
  Factory,
  FileBarChart,
  FileCheck,
  FileMinus,
  FileOutput,
  FileText,
  HelpCircle,
  Home,
  LayoutDashboard,
  Package,
  PiggyBank,
  Receipt,
  Scale,
  Settings,
  ShoppingCart,
  Smartphone,
  Shield,
  Target,
  TestTube,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';

export const menuItems = [
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
      { title: 'Facturacion', url: '/?view=facturacion', icon: Receipt, plan: 'basic' as const },
      { title: 'Punto de Venta', url: '/?view=punto-venta', icon: CreditCard, plan: 'pro' as const },
      { title: 'Ventas Credito', url: '/?view=credit-sales', icon: DollarSign, plan: 'pro' as const },
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
      { title: 'Conciliacion', url: '/?view=conciliacion-bancaria', icon: ArrowLeftRight, plan: 'pro' as const },
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
      { title: 'Fact. Electronica', url: '/?view=facturacion-electronica', icon: Zap, plan: 'pro' as const },
    ]
  },
  {
    group: 'Planificacion',
    items: [
      { title: 'Presupuestos', url: '/?view=presupuestos', icon: Target, plan: 'pro' as const },
      { title: 'Centros Costo', url: '/?view=centros-costo', icon: Factory, plan: 'pro' as const },
    ]
  },
  {
    group: 'Recursos Humanos',
    items: [
      { title: 'Nomina', url: '/?view=nomina', icon: UserCheck, plan: 'pro' as const },
      { title: 'Empleados', url: '/?view=empleados', icon: Users, plan: 'pro' as const },
    ]
  },
  {
    group: 'Reportes',
    items: [
      { title: 'Reportes', url: '/?view=reportes', icon: FileBarChart, plan: 'pro' as const },
      { title: 'Analisis', url: '/?view=analisis-financiero', icon: TrendingUp, plan: 'pro' as const },
      { title: 'IA', url: '/?view=analisis-inteligente', icon: Brain, plan: 'enterprise' as const },
      { title: 'Rentabilidad', url: '/?view=rentabilidad', icon: TrendingUp, plan: 'enterprise' as const },
      { title: 'Auditoria', url: '/?view=auditoria-avanzada', icon: TestTube, plan: 'enterprise' as const },
    ]
  },
  {
    group: 'Configuracion',
    items: [
      { title: 'Configuracion', url: '/?view=configuracion', icon: Settings, plan: 'basic' as const },
      { title: 'Backup', url: '/?view=backup', icon: Download, plan: 'pro' as const },
      { title: 'Tutorial', url: '/?view=tutorial', icon: HelpCircle, plan: 'basic' as const },
    ]
  }
];

export const adminMenuItems = [
  {
    group: 'Administracion',
    items: [
      { title: 'Panel Admin', url: '/?view=admin-dashboard', icon: LayoutDashboard },
      { title: 'Gestion Usuarios', url: '/?view=admin-users', icon: Users },
      { title: 'Suscripciones', url: '/?view=admin-subscriptions', icon: CreditCard },
      { title: 'Pagos Bolivia', url: '/?view=admin-payments', icon: Smartphone },
      { title: 'Logs Actividad', url: '/?view=admin-logs', icon: Activity },
    ]
  }
];
