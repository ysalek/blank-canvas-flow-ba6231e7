// Plan de cuentas estándar unificado para todo el sistema
export const PLAN_CUENTAS_INICIAL = [
  // ACTIVOS (1000-1999)
  { codigo: "1", nombre: "ACTIVOS", tipo: "activo", nivel: 1, naturaleza: "deudora", saldo: 150000, activa: true },
  { codigo: "11", nombre: "ACTIVO CORRIENTE", tipo: "activo", nivel: 2, padre: "1", naturaleza: "deudora", saldo: 75000, activa: true },
  { codigo: "111", nombre: "DISPONIBLE", tipo: "activo", nivel: 3, padre: "11", naturaleza: "deudora", saldo: 25000, activa: true },
  { codigo: "1111", nombre: "Caja General", tipo: "activo", nivel: 4, padre: "111", naturaleza: "deudora", saldo: 5000, activa: true },
  { codigo: "1112", nombre: "Banco Nacional de Bolivia", tipo: "activo", nivel: 4, padre: "111", naturaleza: "deudora", saldo: 15000, activa: true },
  { codigo: "1113", nombre: "Banco Mercantil Santa Cruz", tipo: "activo", nivel: 4, padre: "111", naturaleza: "deudora", saldo: 5000, activa: true },
  { codigo: "1114", nombre: "Banco Sol", tipo: "activo", nivel: 4, padre: "111", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "1115", nombre: "Banco Unión", tipo: "activo", nivel: 4, padre: "111", naturaleza: "deudora", saldo: 0, activa: true },
  
  { codigo: "112", nombre: "EXIGIBLE", tipo: "activo", nivel: 3, padre: "11", naturaleza: "deudora", saldo: 30000, activa: true },
  { codigo: "1121", nombre: "Cuentas por Cobrar", tipo: "activo", nivel: 4, padre: "112", naturaleza: "deudora", saldo: 25000, activa: true },
  { codigo: "1122", nombre: "Documentos por Cobrar", tipo: "activo", nivel: 4, padre: "112", naturaleza: "deudora", saldo: 5000, activa: true },
  { codigo: "1141", nombre: "Gastos Pagados por Anticipado", tipo: "activo", nivel: 4, padre: "112", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "1142", nombre: "IVA Crédito Fiscal", tipo: "activo", nivel: 4, padre: "112", naturaleza: "deudora", saldo: 0, activa: true },
  
  { codigo: "113", nombre: "REALIZABLE", tipo: "activo", nivel: 3, padre: "11", naturaleza: "deudora", saldo: 20000, activa: true },
  { codigo: "1131", nombre: "Inventarios", tipo: "activo", nivel: 4, padre: "113", naturaleza: "deudora", saldo: 20000, activa: true },
  
  { codigo: "12", nombre: "ACTIVO NO CORRIENTE", tipo: "activo", nivel: 2, padre: "1", naturaleza: "deudora", saldo: 75000, activa: true },
  { codigo: "121", nombre: "BIENES DE USO", tipo: "activo", nivel: 3, padre: "12", naturaleza: "deudora", saldo: 75000, activa: true },
  { codigo: "1211", nombre: "Muebles y Enseres", tipo: "activo", nivel: 4, padre: "121", naturaleza: "deudora", saldo: 25000, activa: true },
  { codigo: "1212", nombre: "Equipos de Computación", tipo: "activo", nivel: 4, padre: "121", naturaleza: "deudora", saldo: 15000, activa: true },
  { codigo: "1213", nombre: "Vehículos", tipo: "activo", nivel: 4, padre: "121", naturaleza: "deudora", saldo: 35000, activa: true },

  // PASIVOS (2000-2999)
  { codigo: "2", nombre: "PASIVOS", tipo: "pasivo", nivel: 1, naturaleza: "acreedora", saldo: 60000, activa: true },
  { codigo: "21", nombre: "PASIVO CORRIENTE", tipo: "pasivo", nivel: 2, padre: "2", naturaleza: "acreedora", saldo: 40000, activa: true },
  { codigo: "211", nombre: "EXIGIBLE", tipo: "pasivo", nivel: 3, padre: "21", naturaleza: "acreedora", saldo: 40000, activa: true },
  { codigo: "2111", nombre: "Cuentas por Pagar", tipo: "pasivo", nivel: 4, padre: "211", naturaleza: "acreedora", saldo: 25000, activa: true },
  { codigo: "2112", nombre: "Documentos por Pagar", tipo: "pasivo", nivel: 4, padre: "211", naturaleza: "acreedora", saldo: 10000, activa: true },
  { codigo: "2113", nombre: "IVA por Pagar", tipo: "pasivo", nivel: 4, padre: "211", naturaleza: "acreedora", saldo: 5000, activa: true },
  { codigo: "2121", nombre: "Sueldos y Salarios por Pagar", tipo: "pasivo", nivel: 4, padre: "211", naturaleza: "acreedora", saldo: 0, activa: true },
  { codigo: "2113", nombre: "IVA Débito Fiscal", tipo: "pasivo", nivel: 4, padre: "211", naturaleza: "acreedora", saldo: 0, activa: true },
  { codigo: "2114", nombre: "IT por Pagar", tipo: "pasivo", nivel: 4, padre: "211", naturaleza: "acreedora", saldo: 0, activa: true },
  { codigo: "2151", nombre: "Previsiones Sociales por Pagar", tipo: "pasivo", nivel: 4, padre: "211", naturaleza: "acreedora", saldo: 0, activa: true },
  
  { codigo: "22", nombre: "PASIVO NO CORRIENTE", tipo: "pasivo", nivel: 2, padre: "2", naturaleza: "acreedora", saldo: 20000, activa: true },
  { codigo: "221", nombre: "DEUDAS A LARGO PLAZO", tipo: "pasivo", nivel: 3, padre: "22", naturaleza: "acreedora", saldo: 20000, activa: true },
  { codigo: "2211", nombre: "Préstamos Bancarios LP", tipo: "pasivo", nivel: 4, padre: "221", naturaleza: "acreedora", saldo: 20000, activa: true },

  // PATRIMONIO (3000-3999)
  { codigo: "3", nombre: "PATRIMONIO", tipo: "patrimonio", nivel: 1, naturaleza: "acreedora", saldo: 90000, activa: true },
  { codigo: "31", nombre: "CAPITAL", tipo: "patrimonio", nivel: 2, padre: "3", naturaleza: "acreedora", saldo: 80000, activa: true },
  { codigo: "311", nombre: "Capital Social", tipo: "patrimonio", nivel: 3, padre: "31", naturaleza: "acreedora", saldo: 80000, activa: true },
  { codigo: "3111", nombre: "Capital Social", tipo: "patrimonio", nivel: 4, padre: "311", naturaleza: "acreedora", saldo: 80000, activa: true },
  { codigo: "32", nombre: "RESULTADOS", tipo: "patrimonio", nivel: 2, padre: "3", naturaleza: "acreedora", saldo: 10000, activa: true },
  { codigo: "321", nombre: "Utilidades del Ejercicio", tipo: "patrimonio", nivel: 3, padre: "32", naturaleza: "acreedora", saldo: 10000, activa: true },
  { codigo: "3211", nombre: "Utilidades Acumuladas", tipo: "patrimonio", nivel: 4, padre: "321", naturaleza: "acreedora", saldo: 10000, activa: true },

  // INGRESOS (4000-4999)
  { codigo: "4", nombre: "INGRESOS", tipo: "ingresos", nivel: 1, naturaleza: "acreedora", saldo: 0, activa: true },
  { codigo: "41", nombre: "INGRESOS OPERACIONALES", tipo: "ingresos", nivel: 2, padre: "4", naturaleza: "acreedora", saldo: 0, activa: true },
  { codigo: "411", nombre: "Ventas", tipo: "ingresos", nivel: 3, padre: "41", naturaleza: "acreedora", saldo: 0, activa: true },
  { codigo: "4111", nombre: "Ventas de Productos", tipo: "ingresos", nivel: 4, padre: "411", naturaleza: "acreedora", saldo: 0, activa: true },
  { codigo: "412", nombre: "Descuentos y Bonificaciones", tipo: "ingresos", nivel: 3, padre: "41", naturaleza: "acreedora", saldo: 0, activa: true },
  { codigo: "4121", nombre: "Descuentos Obtenidos", tipo: "ingresos", nivel: 4, padre: "412", naturaleza: "acreedora", saldo: 0, activa: true },
  { codigo: "419", nombre: "Otros Ingresos", tipo: "ingresos", nivel: 3, padre: "41", naturaleza: "acreedora", saldo: 0, activa: true },
  { codigo: "4191", nombre: "Otros Ingresos Varios", tipo: "ingresos", nivel: 4, padre: "419", naturaleza: "acreedora", saldo: 0, activa: true },

  // GASTOS (5000-5999)
  { codigo: "5", nombre: "GASTOS", tipo: "gastos", nivel: 1, naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "51", nombre: "COSTO DE VENTAS", tipo: "gastos", nivel: 2, padre: "5", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "511", nombre: "Costo de Productos Vendidos", tipo: "gastos", nivel: 3, padre: "51", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5111", nombre: "Costo de Ventas", tipo: "gastos", nivel: 4, padre: "511", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "52", nombre: "GASTOS OPERACIONALES", tipo: "gastos", nivel: 2, padre: "5", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "521", nombre: "Gastos Administrativos", tipo: "gastos", nivel: 3, padre: "52", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5211", nombre: "Sueldos y Salarios", tipo: "gastos", nivel: 4, padre: "521", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5212", nombre: "Servicios Básicos", tipo: "gastos", nivel: 4, padre: "521", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5221", nombre: "Cargas Sociales", tipo: "gastos", nivel: 4, padre: "521", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5231", nombre: "Servicios Básicos", tipo: "gastos", nivel: 4, padre: "521", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "522", nombre: "Gastos de Ventas", tipo: "gastos", nivel: 3, padre: "52", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5241", nombre: "Alquileres", tipo: "gastos", nivel: 4, padre: "522", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5251", nombre: "Materiales y Suministros", tipo: "gastos", nivel: 4, padre: "522", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5261", nombre: "Combustibles y Lubricantes", tipo: "gastos", nivel: 4, padre: "522", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5271", nombre: "Mantenimiento y Reparaciones", tipo: "gastos", nivel: 4, padre: "522", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5281", nombre: "Gastos de Viaje", tipo: "gastos", nivel: 4, padre: "522", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5291", nombre: "Gastos Financieros", tipo: "gastos", nivel: 4, padre: "522", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "519", nombre: "Gastos Varios", tipo: "gastos", nivel: 3, padre: "52", naturaleza: "deudora", saldo: 0, activa: true },
  { codigo: "5191", nombre: "Gastos Generales Varios", tipo: "gastos", nivel: 4, padre: "519", naturaleza: "deudora", saldo: 0, activa: true }
];

export const inicializarPlanCuentas = () => {
  const planCuentasExistente = localStorage.getItem('planCuentas');
  if (!planCuentasExistente || JSON.parse(planCuentasExistente).length === 0) {
    localStorage.setItem('planCuentas', JSON.stringify(PLAN_CUENTAS_INICIAL));
    return PLAN_CUENTAS_INICIAL;
  }
  return JSON.parse(planCuentasExistente);
};

// Función para verificar si una cuenta existe
export const cuentaExiste = (codigo: string): boolean => {
  const planCuentas = JSON.parse(localStorage.getItem('planCuentas') || '[]');
  return planCuentas.some((cuenta: any) => cuenta.codigo === codigo);
};

// Función para obtener datos de una cuenta
export const obtenerCuenta = (codigo: string) => {
  const planCuentas = JSON.parse(localStorage.getItem('planCuentas') || '[]');
  return planCuentas.find((cuenta: any) => cuenta.codigo === codigo);
};