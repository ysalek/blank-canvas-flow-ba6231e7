import type { AsientoContable } from "@/components/contable/diary/DiaryData";
import type { Producto } from "./useProductosValidated";
import { useAsientos } from "./useAsientos";

export interface TrialBalanceDetail {
  codigo: string;
  nombre: string;
  sumaDebe: number;
  sumaHaber: number;
  saldoDeudor: number;
  saldoAcreedor: number;
}

export interface TrialBalanceTotals {
  sumaDebe: number;
  sumaHaber: number;
  saldoDeudor: number;
  saldoAcreedor: number;
}

export interface BalanceSheetAccount {
  codigo: string;
  nombre: string;
  saldo: number;
}

export interface BalanceSheetData {
  activos: {
    cuentas: BalanceSheetAccount[];
    total: number;
  };
  pasivos: {
    cuentas: BalanceSheetAccount[];
    total: number;
  };
  patrimonio: {
    cuentas: BalanceSheetAccount[];
    total: number;
  };
  totalPasivoPatrimonio: number;
  ecuacionCuadrada: boolean;
  inventario: {
    saldoFisico: number;
    saldoContable: number;
    diferencia: number;
    conciliado: boolean;
    criterioBalance: "contable";
  };
}

export interface IncomeStatementData {
  ingresos: {
    cuentas: BalanceSheetAccount[];
    total: number;
  };
  gastos: {
    cuentas: BalanceSheetAccount[];
    total: number;
  };
  utilidadNeta: number;
}

export interface DeclaracionIVAData {
  ventas: {
    baseImponible: number;
    debitoFiscal: number;
  };
  compras: {
    baseImponible: number;
    creditoFiscal: number;
  };
  saldo: {
    aFavorFisco: number;
    aFavorContribuyente: number;
  };
}

export interface LibroMayorMovimiento {
  fecha: string;
  concepto: string;
  referencia: string;
  debe: number;
  haber: number;
}

export interface LibroMayorCuenta {
  nombre: string;
  codigo: string;
  movimientos: LibroMayorMovimiento[];
  totalDebe: number;
  totalHaber: number;
}

type LedgerMap = Record<string, LibroMayorCuenta>;
type BalanceFilters = {
  fechaInicio?: string;
  fechaFin?: string;
};

const normalizarValorProducto = (
  valorSnake?: number | null,
  valorAlias?: number | null
): number => Number(valorSnake ?? valorAlias ?? 0);

const estaDentroDeRango = (asiento: AsientoContable, filtros?: BalanceFilters): boolean => {
  if (asiento.estado !== "registrado") return false;
  if (!filtros?.fechaInicio && !filtros?.fechaFin) return true;

  const fechaAsiento = new Date(asiento.fecha);
  if (filtros.fechaInicio && fechaAsiento < new Date(filtros.fechaInicio)) {
    return false;
  }
  if (filtros.fechaFin && fechaAsiento > new Date(`${filtros.fechaFin}T23:59:59`)) {
    return false;
  }

  return true;
};

export const useReportesContables = (productos: Producto[] = []) => {
  const { getAsientos } = useAsientos();

  const construirLibroMayor = (asientos: AsientoContable[]): LedgerMap => {
    const libroMayor: LedgerMap = {};

    asientos.forEach((asiento) => {
      asiento.cuentas.forEach((cuenta) => {
        if (!libroMayor[cuenta.codigo]) {
          libroMayor[cuenta.codigo] = {
            codigo: cuenta.codigo,
            nombre: cuenta.nombre,
            movimientos: [],
            totalDebe: 0,
            totalHaber: 0,
          };
        }

        libroMayor[cuenta.codigo].movimientos.push({
          fecha: asiento.fecha,
          concepto: asiento.concepto,
          referencia: asiento.referencia,
          debe: cuenta.debe,
          haber: cuenta.haber,
        });
        libroMayor[cuenta.codigo].totalDebe += cuenta.debe;
        libroMayor[cuenta.codigo].totalHaber += cuenta.haber;
      });
    });

    Object.values(libroMayor).forEach((cuenta) => {
      cuenta.movimientos.sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );
    });

    return libroMayor;
  };

  const getLibroMayor = (): LedgerMap => {
    const asientos = getAsientos().filter((asiento) => asiento.estado === "registrado");
    return construirLibroMayor([...asientos].reverse());
  };

  const getTrialBalanceData = (filtros?: {
    fechaInicio?: string;
    fechaFin?: string;
    cuentaInicio?: string;
    cuentaFin?: string;
  }): { details: TrialBalanceDetail[]; totals: TrialBalanceTotals } => {
    const asientosFiltrados = getAsientos().filter((asiento) => estaDentroDeRango(asiento, filtros));
    const libroMayor = construirLibroMayor([...asientosFiltrados].reverse());

    let cuentasOrdenadas = Object.values(libroMayor).sort((a, b) => a.codigo.localeCompare(b.codigo));

    if (filtros?.cuentaInicio || filtros?.cuentaFin) {
      cuentasOrdenadas = cuentasOrdenadas.filter((cuenta) => {
        if (filtros.cuentaInicio && cuenta.codigo < filtros.cuentaInicio) return false;
        if (filtros.cuentaFin && cuenta.codigo > filtros.cuentaFin) return false;
        return true;
      });
    }

    const totals: TrialBalanceTotals = {
      sumaDebe: 0,
      sumaHaber: 0,
      saldoDeudor: 0,
      saldoAcreedor: 0,
    };

    const details = cuentasOrdenadas.map((cuenta) => {
      const saldo = cuenta.totalDebe - cuenta.totalHaber;
      const saldoDeudor = saldo > 0 ? saldo : 0;
      const saldoAcreedor = saldo < 0 ? -saldo : 0;

      totals.sumaDebe += cuenta.totalDebe;
      totals.sumaHaber += cuenta.totalHaber;
      totals.saldoDeudor += saldoDeudor;
      totals.saldoAcreedor += saldoAcreedor;

      return {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        sumaDebe: cuenta.totalDebe,
        sumaHaber: cuenta.totalHaber,
        saldoDeudor,
        saldoAcreedor,
      };
    });

    return { details, totals };
  };

  const getBalanceSheetData = (filtros?: BalanceFilters): BalanceSheetData => {
    const { details } = getTrialBalanceData(filtros);

    const activos = { cuentas: [] as BalanceSheetAccount[], total: 0 };
    const pasivos = { cuentas: [] as BalanceSheetAccount[], total: 0 };
    const patrimonio = { cuentas: [] as BalanceSheetAccount[], total: 0 };
    const ingresos = { total: 0 };
    const gastos = { total: 0 };

    const valorInventarioFisico = productos.reduce((total, producto) => {
      const stockActual = normalizarValorProducto(producto.stock_actual, producto.stockActual);
      const costoUnitario = normalizarValorProducto(producto.costo_unitario, producto.costoUnitario);
      return total + stockActual * costoUnitario;
    }, 0);

    const cuentaInventario = details.find(
      (cuenta) => cuenta.codigo === "1131" || cuenta.codigo === "1141"
    );
    const valorInventarioContable = cuentaInventario
      ? cuentaInventario.saldoDeudor - cuentaInventario.saldoAcreedor
      : 0;

    details.forEach((cuenta) => {
      const saldo = cuenta.saldoDeudor - cuenta.saldoAcreedor;

      if (cuenta.codigo.startsWith("1")) {
        const saldoActivo =
          cuenta.codigo === "1131" || cuenta.codigo === "1141"
            ? Math.max(0, valorInventarioContable)
            : Math.max(0, saldo);

        activos.cuentas.push({
          codigo: cuenta.codigo,
          nombre: cuenta.nombre,
          saldo: saldoActivo,
        });
        activos.total += saldoActivo;
        return;
      }

      if (cuenta.codigo.startsWith("2")) {
        const saldoPasivo = Math.max(0, -saldo);
        pasivos.cuentas.push({
          codigo: cuenta.codigo,
          nombre: cuenta.nombre,
          saldo: saldoPasivo,
        });
        pasivos.total += saldoPasivo;
        return;
      }

      if (cuenta.codigo.startsWith("3")) {
        const saldoPatrimonial = Math.max(0, -saldo);
        patrimonio.cuentas.push({
          codigo: cuenta.codigo,
          nombre: cuenta.nombre,
          saldo: saldoPatrimonial,
        });
        patrimonio.total += saldoPatrimonial;
        return;
      }

      if (cuenta.codigo.startsWith("4")) {
        ingresos.total += Math.max(0, -saldo);
        return;
      }

      if (cuenta.codigo.startsWith("5") || cuenta.codigo.startsWith("6")) {
        gastos.total += Math.max(0, saldo);
      }
    });

    const utilidadPeriodo = ingresos.total - gastos.total;
    if (Math.abs(utilidadPeriodo) > 0.01) {
      patrimonio.cuentas.push({
        codigo: "3211",
        nombre: "Utilidad (o Perdida) del Ejercicio",
        saldo: utilidadPeriodo,
      });
      patrimonio.total += utilidadPeriodo;
    }

    activos.cuentas.sort((a, b) => a.codigo.localeCompare(b.codigo));
    pasivos.cuentas.sort((a, b) => a.codigo.localeCompare(b.codigo));
    patrimonio.cuentas.sort((a, b) => a.codigo.localeCompare(b.codigo));

    const totalPasivoPatrimonio = pasivos.total + patrimonio.total;
    const diferenciaInventario = valorInventarioFisico - valorInventarioContable;

    return {
      activos,
      pasivos,
      patrimonio,
      totalPasivoPatrimonio,
      ecuacionCuadrada: Math.abs(activos.total - totalPasivoPatrimonio) < 0.01,
      inventario: {
        saldoFisico: valorInventarioFisico,
        saldoContable: valorInventarioContable,
        diferencia: diferenciaInventario,
        conciliado: Math.abs(diferenciaInventario) < 0.01,
        criterioBalance: "contable",
      },
    };
  };

  const getIncomeStatementData = (filtros?: BalanceFilters): IncomeStatementData => {
    const { details } = getTrialBalanceData(filtros);

    const ingresos: IncomeStatementData["ingresos"] = {
      cuentas: [],
      total: 0,
    };
    const gastos: IncomeStatementData["gastos"] = {
      cuentas: [],
      total: 0,
    };

    details.forEach((cuenta) => {
      const saldo = cuenta.saldoDeudor - cuenta.saldoAcreedor;

      if (cuenta.codigo.startsWith("4")) {
        const saldoAcreedor = Math.max(0, -saldo);
        if (saldoAcreedor > 0.01) {
          ingresos.cuentas.push({
            codigo: cuenta.codigo,
            nombre: cuenta.nombre,
            saldo: saldoAcreedor,
          });
          ingresos.total += saldoAcreedor;
        }
        return;
      }

      if (cuenta.codigo.startsWith("5") || cuenta.codigo.startsWith("6")) {
        const saldoDeudor = Math.max(0, saldo);
        if (saldoDeudor > 0.01) {
          gastos.cuentas.push({
            codigo: cuenta.codigo,
            nombre: cuenta.nombre,
            saldo: saldoDeudor,
          });
          gastos.total += saldoDeudor;
        }
      }
    });

    ingresos.cuentas.sort((a, b) => a.codigo.localeCompare(b.codigo));
    gastos.cuentas.sort((a, b) => a.codigo.localeCompare(b.codigo));

    return {
      ingresos,
      gastos,
      utilidadNeta: ingresos.total - gastos.total,
    };
  };

  const getDeclaracionIVAData = (fechas: {
    fechaInicio: string;
    fechaFin: string;
  }): DeclaracionIVAData => {
    const startDate = new Date(fechas.fechaInicio);
    const endDate = new Date(fechas.fechaFin);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const asientosEnPeriodo = getAsientos().filter((asiento) => {
      if (!asiento.fecha || asiento.estado !== "registrado") return false;
      const fechaAsiento = new Date(asiento.fecha);
      return fechaAsiento >= startDate && fechaAsiento <= endDate;
    });

    let debitoFiscalTotal = 0;
    let baseImponibleVentas = 0;
    let creditoFiscalTotal = 0;
    let baseImponibleCompras = 0;

    asientosEnPeriodo.forEach((asiento) => {
      const ventaCuenta = asiento.cuentas.find((cuenta) => cuenta.codigo.startsWith("4") && cuenta.haber > 0);
      const ivaDebitoCuenta = asiento.cuentas.find(
        (cuenta) => (cuenta.codigo === "2113" || cuenta.codigo === "2131") && cuenta.haber > 0
      );

      if (ventaCuenta && ivaDebitoCuenta) {
        baseImponibleVentas += ventaCuenta.haber;
        debitoFiscalTotal += ivaDebitoCuenta.haber;
      }

      const reversionVentaCuenta = asiento.cuentas.find(
        (cuenta) => cuenta.codigo.startsWith("4") && cuenta.debe > 0
      );
      const reversionIvaDebito = asiento.cuentas.find(
        (cuenta) => (cuenta.codigo === "2113" || cuenta.codigo === "2131") && cuenta.debe > 0
      );

      if (reversionVentaCuenta && reversionIvaDebito) {
        baseImponibleVentas -= reversionVentaCuenta.debe;
        debitoFiscalTotal -= reversionIvaDebito.debe;
      }

      const ivaCreditoCuenta = asiento.cuentas.find(
        (cuenta) => cuenta.codigo === "1142" && cuenta.debe > 0
      );

      if (ivaCreditoCuenta) {
        creditoFiscalTotal += ivaCreditoCuenta.debe;
        const baseCompra = asiento.cuentas
          .filter(
            (cuenta) =>
              (cuenta.codigo === "1131" ||
                cuenta.codigo === "1141" ||
                cuenta.codigo.startsWith("5")) &&
              cuenta.debe > 0
          )
          .reduce((sum, cuenta) => sum + cuenta.debe, 0);
        baseImponibleCompras += baseCompra;
      }
    });

    const diferencia = debitoFiscalTotal - creditoFiscalTotal;

    return {
      ventas: {
        baseImponible: baseImponibleVentas,
        debitoFiscal: debitoFiscalTotal,
      },
      compras: {
        baseImponible: baseImponibleCompras,
        creditoFiscal: creditoFiscalTotal,
      },
      saldo: {
        aFavorFisco: diferencia > 0 ? diferencia : 0,
        aFavorContribuyente: diferencia < 0 ? -diferencia : 0,
      },
    };
  };

  return {
    getLibroMayor,
    getTrialBalanceData,
    getBalanceSheetData,
    getIncomeStatementData,
    getDeclaracionIVAData,
  };
};
