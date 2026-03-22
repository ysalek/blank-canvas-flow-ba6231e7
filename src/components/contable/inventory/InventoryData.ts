
export interface ProductoInventario {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  imagenUrl?: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  costoUnitario: number;
  costoPromedioPonderado: number;
  precioVenta: number;
  ubicacion: string;
  fechaUltimoMovimiento: string;
  valorTotalInventario: number;
}

export interface MovimientoInventario {
  id: string;
  fecha: string;
  tipo: 'entrada' | 'salida' | 'ajuste';
  productoId: string;
  producto: string;
  cantidad: number;
  costoUnitario: number;
  costoPromedioPonderado: number;
  motivo: string;
  documento: string;
  usuario: string;
  stockAnterior: number;
  stockNuevo: number;
  valorMovimiento: number;
}

export const calcularPromedioPonderado = (stockAnterior: number, costoAnterior: number, cantidadNueva: number, costoNuevo: number): number => {
  if (stockAnterior + cantidadNueva === 0) return 0;
  const valorAnterior = stockAnterior * costoAnterior;
  const valorNuevo = cantidadNueva * costoNuevo;
  return (valorAnterior + valorNuevo) / (stockAnterior + cantidadNueva);
};

export const productosIniciales: ProductoInventario[] = [
  {
    id: "1",
    codigo: "PROD001",
    nombre: "Laptop Dell Inspiron 15",
    categoria: "Equipos",
    stockActual: 15,
    stockMinimo: 5,
    stockMaximo: 50,
    costoUnitario: 3500,
    costoPromedioPonderado: 3480,
    precioVenta: 4200,
    ubicacion: "Almacén A-1",
    fechaUltimoMovimiento: "2024-06-14",
    valorTotalInventario: 15 * 3480
  },
  {
    id: "2",
    codigo: "PROD002",
    nombre: "Mouse Inalámbrico",
    categoria: "Accesorios",
    stockActual: 3,
    stockMinimo: 10,
    stockMaximo: 100,
    costoUnitario: 45,
    costoPromedioPonderado: 47.5,
    precioVenta: 65,
    ubicacion: "Almacén B-2",
    fechaUltimoMovimiento: "2024-06-13",
    valorTotalInventario: 3 * 47.5
  },
  {
    id: "3",
    codigo: "SERV001",
    nombre: "Consultoría IT",
    categoria: "Servicios",
    stockActual: 0,
    stockMinimo: 0,
    stockMaximo: 0,
    costoUnitario: 0,
    costoPromedioPonderado: 0,
    precioVenta: 150,
    ubicacion: "N/A",
    fechaUltimoMovimiento: "2024-06-15",
    valorTotalInventario: 0
  }
];

export const movimientosIniciales: MovimientoInventario[] = [
  {
    id: "1",
    fecha: "2024-06-15",
    tipo: "entrada",
    productoId: "1",
    producto: "Laptop Dell Inspiron 15",
    cantidad: 10,
    costoUnitario: 3500,
    costoPromedioPonderado: 3480,
    motivo: "Compra a proveedor",
    documento: "FC-001234",
    usuario: "Admin",
    stockAnterior: 5,
    stockNuevo: 15,
    valorMovimiento: 35000
  },
  {
    id: "2",
    fecha: "2024-06-14",
    tipo: "salida",
    productoId: "2",
    producto: "Mouse Inalámbrico",
    cantidad: 5,
    costoUnitario: 47.5,
    costoPromedioPonderado: 47.5,
    motivo: "Venta",
    documento: "FV-000567",
    usuario: "Vendedor",
    stockAnterior: 8,
    stockNuevo: 3,
    valorMovimiento: 237.5
  }
];
