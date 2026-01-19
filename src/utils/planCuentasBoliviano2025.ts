// Plan de cuentas actualizado según normativas contables bolivianas 2025-2026
// Sincronizado con tabla plan_cuentas de Supabase (códigos de 4 dígitos)
export interface CuentaContable {
  codigo: string;
  nombre: string;
  tipo: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'gasto';
  naturaleza: 'deudora' | 'acreedora';
  nivel: number;
  padre?: string;
  activa: boolean;
  requiereDetalle: boolean;
  centrosCosto?: boolean;
  validacionesSIN?: string[];
  categoriaTributaria?: string;
}

// Plan de cuentas sincronizado con Supabase - Códigos de 4 dígitos según CAMC 2025 y normativa SIN
export const planCuentasBoliviano2025: CuentaContable[] = [
  // 1. ACTIVOS
  { codigo: '1', nombre: 'ACTIVOS', tipo: 'activo', naturaleza: 'deudora', nivel: 1, activa: false, requiereDetalle: false },
  
  // 1.1 ACTIVOS CORRIENTES
  { codigo: '11', nombre: 'ACTIVOS CORRIENTES', tipo: 'activo', naturaleza: 'deudora', nivel: 2, padre: '1', activa: false, requiereDetalle: false },
  
  // 1.1.1 Disponibilidades (111x)
  { codigo: '111', nombre: 'DISPONIBILIDADES', tipo: 'activo', naturaleza: 'deudora', nivel: 3, padre: '11', activa: false, requiereDetalle: false },
  { codigo: '1111', nombre: 'Caja General', tipo: 'activo', naturaleza: 'deudora', nivel: 4, padre: '111', activa: true, requiereDetalle: true },
  { codigo: '1112', nombre: 'Banco Nacional de Bolivia', tipo: 'activo', naturaleza: 'deudora', nivel: 4, padre: '111', activa: true, requiereDetalle: true, validacionesSIN: ['conciliacion_bancaria'] },
  { codigo: '1113', nombre: 'Banco Mercantil Santa Cruz', tipo: 'activo', naturaleza: 'deudora', nivel: 4, padre: '111', activa: true, requiereDetalle: true, validacionesSIN: ['conciliacion_bancaria'] },

  // 1.1.2 Exigible (112x)
  { codigo: '112', nombre: 'EXIGIBLE', tipo: 'activo', naturaleza: 'deudora', nivel: 3, padre: '11', activa: false, requiereDetalle: false },
  { codigo: '1121', nombre: 'Cuentas por Cobrar Comerciales', tipo: 'activo', naturaleza: 'deudora', nivel: 4, padre: '112', activa: true, requiereDetalle: true, validacionesSIN: ['antiguedad_saldos'] },

  // 1.1.3 Realizables (113x) - INVENTARIOS
  { codigo: '113', nombre: 'REALIZABLES', tipo: 'activo', naturaleza: 'deudora', nivel: 3, padre: '11', activa: false, requiereDetalle: false },
  { codigo: '1131', nombre: 'Inventarios - Mercaderías', tipo: 'activo', naturaleza: 'deudora', nivel: 4, padre: '113', activa: true, requiereDetalle: true, validacionesSIN: ['kardex'] },

  // 1.1.4 Gastos Pagados por Anticipado (114x)
  { codigo: '114', nombre: 'DIFERIDOS', tipo: 'activo', naturaleza: 'deudora', nivel: 3, padre: '11', activa: false, requiereDetalle: false },
  { codigo: '1141', nombre: 'Gastos Pagados por Anticipado', tipo: 'activo', naturaleza: 'deudora', nivel: 4, padre: '114', activa: true, requiereDetalle: true },
  { codigo: '1142', nombre: 'IVA Crédito Fiscal', tipo: 'activo', naturaleza: 'deudora', nivel: 4, padre: '114', activa: true, requiereDetalle: true, categoriaTributaria: 'IVA', validacionesSIN: ['libro_compras'] },

  // 1.2 ACTIVOS NO CORRIENTES
  { codigo: '12', nombre: 'ACTIVOS NO CORRIENTES', tipo: 'activo', naturaleza: 'deudora', nivel: 2, padre: '1', activa: false, requiereDetalle: false },
  
  // 1.2.1 Activos Fijos (121x)
  { codigo: '121', nombre: 'ACTIVOS FIJOS', tipo: 'activo', naturaleza: 'deudora', nivel: 3, padre: '12', activa: false, requiereDetalle: false },
  { codigo: '1211', nombre: 'Muebles y Enseres', tipo: 'activo', naturaleza: 'deudora', nivel: 4, padre: '121', activa: true, requiereDetalle: true, validacionesSIN: ['registro_activos_fijos', 'depreciacion'] },
  { codigo: '1212', nombre: 'Equipos de Computación', tipo: 'activo', naturaleza: 'deudora', nivel: 4, padre: '121', activa: true, requiereDetalle: true, validacionesSIN: ['registro_activos_fijos', 'depreciacion'] },

  // 2. PASIVOS
  { codigo: '2', nombre: 'PASIVOS', tipo: 'pasivo', naturaleza: 'acreedora', nivel: 1, activa: false, requiereDetalle: false },
  
  // 2.1 PASIVOS CORRIENTES
  { codigo: '21', nombre: 'PASIVOS CORRIENTES', tipo: 'pasivo', naturaleza: 'acreedora', nivel: 2, padre: '2', activa: false, requiereDetalle: false },
  
  // 2.1.1 Cuentas por Pagar (211x)
  { codigo: '211', nombre: 'CUENTAS POR PAGAR', tipo: 'pasivo', naturaleza: 'acreedora', nivel: 3, padre: '21', activa: false, requiereDetalle: false },
  { codigo: '2111', nombre: 'Cuentas por Pagar Comerciales', tipo: 'pasivo', naturaleza: 'acreedora', nivel: 4, padre: '211', activa: true, requiereDetalle: true },
  { codigo: '2113', nombre: 'IVA Débito Fiscal', tipo: 'pasivo', naturaleza: 'acreedora', nivel: 4, padre: '211', activa: true, requiereDetalle: true, categoriaTributaria: 'IVA', validacionesSIN: ['libro_ventas'] },
  { codigo: '2114', nombre: 'IT por Pagar', tipo: 'pasivo', naturaleza: 'acreedora', nivel: 4, padre: '211', activa: true, requiereDetalle: true, categoriaTributaria: 'IT' },

  // 2.1.2 Obligaciones Laborales (212x)
  { codigo: '212', nombre: 'OBLIGACIONES LABORALES', tipo: 'pasivo', naturaleza: 'acreedora', nivel: 3, padre: '21', activa: false, requiereDetalle: false },
  { codigo: '2121', nombre: 'Sueldos y Salarios por Pagar', tipo: 'pasivo', naturaleza: 'acreedora', nivel: 4, padre: '212', activa: true, requiereDetalle: true },

  // 3. PATRIMONIO
  { codigo: '3', nombre: 'PATRIMONIO', tipo: 'patrimonio', naturaleza: 'acreedora', nivel: 1, activa: false, requiereDetalle: false },
  { codigo: '31', nombre: 'CAPITAL', tipo: 'patrimonio', naturaleza: 'acreedora', nivel: 2, padre: '3', activa: false, requiereDetalle: false },
  { codigo: '311', nombre: 'CAPITAL SOCIAL', tipo: 'patrimonio', naturaleza: 'acreedora', nivel: 3, padre: '31', activa: false, requiereDetalle: false },
  { codigo: '3111', nombre: 'Capital Social', tipo: 'patrimonio', naturaleza: 'acreedora', nivel: 4, padre: '311', activa: true, requiereDetalle: true },
  
  { codigo: '32', nombre: 'RESULTADOS', tipo: 'patrimonio', naturaleza: 'acreedora', nivel: 2, padre: '3', activa: false, requiereDetalle: false },
  { codigo: '321', nombre: 'RESULTADOS ACUMULADOS', tipo: 'patrimonio', naturaleza: 'acreedora', nivel: 3, padre: '32', activa: false, requiereDetalle: false },
  { codigo: '3211', nombre: 'Utilidades Acumuladas', tipo: 'patrimonio', naturaleza: 'acreedora', nivel: 4, padre: '321', activa: true, requiereDetalle: true },

  // 4. INGRESOS
  { codigo: '4', nombre: 'INGRESOS', tipo: 'ingreso', naturaleza: 'acreedora', nivel: 1, activa: false, requiereDetalle: false },
  { codigo: '41', nombre: 'INGRESOS OPERACIONALES', tipo: 'ingreso', naturaleza: 'acreedora', nivel: 2, padre: '4', activa: false, requiereDetalle: false },
  { codigo: '411', nombre: 'VENTAS', tipo: 'ingreso', naturaleza: 'acreedora', nivel: 3, padre: '41', activa: false, requiereDetalle: false },
  { codigo: '4111', nombre: 'Ventas', tipo: 'ingreso', naturaleza: 'acreedora', nivel: 4, padre: '411', activa: true, requiereDetalle: true, validacionesSIN: ['libro_ventas'], centrosCosto: true },
  
  { codigo: '419', nombre: 'OTROS INGRESOS', tipo: 'ingreso', naturaleza: 'acreedora', nivel: 3, padre: '41', activa: false, requiereDetalle: false },
  { codigo: '4191', nombre: 'Otros Ingresos', tipo: 'ingreso', naturaleza: 'acreedora', nivel: 4, padre: '419', activa: true, requiereDetalle: true },
  { codigo: '4211', nombre: 'Otros Ingresos - Ajustes', tipo: 'ingreso', naturaleza: 'acreedora', nivel: 4, padre: '419', activa: true, requiereDetalle: true },

  // 5. GASTOS
  { codigo: '5', nombre: 'GASTOS', tipo: 'gasto', naturaleza: 'deudora', nivel: 1, activa: false, requiereDetalle: false },
  
  // 5.1 COSTO DE VENTAS
  { codigo: '51', nombre: 'COSTO DE VENTAS', tipo: 'gasto', naturaleza: 'deudora', nivel: 2, padre: '5', activa: false, requiereDetalle: false },
  { codigo: '511', nombre: 'COSTO DE PRODUCTOS VENDIDOS', tipo: 'gasto', naturaleza: 'deudora', nivel: 3, padre: '51', activa: false, requiereDetalle: false },
  { codigo: '5111', nombre: 'Costo de Ventas', tipo: 'gasto', naturaleza: 'deudora', nivel: 4, padre: '511', activa: true, requiereDetalle: true, centrosCosto: true },
  { codigo: '5191', nombre: 'Gastos Varios', tipo: 'gasto', naturaleza: 'deudora', nivel: 4, padre: '511', activa: true, requiereDetalle: true },

  // 5.2 GASTOS OPERACIONALES
  { codigo: '52', nombre: 'GASTOS OPERACIONALES', tipo: 'gasto', naturaleza: 'deudora', nivel: 2, padre: '5', activa: false, requiereDetalle: false },
  { codigo: '521', nombre: 'GASTOS DE PERSONAL', tipo: 'gasto', naturaleza: 'deudora', nivel: 3, padre: '52', activa: false, requiereDetalle: false },
  { codigo: '5211', nombre: 'Sueldos y Salarios', tipo: 'gasto', naturaleza: 'deudora', nivel: 4, padre: '521', activa: true, requiereDetalle: true, centrosCosto: true },
  { codigo: '5221', nombre: 'Cargas Sociales', tipo: 'gasto', naturaleza: 'deudora', nivel: 4, padre: '521', activa: true, requiereDetalle: true, centrosCosto: true },

  // 5.3 OTROS GASTOS
  { codigo: '53', nombre: 'OTROS GASTOS', tipo: 'gasto', naturaleza: 'deudora', nivel: 2, padre: '5', activa: false, requiereDetalle: false },
  { codigo: '532', nombre: 'PÉRDIDAS', tipo: 'gasto', naturaleza: 'deudora', nivel: 3, padre: '53', activa: false, requiereDetalle: false },
  { codigo: '5322', nombre: 'Pérdidas y Faltantes de Inventario', tipo: 'gasto', naturaleza: 'deudora', nivel: 4, padre: '532', activa: true, requiereDetalle: true },
  
  // 5.4 IMPUESTOS
  { codigo: '54', nombre: 'IMPUESTOS', tipo: 'gasto', naturaleza: 'deudora', nivel: 2, padre: '5', activa: false, requiereDetalle: false },
  { codigo: '540', nombre: 'IMPUESTOS NACIONALES', tipo: 'gasto', naturaleza: 'deudora', nivel: 3, padre: '54', activa: false, requiereDetalle: false },
  { codigo: '5401', nombre: 'IT Pagado', tipo: 'gasto', naturaleza: 'deudora', nivel: 4, padre: '540', activa: true, requiereDetalle: true, categoriaTributaria: 'IT' },
];

// Funciones de utilidad para el plan de cuentas
export const obtenerCuentasPorTipo = (tipo: string): CuentaContable[] => {
  return planCuentasBoliviano2025.filter(cuenta => cuenta.tipo === tipo);
};

export const obtenerCuentasActivas = (): CuentaContable[] => {
  return planCuentasBoliviano2025.filter(cuenta => cuenta.activa);
};

export const obtenerCuentaPorCodigo = (codigo: string): CuentaContable | undefined => {
  return planCuentasBoliviano2025.find(cuenta => cuenta.codigo === codigo);
};

export const obtenerCuentasHijas = (codigoPadre: string): CuentaContable[] => {
  return planCuentasBoliviano2025.filter(cuenta => cuenta.padre === codigoPadre);
};

export const validarCuentaParaSIN = (codigo: string): { valida: boolean; validaciones: string[] } => {
  const cuenta = obtenerCuentaPorCodigo(codigo);
  if (!cuenta) {
    return { valida: false, validaciones: ['Cuenta no existe'] };
  }
  
  return {
    valida: true,
    validaciones: cuenta.validacionesSIN || []
  };
};

export const obtenerCuentasTributarias = (): CuentaContable[] => {
  return planCuentasBoliviano2025.filter(cuenta => cuenta.categoriaTributaria);
};

export const estructuraJerarquica = (): any => {
  const cuentasNivel1 = planCuentasBoliviano2025.filter(c => c.nivel === 1);
  
  const construirArbol = (cuentas: CuentaContable[], nivel: number = 1): any[] => {
    return cuentas
      .filter(c => c.nivel === nivel)
      .map(cuenta => ({
        ...cuenta,
        hijas: construirArbol(
          planCuentasBoliviano2025.filter(c => c.padre === cuenta.codigo),
          nivel + 1
        )
      }));
  };
  
  return construirArbol(planCuentasBoliviano2025);
};

// Constantes de tasas impositivas bolivianas 2026
export const TASAS_IMPUESTOS_BOLIVIA_2026 = {
  IVA: 0.13,           // 13% IVA
  IT: 0.03,            // 3% IT
  IUE: 0.25,           // 25% IUE
  RC_IVA: 0.13,        // 13% RC-IVA
  RC_IT: 0.03,         // 3% RC-IT
  IEHD_MAX: 10.40,     // Bs 10.40 alícuota máxima IEHD
  ISAE: 464,           // Bs 464 ISAE
  UFV: 3.05,           // UFV aproximado
  TIPO_CAMBIO_USD: 6.96 // Tipo de cambio oficial
};
