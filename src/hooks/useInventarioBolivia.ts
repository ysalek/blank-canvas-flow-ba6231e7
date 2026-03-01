import { useToast } from "@/hooks/use-toast";
import { useAsientosGenerator } from "./useAsientosGenerator";
import { ProductoInventario, MovimientoInventario } from "@/components/contable/inventory/InventoryData";

export const useInventarioBolivia = () => {
  const { toast } = useToast();
  const { generarAsientoInventario } = useAsientosGenerator();

  /**
   * Valida que un movimiento de inventario cumpla con la normativa boliviana
   */
  const validarMovimientoNormativo = (movimiento: MovimientoInventario, producto: ProductoInventario): {
    esValido: boolean;
    errores: string[];
    advertencias: string[];
  } => {
    const errores: string[] = [];
    const advertencias: string[] = [];

    // Validación 1: Stock nunca puede ser negativo
    if (movimiento.tipo === 'salida' && producto.stockActual < movimiento.cantidad) {
      errores.push(`Stock insuficiente. Disponible: ${producto.stockActual}, Solicitado: ${movimiento.cantidad}`);
    }

    // Validación 2: Costo unitario válido
    if (movimiento.costoUnitario <= 0) {
      errores.push("El costo unitario debe ser mayor a cero");
    }

    // Validación 3: Cantidad válida
    if (movimiento.cantidad <= 0) {
      errores.push("La cantidad debe ser mayor a cero");
    }

    // Validación 4: Motivo específico para clasificación contable correcta
    if (!movimiento.motivo || movimiento.motivo.trim() === '') {
      advertencias.push("Se recomienda especificar el motivo para correcta clasificación contable");
    }

    // Validación 5: Documento de respaldo
    if (!movimiento.documento || movimiento.documento.trim() === '') {
      advertencias.push("Se recomienda especificar el documento de respaldo para auditoría");
    }

    // Validación 6: Alertas específicas por tipo de movimiento
    if (movimiento.tipo === 'salida') {
      if (movimiento.motivo?.toLowerCase().includes('pérdida') || 
          movimiento.motivo?.toLowerCase().includes('perdida')) {
        advertencias.push("Pérdida detectada: Se contabilizará en cuenta 5322 (Pérdidas y Faltantes)");
      } else if (movimiento.motivo?.toLowerCase().includes('venta') ||
                 movimiento.motivo?.toLowerCase().includes('factura')) {
        advertencias.push("Venta detectada: Se contabilizará en cuenta 5111 (Costo de Productos Vendidos)");
      } else {
        advertencias.push("Tipo de salida no específica: Revisar clasificación contable");
      }
    }

    return {
      esValido: errores.length === 0,
      errores,
      advertencias
    };
  };

  /**
   * Procesa un movimiento de inventario con validaciones normativas
   */
  const procesarMovimientoInventario = (
    movimiento: MovimientoInventario, 
    producto: ProductoInventario
  ): {
    exito: boolean;
    productoActualizado?: ProductoInventario;
    asientoGenerado?: any;
    mensaje: string;
  } => {
    try {
      // Validar movimiento según normativa
      const validacion = validarMovimientoNormativo(movimiento, producto);
      
      if (!validacion.esValido) {
        const erroresTexto = validacion.errores.join(', ');
        toast({
          title: "Error de Validación Normativa",
          description: erroresTexto,
          variant: "destructive"
        });
        return {
          exito: false,
          mensaje: erroresTexto
        };
      }

      // Mostrar advertencias si las hay
      if (validacion.advertencias.length > 0) {
        validacion.advertencias.forEach(advertencia => {
          toast({
            title: "Advertencia Normativa",
            description: advertencia,
            variant: "default"
          });
        });
      }

      // Calcular nuevo stock según tipo de movimiento
      let nuevoStock: number;
      if (movimiento.tipo === 'entrada') {
        nuevoStock = producto.stockActual + movimiento.cantidad;
      } else {
        nuevoStock = producto.stockActual - movimiento.cantidad;
      }

      // Calcular nuevo costo promedio ponderado según normativa boliviana
      let nuevoCostoPromedio = producto.costoPromedioPonderado;
      if (movimiento.tipo === 'entrada') {
        const valorInventarioAnterior = producto.stockActual * producto.costoPromedioPonderado;
        const valorCompra = movimiento.cantidad * movimiento.costoUnitario;
        const stockTotal = producto.stockActual + movimiento.cantidad;
        
        if (stockTotal > 0) {
          nuevoCostoPromedio = (valorInventarioAnterior + valorCompra) / stockTotal;
        }
      }

      // Actualizar datos del movimiento con valores calculados
      const movimientoCompleto: MovimientoInventario = {
        ...movimiento,
        stockAnterior: producto.stockActual,
        stockNuevo: nuevoStock,
        costoPromedioPonderado: nuevoCostoPromedio,
        valorMovimiento: movimiento.cantidad * (movimiento.tipo === 'entrada' ? movimiento.costoUnitario : nuevoCostoPromedio)
      };

      // Generar asiento contable según normativa boliviana
      const asientoContable = generarAsientoInventario(movimientoCompleto);
      
      if (!asientoContable) {
        return {
          exito: false,
          mensaje: "Error: No se pudo generar el asiento contable. Revisar configuración."
        };
      }

      // Crear producto actualizado
      const productoActualizado: ProductoInventario = {
        ...producto,
        stockActual: nuevoStock,
        costoPromedioPonderado: nuevoCostoPromedio,
        costoUnitario: movimiento.tipo === 'entrada' ? nuevoCostoPromedio : producto.costoUnitario,
        fechaUltimoMovimiento: movimiento.fecha,
        valorTotalInventario: nuevoStock * nuevoCostoPromedio
      };

      // Mensaje de éxito según tipo de operación
      let mensajeExito: string;
      if (movimiento.tipo === 'entrada') {
        mensajeExito = `Entrada registrada: +${movimiento.cantidad} unidades. Nuevo costo promedio: Bs. ${nuevoCostoPromedio.toFixed(2)}`;
      } else {
        mensajeExito = `Salida registrada: -${movimiento.cantidad} unidades. Stock restante: ${nuevoStock}`;
      }

      // Alertas específicas según normativa
      if (nuevoStock <= producto.stockMinimo && nuevoStock > 0) {
        toast({
          title: "Alerta de Stock Mínimo",
          description: `${producto.nombre} requiere reposición (Stock: ${nuevoStock})`,
          variant: "destructive"
        });
      }

      if (movimiento.tipo === 'salida' && movimiento.motivo?.toLowerCase().includes('pérdida')) {
        toast({
          title: "Pérdida Registrada",
          description: `Pérdida contabilizada correctamente en cuenta 5322`,
          variant: "default"
        });
      }

      return {
        exito: true,
        productoActualizado,
        asientoGenerado: asientoContable,
        mensaje: mensajeExito
      };

    } catch (error) {
      const mensajeError = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error al procesar movimiento:", error);
      
      toast({
        title: "Error del Sistema",
        description: mensajeError,
        variant: "destructive"
      });

      return {
        exito: false,
        mensaje: mensajeError
      };
    }
  };

  /**
   * Valida la integridad contable del inventario según normativa boliviana
   */
  const validarIntegridadContable = (asientos: any[] = [], productos: any[] = []) => {
    try {
      
      let saldoInventarioContable = 0;
      let totalCostoVentas = 0;
      let totalPerdidas = 0;

      // Calcular saldos contables
      asientos.forEach((asiento: any) => {
        if (asiento.estado === 'registrado') {
          asiento.cuentas.forEach((cuenta: any) => {
            if (cuenta.codigo === '1131' || cuenta.codigo === '1141') { // Inventarios
              saldoInventarioContable += cuenta.debe - cuenta.haber;
            } else if (cuenta.codigo === '5111') { // Costo de Ventas
              totalCostoVentas += cuenta.debe - cuenta.haber;
            } else if (cuenta.codigo === '5322') { // Pérdidas
              totalPerdidas += cuenta.debe - cuenta.haber;
            }
          });
        }
      });

      // Calcular inventario físico
      const inventarioFisico = productos.reduce((total: number, producto: any) => {
        return total + (producto.stockActual * producto.costoUnitario);
      }, 0);

      const diferencia = Math.abs(saldoInventarioContable - inventarioFisico);
      
      const resultado = {
        saldoContable: saldoInventarioContable,
        inventarioFisico: inventarioFisico,
        diferencia: diferencia,
        costoVentas: totalCostoVentas,
        perdidas: totalPerdidas,
        esValido: diferencia < 10, // Tolerancia de Bs. 10
        cumpleNormativa: saldoInventarioContable >= 0 && diferencia < 10
      };

      if (!resultado.cumpleNormativa) {
        toast({
          title: "⚠️ Alerta de Cumplimiento Normativo",
          description: diferencia >= 10 
            ? `Diferencia inventario físico vs contable: Bs. ${diferencia.toFixed(2)}`
            : "Saldo de inventarios negativo detectado",
          variant: "destructive"
        });
      }

      return resultado;
    } catch (error) {
      console.error("Error en validación de integridad:", error);
      return null;
    }
  };

  return {
    procesarMovimientoInventario,
    validarMovimientoNormativo,
    validarIntegridadContable
  };
};