import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  BarChart,
  FileText,
  DollarSign,
  Users,
  Package,
  Activity,
  CheckCircle,
  AlertCircle,
  Shield,
} from "lucide-react";
import {
  EnhancedHeader,
  MetricGrid,
  EnhancedMetricCard,
  Section,
} from "./dashboard/EnhancedLayout";
import { useToast } from "@/hooks/use-toast";
import { Factura, Cliente, simularValidacionSIN } from "./billing/BillingData";
import { MovimientoInventario } from "./inventory/InventoryData";
import InvoiceForm from "./billing/InvoiceForm";
import InvoiceAccountingHistory from "./billing/InvoiceAccountingHistory";
import { useProductosValidated } from "@/hooks/useProductosValidated";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useFacturas } from "@/hooks/useFacturas";
import { useClientesSupabase } from "@/hooks/useClientesSupabase";
import InvoiceSummary from "./billing/InvoiceSummary";
import InvoiceList from "./billing/InvoiceList";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import InvoicePreview from "./billing/InvoicePreview";
import DeclaracionIVA from "./DeclaracionIVA";
import { supabase } from "@/integrations/supabase/client";

interface NormativaAlert {
  id: string;
  titulo?: string | null;
  resumen?: string | null;
}

interface ConfiguracionTributaria {
  modalidad_facturacion?: string | null;
}

const FacturacionModule = () => {
  const {
    facturas,
    loading: facturasLoading,
    guardarFactura: guardarFacturaDB,
    actualizarEstadoFactura,
  } = useFacturas();
  const {
    clientes,
    loading: clientesLoading,
    agregarCliente,
  } = useClientesSupabase();
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showAccountingHistory, setShowAccountingHistory] = useState(false);
  const [showDeclaracionIVA, setShowDeclaracionIVA] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Factura | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [normativasAlerts, setNormativasAlerts] = useState<NormativaAlert[]>([]);
  const [configuracionTributaria, setConfiguracionTributaria] =
    useState<ConfiguracionTributaria | null>(null);
  const { toast } = useToast();
  const {
    productos,
    loading: productosLoading,
    error: productosError,
    connectivity,
    actualizarStockProducto,
    refetch: refetchProductos,
  } = useProductosValidated();
  const {
    generarAsientoVenta,
    generarAsientoInventario,
    getAsientos,
    generarAsientoPagoFactura,
    generarAsientoAnulacionFactura,
  } = useContabilidadIntegration();

  useEffect(() => {
    loadConfiguracionTributaria();
    loadNormativasAlerts();
  }, []);

  useEffect(() => {
    if (!productosLoading) {
      console.log("[Facturacion] Estado de productos:", {
        cantidad: productos.length,
        conectividad: connectivity.isConnected,
        autenticado: connectivity.isAuthenticated,
        error: productosError,
        ultimaConexion: connectivity.lastCheck,
      });

      if (productos.length > 0) {
        console.log(
          "[Facturacion] Productos disponibles:",
          productos.slice(0, 3).map((p) => ({
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            stock: p.stock_actual,
          })),
        );
      } else if (!productosError) {
        console.log("[Facturacion] No hay productos, verificando conectividad...");
      }
    }
  }, [productos, productosLoading, connectivity, productosError]);

  const loadConfiguracionTributaria = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracion_tributaria")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setConfiguracionTributaria((data as ConfiguracionTributaria | null) ?? null);
    } catch (error) {
      console.error("Error loading configuracion tributaria:", error);
    }
  };

  const loadNormativasAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("normativas_2025")
        .select("*")
        .eq("estado", "vigente")
        .in("categoria", ["facturacion", "iva"])
        .order("fecha_emision", { ascending: false })
        .limit(3);

      if (error) throw error;
      setNormativasAlerts((data as NormativaAlert[]) || []);
    } catch (error) {
      console.error("Error loading normativas alerts:", error);
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
        variant: "destructive",
      });
    }
  };

  const handleSaveInvoice = async (nuevaFactura: Factura) => {
    setShowNewInvoice(false);

    toast({
      title: "Procesando factura...",
      description: "Ejecutando validacion operativa del circuito SIN y registrando la venta.",
    });

    try {
      const facturaValidada = await simularValidacionSIN(nuevaFactura, {
        origen: "facturacion comercial",
      });

      if (facturaValidada.estadoSIN === "aceptado") {
        for (const item of facturaValidada.items) {
          const producto = productos.find((p) => p.id === item.productoId);
          if (producto && Number(producto.stock_actual || 0) < item.cantidad) {
            toast({
              title: "Error de stock",
              description: `Stock insuficiente para ${item.descripcion}. Disponible: ${producto.stock_actual}, solicitado: ${item.cantidad}.`,
              variant: "destructive",
            });
            return;
          }
        }

        const facturaGuardada = await guardarFacturaDB(facturaValidada);
        if (!facturaGuardada) {
          toast({
            title: "No se pudo registrar la factura",
            description: "La validacion operativa fue correcta, pero la factura no se guardo en la base principal.",
            variant: "destructive",
          });
          return;
        }

        const advertencias: string[] = [];

        for (const item of facturaValidada.items) {
          const producto = productos.find((p) => p.id === item.productoId);

          if (producto && Number(producto.costo_unitario || 0) > 0) {
            const stockDisponible = Number(producto.stock_actual || 0);

            if (stockDisponible < item.cantidad) {
              toast({
                title: "Error de stock",
                description: `Stock insuficiente para ${item.descripcion}. Disponible: ${stockDisponible}, solicitado: ${item.cantidad}.`,
                variant: "destructive",
              });
              return;
            }

            const stockActualizado = await actualizarStockProducto(
              item.productoId,
              item.cantidad,
              "salida",
            );

            if (!stockActualizado) {
              advertencias.push(`No se pudo actualizar el stock de ${item.descripcion}.`);
              continue;
            }

            const movimientoInventario: MovimientoInventario = {
              id: `FAC-${facturaValidada.numero}-${item.productoId}`,
              fecha: facturaValidada.fecha,
              tipo: "salida",
              productoId: item.productoId,
              producto: item.descripcion,
              cantidad: item.cantidad,
              costoUnitario: producto.costo_unitario,
              costoPromedioPonderado: producto.costo_unitario,
              motivo: "Venta",
              documento: `Factura N ${facturaValidada.numero}`,
              usuario: "Sistema",
              stockAnterior: producto.stock_actual,
              stockNuevo: producto.stock_actual - item.cantidad,
              valorMovimiento: item.cantidad * producto.costo_unitario,
            };

            const asientoInventario = await generarAsientoInventario(movimientoInventario);
            if (!asientoInventario) {
              advertencias.push(`No se pudo registrar el asiento de inventario para ${item.descripcion}.`);
            }
          }
        }

        const asientoVenta = await generarAsientoVenta(facturaValidada);
        if (!asientoVenta) {
          advertencias.push("No se pudo registrar el asiento principal de venta.");
        }

        toast(
          advertencias.length === 0
            ? {
                title: "Factura aceptada",
                description: `Factura N ${facturaValidada.numero} generada y registrada contablemente.`,
              }
            : {
                title: "Factura registrada con observaciones",
                description: advertencias.join(" "),
                variant: "destructive",
              },
        );
      } else {
        const facturaGuardada = await guardarFacturaDB(facturaValidada);
        if (!facturaGuardada) {
          toast({
            title: "No se pudo guardar el rechazo",
            description: `La factura N ${facturaValidada.numero} fue observada, pero el resultado no se persistio en la base principal.`,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Factura rechazada",
          description: `La factura N ${facturaValidada.numero} fue rechazada. Revisa las observaciones y vuelve a intentarlo.`,
          variant: "destructive",
          duration: 9000,
        });
      }
    } catch (error) {
      console.error("Error al procesar la factura:", error);
      toast({
        title: "Error de conexion",
        description: "No se pudo comunicar con el servicio de Impuestos Nacionales. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateInvoiceStatus = async (
    invoiceId: string,
    newStatus: "pagada" | "anulada",
  ) => {
    const invoiceToUpdate = facturas.find((factura) => factura.id === invoiceId);
    if (!invoiceToUpdate) return;

    if (newStatus === "pagada") {
      if (invoiceToUpdate.estado !== "enviada") {
        toast({
          title: "Accion no permitida",
          description: "Solo se pueden pagar facturas enviadas.",
        });
        return;
      }

      const updatedInvoice = { ...invoiceToUpdate, estado: "pagada" as const };
      await generarAsientoPagoFactura(updatedInvoice);
      await actualizarEstadoFactura(invoiceId, "pagada");
      toast({
        title: "Factura pagada",
        description: `La factura N ${updatedInvoice.numero} se marco como pagada.`,
      });
      return;
    }

    if (invoiceToUpdate.estado === "anulada" || invoiceToUpdate.estado === "pagada") {
      toast({
        title: "Accion no permitida",
        description: "No se puede anular una factura pagada o ya anulada.",
        variant: "destructive",
      });
      return;
    }

    const updatedInvoice = { ...invoiceToUpdate, estado: "anulada" as const };
    await generarAsientoAnulacionFactura(updatedInvoice);
    await actualizarEstadoFactura(invoiceId, "anulada");
    toast({
      title: "Factura anulada",
      description: `La factura N ${updatedInvoice.numero} ha sido anulada.`,
    });
  };

  const handleShowDetails = (invoice: Factura) => {
    setSelectedInvoice(invoice);
    setIsDetailViewOpen(true);
  };

  if (showNewInvoice) {
    if (productosLoading && !productosError && productos.length === 0) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-8 w-8 animate-pulse text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Cargando productos...</h3>
              <p className="mx-auto max-w-sm text-muted-foreground">
                Preparando el catalogo de productos.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={() => refetchProductos()} size="sm">
                Reintentar
              </Button>
              <Button onClick={() => setShowNewInvoice(false)} size="sm" variant="outline">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (productosError || (!connectivity.isConnected && connectivity.isAuthenticated === false)) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Error de conectividad</h3>
              <p className="mx-auto max-w-sm text-muted-foreground">
                {productosError || "No se puede conectar con la base de datos."}
              </p>
              {!connectivity.isAuthenticated && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Inicia sesion nuevamente para continuar.
                </p>
              )}
            </div>
            <div className="space-x-2">
              <Button onClick={() => window.location.reload()}>Reintentar</Button>
              <Button onClick={() => setShowNewInvoice(false)} variant="outline">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (productos.length === 0) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
              <Package className="h-8 w-8 text-warning" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                No hay productos disponibles
              </h3>
              <p className="mx-auto max-w-sm text-muted-foreground">
                Necesitas tener productos registrados antes de crear facturas.
              </p>
            </div>
            <Button onClick={() => setShowNewInvoice(false)} variant="outline">
              Volver a facturacion
            </Button>
          </div>
        </div>
      );
    }

    return (
      <InvoiceForm
        clientes={clientes}
        productos={productos.map((producto) => ({
          id: String(producto.id),
          codigo: String(producto.codigo || ""),
          nombre: String(producto.nombre || ""),
          descripcion: String(producto.descripcion || ""),
          categoria: String(producto.categoria_id || "General"),
          unidadMedida: String(producto.unidad_medida || "PZA"),
          precioVenta: Number(producto.precio_venta || 0),
          precioCompra: Number(producto.precio_compra || 0),
          costoUnitario: Number(producto.costo_unitario || 0),
          stockActual: Number(producto.stock_actual || 0),
          stockMinimo: Number(producto.stock_minimo || 0),
          codigoSIN: String(producto.codigo_sin || "00000000"),
          activo: Boolean(producto.activo),
          fechaCreacion:
            producto.created_at?.split("T")[0] || new Date().toISOString().slice(0, 10),
          fechaActualizacion:
            producto.updated_at?.split("T")[0] || new Date().toISOString().slice(0, 10),
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
          <h2 className="text-2xl font-bold">Historial contable de facturacion</h2>
          <Button onClick={() => setShowAccountingHistory(false)}>
            Volver a facturacion
          </Button>
        </div>
        <InvoiceAccountingHistory asientos={getAsientos()} />
      </div>
    );
  }

  if (showDeclaracionIVA) {
    return <DeclaracionIVA onBack={() => setShowDeclaracionIVA(false)} />;
  }

  const facturasPagadas = facturas.filter((factura) => factura.estado === "pagada").length;
  const facturasEnviadas = facturas.filter((factura) => factura.estado === "enviada").length;
  const facturasRechazadas = facturas.filter(
    (factura) => factura.estadoSIN === "rechazado",
  ).length;
  const ingresosMes = facturas
    .filter((factura) => factura.estado === "pagada")
    .reduce((sum, factura) => sum + factura.total, 0);
  const facturasHoy = facturas.filter(
    (factura) => factura.fecha === new Date().toISOString().slice(0, 10),
  ).length;

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Facturacion"
        subtitle="Emision, control comercial y trazabilidad contable dentro de una mesa operativa unica."
        badge={{
          text: `${facturas.length} facturas`,
          variant: "secondary",
        }}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAccountingHistory(true)}>
              <FileText className="mr-1.5 h-4 w-4" />
              Asientos
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowDeclaracionIVA(true)}>
              <BarChart className="mr-1.5 h-4 w-4" />
              IVA
            </Button>
            <Button size="sm" onClick={() => setShowNewInvoice(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva factura
            </Button>
          </div>
        }
      />

      <div className="hero-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
          <div className="space-y-4">
            <Alert className="border-amber-300 bg-amber-50/95 shadow-sm">
              <Shield className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-900">
                La validacion con el SIN en este modulo sigue en modo demostracion. Al 22 de
                marzo de 2026, el sistema aun no usa servicios oficiales de CUIS/CUFD,
                recepcion ni anulacion productiva.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Centro de operacion
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">
                  Mesa comercial y tributaria
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Emite facturas, controla cobranza, revisa el estado tributario y manten la
                  trazabilidad contable en un solo flujo.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                    {configuracionTributaria?.modalidad_facturacion || "Modalidad por definir"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                    {facturasEnviadas} pendientes de cobro
                  </Badge>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Radar normativo
                </p>
                <div className="mt-3 space-y-3">
                  {normativasAlerts.length > 0 ? (
                    normativasAlerts.slice(0, 2).map((alerta) => (
                      <div
                        key={alerta.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3"
                      >
                        <p className="text-sm font-semibold">
                          {alerta.titulo || "Actualizacion vigente"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">
                          {alerta.resumen ||
                            "Normativa vigente asociada al frente de facturacion e IVA."}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-sm font-semibold">Sin alertas regulatorias cargadas</p>
                      <p className="mt-1 text-xs leading-5 text-slate-300">
                        Cuando existan normativas vigentes de IVA o facturacion se mostraran
                        aqui para el equipo administrativo.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Pulso del dia
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Facturas emitidas hoy</p>
                  <p className="text-xs text-slate-500">Actividad comercial de la jornada</p>
                </div>
                <p className="text-2xl font-bold text-slate-950">{facturasHoy}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Facturas cobradas</p>
                  <p className="text-xs text-slate-500">Operaciones ya cerradas</p>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{facturasPagadas}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Clientes activos</p>
                  <p className="text-xs text-slate-500">Base comercial disponible</p>
                </div>
                <p className="text-2xl font-bold text-slate-950">{clientes.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MetricGrid columns={4}>
        <EnhancedMetricCard
          title="Facturas registradas"
          value={facturas.length}
          subtitle="Documentos comerciales en el perimetro"
          icon={FileText}
        />
        <EnhancedMetricCard
          title="Cobranza acumulada"
          value={`Bs ${ingresosMes.toLocaleString()}`}
          subtitle="Facturas pagadas y cerradas"
          icon={DollarSign}
          variant="success"
        />
        <EnhancedMetricCard
          title="Pendientes de gestion"
          value={facturasEnviadas}
          subtitle="Facturas emitidas aun no cobradas"
          icon={AlertCircle}
          variant="warning"
        />
        <EnhancedMetricCard
          title="Aceptacion demostrada"
          value={`${facturas.length > 0 ? (((facturas.length - facturasRechazadas) / facturas.length) * 100).toFixed(0) : 100}%`}
          subtitle="Tasa de respuesta positiva en el entorno actual"
          icon={CheckCircle}
        />
      </MetricGrid>

      <InvoiceSummary facturas={facturas} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Section title="Facturas" subtitle="Lista con acciones rapidas">
          <InvoiceList
            facturas={facturas}
            onShowDetails={handleShowDetails}
            onUpdateStatus={handleUpdateInvoiceStatus}
          />
        </Section>

        <Section title="Siguiente foco" subtitle="Acciones para acelerar la operacion">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-2.5">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">Seguimiento comercial</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {facturasEnviadas > 0
                      ? `Hay ${facturasEnviadas} facturas enviadas que conviene gestionar para acelerar cobranza y flujo de caja.`
                      : "No hay facturas pendientes de cobro en este momento."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-100 p-2.5">
                  <Activity className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">Estado del circuito</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {clientesLoading || facturasLoading
                      ? "Actualizando base comercial y tributaria."
                      : `La cartera opera con ${clientes.length} clientes y ${facturasPagadas} facturas ya cobradas.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Auditoria tributaria
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                El frente de facturacion sigue preparado para operacion comercial, pero la
                conexion productiva con servicios oficiales del SIN aun debe completarse.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-slate-100"
                >
                  CUIS/CUFD pendiente
                </Badge>
                <Badge
                  variant="secondary"
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-slate-100"
                >
                  Recepcion productiva pendiente
                </Badge>
              </div>
            </div>
          </div>
        </Section>
      </div>

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
