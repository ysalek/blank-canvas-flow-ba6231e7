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
    iva: Number((4200 - 4200 / 1.13).toFixed(2)),
    total: 4200,
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

export const generarCUF = (
  facturaData: {
    nitEmisor: string;
    fechaHora: string;
    sucursal: string;
    modalidad: string;
    tipoEmision: string;
    tipoFactura: string;
    tipoDocumentoSector: string;
    numeroFactura: string;
    pos: string;
  },
  cufd: string
): string => {
  const dataString = Object.values(facturaData).join('|') + '|' + cufd;
  if (dataString.length === 0) return '';

  let hash = 0;
  for (let i = 0; i < dataString.length; i += 1) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  const base = `${Math.abs(hash).toString(16)}${Array.from(dataString)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')}`
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '');

  return base.slice(0, 64).padEnd(64, 'A');
};

export const generarCodigoControl = (numeroFactura: string, nit: string, fecha: string, puntoVenta: number): string => {
  const semilla = `${numeroFactura}-${nit}-${fecha}-${puntoVenta}`;
  let hash = 7;

  for (let index = 0; index < semilla.length; index += 1) {
    hash = (hash * 31 + semilla.charCodeAt(index)) % 1000000;
  }

  const base = hash.toString().padStart(6, '0');
  return `${base.slice(0, 2)}-${base.slice(2, 4)}-${base.slice(4, 6)}`;
};

export const esFacturaElectronica = (
  factura: Pick<Factura, 'cuf' | 'cufd' | 'codigoControl' | 'observaciones'>
): boolean =>
  Boolean(factura.cuf || factura.cufd || factura.codigoControl) ||
  String(factura.observaciones || '').includes('Registro creado desde Facturacion Electronica.');

export const validarFacturaParaSINDemo = (factura: Factura): { aceptada: boolean; motivo?: string } => {
  if (!factura.cliente?.nombre) {
    return { aceptada: false, motivo: "La factura no tiene cliente asociado." };
  }

  const nitValidation = validarNITBoliviano(factura.cliente.nit);
  if (!nitValidation.valido) {
    return { aceptada: false, motivo: nitValidation.mensaje };
  }

  if (!factura.items.length) {
    return { aceptada: false, motivo: "La factura no tiene items para validacion tributaria." };
  }

  const itemInvalido = factura.items.find((item) => !item.codigoSIN || !item.descripcion.trim());
  if (itemInvalido) {
    return { aceptada: false, motivo: "Existe al menos un item sin codigo SIN o descripcion valida." };
  }

  if (!factura.cufd) {
    return { aceptada: false, motivo: "La factura no tiene CUFD operativo asociado." };
  }

  if (!factura.cuf) {
    return { aceptada: false, motivo: "La factura no tiene CUF generado." };
  }

  if (!factura.codigoControl) {
    return { aceptada: false, motivo: "La factura no tiene codigo de control generado." };
  }

  return { aceptada: true };
};

export interface ResultadoRecepcionSINDemo {
  aceptada: boolean;
  motivo?: string;
  estado: Factura['estado'];
  estadoSIN: Factura['estadoSIN'];
  observaciones: string;
}

const unirObservaciones = (...partes: Array<string | undefined>) =>
  partes
    .map((parte) => parte?.trim())
    .filter(Boolean)
    .join(' ')
    .trim();

export const evaluarRecepcionSINDemo = (
  factura: Factura,
  options?: {
    conectadoSIN?: boolean;
    origen?: string;
  }
): ResultadoRecepcionSINDemo => {
  const conectadoSIN = options?.conectadoSIN ?? true;
  const origen = options?.origen || 'circuito general';

  if (!conectadoSIN) {
    return {
      aceptada: false,
      motivo: 'La configuracion operativa del SIN no esta lista.',
      estado: 'borrador',
      estadoSIN: 'rechazado',
      observaciones: unirObservaciones(
        factura.observaciones,
        `Recepcion SIN simulada (${origen}): rechazada por configuracion incompleta.`
      ),
    };
  }

  const resultado = validarFacturaParaSINDemo(factura);
  if (!resultado.aceptada) {
    return {
      aceptada: false,
      motivo: resultado.motivo,
      estado: 'borrador',
      estadoSIN: 'rechazado',
      observaciones: unirObservaciones(
        factura.observaciones,
        `Recepcion SIN simulada (${origen}): rechazada por validacion funcional. Motivo: ${resultado.motivo}.`
      ),
    };
  }

  return {
    aceptada: true,
    estado: 'enviada',
    estadoSIN: 'aceptado',
    observaciones: unirObservaciones(
      factura.observaciones,
      `Recepcion SIN simulada (${origen}): aceptada y auditada sobre la factura real.`
    ),
  };
};

export const aplicarResultadoRecepcionSINDemo = (
  factura: Factura,
  resultado: ResultadoRecepcionSINDemo
): Factura => ({
  ...factura,
  estado: resultado.estado,
  estadoSIN: resultado.estadoSIN,
  observaciones: resultado.observaciones,
});

export const simularValidacionSIN = (
  factura: Factura,
  options?: {
    conectadoSIN?: boolean;
    origen?: string;
  }
): Promise<Factura> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const resultado = evaluarRecepcionSINDemo(factura, options);
      resolve(aplicarResultadoRecepcionSINDemo(factura, resultado));
    }, 1200);
  });
};

export const sectoresEspeciales = {
  biodiesel: { codigo: 54, tasa: 0 },
  combustibleNoSubvencionado: { codigo: 55, tasa: 13 },
  serviciosPublicos: { codigo: 1, tasa: 0 },
  exportaciones: { codigo: 2, tasa: 0 },
  medicamentos: { codigo: 3, tasa: 0 },
  bienesCapital: { codigo: 56, tasa: 0 },
  energiaElectrica: { codigo: 57, tasa: 0 }
};

export const calcularIVA = (precioConIVA: number, codigoSector?: number): number => {
  const sectorEspecial = Object.values(sectoresEspeciales)
    .find(s => s.codigo === codigoSector);

  if (sectorEspecial && sectorEspecial.tasa === 0) {
    return 0;
  }

  const precioSinIVA = precioConIVA / 1.13;
  return precioConIVA - precioSinIVA;
};

export const calcularSubtotalSinIVA = (precioConIVA: number, codigoSector?: number): number => {
  const sectorEspecial = Object.values(sectoresEspeciales)
    .find(s => s.codigo === codigoSector);

  if (sectorEspecial && sectorEspecial.tasa === 0) {
    return precioConIVA;
  }

  return precioConIVA / 1.13;
};

export const calcularTotal = (subtotalConDescuento: number): number => {
  return subtotalConDescuento;
};

export const actividadesEconomicas = [
  { codigo: "620100", descripcion: "Programacion informatica y actividades relacionadas", ivaExento: false },
  { codigo: "620200", descripcion: "Consultoria informatica y gestion de instalaciones", ivaExento: false },
  { codigo: "631100", descripcion: "Procesamiento de datos y hospedaje", ivaExento: false },
  { codigo: "851000", descripcion: "Educacion preprimaria", ivaExento: true },
  { codigo: "861000", descripcion: "Actividades de hospitales", ivaExento: true },
  { codigo: "192000", descripcion: "Fabricacion de productos de refinacion del petroleo", ivaExento: false },
  { codigo: "351100", descripcion: "Generacion de energia electrica", ivaExento: true },
  { codigo: "461000", descripcion: "Venta al por mayor a comision o por contrata", ivaExento: false },
  { codigo: "471100", descripcion: "Venta al por menor en comercios no especializados", ivaExento: false },
  { codigo: "692000", descripcion: "Contabilidad, auditoria y consultoria fiscal", ivaExento: false },
  { codigo: "702000", descripcion: "Consultoria de gestion", ivaExento: false },
  { codigo: "561010", descripcion: "Actividades de restaurantes", ivaExento: false },
];

export const validarNITBoliviano = (nit: string): { valido: boolean; mensaje: string } => {
  if (!nit) return { valido: false, mensaje: "NIT requerido" };

  const nitLimpio = nit.replace(/[-\s]/g, '');

  if (nitLimpio.length < 7 || nitLimpio.length > 12) {
    return { valido: false, mensaje: "NIT debe tener entre 7 y 12 digitos" };
  }

  if (!/^\d+$/.test(nitLimpio)) {
    return { valido: false, mensaje: "NIT debe contener solo numeros" };
  }

  return { valido: true, mensaje: "NIT valido" };
};
