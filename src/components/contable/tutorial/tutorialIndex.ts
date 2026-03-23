export interface TutorialIndexModule {
  title: string;
  view: string;
  plan: "basic" | "pro" | "enterprise" | "admin";
  summary: string;
  idealFor: string;
}

export interface TutorialIndexGroup {
  group: string;
  modules: TutorialIndexModule[];
}

export const tutorialMasterIndex: TutorialIndexGroup[] = [
  {
    group: "Principal",
    modules: [
      { title: "Dashboard", view: "dashboard", plan: "basic", summary: "Centro de mando con KPIs, alertas y accesos operativos.", idealFor: "Revisión diaria de gerencia y contador." },
    ],
  },
  {
    group: "Contabilidad",
    modules: [
      { title: "Plan de Cuentas", view: "plan-cuentas", plan: "basic", summary: "Catálogo base de cuentas para toda la operación contable.", idealFor: "Configuración y control contable." },
      { title: "Comprobantes", view: "comprobantes-integrados", plan: "basic", summary: "Registro formal de comprobantes y asientos vinculados.", idealFor: "Operaciones manuales y ajustes." },
      { title: "Diario", view: "diario", plan: "basic", summary: "Bitácora cronológica de asientos y movimientos.", idealFor: "Revisión contable diaria." },
      { title: "Mayor", view: "mayor", plan: "basic", summary: "Consulta de movimientos y saldos por cuenta.", idealFor: "Análisis y conciliación." },
      { title: "Balance Comprobación", view: "balance-comprobacion", plan: "basic", summary: "Control de cuadre y consistencia contable.", idealFor: "Pre-cierre y auditoría." },
      { title: "Balance General", view: "balance-general", plan: "pro", summary: "Situación financiera de activos, pasivos y patrimonio.", idealFor: "Gerencia y cierre financiero." },
      { title: "Resultados", view: "estado-resultados", plan: "pro", summary: "Ingresos, costos y utilidad del período.", idealFor: "Rentabilidad y análisis gerencial." },
    ],
  },
  {
    group: "Operaciones",
    modules: [
      { title: "Facturación", view: "facturacion", plan: "basic", summary: "Emisión de facturas y control del ciclo comercial.", idealFor: "Ventas y administración." },
      { title: "Punto de Venta", view: "punto-venta", plan: "pro", summary: "Venta rápida con ticket, cliente y cobro.", idealFor: "Caja y retail." },
      { title: "Ventas Crédito", view: "credit-sales", plan: "pro", summary: "Control de cartera, saldos y cobranzas.", idealFor: "Empresas que venden a plazo." },
      { title: "Notas C/D", view: "notas-credito-debito", plan: "pro", summary: "Ajustes comerciales y tributarios sobre operaciones emitidas.", idealFor: "Devoluciones y correcciones." },
      { title: "Compras", view: "compras", plan: "pro", summary: "Registro de compras, crédito fiscal y obligaciones.", idealFor: "Abastecimiento y contabilidad." },
      { title: "Proveedores", view: "proveedores", plan: "pro", summary: "Directorio y análisis de terceros proveedores.", idealFor: "Compras y cuentas por pagar." },
      { title: "Clientes", view: "clientes", plan: "basic", summary: "Base comercial con historial y datos fiscales.", idealFor: "Ventas y cobranza." },
    ],
  },
  {
    group: "Inventario y Activos",
    modules: [
      { title: "Productos", view: "productos", plan: "basic", summary: "Catálogo de productos y servicios con imagen principal.", idealFor: "Ventas, POS e inventario." },
      { title: "Inventario", view: "inventario", plan: "basic", summary: "Control de stock, valorización y alertas.", idealFor: "Almacén y control interno." },
      { title: "Kardex", view: "kardex", plan: "pro", summary: "Historial detallado de movimientos por producto.", idealFor: "Auditoría de inventario." },
      { title: "Activos Fijos", view: "activos-fijos", plan: "pro", summary: "Control de bienes, depreciación y valor en libros.", idealFor: "Patrimonio y cierre anual." },
    ],
  },
  {
    group: "Finanzas",
    modules: [
      { title: "Bancos", view: "bancos", plan: "pro", summary: "Mesa de tesorería con cuentas y movimientos.", idealFor: "Tesorería diaria." },
      { title: "Conciliación", view: "conciliacion-bancaria", plan: "pro", summary: "Conciliación auditable de banco versus libros.", idealFor: "Cierre mensual bancario." },
      { title: "Flujo Caja", view: "flujo-caja", plan: "pro", summary: "Lectura y proyección de liquidez.", idealFor: "Gerencia financiera." },
      { title: "CxC / CxP", view: "cuentas-cobrar-pagar", plan: "pro", summary: "Consolidado de cartera y obligaciones.", idealFor: "Cobranza y pagos." },
    ],
  },
  {
    group: "Impuestos SIN",
    modules: [
      { title: "Libro C/V", view: "libro-compras-ventas", plan: "pro", summary: "Libro fiscal SIAT con control de exportación.", idealFor: "Cierre tributario mensual." },
      { title: "Declaraciones", view: "declaraciones-tributarias", plan: "pro", summary: "Calendario fiscal y registro de declaraciones.", idealFor: "IVA, IT e IUE." },
      { title: "Cumplimiento", view: "cumplimiento-normativo", plan: "pro", summary: "Seguimiento normativo y regulatorio.", idealFor: "Responsable tributario." },
      { title: "Retenciones", view: "retenciones", plan: "pro", summary: "Emisión y control de retenciones fiscales.", idealFor: "RC-IVA y obligaciones relacionadas." },
      { title: "Fact. Electrónica", view: "facturacion-electronica", plan: "pro", summary: "Control de CUF, CUFD y recepción SIN asistida.", idealFor: "Incidencias electrónicas y revisión fiscal." },
    ],
  },
  {
    group: "Planificación",
    modules: [
      { title: "Presupuestos", view: "presupuestos", plan: "pro", summary: "Planificación y control presupuestario.", idealFor: "Gerencia y control financiero." },
      { title: "Centros Costo", view: "centros-costo", plan: "pro", summary: "Seguimiento de ejecución por área o unidad.", idealFor: "Costos y control gerencial." },
    ],
  },
  {
    group: "Recursos Humanos",
    modules: [
      { title: "Nómina", view: "nomina", plan: "pro", summary: "Planillas, RC-IVA y pago de personal.", idealFor: "RRHH y contabilidad laboral." },
      { title: "Empleados", view: "empleados", plan: "pro", summary: "Directorio y estado del personal.", idealFor: "Administración de personal." },
    ],
  },
  {
    group: "Reportes",
    modules: [
      { title: "Reportes", view: "reportes", plan: "pro", summary: "Centro de reportes operativos y financieros.", idealFor: "Gerencia y control." },
      { title: "Análisis", view: "analisis-financiero", plan: "pro", summary: "Ratios y lectura financiera ejecutiva.", idealFor: "Dirección y análisis." },
      { title: "IA", view: "analisis-inteligente", plan: "enterprise", summary: "Lectura analítica avanzada del sistema.", idealFor: "Hallazgos y soporte ejecutivo." },
      { title: "Rentabilidad", view: "rentabilidad", plan: "enterprise", summary: "Margen y análisis de rentabilidad.", idealFor: "Comercial y costos." },
      { title: "Auditoría", view: "auditoria-avanzada", plan: "enterprise", summary: "Hallazgos y control interno avanzado.", idealFor: "Auditoría y cierre." },
    ],
  },
  {
    group: "Configuración",
    modules: [
      { title: "Configuración", view: "configuracion", plan: "basic", summary: "Parámetros de empresa, fiscalidad y SIN.", idealFor: "Implementación y mantenimiento." },
      { title: "Backup", view: "backup", plan: "pro", summary: "Respaldo operativo y continuidad.", idealFor: "Administrador del sistema." },
      { title: "Tutorial", view: "tutorial", plan: "basic", summary: "Centro de ayuda, onboarding y capacitación.", idealFor: "Nuevos usuarios y reciclaje." },
    ],
  },
  {
    group: "Administración",
    modules: [
      { title: "Panel Admin", view: "admin-dashboard", plan: "admin", summary: "Control global de la capa administrativa.", idealFor: "Administrador de plataforma." },
      { title: "Gestión Usuarios", view: "admin-users", plan: "admin", summary: "Administración avanzada de usuarios.", idealFor: "Soporte y seguridad." },
      { title: "Suscripciones", view: "admin-subscriptions", plan: "admin", summary: "Planes y estados comerciales del SaaS.", idealFor: "Backoffice comercial." },
      { title: "Pagos Bolivia", view: "admin-payments", plan: "admin", summary: "Seguimiento administrativo de pagos locales.", idealFor: "Soporte comercial." },
      { title: "Logs Actividad", view: "admin-logs", plan: "admin", summary: "Trazabilidad de actividad y eventos.", idealFor: "Auditoría y soporte." },
    ],
  },
];
