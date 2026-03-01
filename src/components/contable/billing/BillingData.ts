export interface Cliente {
  id: string;
  nombre: string;
  nit: string;
  email: string;
  telefono: string;
  direccion: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface ItemFactura {
  id: string;
  productoId: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  codigoSIN: string;
}

export interface Factura {
  id: string;
  numero: string;
  cliente: Cliente;
  fecha: string;
  fechaVencimiento: string;
  items: ItemFactura[];
  subtotal: number;
  descuentoTotal: number;
  iva: number;
  total: number;
  estado: 'borrador' | 'enviada' | 'pagada' | 'anulada';
  estadoSIN: 'pendiente' | 'aceptado' | 'rechazado';
  cuf: string;
  cufd: string;
  puntoVenta: number;
  codigoControl: string;
  observaciones: string;
  fechaCreacion: string;
}

export interface PuntoVenta {
  codigo: number;
  nombre: string;
}

export const puntosVenta: PuntoVenta[] = [
  { codigo: 0, nombre: "Oficina Central Santa Cruz" },
  { codigo: 1, nombre: "Sucursal La Paz" },
];

export const obtenerCUFD = (codigoPuntoVenta: number): string => {
  const hoy = new Date();
  const seed = hoy.getFullYear() * 10000 + (hoy.getMonth() + 1) * 100 + hoy.getDate() + codigoPuntoVenta;
  let random = Math.sin(seed) * 10000;
  random = random - Math.floor(random);
  const datePart = hoy.toISOString().slice(0, 10).replace(/-/g, "");
  return `CUFD_${datePart}_${random.toString(16).slice(2, 12)}`.toUpperCase();
};

export const clientesIniciales: Cliente[] = [
  {
    id: "1",
    nombre: "Empresa ABC S.R.L.",
    nit: "1234567890",
    email: "contacto@empresaabc.com",
    telefono: "77123456",
    direccion: "Av. Principal 123, Santa Cruz",
    activo: true,
    fechaCreacion: "2024-01-15"
  },
  {
    id: "2",
    nombre: "Comercial XYZ Ltda.",
    nit: "0987654321",
    email: "ventas@comercialxyz.com",
    telefono: "77654321",
    direccion: "Calle Secundaria 456, La Paz",
    activo: true,
    fechaCreacion: "2024-02-20"
  },
  {
    id: "3",
    nombre: "Servicios Integrales 123",
    nit: "5555666677",
    email: "info@servicios123.com",
    telefono: "77999888",
    direccion: "Zona Norte 789, Cochabamba",
    activo: true,
    fechaCreacion: "2024-03-10"
  }
];

export const facturasIniciales: Factura[] = [
  {
    id: "1",
    numero: "001234",
    cliente: clientesIniciales[0],
    fecha: "2024-06-15",
    fechaVencimiento: "2024-07-15",
    items: [
      {
        id: "1",
        productoId: "1",
        codigo: "PROD001",
        descripcion: "Laptop Dell Inspiron 15",
        cantidad: 1,
        precioUnitario: 4200,
        descuento: 0,
        subtotal: 4200,
        codigoSIN: "86173000"
      }
    ],
    subtotal: 4200,
    descuentoTotal: 0,
    iva: Number((4200 - 4200 / 1.13).toFixed(2)), // IVA incluido: 483.19
    total: 4200, // En Bolivia el precio ya incluye IVA
    estado: 'enviada',
    estadoSIN: 'aceptado',
    cuf: "E0D5C1B9A8F7E6D5C4B3A2F1E0D9C8B7A6F5E4D3C2B1A0F9E8D7C6B5A4F3E2D1",
    cufd: obtenerCUFD(0),
    puntoVenta: 0,
    codigoControl: "12-34-56",
    observaciones: "",
    fechaCreacion: "2024-06-15"
  }
];

export const generarNumeroFactura = (ultimaFactura: string): string => {
  const numero = parseInt(ultimaFactura) + 1;
  return numero.toString().padStart(6, '0');
};

export const generarCUF = (facturaData: { nitEmisor: string, fechaHora: string, sucursal: string, modalidad: string, tipoEmision: string, tipoFactura: string, tipoDocumentoSector: string, numeroFactura: string, pos: string}, cufd: string): string => {
  const dataString = Object.values(facturaData).join('|') + '|' + cufd;
  let hash = 0;
  if (dataString.length === 0) return '';
  for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
  }
  const hexHash = Math.abs(hash).toString(16).toUpperCase();
  const cuf = (hexHash + dataString.split("").reverse().join("").charCodeAt(0).toString(16) + Date.now().toString(16)).toUpperCase().replace(/[^A-F0-9]/g, '');
  return cuf.slice(0, 64).padEnd(64, 'A');
};

const motivosRechazo = [
  "El NIT del cliente es inválido",
  "El código de producto SIN no corresponde",
  "Firma digital inválida",
  "Factura fuera de secuencia",
];

export const simularValidacionSIN = (factura: Factura): Promise<Factura> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simular una respuesta del SIN. 85% de probabilidad de éxito.
      const aceptada = Math.random() < 0.85;
      
      const facturaActualizada: Factura = {
        ...factura,
        estadoSIN: aceptada ? 'aceptado' : 'rechazado',
      };
      
      if (!aceptada) {
        facturaActualizada.estado = 'borrador';
        facturaActualizada.observaciones = `RECHAZADA POR EL SIN. MOTIVO SIMULADO: ${motivosRechazo[Math.floor(Math.random() * motivosRechazo.length)]}. ${factura.observaciones || ''}`.trim();
      } else {
        facturaActualizada.estado = 'enviada';
      }

      resolve(facturaActualizada);
    }, 2500); // Simular latencia de red de 2.5 segundos
  });
};

// Normativa actualizada 2026 - IVA 13%
// Sectores especiales según RNDs 2025-2026. Nota: DS 5503 abrogado por DS 5516 (enero 2026)
export const sectoresEspeciales = {
  biodiesel: { codigo: 54, tasa: 0 }, // Tasa cero según Ley 1613
  combustibleNoSubvencionado: { codigo: 55, tasa: 13 },
  serviciosPublicos: { codigo: 1, tasa: 0 },
  exportaciones: { codigo: 2, tasa: 0 },
  medicamentos: { codigo: 3, tasa: 0 },
  bienesCapital: { codigo: 56, tasa: 0 }, // IVA Tasa Cero - RND 102500000002 (agropecuario, industrial, construcción, minería)
  energiaElectrica: { codigo: 57, tasa: 0 } // Generación energía eléctrica
};

// Cálculo de IVA actualizado con sectores especiales
export const calcularIVA = (precioConIVA: number, codigoSector?: number): number => {
  // Verificar si es sector con tasa especial
  const sectorEspecial = Object.values(sectoresEspeciales)
    .find(s => s.codigo === codigoSector);
  
  if (sectorEspecial && sectorEspecial.tasa === 0) {
    return 0; // Tasa cero para sectores especiales
  }
  
  // IVA estándar 13%
  const precioSinIVA = precioConIVA / 1.13;
  return precioConIVA - precioSinIVA;
};

export const calcularSubtotalSinIVA = (precioConIVA: number, codigoSector?: number): number => {
  const sectorEspecial = Object.values(sectoresEspeciales)
    .find(s => s.codigo === codigoSector);
  
  if (sectorEspecial && sectorEspecial.tasa === 0) {
    return precioConIVA; // Sin IVA para sectores especiales
  }
  
  return precioConIVA / 1.13;
};

export const calcularTotal = (subtotalConDescuento: number): number => {
  return subtotalConDescuento;
};

// Códigos de actividad económica CAEB-SIN actualizados 2026 (RND 102500000018)
export const actividadesEconomicas = [
  { codigo: "620100", descripcion: "Programación informática y actividades relacionadas", ivaExento: false },
  { codigo: "620200", descripcion: "Consultoría informática y gestión de instalaciones", ivaExento: false },
  { codigo: "631100", descripcion: "Procesamiento de datos y hospedaje", ivaExento: false },
  { codigo: "851000", descripcion: "Educación preprimaria", ivaExento: true },
  { codigo: "861000", descripcion: "Actividades de hospitales", ivaExento: true },
  { codigo: "192000", descripcion: "Fabricación de productos de refinación del petróleo", ivaExento: false },
  { codigo: "351100", descripcion: "Generación de energía eléctrica", ivaExento: true },
  { codigo: "461000", descripcion: "Venta al por mayor a comisión o por contrata", ivaExento: false },
  { codigo: "471100", descripcion: "Venta al por menor en comercios no especializados", ivaExento: false },
  { codigo: "692000", descripcion: "Contabilidad, auditoría y consultoría fiscal", ivaExento: false },
  { codigo: "702000", descripcion: "Consultoría de gestión", ivaExento: false },
  { codigo: "561010", descripcion: "Actividades de restaurantes", ivaExento: false },
];

// Validación de NIT actualizada según normativa 2025
export const validarNITBoliviano = (nit: string): { valido: boolean; mensaje: string } => {
  if (!nit) return { valido: false, mensaje: "NIT requerido" };
  
  // Remover espacios y guiones
  const nitLimpio = nit.replace(/[-\s]/g, '');
  
  // Verificar longitud (7-12 dígitos según normativa actual)
  if (nitLimpio.length < 7 || nitLimpio.length > 12) {
    return { valido: false, mensaje: "NIT debe tener entre 7 y 12 dígitos" };
  }
  
  // Verificar que solo contenga números
  if (!/^\d+$/.test(nitLimpio)) {
    return { valido: false, mensaje: "NIT debe contener solo números" };
  }
  
  return { valido: true, mensaje: "NIT válido" };
};
