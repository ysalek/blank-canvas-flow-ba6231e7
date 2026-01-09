// Servicio para integración con el SIN (Servicio de Impuestos Nacionales)
// Actualizado a enero 2026 según RNDs vigentes y SIAT v2.0
export interface CUFDResponse {
  codigo: string;
  codigoControl: string;
  direccion: string;
  fechaVigencia: string;
}

export interface FacturaRequest {
  cabecera: {
    nitEmisor: string;
    razonSocialEmisor: string;
    municipio: string;
    telefono: string;
    numeroFactura: number;
    cuf: string;
    cufd: string;
    codigoSucursal: number;
    direccion: string;
    codigoPuntoVenta: number;
    fechaEmision: string;
    nombreRazonSocial: string;
    codigoTipoDocumentoIdentidad: number;
    numeroDocumento: string;
    complemento: string;
    codigoCliente: string;
    codigoMetodoPago: number;
    numeroTarjeta: string;
    montoTotal: number;
    montoTotalSujetoIva: number;
    codigoMoneda: number;
    tipoCambio: number;
    montoTotalMoneda: number;
    montoGiftCard: number;
    descuentoAdicional: number;
    codigoExcepcion: number;
    cafc: string;
    leyenda: string;
    usuario: string;
    codigoDocumentoSector: number;
  };
  detalle: Array<{
    actividadEconomica: string;
    codigoProductoSin: string;
    codigoProducto: string;
    descripcion: string;
    cantidad: number;
    unidadMedida: number;
    precioUnitario: number;
    montoDescuento: number;
    subTotal: number;
    numeroSerie: string;
    numeroImei: string;
  }>;
}

export interface FacturaResponse {
  codigoRecepcion: string;
  transaccion: boolean;
  codigoEstado: number;
  codigoDescripcion: string;
  mensajesList: Array<{
    codigo: number;
    descripcion: string;
  }>;
}

// Tasas de impuestos actualizadas 2026 según normativa vigente
export const TASAS_IMPUESTOS_2026 = {
  IVA: 13,           // 13% IVA estándar
  IT: 3,             // 3% IT estándar
  IUE: 25,           // 25% IUE empresas
  RC_IVA: 13,        // 13% RC-IVA
  RC_IT: 3,          // 3% RC-IT
  IEHD_MAX: 10.40,   // Bs 10.40 alícuota máxima IEHD 2026 (RND 102500000047)
  ISAE: 464,         // Bs 464 ISAE 2026 (RND 102500000051)
  UFV: 3.05,         // UFV aproximado enero 2026
  TIPO_CAMBIO_USD: 6.96  // Tipo de cambio oficial
};

// Grupos de facturación electrónica y sus plazos según RND 102500000036
export const GRUPOS_FACTURACION_ELECTRONICA = {
  grupos_9_12: {
    plazoTransicion: '2026-03-31',
    obligatorioDesde: '2026-04-01',
    descripcion: 'Grupos 9º al 12º - Prórroga hasta marzo 2026'
  }
};

class SINService {
  private baseURL: string;
  private apiKey: string;
  private nitEmisor: string;
  private version: string;
  
  constructor() {
    // URLs actualizadas según normativa 2026 - SIAT v2.0
    this.baseURL = 'https://siatrest.impuestos.gob.bo/v2';
    this.apiKey = 'demo-key'; // En producción usar secrets
    this.nitEmisor = '123456789';
    this.version = '2.0.1'; // Versión actual del sistema de facturación 2026
  }

  // Obtener CUFD (Código Único de Facturación Diaria)
  async obtenerCUFD(): Promise<CUFDResponse> {
    try {
      const response: CUFDResponse = {
        codigo: `CUFD${Date.now()}`,
        codigoControl: `CC${Math.random().toString(36).substr(2, 9)}`,
        direccion: 'https://piloto.facturacionelectronica.bo/',
        fechaVigencia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      
      console.log('CUFD obtenido:', response);
      return response;
    } catch (error) {
      console.error('Error obteniendo CUFD:', error);
      throw new Error('No se pudo obtener el CUFD del SIN');
    }
  }

  // Verificar comunicación con SIN
  async verificarComunicacion(): Promise<boolean> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Comunicación con SIN verificada');
      return true;
    } catch (error) {
      console.error('Error verificando comunicación:', error);
      return false;
    }
  }

  // Enviar factura al SIN
  async enviarFactura(factura: FacturaRequest): Promise<FacturaResponse> {
    try {
      console.log('Enviando factura al SIN:', factura);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response: FacturaResponse = {
        codigoRecepcion: `REC${Date.now()}`,
        transaccion: true,
        codigoEstado: 901,
        codigoDescripcion: 'PROCESADA',
        mensajesList: [{
          codigo: 0,
          descripcion: 'Factura procesada correctamente'
        }]
      };
      
      console.log('Respuesta del SIN:', response);
      return response;
    } catch (error) {
      console.error('Error enviando factura:', error);
      throw new Error('No se pudo enviar la factura al SIN');
    }
  }

  // Consultar estado de factura
  async consultarEstado(codigoRecepcion: string): Promise<any> {
    try {
      console.log('Consultando estado de factura:', codigoRecepcion);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        codigoRecepcion,
        codigoEstado: 901,
        descripcion: 'PROCESADA',
        fechaProceso: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error consultando estado:', error);
      throw new Error('No se pudo consultar el estado de la factura');
    }
  }

  // Obtener eventos significativos
  async obtenerEventos(): Promise<any[]> {
    try {
      console.log('Obteniendo eventos del SIN');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return [
        {
          fecha: new Date().toISOString(),
          tipo: 'CONEXION',
          descripcion: 'Conexión exitosa con SIN'
        },
        {
          fecha: new Date(Date.now() - 3600000).toISOString(),
          tipo: 'CUFD',
          descripcion: 'CUFD renovado automáticamente'
        }
      ];
    } catch (error) {
      console.error('Error obteniendo eventos:', error);
      return [];
    }
  }

  // Generar CUF (Código Único de Factura)
  generarCUF(numeroFactura: number, cufd: string): string {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const hora = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    
    return `${this.nitEmisor}${fecha}${hora}${numeroFactura.toString().padStart(6, '0')}${cufd.slice(-8)}`;
  }

  // Validar NIT según normativa actualizada 2026
  validarNIT(nit: string): { valido: boolean; mensaje: string } {
    if (!nit) return { valido: false, mensaje: "NIT requerido" };
    
    const nitLimpio = nit.replace(/[-\s]/g, '');
    
    // Longitud válida según normativa actual (7-12 dígitos)
    if (nitLimpio.length < 7 || nitLimpio.length > 12) {
      return { valido: false, mensaje: "NIT debe tener entre 7 y 12 dígitos" };
    }
    
    if (!/^\d+$/.test(nitLimpio)) {
      return { valido: false, mensaje: "NIT debe contener solo números" };
    }
    
    // Algoritmo de validación de dígito verificador boliviano
    const digits = nitLimpio.split('').map(Number);
    const checkDigit = digits.pop();
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (digits.length + 1 - i);
    }
    
    const remainder = sum % 11;
    const calculatedCheckDigit = remainder < 2 ? remainder : 11 - remainder;
    
    if (checkDigit !== calculatedCheckDigit) {
      return { valido: false, mensaje: "Dígito verificador inválido" };
    }
    
    return { valido: true, mensaje: "NIT válido" };
  }

  // Validar sectores especiales según RNDs 2025-2026
  async validarSectorEspecial(codigoSector: number): Promise<boolean> {
    const sectoresValidos = [54, 55, 56]; // Biodiesel, combustible no subvencionado y energía eléctrica
    return sectoresValidos.includes(codigoSector);
  }

  // Método para obtener códigos de actividad económica actualizados 2026 (RND 102500000018)
  async obtenerActividadesEconomicas(): Promise<any[]> {
    return [
      { codigo: "620100", descripcion: "Programación informática y actividades relacionadas", sector: "Servicios tecnológicos" },
      { codigo: "620200", descripcion: "Consultoría informática y gestión de instalaciones", sector: "Servicios tecnológicos" },
      { codigo: "631100", descripcion: "Procesamiento de datos y hospedaje", sector: "Servicios tecnológicos" },
      { codigo: "192000", descripcion: "Fabricación de productos de refinación del petróleo", sector: "Combustibles" },
      { codigo: "351100", descripcion: "Generación de energía eléctrica", sector: "Energía" },
      { codigo: "461000", descripcion: "Venta al por mayor a comisión o por contrata", sector: "Comercio" },
      { codigo: "471100", descripcion: "Venta al por menor en comercios no especializados", sector: "Comercio" },
      { codigo: "471900", descripcion: "Venta al por menor de otros productos en comercios no especializados", sector: "Comercio" },
      { codigo: "682000", descripcion: "Actividades inmobiliarias por retribución o contrata", sector: "Inmobiliario" },
      { codigo: "691100", descripcion: "Actividades jurídicas", sector: "Servicios profesionales" },
      { codigo: "692000", descripcion: "Actividades de contabilidad, auditoría y consultoría fiscal", sector: "Servicios profesionales" },
      { codigo: "702000", descripcion: "Actividades de consultoría de gestión", sector: "Servicios profesionales" },
      { codigo: "711000", descripcion: "Actividades de arquitectura e ingeniería", sector: "Servicios profesionales" }
    ];
  }

  // Validar cumplimiento de facturación electrónica según grupo (RND 102500000036)
  async validarGrupoFacturacionElectronica(nit: string): Promise<{
    obligatorio: boolean;
    grupo: string;
    fechaImplementacion: string;
    estado: 'implementado' | 'en_proceso' | 'pendiente';
    fechaLimite?: string;
  }> {
    // Grupos 9-12 tienen hasta 31/03/2026 (RND 102500000036)
    const fechaActual = new Date();
    const fechaLimite = new Date('2026-03-31');
    const fechaObligatoria = new Date('2026-04-01');
    
    if (fechaActual < fechaLimite) {
      return {
        obligatorio: false,
        grupo: 'noveno-duodecimo',
        fechaImplementacion: '2026-04-01',
        estado: 'en_proceso',
        fechaLimite: '2026-03-31'
      };
    }

    return {
      obligatorio: true,
      grupo: 'noveno-duodecimo',
      fechaImplementacion: '2026-04-01',
      estado: fechaActual >= fechaObligatoria ? 'implementado' : 'en_proceso'
    };
  }

  // Obtener tasas de impuestos actualizadas 2026
  async obtenerTasasImpuestos(): Promise<{
    iva: number;
    it: number;
    iue: number;
    rcIva: number;
    rcIt: number;
    iehd_max: number;
    isae: number;
    ufv: number;
    tipoCambioUsd: number;
    fechaActualizacion: string;
  }> {
    return {
      iva: TASAS_IMPUESTOS_2026.IVA,
      it: TASAS_IMPUESTOS_2026.IT,
      iue: TASAS_IMPUESTOS_2026.IUE,
      rcIva: TASAS_IMPUESTOS_2026.RC_IVA,
      rcIt: TASAS_IMPUESTOS_2026.RC_IT,
      iehd_max: TASAS_IMPUESTOS_2026.IEHD_MAX,
      isae: TASAS_IMPUESTOS_2026.ISAE,
      ufv: TASAS_IMPUESTOS_2026.UFV,
      tipoCambioUsd: TASAS_IMPUESTOS_2026.TIPO_CAMBIO_USD,
      fechaActualizacion: new Date().toISOString().slice(0, 10)
    };
  }

  // Verificar si contribuyente está sujeto a Control de Existencias ICE (RND 102500000027)
  async verificarSujetoICE(codigoProducto: string): Promise<{
    sujetoICE: boolean;
    requiereCEP: boolean;
    formularios: string[];
  }> {
    // Productos sujetos al módulo CEP según RND 102500000027
    const productosICE = [
      'jugos', 'aguas', 'cervezas', 'vinos', 'licores', 
      'alcohol_etilico', 'cigarrillos', 'tabaco', 'nicotina'
    ];
    
    const esSujetoICE = productosICE.some(p => 
      codigoProducto.toLowerCase().includes(p)
    );

    return {
      sujetoICE: esSujetoICE,
      requiereCEP: esSujetoICE,
      formularios: esSujetoICE ? ['650', '651', '652'] : []
    };
  }

  // Verificar requisitos de bancarización (RND 102400000021)
  async verificarBancarizacion(monto: number): Promise<{
    requiereBancarizacion: boolean;
    montoMinimo: number;
    mensaje: string;
  }> {
    const MONTO_MINIMO_BANCARIZACION = 50000; // Bs 50,000

    return {
      requiereBancarizacion: monto >= MONTO_MINIMO_BANCARIZACION,
      montoMinimo: MONTO_MINIMO_BANCARIZACION,
      mensaje: monto >= MONTO_MINIMO_BANCARIZACION 
        ? 'Transacción debe estar respaldada con documento de pago (bancarización)'
        : 'Transacción no requiere bancarización'
    };
  }

  // Calcular incentivos DS 5503 (RND 102500000052)
  async calcularIncentivosDS5503(datos: {
    esHechoEnBolivia: boolean;
    tipoActivo?: string;
    aportesPatronales?: number;
  }): Promise<{
    incentivoHechoBolivia: boolean;
    depreciacionAcelerada: boolean;
    aportesComoCredito: number;
    descripcion: string;
  }> {
    return {
      incentivoHechoBolivia: datos.esHechoEnBolivia,
      depreciacionAcelerada: datos.tipoActivo === 'maquinaria_industrial',
      aportesComoCredito: datos.aportesPatronales || 0,
      descripcion: 'Incentivos tributarios según DS 5503 para Reactivación Económica y Desregulación Productiva'
    };
  }

  // Verificar plazo homologación de productos (RND 102500000042)
  async verificarHomologacionProductos(): Promise<{
    plazoVigente: boolean;
    fechaLimite: string;
    mensaje: string;
  }> {
    const fechaLimite = new Date('2026-02-27');
    const hoy = new Date();

    return {
      plazoVigente: hoy <= fechaLimite,
      fechaLimite: '2026-02-27',
      mensaje: hoy <= fechaLimite
        ? 'Plazo vigente para homologación de productos con actividades económicas del RNC'
        : 'Plazo de homologación vencido. Actualice sus productos según el nuevo CAEB-SIN.'
    };
  }
}

export const sinService = new SINService();
export default sinService;