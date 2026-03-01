import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, BarChart, FileText, DollarSign, Users, Package, TrendingUp, Activity, CheckCircle, AlertCircle, Shield, Gavel } from "lucide-react";
import { EnhancedHeader, MetricGrid, EnhancedMetricCard, Section } from "./dashboard/EnhancedLayout";
import { useToast } from "@/hooks/use-toast";
import { Factura, Cliente, simularValidacionSIN } from "./billing/BillingData";
import { MovimientoInventario } from "./inventory/InventoryData";
import InvoiceForm from "./billing/InvoiceForm";
import InvoiceAccountingHistory from "./billing/InvoiceAccountingHistory";
import { useProductosValidated } from '@/hooks/useProductosValidated';
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useFacturas } from "@/hooks/useFacturas";
import { useClientesSupabase } from "@/hooks/useClientesSupabase";
import InvoiceSummary from "./billing/InvoiceSummary";
import InvoiceList from "./billing/InvoiceList";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import InvoicePreview from "./billing/InvoicePreview";
import DeclaracionIVA from "./DeclaracionIVA";
import { supabase } from "@/integrations/supabase/client";

const FacturacionModule = () => {
  const { facturas, loading: facturasLoading, guardarFactura: guardarFacturaDB, actualizarEstadoFactura } = useFacturas();
  const { clientes, loading: clientesLoading, agregarCliente } = useClientesSupabase();
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showAccountingHistory, setShowAccountingHistory] = useState(false);
  const [showDeclaracionIVA, setShowDeclaracionIVA] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Factura | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [normativasAlerts, setNormativasAlerts] = useState<any[]>([]);
  const [configuracionTributaria, setConfiguracionTributaria] = useState<any>(null);
  const { toast } = useToast();
  const { productos, loading: productosLoading, error: productosError, connectivity, crearProducto, actualizarStockProducto } = useProductosValidated();
  const { 
    generarAsientoVenta, 
    generarAsientoInventario, 
    getAsientos,
    generarAsientoPagoFactura,
    generarAsientoAnulacionFactura
  } = useContabilidadIntegration();

  // Cargar configuración tributaria y normativas
  useEffect(() => {
    loadConfiguracionTributaria();
    loadNormativasAlerts();
  }, []);
  // Debug y validación de productos
  useEffect(() => {
    if (!productosLoading) {
      console.log('📦 [Facturación] Estado de productos:', {
        cantidad: productos.length,
        conectividad: connectivity.isConnected,
        autenticado: connectivity.isAuthenticated,
        error: productosError,
        ultimaConexion: connectivity.lastCheck
      });
      
      if (productos.length > 0) {
        console.log('✅ [Facturación] Productos disponibles:', productos.slice(0, 3).map(p => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, stock: p.stock_actual })));
      } else if (!productosError) {
        console.log('⚠️ [Facturación] No hay productos - verificando conectividad...');
      }
    }
  }, [productos.length, productosLoading, connectivity, productosError]);

  const loadConfiguracionTributaria = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_tributaria')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setConfiguracionTributaria(data);
    } catch (error: any) {
      console.error('Error loading configuracion tributaria:', error);
    }
  };

  const loadNormativasAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('normativas_2025')
        .select('*')
        .eq('estado', 'vigente')
        .in('categoria', ['facturacion', 'iva'])
        .order('fecha_emision', { ascending: false })
        .limit(3);

      if (error) throw error;
      setNormativasAlerts(data || []);
    } catch (error: any) {
      console.error('Error loading normativas alerts:', error);
    }
  };


  const handleAddNewClient = async (nuevoCliente: Cliente) => {
    const result = await agregarCliente(nuevoCliente);
    if (result) {
      toast({
        title: "Cliente creado",
        description: `${nuevoCliente.nombre} ha sido agregado exitosamente.`,
      });
    } else {
      toast({
        title: "Error",
        description: "No se pudo crear el cliente.",
        variant: "destructive"
      });
    }
  };

  const handleSaveInvoice = async (nuevaFactura: Factura) => {
    setShowNewInvoice(false);
    
    toast({
      title: "Procesando factura...",
      description: "Enviando al SIN para validación. Esto puede tardar unos segundos.",
    });

    try {
      const facturaValidada = await simularValidacionSIN(nuevaFactura);
      
      toast({
        title: "Respuesta del SIN recibida",
        description: "Procesando integración contable...",
      });

      if (facturaValidada.estadoSIN === 'aceptado') {
        // La factura fue aceptada, proceder con la contabilidad
        
        // 1. Validar y procesar inventario según normativa boliviana
        console.log('📦 Procesando inventario para factura:', facturaValidada.numero);
        for (const item of facturaValidada.items) {
          const producto = productos.find(p => p.id === item.productoId);
          console.log(`🔍 Producto encontrado:`, { 
            id: producto?.id, 
            stock_actual: producto?.stock_actual, 
            cantidad_solicitada: item.cantidad 
          });
          
          if (producto && Number(producto.costo_unitario || 0) > 0) {
            // CRÍTICO: Verificar stock antes de procesar
            const stockDisponible = Number(producto.stock_actual || 0);
            console.log('🔍 Validando stock para', item.descripcion + ':', 'Stock disponible:', stockDisponible, 'Solicitado:', item.cantidad);
            
            if (stockDisponible < item.cantidad) {
              console.error('❌ Stock insuficiente:', { producto: item.descripcion, disponible: stockDisponible, solicitado: item.cantidad });
              toast({
                title: "Error de Stock - Normativa Boliviana",
                description: `Stock insuficiente para ${item.descripcion}. Disponible: ${stockDisponible}, Solicitado: ${item.cantidad}`,
                variant: "destructive"
              });
              return; // Detener el proceso si no hay stock suficiente
            }
            
            console.log('✅ Stock suficiente para', item.descripcion);
            
            // CRÍTICO: Actualizar stock del producto en Supabase
            console.log('🔄 Actualizando stock del producto:', item.descripcion);
            const stockActualizado = await actualizarStockProducto(item.productoId, item.cantidad, 'salida');
            
            if (!stockActualizado) {
              console.error('❌ Error actualizando stock para:', item.descripcion);
              toast({
                title: "Error de Stock - Normativa Boliviana",
                description: `No se pudo actualizar el stock para ${item.descripcion}. Factura cancelada.`,
                variant: "destructive"
              });
              return; // Detener el proceso si falla la actualización de stock
            }
            
            console.log('✅ Stock actualizado exitosamente para:', item.descripcion);

            // Generar movimiento de inventario con motivo específico para contabilidad
            const movimientoInventario: MovimientoInventario = {
              id: `FAC-${facturaValidada.numero}-${item.productoId}`,
              fecha: facturaValidada.fecha,
              tipo: 'salida',
              productoId: item.productoId,
              producto: item.descripcion,
              cantidad: item.cantidad,
              costoUnitario: producto.costo_unitario,
              costoPromedioPonderado: producto.costo_unitario,
              motivo: 'Venta',
              documento: `Factura N° ${facturaValidada.numero}`,
              usuario: 'Sistema',
              stockAnterior: producto.stock_actual,
              stockNuevo: producto.stock_actual - item.cantidad,
              valorMovimiento: item.cantidad * producto.costo_unitario,
            };

            // Generar asiento contable del movimiento de inventario
            await generarAsientoInventario(movimientoInventario);

            // Movimiento de inventario ya creado por actualizarStockProducto
            
            console.log(`✅ Stock descontado: ${item.descripcion} - Cantidad: ${item.cantidad}`);
          }
        }

        // 2. Generar asiento contable de venta
        await generarAsientoVenta(facturaValidada);
        
        // 3. Guardar factura en Supabase
        await guardarFacturaDB(facturaValidada);
        
        toast({
          title: "Factura ACEPTADA por el SIN",
          description: `Factura N° ${facturaValidada.numero} generada y registrada contablemente.`,
          variant: "default",
        });

      } else {
        // La factura fue rechazada
        await guardarFacturaDB(facturaValidada);

        toast({
          title: "Factura RECHAZADA por el SIN",
          description: `La factura N° ${facturaValidada.numero} fue rechazada. Revise las observaciones y corríjala.`,
          variant: "destructive",
          duration: 9000,
        });
      }
      
    } catch (error) {
      console.error("Error al procesar la factura:", error);
      toast({
        title: "Error de Conexión",
        description: "No se pudo comunicar con el servicio de Impuestos Nacionales. Intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: 'pagada' | 'anulada') => {
    const invoiceToUpdate = facturas.find(f => f.id === invoiceId);
    if (!invoiceToUpdate) return;

    if (newStatus === 'pagada') {
      if (invoiceToUpdate.estado !== 'enviada') {
        toast({ title: "Acción no permitida", description: "Solo se pueden pagar facturas enviadas.", variant: "default" });
        return;
      }
      const updatedInvoice = { ...invoiceToUpdate, estado: 'pagada' as const };
      await generarAsientoPagoFactura(updatedInvoice);
      await actualizarEstadoFactura(invoiceId, 'pagada');
      toast({ title: "Factura Pagada", description: `La factura N° ${updatedInvoice.numero} se marcó como pagada.` });
    } else if (newStatus === 'anulada') {
      if (invoiceToUpdate.estado === 'anulada' || invoiceToUpdate.estado === 'pagada') {
        toast({ title: "Acción no permitida", description: "No se puede anular una factura pagada o ya anulada.", variant: "destructive" });
        return;
      }
      const updatedInvoice = { ...invoiceToUpdate, estado: 'anulada' as const };
      await generarAsientoAnulacionFactura(updatedInvoice);
      await actualizarEstadoFactura(invoiceId, 'anulada');
      toast({ title: "Factura Anulada", description: `La factura N° ${updatedInvoice.numero} ha sido anulada.` });
    }
  };

  const handleShowDetails = (invoice: Factura) => {
    setSelectedInvoice(invoice);
    setIsDetailViewOpen(true);
  };

  if (showNewInvoice) {
    // Verificar el estado de carga y disponibilidad de productos
    if (productosLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Cargando productos...</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Preparando el catálogo de productos
              </p>
            </div>
            <Button onClick={() => setShowNewInvoice(false)} variant="outline">
              Cancelar
            </Button>
          </div>
        </div>
      );
    }

    // Verificar errores de conectividad solo si NO está autenticado
    if (productosError || (!connectivity.isConnected && connectivity.isAuthenticated === false)) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Error de conectividad</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {productosError || 'No se puede conectar con la base de datos'}
              </p>
              {!connectivity.isAuthenticated && (
                <p className="text-sm text-muted-foreground mt-2">
                  Por favor, inicie sesión nuevamente
                </p>
              )}
            </div>
            <div className="space-x-2">
              <Button onClick={() => window.location.reload()} variant="default">
                Reintentar
              </Button>
              <Button onClick={() => setShowNewInvoice(false)} variant="outline">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    // Verificar que hay productos disponibles antes de mostrar el formulario
    if (productos.length === 0) {
      return (
         <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-warning/10 flex items-center justify-center">
              <Package className="w-8 h-8 text-warning" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">No hay productos disponibles</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Necesitas tener productos registrados antes de crear facturas. 
                Dirígete al módulo de Productos para agregar productos.
              </p>
            </div>
            <Button onClick={() => setShowNewInvoice(false)} variant="outline">
              Volver a Facturación
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <InvoiceForm
        clientes={clientes}
        productos={productos.map(p => ({
          id: String(p.id),
          codigo: String(p.codigo || ''),
          nombre: String(p.nombre || ''),
          descripcion: String(p.descripcion || ''),
          categoria: String(p.categoria_id || 'General'),
          unidadMedida: String(p.unidad_medida || 'PZA'),
          precioVenta: Number(p.precio_venta || 0),
          precioCompra: Number(p.precio_compra || 0),
          costoUnitario: Number(p.costo_unitario || 0),
          stockActual: Number(p.stock_actual || 0),
          stockMinimo: Number(p.stock_minimo || 0),
          codigoSIN: String(p.codigo_sin || '00000000'),
          activo: Boolean(p.activo),
          fechaCreacion: p.created_at?.split('T')[0] || new Date().toISOString().slice(0, 10),
          fechaActualizacion: p.updated_at?.split('T')[0] || new Date().toISOString().slice(0, 10)
        }))}
        facturas={facturas}
        onSave={handleSaveInvoice}
        onCancel={() => setShowNewInvoice(false)}
        onAddNewClient={handleAddNewClient}
      />
    );
  }

  if (showAccountingHistory) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Historial Contable de Facturación</h2>
          <Button onClick={() => setShowAccountingHistory(false)}>
            Volver a Facturación
          </Button>
        </div>
        <InvoiceAccountingHistory 
          asientos={getAsientos()} 
        />
      </div>
    );
  }

  if (showDeclaracionIVA) {
    return <DeclaracionIVA onBack={() => setShowDeclaracionIVA(false)} />;
  }

  const facturasPagadas = facturas.filter(f => f.estado === 'pagada').length;
  const facturasEnviadas = facturas.filter(f => f.estado === 'enviada').length;
  const facturasRechazadas = facturas.filter(f => f.estadoSIN === 'rechazado').length;
  const ingresosMes = facturas.filter(f => f.estado === 'pagada').reduce((sum, f) => sum + f.total, 0);
  const facturasHoy = facturas.filter(f => f.fecha === new Date().toISOString().slice(0, 10)).length;

  return (
    <div className="space-y-6">
      {/* Header compacto */}
      <EnhancedHeader
        title="Facturación"
        subtitle="Emisión, control y seguimiento de facturas"
        badge={{
          text: `${facturas.length} facturas`,
          variant: "secondary"
        }}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setShowAccountingHistory(true)}>
              <FileText className="w-4 h-4 mr-1.5" />
              Asientos
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowDeclaracionIVA(true)}>
              <BarChart className="w-4 h-4 mr-1.5" />
              IVA
            </Button>
            <Button 
              size="sm"
              onClick={() => setShowNewInvoice(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva Factura
            </Button>
          </div>
        }
      />

      {/* KPIs en línea compacta */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card animate-slide-up stagger-1 hover-lift">
          <div className="p-2 rounded-lg bg-primary/10"><FileText className="w-4 h-4 text-primary" /></div>
          <div>
            <p className="text-xl font-bold">{facturas.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card animate-slide-up stagger-2 hover-lift">
          <div className="p-2 rounded-lg bg-success/10"><DollarSign className="w-4 h-4 text-success" /></div>
          <div>
            <p className="text-xl font-bold">Bs {ingresosMes.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Cobrado</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card animate-slide-up stagger-3 hover-lift">
          <div className="p-2 rounded-lg bg-warning/10"><AlertCircle className="w-4 h-4 text-warning" /></div>
          <div>
            <p className="text-xl font-bold">{facturasEnviadas}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card animate-slide-up stagger-4 hover-lift">
          <div className="p-2 rounded-lg bg-success/10"><CheckCircle className="w-4 h-4 text-success" /></div>
          <div>
            <p className="text-xl font-bold">{facturas.length > 0 ? (((facturas.length - facturasRechazadas) / facturas.length) * 100).toFixed(0) : 100}%</p>
            <p className="text-xs text-muted-foreground">Éxito SIN</p>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <InvoiceSummary facturas={facturas} />

      {/* Lista de Facturas */}
      <Section title="Facturas" subtitle="Lista con acciones rápidas">
        <InvoiceList 
          facturas={facturas} 
          onShowDetails={handleShowDetails}
          onUpdateStatus={handleUpdateInvoiceStatus}
        />
      </Section>
      
      {selectedInvoice && (
        <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
          <DialogContent className="max-w-4xl p-0" aria-describedby="invoice-preview-description">
            <div className="p-6">
              <div className="sr-only" id="invoice-preview-description">
                Vista previa de la factura seleccionada
              </div>
              <InvoicePreview invoice={selectedInvoice} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FacturacionModule;
