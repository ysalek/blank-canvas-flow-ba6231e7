import { AsientoContable, CuentaAsiento } from "@/components/contable/diary/DiaryData";
import { MovimientoInventario } from "@/components/contable/inventory/InventoryData";
import { Factura } from "@/components/contable/billing/BillingData";
import { Compra } from "@/components/contable/purchases/PurchasesData";
import { useAsientos } from "./useAsientos";
import { useProductosUnificado } from "./useProductosUnificado";

export const useAsientosGenerator = () => {
  const { guardarAsiento } = useAsientos();
  const { obtenerProductos } = useProductosUnificado();

  const generarAsientoInventario = async (movimiento: MovimientoInventario): Promise<AsientoContable | null> => {
    try {
      const cuentas: CuentaAsiento[] = [];
      const fecha = new Date().toISOString().slice(0, 10);
      
      console.log("Generando asiento para movimiento (normativa boliviana):", movimiento);
      
      if (movimiento.tipo === 'entrada') {
        cuentas.push({
          codigo: "1131",
          nombre: "Inventarios",
          debe: movimiento.valorMovimiento,
          haber: 0
        });
        
        if (movimiento.motivo?.toLowerCase().includes('anulación') || 
            movimiento.motivo?.toLowerCase().includes('devolución') ||
            movimiento.motivo?.toLowerCase().includes('devolucion')) {
          cuentas.push({
            codigo: "5111",
            nombre: "Costo de Productos Vendidos",
            debe: 0,
            haber: movimiento.valorMovimiento
          });
        } else if (movimiento.motivo?.toLowerCase().includes('compra') ||
                   movimiento.motivo?.toLowerCase().includes('proveedor') ||
                   movimiento.motivo?.toLowerCase().includes('adquisición')) {
          cuentas.push({
            codigo: "2111",
            nombre: "Cuentas por Pagar",
            debe: 0,
            haber: movimiento.valorMovimiento
          });
        } else if (movimiento.motivo?.toLowerCase().includes('ajuste positivo')) {
          cuentas.push({
            codigo: "4211",
            nombre: "Otros Ingresos",
            debe: 0,
            haber: movimiento.valorMovimiento
          });
        } else {
          cuentas.push({
            codigo: "2111",
            nombre: "Cuentas por Pagar",
            debe: 0,
            haber: movimiento.valorMovimiento
          });
        }
      } else if (movimiento.tipo === 'salida') {
        cuentas.push({
          codigo: "1131",
          nombre: "Inventarios",
          debe: 0,
          haber: movimiento.valorMovimiento
        });
        
        if (movimiento.motivo?.toLowerCase().includes('venta') || 
            movimiento.motivo?.toLowerCase().includes('factura') ||
            movimiento.motivo?.toLowerCase().includes('vendido')) {
          cuentas.push({
            codigo: "5111",
            nombre: "Costo de Productos Vendidos",
            debe: movimiento.valorMovimiento,
            haber: 0
          });
        } else if (movimiento.motivo?.toLowerCase().includes('pérdida') ||
                   movimiento.motivo?.toLowerCase().includes('perdida') ||
                   movimiento.motivo?.toLowerCase().includes('deterioro') ||
                   movimiento.motivo?.toLowerCase().includes('robo') ||
                   movimiento.motivo?.toLowerCase().includes('vencimiento')) {
          cuentas.push({
            codigo: "5322",
            nombre: "Pérdidas y Faltantes de Inventario",
            debe: movimiento.valorMovimiento,
            haber: 0
          });
        } else if (movimiento.motivo?.toLowerCase().includes('consumo interno') ||
                   movimiento.motivo?.toLowerCase().includes('uso interno') ||
                   movimiento.motivo?.toLowerCase().includes('muestra')) {
          cuentas.push({
            codigo: "5211",
            nombre: "Gastos Operativos",
            debe: movimiento.valorMovimiento,
            haber: 0
          });
        } else if (movimiento.motivo?.toLowerCase().includes('ajuste negativo')) {
          cuentas.push({
            codigo: "5322",
            nombre: "Pérdidas y Faltantes de Inventario",
            debe: movimiento.valorMovimiento,
            haber: 0
          });
        } else {
          console.warn("Motivo de salida no específico, registrando como pérdida:", movimiento.motivo);
          cuentas.push({
            codigo: "5322",
            nombre: "Pérdidas y Faltantes de Inventario",
            debe: movimiento.valorMovimiento,
            haber: 0
          });
        }
      }

      const totalDebe = cuentas.reduce((sum, cuenta) => sum + cuenta.debe, 0);
      const totalHaber = cuentas.reduce((sum, cuenta) => sum + cuenta.haber, 0);

      const asiento: AsientoContable = {
        id: `AST-INV-${Date.now()}`,
        numero: `INV-${movimiento.tipo.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        fecha,
        concepto: `${movimiento.tipo === 'entrada' ? 'Entrada' : 'Salida'} de inventario - ${movimiento.producto}${movimiento.motivo ? ` (${movimiento.motivo})` : ''}`,
        referencia: movimiento.documento || 'N/A',
        debe: totalDebe,
        haber: totalHaber,
        estado: 'registrado',
        cuentas
      };

      console.log("Asiento generado:", asiento);

      const resultado = await guardarAsiento(asiento);
      return resultado ? asiento : null;
    } catch (error) {
      console.error("Error al generar asiento de inventario:", error);
      return null;
    }
  };

  const generarAsientoVenta = async (factura: any): Promise<AsientoContable | null> => {
    const cuentas: CuentaAsiento[] = [];
    const fecha = new Date().toISOString().slice(0, 10);
    
    const totalConIVA = factura.total;
    const ventaSinIVA = Number((totalConIVA / 1.13).toFixed(2));
    const ivaVenta = Number((totalConIVA - ventaSinIVA).toFixed(2));
    const itVenta = Number((totalConIVA * 0.03).toFixed(2)); // IT 3% sobre ingreso bruto (total con IVA)

    cuentas.push({
      codigo: "1121",
      nombre: "Cuentas por Cobrar Comerciales",
      debe: totalConIVA,
      haber: 0
    });

    cuentas.push({
      codigo: "4111",
      nombre: "Ventas de Productos",
      debe: 0,
      haber: ventaSinIVA
    });

    cuentas.push({
      codigo: "2113",
      nombre: "IVA Débito Fiscal",
      debe: 0,
      haber: ivaVenta
    });

    const asientoVenta: AsientoContable = {
      id: Date.now().toString(),
      numero: `VTA-${Date.now().toString().slice(-6)}`,
      fecha,
      concepto: `Venta según factura ${factura.numero}`,
      referencia: factura.numero,
      debe: totalConIVA,
      haber: totalConIVA,
      estado: 'registrado',
      cuentas
    };

    const saved = await guardarAsiento(asientoVenta);
    if (!saved) {
      console.error('❌ Error guardando asiento de venta');
      return null;
    }
    console.log('✅ Asiento de venta guardado:', asientoVenta.numero);

    // IT asiento
    const asientoIT: AsientoContable = {
      id: (Date.now() + 1).toString(),
      numero: `IT-${Date.now().toString().slice(-6)}`,
      fecha,
      concepto: `IT 3% sobre venta factura ${factura.numero}`,
      referencia: factura.numero,
      debe: itVenta,
      haber: itVenta,
      estado: 'registrado',
      cuentas: [
        {
          codigo: "5261",
          nombre: "Impuesto a las Transacciones",
          debe: itVenta,
          haber: 0
        },
        {
          codigo: "2114",
          nombre: "IT por Pagar",
          debe: 0,
          haber: itVenta
        }
      ]
    };

    await guardarAsiento(asientoIT);
    console.log('✅ Asiento IT guardado:', asientoIT.numero);

    // Asiento de Costo de Ventas (descarga inventario)
    if (factura.items && factura.items.length > 0) {
      const productos = obtenerProductos();
      let costoTotal = 0;
      const cuentasCosto: CuentaAsiento[] = [];

      for (const item of factura.items) {
        const producto = productos.find((p: any) => p.id === item.productoId);
        const costoUnitario = producto?.costoUnitario || producto?.costo_unitario || 0;
        if (costoUnitario > 0) {
          costoTotal += item.cantidad * costoUnitario;
        }
      }

      if (costoTotal > 0) {
        const costoRedondeado = Number(costoTotal.toFixed(2));
        const asientoCosto: AsientoContable = {
          id: (Date.now() + 2).toString(),
          numero: `CDV-${Date.now().toString().slice(-6)}`,
          fecha,
          concepto: `Costo de ventas factura ${factura.numero}`,
          referencia: factura.numero,
          debe: costoRedondeado,
          haber: costoRedondeado,
          estado: 'registrado',
          cuentas: [
            { codigo: "5111", nombre: "Costo de Productos Vendidos", debe: costoRedondeado, haber: 0 },
            { codigo: "1131", nombre: "Inventarios", debe: 0, haber: costoRedondeado }
          ]
        };
        await guardarAsiento(asientoCosto);
        console.log('✅ Asiento Costo de Ventas guardado:', asientoCosto.numero, 'Monto:', costoRedondeado);
      }
    }

    return asientoVenta;
  };

  const generarAsientoCompra = async (compra: { numero: string, total: number, subtotal: number, iva: number }): Promise<AsientoContable | null> => {
    const cuentas: CuentaAsiento[] = [];
    const fecha = new Date().toISOString().slice(0, 10);
    
    const totalCompra = compra.total;
    const comprasValor = Number((totalCompra / 1.13).toFixed(2));
    const ivaCreditoFiscal = Number((totalCompra - comprasValor).toFixed(2));

    cuentas.push({
      codigo: "1131", 
      nombre: "Inventarios",
      debe: comprasValor,
      haber: 0
    });

    cuentas.push({
      codigo: "1142",
      nombre: "IVA Crédito Fiscal",
      debe: ivaCreditoFiscal,
      haber: 0
    });

    cuentas.push({
      codigo: "2111",
      nombre: "Cuentas por Pagar",
      debe: 0,
      haber: totalCompra
    });

    const asiento: AsientoContable = {
      id: Date.now().toString(),
      numero: `CMP-${Date.now().toString().slice(-6)}`,
      fecha,
      concepto: `Compra de mercadería según factura ${compra.numero}`,
      referencia: compra.numero,
      debe: totalCompra,
      haber: totalCompra,
      estado: 'registrado',
      cuentas
    };

    const saved = await guardarAsiento(asiento);
    return saved ? asiento : null;
  };

  const generarAsientoPagoCompra = async (compra: Compra): Promise<AsientoContable | null> => {
    const totalPago = compra.subtotal + compra.iva;
    const asiento: AsientoContable = {
      id: Date.now().toString(),
      numero: `PGC-${compra.numero}`,
      fecha: new Date().toISOString().slice(0, 10),
      concepto: `Pago de compra N° ${compra.numero}`,
      referencia: compra.numero,
      debe: totalPago,
      haber: totalPago,
      estado: 'registrado',
      cuentas: [
        { codigo: "2111", nombre: "Cuentas por Pagar", debe: totalPago, haber: 0 },
        { codigo: "1111", nombre: "Caja y Bancos", debe: 0, haber: totalPago }
      ]
    };
    const saved = await guardarAsiento(asiento);
    return saved ? asiento : null;
  };

  const generarAsientoPagoFactura = async (factura: Factura): Promise<AsientoContable | null> => {
    const asiento: AsientoContable = {
      id: Date.now().toString(),
      numero: `PAG-${factura.numero}`,
      fecha: new Date().toISOString().slice(0, 10),
      concepto: `Cobro de factura N° ${factura.numero}`,
      referencia: factura.numero,
      debe: factura.total,
      haber: factura.total,
      estado: 'registrado',
      cuentas: [
        { codigo: "1111", nombre: "Caja y Bancos", debe: factura.total, haber: 0 },
        { codigo: "1121", nombre: "Cuentas por Cobrar", debe: 0, haber: factura.total }
      ]
    };
    const saved = await guardarAsiento(asiento);
    return saved ? asiento : null;
  };

  const generarAsientoAnulacionFactura = async (factura: Factura): Promise<AsientoContable[] | null> => {
    const ventaSinIVA = Number((factura.total / 1.13).toFixed(2));
    const ivaVenta = Number((factura.total - ventaSinIVA).toFixed(2));
    const itVenta = Number((factura.total * 0.03).toFixed(2)); // IT 3% sobre ingreso bruto
    
    const asientoVentaReversion: AsientoContable = {
      id: Date.now().toString(),
      numero: `ANV-${factura.numero}`,
      fecha: new Date().toISOString().slice(0, 10),
      concepto: `Anulación de venta, factura N° ${factura.numero}`,
      referencia: factura.numero,
      debe: factura.total,
      haber: factura.total,
      estado: 'registrado',
      cuentas: [
        { codigo: "4111", nombre: "Ventas de Productos", debe: ventaSinIVA, haber: 0 },
        { codigo: "2113", nombre: "IVA Débito Fiscal", debe: ivaVenta, haber: 0 },
        { codigo: "1121", nombre: "Cuentas por Cobrar Comerciales", debe: 0, haber: factura.total }
      ]
    };
    const savedReversion = await guardarAsiento(asientoVentaReversion);
    if (!savedReversion) return null;
    
    const asientoITReversion: AsientoContable = {
      id: (Date.now() + 1).toString(),
      numero: `ANV-IT-${factura.numero}`,
      fecha: new Date().toISOString().slice(0, 10),
      concepto: `Anulación IT factura N° ${factura.numero}`,
      referencia: factura.numero,
      debe: itVenta,
      haber: itVenta,
      estado: 'registrado',
      cuentas: [
        { codigo: "2114", nombre: "IT por Pagar", debe: itVenta, haber: 0 },
        { codigo: "5261", nombre: "Impuesto a las Transacciones", debe: 0, haber: itVenta }
      ]
    };
    await guardarAsiento(asientoITReversion);

    const asientosGenerados: AsientoContable[] = [asientoVentaReversion, asientoITReversion];

    for (const item of factura.items) {
      const producto = obtenerProductos().find(p => p.id === item.productoId);
      if (producto && producto.costoUnitario > 0) {
        const valorMovimiento = item.cantidad * producto.costoUnitario;
        const movimientoInventario: MovimientoInventario = {
          id: `${Date.now().toString()}-${item.productoId}`,
          fecha: new Date().toISOString().slice(0, 10),
          tipo: 'entrada',
          productoId: item.productoId,
          producto: item.descripcion,
          cantidad: item.cantidad,
          costoUnitario: producto.costoUnitario,
          costoPromedioPonderado: producto.costoUnitario,
          motivo: 'Anulación Venta',
          documento: `Factura Anulada N° ${factura.numero}`,
          usuario: 'Sistema',
          stockAnterior: producto.stockActual,
          stockNuevo: producto.stockActual + item.cantidad,
          valorMovimiento,
        };
        const asientoCosto = await generarAsientoInventario(movimientoInventario);
        if (asientoCosto) {
          asientosGenerados.push(asientoCosto);
        } else {
          console.error(`Error crítico: Falló la reversión del costo para el producto ${item.productoId}`);
        }
      }
    }

    return asientosGenerados;
  };
  
  const generarAsientoCompensacionIVA = async (debitoFiscal: number, creditoFiscal: number, periodo: string): Promise<AsientoContable | null> => {
    const fecha = new Date().toISOString().slice(0, 10);
    const diferencia = debitoFiscal - creditoFiscal;

    if (Math.abs(diferencia) < 0.01) {
      console.log('IVA DF y CF son iguales, no se requiere asiento de compensación');
      return null;
    }

    const cuentas: CuentaAsiento[] = [];

    // Siempre cerrar ambas cuentas de IVA
    cuentas.push({
      codigo: "2113",
      nombre: "IVA Débito Fiscal",
      debe: debitoFiscal,
      haber: 0
    });
    cuentas.push({
      codigo: "1142",
      nombre: "IVA Crédito Fiscal",
      debe: 0,
      haber: creditoFiscal
    });

    if (diferencia > 0) {
      // DF > CF: IVA por pagar al fisco
      cuentas.push({
        codigo: "2113",
        nombre: "IVA por Pagar",
        debe: 0,
        haber: Number(diferencia.toFixed(2))
      });
    } else {
      // CF > DF: Saldo a favor del contribuyente (se arrastra)
      cuentas.push({
        codigo: "1142",
        nombre: "Crédito Fiscal a Favor (arrastre)",
        debe: Number((-diferencia).toFixed(2)),
        haber: 0
      });
    }

    const totalDebe = cuentas.reduce((s, c) => s + c.debe, 0);
    const totalHaber = cuentas.reduce((s, c) => s + c.haber, 0);

    const asiento: AsientoContable = {
      id: Date.now().toString(),
      numero: `COMP-IVA-${periodo}`,
      fecha,
      concepto: `Compensación mensual IVA — Periodo ${periodo} (Art. 7-9 Ley 843)`,
      referencia: `IVA-${periodo}`,
      debe: totalDebe,
      haber: totalHaber,
      estado: 'registrado',
      cuentas
    };

    const saved = await guardarAsiento(asiento);
    return saved ? asiento : null;
  };

  return {
    generarAsientoInventario,
    generarAsientoVenta,
    generarAsientoCompra,
    generarAsientoPagoCompra,
    generarAsientoPagoFactura,
    generarAsientoAnulacionFactura,
    generarAsientoCompensacionIVA,
  };
};