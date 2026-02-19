// Servicio para cumplimiento de normativas contables y tributarias bolivianas
// Actualizado a octubre 2025 según RND vigentes del SIN
export interface NormativaVigente {
  codigo: string;
  titulo: string;
  descripcion: string;
  fechaVigencia: string;
  fechaActualizacion: string;
  categoria: 'contable' | 'tributaria' | 'facturacion' | 'laboral' | 'financiera';
  estado: 'vigente' | 'derogada' | 'modificada';
  organismo: 'SIN' | 'CAMC' | 'ASFI' | 'Ministerio_Trabajo' | 'Ministerio_Economia';
  url?: string;
}

export interface RequisitosCumplimiento {
  codigo: string;
  descripcion: string;
  obligatorio: boolean;
  frecuencia: 'diaria' | 'mensual' | 'trimestral' | 'anual' | 'eventual';
  fechaLimite?: string;
  sancion?: string;
  estado: 'cumplido' | 'pendiente' | 'vencido';
}

class NormativaService {
  private normativas: NormativaVigente[] = [];
  private requisitos: RequisitosCumplimiento[] = [];

  constructor() {
    this.inicializarNormativas();
    this.inicializarRequisitos();
  }

  // Normativas actualizadas hasta enero 2026 según RND vigentes del SIN
  private inicializarNormativas(): void {
    this.normativas = [
      // === RNDs DICIEMBRE 2025 - NUEVAS ===
      {
        codigo: 'RND-102500000053',
        titulo: 'Prórroga RAU Gestión 2024',
        descripcion: 'Se prorroga hasta el 30 de enero de 2026 el plazo para la presentación de DDJJ, pago del RAU y tramitación del Certificado de No Imponibilidad RAU, correspondientes a la gestión 2024.',
        fechaVigencia: '2026-01-30',
        fechaActualizacion: '2025-12-30',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000052',
        titulo: 'Incentivos Tributarios DS 5503 - Reactivación Económica',
        descripcion: 'Reglamenta los incentivos tributarios del DS 5503: Incentivo Hecho en Bolivia (Art. 27), Depreciación Acelerada (Art. 28) y Aportes patronales como pago a cuenta del IVA (Art. 30).',
        fechaVigencia: '2025-12-17',
        fechaActualizacion: '2025-12-30',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000051',
        titulo: 'ISAE 2026 - Impuesto Salidas Aéreas',
        descripcion: 'Actualiza el monto del Impuesto a las Salidas Aéreas al Exterior (ISAE) para 2026 en Bs 464.-',
        fechaVigencia: '2026-01-01',
        fechaActualizacion: '2025-12-30',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000050',
        titulo: 'IUE Transporte Interdepartamental 2025',
        descripcion: 'Actualización de importes IUE para servicio público de transporte interdepartamental de pasajeros y carga según tipo de vehículo.',
        fechaVigencia: '2025-12-01',
        fechaActualizacion: '2025-12-30',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000049',
        titulo: 'ICE Alícuotas 2026',
        descripcion: 'Actualización de alícuotas específicas de productos gravados por el Impuesto a los Consumos Específicos (ICE) para gestión 2026.',
        fechaVigencia: '2026-01-01',
        fechaActualizacion: '2025-12-30',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000047',
        titulo: 'IEHD Alícuota Máxima 2026',
        descripcion: 'Actualiza la alícuota máxima del IEHD a Bs 10,40.- aplicable desde el 1 de enero de 2026.',
        fechaVigencia: '2026-01-01',
        fechaActualizacion: '2025-12-30',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000043',
        titulo: 'Procedimientos Declaraciones Juradas',
        descripcion: 'Modifica la RND Nº 10-0024-08 del reglamento de procedimientos especiales para control de presentación de declaraciones juradas.',
        fechaVigencia: '2025-11-01',
        fechaActualizacion: '2025-11-20',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000042',
        titulo: 'Homologación de Productos RNC',
        descripcion: 'Prórroga hasta el 27 de febrero de 2026 para que contribuyentes IVA realicen la homologación de productos con actividades económicas del RNC.',
        fechaVigencia: '2026-02-27',
        fechaActualizacion: '2025-11-15',
        categoria: 'facturacion',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000041',
        titulo: 'Anulación Extraordinaria Documentos Fiscales',
        descripcion: 'Modifica Art. 38 de RND 102100000011. Anulación de documentos fiscales fuera de plazo mediante nota escrita. Regularización de facturas duplicadas hasta 30/01/2026.',
        fechaVigencia: '2026-01-30',
        fechaActualizacion: '2025-11-10',
        categoria: 'facturacion',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000040',
        titulo: 'Formulario 146 - Distribución Crédito CF IVA Petroleras',
        descripcion: 'Aprueba el Formulario 146 del Módulo Distribución de Crédito del SIAT para distribución del Crédito Fiscal IVA de empresas petroleras.',
        fechaVigencia: '2025-11-01',
        fechaActualizacion: '2025-11-05',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000036',
        titulo: 'Prórroga Facturación en Línea - Grupos 9º al 12º',
        descripcion: 'Amplía hasta el 31 de marzo de 2026 el plazo para que contribuyentes de los Grupos Noveno al Décimo Segundo ajusten sus sistemas a facturación en línea. A partir del 1 de abril de 2026 deben usar exclusivamente facturación en línea.',
        fechaVigencia: '2026-03-31',
        fechaActualizacion: '2025-10-01',
        categoria: 'facturacion',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000027',
        titulo: 'Control de Existencias y Producción ICE (CEP)',
        descripcion: 'Implementa el módulo CEP en SIAT para presentación obligatoria de DDJJ 650, 651 y 652 para contribuyentes ICE que comercialicen jugos, aguas, cervezas, vinos, licores, alcohol etílico, cigarrillos y productos con nicotina.',
        fechaVigencia: '2025-06-06',
        fechaActualizacion: '2025-06-10',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000019',
        titulo: 'Facilidades de Pago - Nuevo Reglamento',
        descripcion: 'Nuevo reglamento para solicitud, autorización y seguimiento de facilidades de pago en SIAT. Plazos hasta 30 meses, pago inicial desde 5%, garantías y condiciones de incumplimiento.',
        fechaVigencia: '2025-05-05',
        fechaActualizacion: '2025-04-25',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000018',
        titulo: 'Nuevo Clasificador de Actividades Económicas (CAEB-SIN)',
        descripcion: 'Aprueba el nuevo Clasificador de Actividades Económicas del RNC, armonizado con CAEB del INE. Contribuyentes deben actualizar sistemas antes del 31/10/2025.',
        fechaVigencia: '2025-05-05',
        fechaActualizacion: '2025-04-22',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000017',
        titulo: 'Registro Nacional de Contribuyentes (RNC)',
        descripcion: 'Crea el nuevo RNC que regula inscripción, modificación, suspensión y baja del NIT mediante SIAT en Línea. Sustituye el PBD-11.',
        fechaVigencia: '2025-05-05',
        fechaActualizacion: '2025-04-15',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000016',
        titulo: 'Declaraciones Juradas Electrónicas SIAT',
        descripcion: 'Desde mayo 2025, todas las DDJJ deben presentarse mediante SIAT en Línea. Formularios electrónicos obligatorios y legalmente válidos.',
        fechaVigencia: '2025-05-01',
        fechaActualizacion: '2025-04-15',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000014',
        titulo: 'Reglamento Declaraciones Rectificatorias',
        descripcion: 'Reglamenta el procedimiento para presentación de DDJJ Rectificatorias a iniciativa del contribuyente o por requerimiento de la Administración Tributaria.',
        fechaVigencia: '2025-05-05',
        fechaActualizacion: '2025-04-10',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000013',
        titulo: 'Tratamiento de Decimales SIAT',
        descripcion: 'Establece el cálculo con todos los decimales y redondeo a 2 decimales (criterio estándar). Deuda Tributaria se expresa con 5 decimales.',
        fechaVigencia: '2025-05-05',
        fechaActualizacion: '2025-04-10',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000005',
        titulo: 'Registro de Beneficiarios Finales',
        descripcion: 'Personas jurídicas deben registrar información de beneficiarios finales. Inscriptos deben actualizar datos antes del 29/04/2025.',
        fechaVigencia: '2025-04-29',
        fechaActualizacion: '2025-02-15',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000002',
        titulo: 'Beneficio IVA Tasa Cero 2025',
        descripcion: 'Procedimiento de facturación Tasa Cero IVA para venta interna de bienes de capital y plantas industriales para sectores agropecuario, industrial, construcción y minería según Ley 1613.',
        fechaVigencia: '2025-01-01',
        fechaActualizacion: '2025-01-15',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102500000001',
        titulo: 'Reanudación Facilidades de Pago Incumplidas',
        descripcion: 'Permite reanudar facilidades de pago incumplidas hasta 31/12/2024, manteniendo condiciones y beneficios, si se reanuda pago hasta el 31/03/2025.',
        fechaVigencia: '2025-03-31',
        fechaActualizacion: '2025-01-05',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RND-102400000021',
        titulo: 'Requisitos de Bancarización 2025',
        descripcion: 'Requisitos de bancarización para transacciones comerciales y tributarias. Rechazo de gastos y costos no bancarizados.',
        fechaVigencia: '2025-01-01',
        fechaActualizacion: '2024-12-20',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      // === TASAS E INDICADORES VIGENTES 2026 ===
      {
        codigo: 'IVA-TASA-2026',
        titulo: 'Tasa IVA 13% - Vigente 2026',
        descripcion: 'Tasa general del Impuesto al Valor Agregado: 13% aplicable a todas las transacciones gravadas',
        fechaVigencia: '2026-01-01',
        fechaActualizacion: '2026-01-01',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'IT-TASA-2026',
        titulo: 'Tasa IT 3% - Vigente 2026',
        descripcion: 'Tasa del Impuesto a las Transacciones: 3% sobre ingresos brutos',
        fechaVigencia: '2026-01-01',
        fechaActualizacion: '2026-01-01',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'IUE-TASA-2026',
        titulo: 'Tasa IUE 25% - Vigente 2026',
        descripcion: 'Tasa del Impuesto sobre las Utilidades de las Empresas: 25% sobre utilidades netas',
        fechaVigencia: '2026-01-01',
        fechaActualizacion: '2026-01-01',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RC-IVA-2026',
        titulo: 'RC-IVA Actualizado 2026',
        descripcion: 'Retenciones de RC-IVA: 13% para profesionales independientes, servicios y alquileres',
        fechaVigencia: '2026-01-01',
        fechaActualizacion: '2026-01-01',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'RC-IT-2026',
        titulo: 'RC-IT Actualizado 2026',
        descripcion: 'Retenciones de RC-IT: 3% sobre ingresos de profesionales independientes y alquileres',
        fechaVigencia: '2026-01-01',
        fechaActualizacion: '2026-01-01',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      },
      {
        codigo: 'DS-5503',
        titulo: 'Decreto Supremo 5503 - Reactivación Económica',
        descripcion: 'Medidas excepcionales: Incentivo Hecho en Bolivia (Art.27), Depreciación Acelerada (Art.28), Aportes patronales como pago a cuenta IVA (Art.30), libre negociación salarial, incremento SMN. Vigente desde 17/12/2025.',
        fechaVigencia: '2025-12-17',
        fechaActualizacion: '2025-12-17',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'Ministerio_Economia'
      },
      {
        codigo: 'LEY-1613',
        titulo: 'Ley Presupuesto General del Estado 2025',
        descripcion: 'Ley del Presupuesto General del Estado para la gestión 2025. Incluye IVA Tasa Cero para sectores productivos.',
        fechaVigencia: '2025-01-01',
        fechaActualizacion: '2025-01-01',
        categoria: 'financiera',
        estado: 'vigente',
        organismo: 'Ministerio_Economia'
      },
      {
        codigo: 'SALARIO-MINIMO-2026',
        titulo: 'Salario Mínimo Nacional 2026 - DS 5503',
        descripcion: 'DS 5503 Art. 25: SMN incrementado a Bs 2.500 (estimado). Libre negociación salarial entre empleadores y trabajadores. Incremento mínimo 3% sobre salario básico.',
        fechaVigencia: '2026-01-01',
        fechaActualizacion: '2025-12-17',
        categoria: 'laboral',
        estado: 'vigente',
        organismo: 'Ministerio_Trabajo'
      },
      {
        codigo: 'UFV-2026',
        titulo: 'Unidad de Fomento de Vivienda 2026',
        descripcion: 'UFV actualizada diariamente por el BCB. Valor aproximado enero 2026: 3.05 Bs',
        fechaVigencia: '2026-01-01',
        fechaActualizacion: '2026-01-09',
        categoria: 'financiera',
        estado: 'vigente',
        organismo: 'Ministerio_Economia'
      },
      {
        codigo: 'TC-USD-2026',
        titulo: 'Tipo de Cambio USD 2026',
        descripcion: 'Tipo de cambio oficial USD/BOB: 6.96 Bs por dólar estadounidense',
        fechaVigencia: '2026-01-01',
        fechaActualizacion: '2026-01-09',
        categoria: 'financiera',
        estado: 'vigente',
        organismo: 'Ministerio_Economia'
      },
      {
        codigo: 'LEY-317',
        titulo: 'Código Tributario Boliviano',
        descripcion: 'Normas fundamentales del régimen jurídico del sistema tributario boliviano',
        fechaVigencia: '2012-12-11',
        fechaActualizacion: '2026-01-01',
        categoria: 'tributaria',
        estado: 'vigente',
        organismo: 'SIN'
      }
    ];
  }

  private inicializarRequisitos(): void {
    const hoy = new Date();
    const proximoMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 20);
    const proximoTrimestre = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 31);
    
    this.requisitos = [
      {
        codigo: 'IVA-MENSUAL',
        descripcion: 'Declaración y pago de IVA mensual (Formulario 200) - SIAT en Línea',
        obligatorio: true,
        frecuencia: 'mensual',
        fechaLimite: proximoMes.toISOString().slice(0, 10),
        sancion: 'Multa del 10% más intereses por mora',
        estado: 'pendiente'
      },
      {
        codigo: 'IT-MENSUAL',
        descripcion: 'Declaración y pago de IT mensual (Formulario 401) - SIAT en Línea',
        obligatorio: true,
        frecuencia: 'mensual',
        fechaLimite: proximoMes.toISOString().slice(0, 10),
        sancion: 'Multa del 10% más intereses por mora',
        estado: 'pendiente'
      },
      {
        codigo: 'RC-IVA-MENSUAL',
        descripcion: 'Declaración de retenciones RC-IVA (Formulario 110) - SIAT en Línea',
        obligatorio: true,
        frecuencia: 'mensual',
        fechaLimite: proximoMes.toISOString().slice(0, 10),
        sancion: 'Multa del 20% más intereses por mora',
        estado: 'pendiente'
      },
      {
        codigo: 'RC-IT-MENSUAL',
        descripcion: 'Declaración de retenciones RC-IT (Formulario 610) - SIAT en Línea',
        obligatorio: true,
        frecuencia: 'mensual',
        fechaLimite: proximoMes.toISOString().slice(0, 10),
        sancion: 'Multa del 20% más intereses por mora',
        estado: 'pendiente'
      },
      {
        codigo: 'IUE-TRIMESTRAL',
        descripcion: 'Declaración jurada trimestral IUE (Formulario 500) - SIAT en Línea',
        obligatorio: true,
        frecuencia: 'trimestral',
        fechaLimite: proximoTrimestre.toISOString().slice(0, 10),
        sancion: 'Multa del 15% más intereses por mora',
        estado: 'pendiente'
      },
      {
        codigo: 'ESTADOS-FINANCIEROS-2026',
        descripcion: 'Presentación de Estados Financieros, Memoria Anual, Dictámenes y Formularios 605/601 para cierre 31/12/2025',
        obligatorio: true,
        frecuencia: 'anual',
        fechaLimite: '2026-04-29',
        sancion: 'Multa progresiva según días de atraso',
        estado: 'pendiente'
      },
      {
        codigo: 'BENEFICIARIO-FINAL-2026',
        descripcion: 'Registro/actualización de Beneficiarios Finales para personas jurídicas (RND 102500000005)',
        obligatorio: true,
        frecuencia: 'anual',
        fechaLimite: '2026-04-29',
        sancion: 'Multa y suspensión de actividades',
        estado: 'pendiente'
      },
      {
        codigo: 'BANCARIZACION-2026',
        descripcion: 'Declaración mensual de transacciones bancarizadas (RND 102400000021) - SIAT en Línea',
        obligatorio: true,
        frecuencia: 'mensual',
        sancion: 'Rechazo de gastos y costos no bancarizados',
        estado: 'pendiente'
      },
      {
        codigo: 'HOMOLOGACION-PRODUCTOS-RNC',
        descripcion: 'Homologación de productos con actividades económicas del RNC (RND 102500000042)',
        obligatorio: true,
        frecuencia: 'eventual',
        fechaLimite: '2026-02-27',
        sancion: 'Inconsistencias en facturación',
        estado: 'pendiente'
      },
      {
        codigo: 'FACTURACION-ELECTRONICA-GRUPOS-9-12',
        descripcion: 'Migración a facturación en línea para Grupos 9º al 12º (RND 102500000036)',
        obligatorio: true,
        frecuencia: 'eventual',
        fechaLimite: '2026-03-31',
        sancion: 'Suspensión de actividades desde 01/04/2026',
        estado: 'pendiente'
      },
      {
        codigo: 'CEP-ICE',
        descripcion: 'Control de Existencias y Producción para contribuyentes ICE - Formularios 650, 651, 652 (RND 102500000027)',
        obligatorio: true,
        frecuencia: 'mensual',
        sancion: 'Multa y cierre temporal',
        estado: 'pendiente'
      },
      {
        codigo: 'RAU-2024',
        descripcion: 'DDJJ y pago del Régimen Agropecuario Unificado gestión 2024 (RND 102500000053)',
        obligatorio: true,
        frecuencia: 'anual',
        fechaLimite: '2026-01-30',
        sancion: 'Multa y recargos',
        estado: 'pendiente'
      },
      {
        codigo: 'ACTUALIZACION-RNC',
        descripcion: 'Actualización de datos en Registro Nacional de Contribuyentes (RND 102500000017)',
        obligatorio: true,
        frecuencia: 'anual',
        sancion: 'Multa fija y suspensión temporal',
        estado: 'pendiente'
      },
      {
        codigo: 'LIBROS-CONTABLES',
        descripcion: 'Presentación y legalización de libros contables obligatorios',
        obligatorio: true,
        frecuencia: 'anual',
        fechaLimite: '2025-03-31',
        sancion: 'Multa progresiva según días de atraso',
        estado: 'pendiente'
      }
    ];
  }

  // Obtener normativas vigentes
  getNormativasVigentes(categoria?: string): NormativaVigente[] {
    let normativas = this.normativas.filter(n => n.estado === 'vigente');
    if (categoria) {
      normativas = normativas.filter(n => n.categoria === categoria);
    }
    return normativas.sort((a, b) => new Date(b.fechaActualizacion).getTime() - new Date(a.fechaActualizacion).getTime());
  }

  // Obtener requisitos de cumplimiento
  getRequisitosCumplimiento(estado?: string): RequisitosCumplimiento[] {
    let requisitos = this.requisitos;
    if (estado) {
      requisitos = requisitos.filter(r => r.estado === estado);
    }
    return requisitos.sort((a, b) => {
      if (!a.fechaLimite) return 1;
      if (!b.fechaLimite) return -1;
      return new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime();
    });
  }

  // Verificar cumplimiento específico
  verificarCumplimiento(codigo: string): RequisitosCumplimiento | null {
    return this.requisitos.find(r => r.codigo === codigo) || null;
  }

  // Calcular días hasta vencimiento
  getDiasHastaVencimiento(fechaLimite: string): number {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    return Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
  }

  // Obtener alertas de vencimiento
  getAlertasVencimiento(): RequisitosCumplimiento[] {
    const hoy = new Date();
    return this.requisitos.filter(r => {
      if (!r.fechaLimite || r.estado === 'cumplido') return false;
      const dias = this.getDiasHastaVencimiento(r.fechaLimite);
      return dias <= 15; // Alertar 15 días antes
    });
  }

  // Marcar requisito como cumplido
  marcarComoCumplido(codigo: string): void {
    const index = this.requisitos.findIndex(r => r.codigo === codigo);
    if (index !== -1) {
      this.requisitos[index].estado = 'cumplido';
    }
  }

  // Obtener resumen de cumplimiento
  getResumenCumplimiento(): {
    total: number;
    cumplidos: number;
    pendientes: number;
    vencidos: number;
    porcentajeCumplimiento: number;
  } {
    const total = this.requisitos.length;
    const cumplidos = this.requisitos.filter(r => r.estado === 'cumplido').length;
    const vencidos = this.requisitos.filter(r => {
      if (!r.fechaLimite || r.estado === 'cumplido') return false;
      return this.getDiasHastaVencimiento(r.fechaLimite) < 0;
    }).length;
    const pendientes = total - cumplidos - vencidos;

    return {
      total,
      cumplidos,
      pendientes,
      vencidos,
      porcentajeCumplimiento: Math.round((cumplidos / total) * 100)
    };
  }

  // Validar formato de documentos según normativa
  validarFormatoDocumento(tipo: string, datos: any): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    switch (tipo) {
      case 'factura':
        if (!datos.numeroFactura) errores.push('Número de factura requerido');
        if (!datos.nitCliente) errores.push('NIT del cliente requerido');
        if (!datos.cuf) errores.push('CUF (Código Único de Facturación) requerido');
        if (!datos.cufd) errores.push('CUFD (Código Único de Facturación Diaria) requerido');
        break;
      
      case 'asiento':
        if (!datos.fecha) errores.push('Fecha del asiento requerida');
        if (!datos.glosa) errores.push('Glosa del asiento requerida');
        if (!datos.movimientos || datos.movimientos.length === 0) {
          errores.push('Debe incluir al menos un movimiento');
        }
        break;

      case 'estado_financiero':
        if (!datos.periodo) errores.push('Período del estado financiero requerido');
        if (!datos.moneda) errores.push('Moneda de presentación requerida');
        break;
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  // Obtener códigos de actividad económica CAEB-SIN 2025 actualizados
  getActividadesEconomicas(): Array<{ codigo: string; descripcion: string; sector: string }> {
    // Actualizado según RND 102500000018 - Vigente desde mayo 2025
    return [
      { codigo: '620100', descripcion: 'Programación informática y actividades relacionadas', sector: 'Servicios tecnológicos' },
      { codigo: '620200', descripcion: 'Consultoría informática y gestión de instalaciones', sector: 'Servicios tecnológicos' },
      { codigo: '631100', descripcion: 'Procesamiento de datos y hospedaje', sector: 'Servicios tecnológicos' },
      { codigo: '192000', descripcion: 'Fabricación de productos de refinación del petróleo', sector: 'Combustibles' },
      { codigo: '351100', descripcion: 'Generación de energía eléctrica', sector: 'Energía' },
      { codigo: '461000', descripcion: 'Venta al por mayor a comisión o por contrata', sector: 'Comercio' },
      { codigo: '471100', descripcion: 'Venta al por menor en comercios no especializados', sector: 'Comercio' },
      { codigo: '471900', descripcion: 'Venta al por menor de otros productos en comercios no especializados', sector: 'Comercio' },
      { codigo: '682000', descripcion: 'Actividades inmobiliarias por retribución o contrata', sector: 'Inmobiliario' },
      { codigo: '691100', descripcion: 'Actividades jurídicas', sector: 'Servicios profesionales' },
      { codigo: '692000', descripcion: 'Actividades de contabilidad, auditoría y consultoría fiscal', sector: 'Servicios profesionales' },
      { codigo: '702000', descripcion: 'Actividades de consultoría de gestión', sector: 'Servicios profesionales' },
      { codigo: '711000', descripcion: 'Actividades de arquitectura e ingeniería', sector: 'Servicios profesionales' },
      { codigo: '561010', descripcion: 'Actividades de restaurantes', sector: 'Alimentos y bebidas' },
      { codigo: '563000', descripcion: 'Actividades de servicio de bebidas', sector: 'Alimentos y bebidas' }
    ];
  }
}

export const normativaService = new NormativaService();
export default normativaService;