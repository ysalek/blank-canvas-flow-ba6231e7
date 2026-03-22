import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useFacturas } from "@/hooks/useFacturas";
import { useSupabasePagos } from "@/hooks/useSupabasePagos";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import { useProductosValidated } from "@/hooks/useProductosValidated";
import type { Factura, Cliente } from "@/components/contable/billing/BillingData";
import type { Producto as ProductoLegacy } from "@/components/contable/products/ProductsData";
import { AlertTriangle, CalendarClock, CheckCircle2, CreditCard, DollarSign, Eye, FileText, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import ProductSearchCombobox from "@/components/contable/billing/ProductSearchCombobox";

interface ItemVentaCredito {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

interface VentaCredito {
  id: string;
  facturaNumero: string;
  clienteId: string;
  clienteNombre: string;
  productos: ItemVentaCredito[];
  total: number;
  fecha: string;
  fechaVencimiento: string;
  estado: "pendiente" | "pagado" | "vencido";
  montoAbonado: number;
  saldoPendiente: number;
  observaciones: string;
}

interface FormularioCobro {
  monto: number;
  metodoPago: "efectivo" | "transferencia" | "cheque" | "tarjeta";
  referencia: string;
  observaciones: string;
}

const EMPTY_PAYMENT_FORM: FormularioCobro = {
  monto: 0,
  metodoPago: "transferencia",
  referencia: "",
  observaciones: "",
};

const formatCurrency = (value: number) => `Bs. ${value.toFixed(2)}`;

const formatDate = (value: string) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-BO");
};

const calcularDiasRestantes = (fechaVencimiento: string) => {
  const hoy = new Date();
  const vencimiento = new Date(`${fechaVencimiento}T00:00:00`);
  return Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
};

const obtenerNumeroFactura = (facturas: Factura[]) => {
  const ultimoNumero = facturas.reduce((maximo, factura) => {
    const numero = Number.parseInt((factura.numero || "").replace(/\D/g, ""), 10);
    return Number.isFinite(numero) ? Math.max(maximo, numero) : maximo;
  }, 0);

  return String(ultimoNumero + 1).padStart(6, "0");
};

const getEstadoBadge = (estado: VentaCredito["estado"]) => {
  switch (estado) {
    case "pagado":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "vencido":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-amber-100 text-amber-800 border-amber-200";
  }
};

const CreditSalesModule = () => {
  const { toast } = useToast();
  const [showNewForm, setShowNewForm] = useState(false);
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [formClienteId, setFormClienteId] = useState("");
  const [fechaVenc, setFechaVenc] = useState("");
  const [itemProductoId, setItemProductoId] = useState("");
  const [itemCantidad, setItemCantidad] = useState(1);
  const [itemPrecio, setItemPrecio] = useState(0);
  const [items, setItems] = useState<ItemVentaCredito[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [ventaDetalle, setVentaDetalle] = useState<VentaCredito | null>(null);
  const [pagoVenta, setPagoVenta] = useState<VentaCredito | null>(null);
  const [pagoForm, setPagoForm] = useState<FormularioCobro>(EMPTY_PAYMENT_FORM);

  const {
    facturas,
    loading: facturasLoading,
    guardarFactura,
    actualizarEstadoFactura,
    refetch: refetchFacturas,
  } = useFacturas();
  const { pagos, loading: pagosLoading, createPago, refetch: refetchPagos } = useSupabasePagos();
  const { clientes, loading: clientesLoading } = useSupabaseClientes();
  const {
    generarAsientoVenta,
    guardarAsiento,
    actualizarStockProducto,
    obtenerProductos,
  } = useContabilidadIntegration();
  const { loading: productosLoading, error: productosError, refetch: refetchProductos } = useProductosValidated();

  const productos = obtenerProductos() as ProductoLegacy[];

  const ventasCredito = useMemo<VentaCredito[]>(() => {
    return facturas
      .filter((factura) => factura.estado !== "anulada" && Boolean(factura.fechaVencimiento))
      .map((factura) => {
        const pagosFactura = pagos.filter((pago) => pago.tipo === "cobro" && pago.factura_id === factura.id);
        const montoAbonado = pagosFactura.reduce((sum, pago) => sum + Number(pago.monto || 0), 0);
        const saldoPendiente = Math.max(0, Number(factura.total || 0) - montoAbonado);
        const estaVencida = saldoPendiente > 0.01 && calcularDiasRestantes(factura.fechaVencimiento) < 0;

        return {
          id: factura.id,
          facturaNumero: factura.numero,
          clienteId: factura.cliente.id,
          clienteNombre: factura.cliente.nombre,
          productos: factura.items.map((item) => ({
            id: item.productoId || item.id,
            nombre: item.descripcion,
            cantidad: Number(item.cantidad || 0),
            precio: Number(item.precioUnitario || 0),
            subtotal: Number(item.subtotal || 0),
          })),
          total: Number(factura.total || 0),
          fecha: factura.fecha,
          fechaVencimiento: factura.fechaVencimiento,
          estado: saldoPendiente <= 0.01 || factura.estado === "pagada" ? "pagado" : estaVencida ? "vencido" : "pendiente",
          montoAbonado,
          saldoPendiente,
          observaciones: factura.observaciones || "",
        };
      })
      .sort((left, right) => right.fecha.localeCompare(left.fecha));
  }, [facturas, pagos]);

  const ventasPendientes = ventasCredito.filter((venta) => venta.estado !== "pagado");
  const ventasVencidas = ventasCredito.filter((venta) => venta.estado === "vencido");
  const totalCuentasPorCobrar = ventasPendientes.reduce((sum, venta) => sum + venta.saldoPendiente, 0);
  const totalCobrado = ventasCredito.reduce((sum, venta) => sum + venta.montoAbonado, 0);
  const totalFacturado = ventasCredito.reduce((sum, venta) => sum + venta.total, 0);
  const loading = facturasLoading || pagosLoading || clientesLoading || productosLoading;

  const resetForm = () => {
    setFormClienteId("");
    setFechaVenc("");
    setItemProductoId("");
    setItemCantidad(1);
    setItemPrecio(0);
    setItems([]);
    setObservaciones("");
  };

  const abrirDialogoCobro = (venta: VentaCredito) => {
    setPagoVenta(venta);
    setPagoForm({
      ...EMPTY_PAYMENT_FORM,
      monto: Number(venta.saldoPendiente.toFixed(2)),
    });
  };

  const agregarItem = () => {
    const producto = productos.find((item) => item.id === itemProductoId);
    if (!producto) return;

    const cantidad = Number(itemCantidad || 0);
    const precio = Number(itemPrecio || 0);
    if (cantidad <= 0 || precio <= 0) return;

    const itemExistente = items.find((item) => item.id === producto.id);
    if (itemExistente) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + cantidad,
                subtotal: Number(((item.cantidad + cantidad) * precio).toFixed(2)),
                precio,
              }
            : item
        )
      );
    } else {
      setItems((prev) => [
        {
          id: producto.id,
          nombre: producto.nombre,
          cantidad,
          precio,
          subtotal: Number((cantidad * precio).toFixed(2)),
        },
        ...prev,
      ]);
    }

    setItemProductoId("");
    setItemCantidad(1);
    setItemPrecio(0);
  };

  const registrarVentaCredito = async () => {
    if (!formClienteId || !fechaVenc || items.length === 0) {
      toast({
        title: "Datos incompletos",
        description: "Debes seleccionar cliente, fecha de vencimiento y al menos un producto.",
        variant: "destructive",
      });
      return;
    }

    const clienteSeleccionado = clientes.find((cliente) => cliente.id === formClienteId);
    if (!clienteSeleccionado) {
      toast({
        title: "Cliente no disponible",
        description: "Selecciona un cliente valido antes de registrar la venta.",
        variant: "destructive",
      });
      return;
    }

    const itemsFactura = items.map((item, index) => {
      const producto = productos.find((productoItem) => productoItem.id === item.id);
      return {
        id: `${item.id}-${index}`,
        productoId: item.id,
        codigo: producto?.codigo || `PROD-${index + 1}`,
        descripcion: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        descuento: 0,
        subtotal: Number(item.subtotal.toFixed(2)),
        codigoSIN: producto?.codigoSIN || "00000000",
      };
    });

    const productosSinStock = items
      .map((item) => {
        const producto = productos.find((productoItem) => productoItem.id === item.id);
        return {
          nombre: item.nombre,
          stockActual: Number(producto?.stockActual || 0),
          cantidad: item.cantidad,
        };
      })
      .filter((item) => item.stockActual < item.cantidad);

    if (productosSinStock.length > 0) {
      toast({
        title: "Stock insuficiente",
        description: `No hay existencias suficientes para ${productosSinStock[0].nombre}.`,
        variant: "destructive",
      });
      return;
    }

    const total = Number(itemsFactura.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
    const iva = Number((total - total / 1.13).toFixed(2));
    const subtotal = Number((total - iva).toFixed(2));

    const clienteFactura: Cliente = {
      id: clienteSeleccionado.id,
      nombre: clienteSeleccionado.nombre,
      nit: clienteSeleccionado.nit || "",
      email: clienteSeleccionado.email || "",
      telefono: clienteSeleccionado.telefono || "",
      direccion: clienteSeleccionado.direccion || "",
      activo: clienteSeleccionado.activo,
      fechaCreacion: clienteSeleccionado.created_at?.split("T")[0] || new Date().toISOString().slice(0, 10),
    };

    const facturaNueva: Factura = {
      id: `tmp-${Date.now()}`,
      numero: obtenerNumeroFactura(facturas),
      cliente: clienteFactura,
      fecha: new Date().toISOString().slice(0, 10),
      fechaVencimiento: fechaVenc,
      items: itemsFactura,
      subtotal,
      descuentoTotal: 0,
      iva,
      total,
      estado: "enviada",
      estadoSIN: "pendiente",
      cuf: "",
      cufd: "",
      puntoVenta: 0,
      codigoControl: "",
      observaciones,
      fechaCreacion: new Date().toISOString().slice(0, 10),
    };

    setIsSavingSale(true);
    try {
      const facturaGuardada = await guardarFactura(facturaNueva);
      if (!facturaGuardada) return;

      const asientoGuardado = await generarAsientoVenta(facturaGuardada);
      if (!asientoGuardado) {
        toast({
          title: "Venta registrada con observacion",
          description: "La factura se guardo, pero el asiento contable no pudo registrarse. Revisa el libro diario.",
          variant: "destructive",
        });
        await refetchFacturas();
        setShowNewForm(false);
        resetForm();
        return;
      }

      const resultadosStock = await Promise.all(
        itemsFactura.map((item) => actualizarStockProducto(item.productoId, item.cantidad, "salida"))
      );

      const huboFalloStock = resultadosStock.some((resultado) => !resultado);
      await Promise.all([refetchFacturas(), refetchProductos()]);

      toast({
        title: "Venta a credito registrada",
        description: huboFalloStock
          ? `Factura ${facturaGuardada.numero} registrada. Revisa inventario porque hubo una incidencia al actualizar stock.`
          : `Factura ${facturaGuardada.numero} integrada con cartera, contabilidad e inventario.`,
        variant: huboFalloStock ? "destructive" : "default",
      });

      setShowNewForm(false);
      resetForm();
    } finally {
      setIsSavingSale(false);
    }
  };

  const registrarCobro = async () => {
    if (!pagoVenta) return;

    const monto = Number(pagoForm.monto || 0);
    if (monto <= 0) {
      toast({
        title: "Monto invalido",
        description: "Ingresa un monto mayor a cero para registrar el cobro.",
        variant: "destructive",
      });
      return;
    }

    if (monto > pagoVenta.saldoPendiente) {
      toast({
        title: "Monto excedido",
        description: "El cobro no puede ser mayor al saldo pendiente.",
        variant: "destructive",
      });
      return;
    }

    const asientoCobro = {
      id: `COBRO-${Date.now()}`,
      numero: `COB-${Date.now().toString().slice(-6)}`,
      fecha: new Date().toISOString().slice(0, 10),
      concepto: `Cobro de venta a credito factura ${pagoVenta.facturaNumero}`,
      referencia: pagoForm.referencia || pagoVenta.facturaNumero,
      estado: "registrado" as const,
      debe: monto,
      haber: monto,
      cuentas: [
        { codigo: "1111", nombre: "Caja", debe: monto, haber: 0 },
        { codigo: "1121", nombre: "Cuentas por Cobrar Comerciales", debe: 0, haber: monto },
      ],
    };

    setIsSavingPayment(true);
    try {
      const asientoGuardado = await guardarAsiento(asientoCobro);
      if (!asientoGuardado) return;

      await createPago({
        tipo: "cobro",
        factura_id: pagoVenta.id,
        fecha: asientoCobro.fecha,
        monto,
        metodo_pago: pagoForm.metodoPago,
        numero_comprobante: pagoForm.referencia || pagoVenta.facturaNumero,
        observaciones: pagoForm.observaciones,
        estado: "registrado",
      });

      const nuevoSaldo = Math.max(0, pagoVenta.saldoPendiente - monto);
      await actualizarEstadoFactura(pagoVenta.id, nuevoSaldo <= 0.01 ? "pagada" : "enviada");
      await Promise.all([refetchFacturas(), refetchPagos()]);

      toast({
        title: "Cobro registrado",
        description: `Se registro un cobro por ${formatCurrency(monto)} con impacto contable y de cartera.`,
      });

      setPagoVenta(null);
      setPagoForm(EMPTY_PAYMENT_FORM);
    } catch (error) {
      console.error("Error registrando cobro:", error);
      toast({
        title: "Operacion incompleta",
        description: "El asiento pudo haberse registrado, pero fallo la actualizacion de pagos o del estado de la factura.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPayment(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="grid gap-6 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 px-6 py-7 text-white lg:grid-cols-[1.6fr_0.9fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-100">
                <Wallet className="h-3.5 w-3.5" />
                Tesoreria comercial
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight">Ventas a credito conectadas con cartera y contabilidad</h2>
                <p className="max-w-2xl text-sm text-slate-200">
                  Este modulo ya trabaja sobre facturas y pagos persistidos en Supabase. Cada venta genera documento real,
                  asiento contable y seguimiento auditable del saldo pendiente.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Accion principal</p>
                  <p className="mt-2 text-lg font-semibold">Registrar nueva venta a credito</p>
                  <p className="mt-1 text-sm text-slate-200">Crea factura, asiento y cartera en un solo flujo.</p>
                </div>
                <CreditCard className="h-10 w-10 rounded-xl bg-white/10 p-2 text-emerald-200" />
              </div>

              <Dialog
                open={showNewForm}
                onOpenChange={(open) => {
                  setShowNewForm(open);
                  if (!open) resetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="mt-5 w-full bg-white text-slate-950 hover:bg-slate-100">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva venta a credito
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>Registrar venta a credito</DialogTitle>
                    <DialogDescription>
                      El registro crea una factura real en Supabase, genera el asiento de venta y deja la cuenta por cobrar lista para cobranza.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Cliente</Label>
                        <Select value={formClienteId} onValueChange={setFormClienteId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientes.map((cliente) => (
                              <SelectItem key={cliente.id} value={cliente.id}>
                                {cliente.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Fecha de vencimiento</Label>
                        <Input type="date" value={fechaVenc} onChange={(event) => setFechaVenc(event.target.value)} />
                      </div>

                      <div className="space-y-2">
                        <Label>Observaciones</Label>
                        <Textarea
                          value={observaciones}
                          onChange={(event) => setObservaciones(event.target.value)}
                          placeholder="Condiciones comerciales, notas de entrega o acuerdos de cobranza"
                          className="min-h-[40px]"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">Detalle de productos</h3>
                          <p className="text-sm text-slate-500">Selecciona productos del catalogo real y arma la factura con precios finales.</p>
                        </div>
                        {productosError && (
                          <Button variant="outline" size="sm" onClick={() => void refetchProductos()}>
                            Reintentar catalogo
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-6 md:items-end">
                        <div className="md:col-span-3">
                          <Label>Producto</Label>
                          <ProductSearchCombobox
                            productos={productos}
                            value={itemProductoId}
                            onChange={(value) => {
                              setItemProductoId(value);
                              const producto = productos.find((item) => item.id === value);
                              setItemPrecio(Number(producto?.precioVenta || 0));
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            min={1}
                            value={itemCantidad}
                            onChange={(event) => setItemCantidad(Number(event.target.value))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Precio</Label>
                          <Input
                            type="number"
                            min={0}
                            value={itemPrecio}
                            onChange={(event) => setItemPrecio(Number(event.target.value))}
                          />
                        </div>

                        <div>
                          <Button
                            type="button"
                            onClick={agregarItem}
                            disabled={!itemProductoId || itemCantidad <= 0 || itemPrecio <= 0}
                            className="w-full"
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border bg-white">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                              <TableHead className="text-right">Precio</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                              <TableHead className="w-[72px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item, index) => (
                              <TableRow key={`${item.id}-${index}`}>
                                <TableCell className="font-medium">{item.nombre}</TableCell>
                                <TableCell className="text-right">{item.cantidad}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.precio)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setItems((prev) => prev.filter((_, currentIndex) => currentIndex !== index))}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}

                            {items.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                  Agrega productos para construir la factura de credito.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4" />
                            <p>
                              Antes de grabar validaremos stock disponible. Si el asiento contable o el inventario fallan, el sistema te avisara para mantener trazabilidad.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resumen</p>
                          <p className="mt-2 text-3xl font-semibold text-slate-950">
                            {formatCurrency(items.reduce((sum, item) => sum + item.subtotal, 0))}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            IVA incluido: {formatCurrency(items.reduce((sum, item) => sum + item.subtotal, 0) - items.reduce((sum, item) => sum + item.subtotal, 0) / 1.13)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button variant="outline" onClick={() => setShowNewForm(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={() => void registrarVentaCredito()} disabled={isSavingSale}>
                        {isSavingSale && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Registrar venta
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900">Total por cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-emerald-950">{formatCurrency(totalCuentasPorCobrar)}</p>
                <p className="text-xs text-emerald-800">{ventasPendientes.length} operaciones activas</p>
              </div>
              <Wallet className="h-8 w-8 text-emerald-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Cobrado acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-950">{formatCurrency(totalCobrado)}</p>
                <p className="text-xs text-slate-500">Pagos reales registrados en Supabase</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">Ventas vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-amber-950">{ventasVencidas.length}</p>
                <p className="text-xs text-amber-800">Requieren gestion de cobranza</p>
              </div>
              <CalendarClock className="h-8 w-8 text-amber-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Facturado historico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-950">{formatCurrency(totalFacturado)}</p>
                <p className="text-xs text-slate-500">{ventasCredito.length} facturas de credito</p>
              </div>
              <FileText className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Panel ejecutivo de cartera</CardTitle>
            <p className="text-sm text-muted-foreground">
              La tabla se alimenta desde facturas con vencimiento y pagos reales. Ya no depende de datos locales del navegador.
            </p>
          </div>
          {loading && (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Sincronizando datos
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Emision</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Cobrado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventasCredito.map((venta) => (
                  <TableRow key={venta.id}>
                    <TableCell className="font-medium">{venta.facturaNumero}</TableCell>
                    <TableCell>{venta.clienteNombre}</TableCell>
                    <TableCell>{formatDate(venta.fecha)}</TableCell>
                    <TableCell>{formatDate(venta.fechaVencimiento)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(venta.total)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(venta.montoAbonado)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(venta.saldoPendiente)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getEstadoBadge(venta.estado)}>
                        {venta.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setVentaDetalle(venta)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirDialogoCobro(venta)}
                          disabled={venta.saldoPendiente <= 0.01}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {ventasCredito.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      No existen ventas a credito persistidas todavia. Registra la primera para activar cartera, cobros y trazabilidad contable.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(ventaDetalle)} onOpenChange={(open) => !open && setVentaDetalle(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de la venta a credito</DialogTitle>
            <DialogDescription>Resumen comercial y contable de la factura vinculada a esta cuenta por cobrar.</DialogDescription>
          </DialogHeader>

          {ventaDetalle && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Factura</p>
                    <p className="mt-2 text-lg font-semibold">{ventaDetalle.facturaNumero}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cliente</p>
                    <p className="mt-2 text-sm font-semibold">{ventaDetalle.clienteNombre}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Saldo</p>
                    <p className="mt-2 text-lg font-semibold">{formatCurrency(ventaDetalle.saldoPendiente)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Estado</p>
                    <Badge variant="outline" className={`mt-2 ${getEstadoBadge(ventaDetalle.estado)}`}>
                      {ventaDetalle.estado}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventaDetalle.productos.map((producto, index) => (
                      <TableRow key={`${producto.id}-${index}`}>
                        <TableCell>{producto.nombre}</TableCell>
                        <TableCell className="text-right">{producto.cantidad}</TableCell>
                        <TableCell className="text-right">{formatCurrency(producto.precio)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(producto.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Emision</p>
                  <p className="mt-2 font-semibold">{formatDate(ventaDetalle.fecha)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Vencimiento</p>
                  <p className="mt-2 font-semibold">{formatDate(ventaDetalle.fechaVencimiento)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dias a vencimiento</p>
                  <p className="mt-2 font-semibold">{calcularDiasRestantes(ventaDetalle.fechaVencimiento)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right">
                <p>Total facturado: {formatCurrency(ventaDetalle.total)}</p>
                <p className="text-sm text-slate-500">IVA incluido: {formatCurrency(ventaDetalle.total - ventaDetalle.total / 1.13)}</p>
                <p className="text-sm text-slate-500">Cobrado: {formatCurrency(ventaDetalle.montoAbonado)}</p>
                <p className="text-lg font-semibold text-slate-950">Saldo pendiente: {formatCurrency(ventaDetalle.saldoPendiente)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pagoVenta)}
        onOpenChange={(open) => {
          if (!open) {
            setPagoVenta(null);
            setPagoForm(EMPTY_PAYMENT_FORM);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar cobro</DialogTitle>
            <DialogDescription>El cobro genera asiento, registra el pago en Supabase y actualiza el estado de la factura.</DialogDescription>
          </DialogHeader>

          {pagoVenta && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Saldo actual</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-950">{formatCurrency(pagoVenta.saldoPendiente)}</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Factura {pagoVenta.facturaNumero} - {pagoVenta.clienteNombre}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Monto a cobrar</Label>
                  <Input
                    type="number"
                    min={0}
                    max={pagoVenta.saldoPendiente}
                    value={pagoForm.monto}
                    onChange={(event) =>
                      setPagoForm((prev) => ({ ...prev, monto: Number(event.target.value) }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Metodo de pago</Label>
                  <Select
                    value={pagoForm.metodoPago}
                    onValueChange={(value: FormularioCobro["metodoPago"]) =>
                      setPagoForm((prev) => ({ ...prev, metodoPago: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input
                  value={pagoForm.referencia}
                  onChange={(event) => setPagoForm((prev) => ({ ...prev, referencia: event.target.value }))}
                  placeholder="Nro. de transferencia, comprobante o cheque"
                />
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={pagoForm.observaciones}
                  onChange={(event) => setPagoForm((prev) => ({ ...prev, observaciones: event.target.value }))}
                  placeholder="Notas del cobro, banco receptor o acuerdo con el cliente"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setPagoVenta(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => void registrarCobro()} disabled={isSavingPayment}>
                  {isSavingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar cobro
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditSalesModule;
