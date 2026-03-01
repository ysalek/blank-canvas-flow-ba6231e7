import { AsientoContable } from "@/components/contable/diary/DiaryData";
import { MovimientoInventario } from "@/components/contable/inventory/InventoryData";
import { useAsientos } from "./useAsientos";
import { useReportesContables } from "./useReportesContables";
import { useProductosUnificado } from "./useProductosUnificado";
import { useAsientosGenerator } from "./useAsientosGenerator";
import { useProductosValidated } from "./useProductosValidated";
import type { 
  TrialBalanceDetail, 
  TrialBalanceTotals, 
  BalanceSheetAccount,
  BalanceSheetData, 
  IncomeStatementData, 
  DeclaracionIVAData 
} from "./useReportesContables";
import type { Producto as ProductoLegacy } from "@/components/contable/products/ProductsData";
import type { Producto } from "@/hooks/useProductosUnificado";
import type { Factura } from "@/components/contable/billing/BillingData";
import type { Compra } from "@/components/contable/purchases/PurchasesData";

// Re-export types to avoid breaking changes in other modules after refactoring
export type { 
  TrialBalanceDetail, 
  TrialBalanceTotals, 
  BalanceSheetAccount,
  BalanceSheetData, 
  IncomeStatementData, 
  DeclaracionIVAData 
} from "./useReportesContables";
export type { Producto as ProductoLegacy } from "@/components/contable/products/ProductsData";
export type { Producto } from "@/hooks/useProductosUnificado";
export type { Compra } from "@/components/contable/purchases/PurchasesData";

export interface ContabilidadIntegrationHook {
  generarAsientoInventario: (movimiento: MovimientoInventario) => Promise<AsientoContable | null>;
  generarAsientoVenta: (factura: any) => Promise<AsientoContable | null>;
  generarAsientoCompra: (compra: { numero: string, total: number, subtotal: number, iva: number }) => Promise<AsientoContable | null>;
  generarAsientoPagoCompra: (compra: Compra) => Promise<AsientoContable | null>;
  generarAsientoPagoFactura: (factura: Factura) => Promise<AsientoContable | null>;
  generarAsientoAnulacionFactura: (factura: Factura) => Promise<AsientoContable[] | null>;
  guardarAsiento: (asiento: AsientoContable) => Promise<boolean>;
  getAsientos: () => AsientoContable[];
  getLibroMayor: () => { [key: string]: { nombre: string, codigo: string, movimientos: any[], totalDebe: number, totalHaber: number } };
  getTrialBalanceData: () => { details: TrialBalanceDetail[], totals: TrialBalanceTotals };
  actualizarStockProducto: (productoId: string, cantidad: number, tipo: 'entrada' | 'salida') => Promise<boolean>;
  obtenerProductos: () => Producto[];
  validarTransaccion: (asiento: AsientoContable) => boolean;
  obtenerBalanceGeneral: () => { activos: number; pasivos: number; patrimonio: number };
  getBalanceSheetData: (filtros?: { fechaInicio?: string, fechaFin?: string }) => BalanceSheetData;
  getIncomeStatementData: () => IncomeStatementData;
  getDeclaracionIVAData: (fechas: { fechaInicio: string, fechaFin: string }) => DeclaracionIVAData;
}

export const useContabilidadIntegration = (): ContabilidadIntegrationHook => {
  const { getAsientos, guardarAsiento, validarTransaccion } = useAsientos();
  const { productos: productosValidated } = useProductosValidated();
  const reportesHook = useReportesContables(productosValidated);
  const { obtenerProductos, actualizarStockProducto } = useProductosUnificado();
  const {
    generarAsientoInventario,
    generarAsientoVenta,
    generarAsientoCompra,
    generarAsientoPagoCompra,
    generarAsientoPagoFactura,
    generarAsientoAnulacionFactura,
  } = useAsientosGenerator();

  const obtenerBalanceGeneral = () => {
    const { activos, pasivos, patrimonio } = reportesHook.getBalanceSheetData();
    return {
      activos: activos.total,
      pasivos: pasivos.total,
      patrimonio: patrimonio.total,
    };
  };

  // Función de compatibilidad que convierte productos al formato legacy
  const obtenerProductosLegacy = (): ProductoLegacy[] => {
    return obtenerProductos().map(p => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion,
      categoria: p.categoria,
      unidadMedida: p.unidad_medida,
      precioVenta: p.precio_venta,
      precioCompra: p.precio_compra,
      costoUnitario: p.costo_unitario,
      stockActual: p.stock_actual,
      stockMinimo: p.stock_minimo,
      codigoSIN: p.codigo_sin || '00000000',
      activo: p.activo,
      fechaCreacion: p.fechaCreacion || '',
      fechaActualizacion: p.fechaActualizacion || '',
      imagenUrl: p.imagen_url
    }));
  };

  return {
    generarAsientoInventario,
    generarAsientoVenta,
    generarAsientoCompra,
    generarAsientoPagoCompra,
    generarAsientoPagoFactura,
    generarAsientoAnulacionFactura,
    guardarAsiento,
    getAsientos,
    getLibroMayor: reportesHook.getLibroMayor,
    getTrialBalanceData: reportesHook.getTrialBalanceData,
    actualizarStockProducto,
    obtenerProductos: obtenerProductosLegacy as () => any,
    validarTransaccion,
    obtenerBalanceGeneral,
    getBalanceSheetData: reportesHook.getBalanceSheetData,
    getIncomeStatementData: reportesHook.getIncomeStatementData,
    getDeclaracionIVAData: reportesHook.getDeclaracionIVAData
  };
};
