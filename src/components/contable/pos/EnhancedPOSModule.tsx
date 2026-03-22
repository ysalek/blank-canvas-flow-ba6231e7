import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useProductosValidated, type Producto } from "@/hooks/useProductosValidated";
import { useSupabaseClientes, type ClienteSupabase } from "@/hooks/useSupabaseClientes";
import { useFacturas } from "@/hooks/useFacturas";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import ProductThumbnail from "../products/ProductThumbnail";
import type { Factura } from "../billing/BillingData";
import type { MovimientoInventario } from "../inventory/InventoryData";
import {
  Banknote,
  Calculator,
  CreditCard,
  Grid3X3,
  Minus,
  Package,
  Percent,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  Scan,
  ScanLine,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

interface ItemVenta {
  id: string;
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

interface ClientePos {
  id: string;
  nombre: string;
  nit: string;
  telefono: string;
  email?: string;
  direccion?: string;
}

interface VentaResumen {
  id: string;
  numero: string;
  fecha: string;
  hora: string;
  cliente: ClientePos;
  items: ItemVenta[];
  subtotal: number;
  descuentoTotal: number;
  impuestos: number;
  total: number;
  metodoPago: string;
  montoRecibido: number;
  cambio: number;
  vendedor: string;
  estado: "completada" | "pendiente";
}

const CLIENTE_GENERAL: ClientePos = {
  id: "general",
  nombre: "Cliente General",
  nit: "0",
  telefono: "",
  email: "",
  direccion: "",
};

const EnhancedPOSModule = () => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const { productos, loading: loadingProductos, actualizarStockProducto } = useProductosValidated();
  const { clientes, loading: loadingClientes, crearCliente } = useSupabaseClientes();
  const { facturas, guardarFactura } = useFacturas();
  const { generarAsientoInventario, generarAsientoVenta, generarAsientoPagoFactura } = useContabilidadIntegration();

  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [cliente, setCliente] = useState<ClientePos | null>(null);
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");
  const [montoRecibido, setMontoRecibido] = useState<number>(0);
  const [showTicket, setShowTicket] = useState(false);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<VentaResumen | null>(null);
  const [activeTab, setActiveTab] = useState("productos");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState<Partial<ClientePos>>({
    nombre: "",
    nit: "",
    telefono: "",
    email: "",
    direccion: "",
  });

  const clientesDisponibles = useMemo<ClientePos[]>(
    () => [
      CLIENTE_GENERAL,
      ...clientes.map((clienteSupabase: ClienteSupabase) => ({
        id: clienteSupabase.id,
        nombre: clienteSupabase.nombre,
        nit: clienteSupabase.nit,
        telefono: clienteSupabase.telefono || "",
        email: clienteSupabase.email || "",
        direccion: clienteSupabase.direccion || "",
      })),
    ],
    [clientes]
  );

  const categoriasDisponibles = [...new Set(productos.map((producto) => producto.categoria || "Sin categoria"))];
  const productosFiltrados = productos.filter(
    (producto) =>
      producto.activo &&
      (!selectedCategoria || (producto.categoria || "Sin categoria") === selectedCategoria) &&
      (producto.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
        producto.codigo.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
        (codigoBarras && producto.codigo === codigoBarras))
  );

  const ventasHoy = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    return facturas.filter((factura) => factura.fecha === hoy && factura.estado !== "anulada");
  }, [facturas]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "F4" && carrito.length > 0 && !procesandoVenta) {
        event.preventDefault();
        void procesarVenta(false);
      }
      if (event.key === "F5") {
        event.preventDefault();
        limpiarVenta();
      }
      if (event.key === "F7") {
        event.preventDefault();
        setActiveTab("barras");
      }
      if (event.key === "Escape") {
        setShowTicket(false);
        setShowNuevoCliente(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [carrito.length, procesandoVenta]);

  const agregarAlCarrito = (producto: Producto) => {
    const itemExistente = carrito.find((item) => item.producto.id === producto.id);

    if (itemExistente) {
      const nuevaCantidad = itemExistente.cantidad + 1;
      if (nuevaCantidad > producto.stock_actual) {
        toast({
          title: "Stock insuficiente",
          description: `Solo hay ${producto.stock_actual} unidades disponibles.`,
          variant: "destructive",
        });
        return;
      }

      setCarrito((prev) =>
        prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precioUnitario - item.descuento }
            : item
        )
      );
      return;
    }

    if (producto.stock_actual < 1) {
      toast({
        title: "Sin stock",
        description: "Este producto no tiene unidades disponibles.",
        variant: "destructive",
      });
      return;
    }

    setCarrito((prev) => [
      ...prev,
      {
        id: `${producto.id}-${Date.now()}`,
        producto,
        cantidad: 1,
        precioUnitario: Number(producto.precio_venta || 0),
        descuento: 0,
        subtotal: Number(producto.precio_venta || 0),
      },
    ]);

    toast({
      title: "Producto agregado",
      description: `${producto.nombre} fue agregado al carrito.`,
    });
  };

  const actualizarCantidad = (itemId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(itemId);
      return;
    }

    const item = carrito.find((row) => row.id === itemId);
    if (!item) return;

    if (nuevaCantidad > item.producto.stock_actual) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${item.producto.stock_actual} unidades disponibles.`,
        variant: "destructive",
      });
      return;
    }

    setCarrito((prev) =>
      prev.map((row) =>
        row.id === itemId
          ? { ...row, cantidad: nuevaCantidad, subtotal: nuevaCantidad * row.precioUnitario - row.descuento }
          : row
      )
    );
  };

  const eliminarDelCarrito = (itemId: string) => {
    setCarrito((prev) => prev.filter((item) => item.id !== itemId));
  };

  const calcularSubtotal = useCallback(
    () => carrito.reduce((total, item) => total + item.cantidad * item.precioUnitario, 0),
    [carrito]
  );
  const calcularDescuentos = useCallback(
    () => carrito.reduce((total, item) => total + item.descuento, 0) + descuentoGlobal,
    [carrito, descuentoGlobal]
  );
  const calcularImpuestos = useCallback(() => {
    const baseInclIVA = calcularSubtotal() - calcularDescuentos();
    return baseInclIVA - baseInclIVA / 1.13;
  }, [calcularDescuentos, calcularSubtotal]);
  const calcularTotal = useCallback(() => calcularSubtotal() - calcularDescuentos(), [calcularDescuentos, calcularSubtotal]);

  const generarNumeroFactura = useCallback(() => {
    const ultimoNumero = facturas.reduce((maximo, factura) => {
      const numero = parseInt(factura.numero || "0", 10);
      return Number.isFinite(numero) && numero > maximo ? numero : maximo;
    }, 0);
    return String(ultimoNumero + 1).padStart(6, "0");
  }, [facturas]);

  const buscarPorCodigoBarras = (codigo: string) => {
    const producto = productos.find((item) => item.codigo === codigo && item.activo);
    if (!producto) {
      toast({
        title: "Producto no encontrado",
        description: `No existe un producto con codigo ${codigo}.`,
        variant: "destructive",
      });
      return;
    }

    agregarAlCarrito(producto);
    setCodigoBarras("");
  };

  const agregarClientePos = async () => {
    if (!nuevoCliente.nombre || !nuevoCliente.nit) {
      toast({
        title: "Datos incompletos",
        description: "Nombre y NIT son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    const creado = await crearCliente({
      nombre: nuevoCliente.nombre,
      nit: nuevoCliente.nit,
      telefono: nuevoCliente.telefono || "",
      email: nuevoCliente.email || "",
      direccion: nuevoCliente.direccion || "",
      activo: true,
    });

    if (!creado) return;

    setCliente({
      id: creado.id,
      nombre: creado.nombre,
      nit: creado.nit,
      telefono: creado.telefono || "",
      email: creado.email || "",
      direccion: creado.direccion || "",
    });
    setNuevoCliente({ nombre: "", nit: "", telefono: "", email: "", direccion: "" });
    setShowNuevoCliente(false);
  };

  const limpiarVenta = () => {
    setCarrito([]);
    setCliente(null);
    setMontoRecibido(0);
    setBusquedaProducto("");
    setCodigoBarras("");
    setDescuentoGlobal(0);
  };

  const procesarVenta = useCallback(async (esCredito = false) => {
    if (carrito.length === 0 || procesandoVenta) return;

    const total = calcularTotal();
    const clienteActual = cliente || CLIENTE_GENERAL;

    if (!esCredito && metodoPago === "efectivo" && montoRecibido < total) {
      toast({
        title: "Monto insuficiente",
        description: "El monto recibido no cubre el total de la venta.",
        variant: "destructive",
      });
      return;
    }

    setProcesandoVenta(true);
    try {
      for (const item of carrito) {
        if (item.cantidad > item.producto.stock_actual) {
          toast({
            title: "Stock insuficiente",
            description: `${item.producto.nombre} no tiene existencias suficientes.`,
            variant: "destructive",
          });
          return;
        }
      }

      const factura: Factura = {
        id: "",
        numero: generarNumeroFactura(),
        cliente: {
          id: clienteActual.id === CLIENTE_GENERAL.id ? "" : clienteActual.id,
          nombre: clienteActual.nombre,
          nit: clienteActual.nit,
          telefono: clienteActual.telefono || "",
          email: clienteActual.email || "",
          direccion: clienteActual.direccion || "",
          activo: true,
          fechaCreacion: new Date().toISOString().slice(0, 10),
        },
        fecha: new Date().toISOString().slice(0, 10),
        fechaVencimiento: new Date().toISOString().slice(0, 10),
        items: carrito.map((item) => ({
          id: item.id,
          productoId: item.producto.id,
          codigo: item.producto.codigo,
          descripcion: item.producto.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          descuento: item.descuento,
          subtotal: item.subtotal,
          codigoSIN: item.producto.codigo_sin || "00000000",
        })),
        subtotal: calcularSubtotal(),
        descuentoTotal: calcularDescuentos(),
        iva: calcularImpuestos(),
        total,
        estado: esCredito ? "enviada" : "pagada",
        estadoSIN: "pendiente",
        cuf: "",
        cufd: "",
        puntoVenta: 0,
        codigoControl: "",
        observaciones: `POS ${esCredito ? "credito" : metodoPago}`,
        fechaCreacion: new Date().toISOString().slice(0, 10),
      };

      const facturaGuardada = await guardarFactura(factura);
      if (!facturaGuardada) return;

      for (const item of carrito) {
        const stockActualizado = await actualizarStockProducto(item.producto.id, item.cantidad, "salida");
        if (!stockActualizado) {
          toast({
            title: "Persistencia parcial",
            description: `La factura se guardo, pero el stock de ${item.producto.nombre} no pudo actualizarse.`,
            variant: "destructive",
          });
          return;
        }

        const movimientoInventario: MovimientoInventario = {
          id: `POS-${facturaGuardada.numero}-${item.producto.id}`,
          fecha: facturaGuardada.fecha,
          tipo: "salida",
          productoId: item.producto.id,
          producto: item.producto.nombre,
          cantidad: item.cantidad,
          costoUnitario: Number(item.producto.costo_unitario || 0),
          costoPromedioPonderado: Number(item.producto.costo_unitario || 0),
          motivo: "Venta",
          documento: `POS ${facturaGuardada.numero}`,
          usuario: "Sistema",
          stockAnterior: Number(item.producto.stock_actual || 0),
          stockNuevo: Number(item.producto.stock_actual || 0) - item.cantidad,
          valorMovimiento: item.cantidad * Number(item.producto.costo_unitario || 0),
        };

        await generarAsientoInventario(movimientoInventario);
      }

      await generarAsientoVenta(facturaGuardada);
      if (!esCredito) {
        await generarAsientoPagoFactura(facturaGuardada);
      }

      setUltimaVenta({
        id: facturaGuardada.id,
        numero: facturaGuardada.numero,
        fecha: facturaGuardada.fecha,
        hora: new Date().toLocaleTimeString("es-BO"),
        cliente: clienteActual,
        items: carrito,
        subtotal: facturaGuardada.subtotal,
        descuentoTotal: facturaGuardada.descuentoTotal,
        impuestos: facturaGuardada.iva,
        total: facturaGuardada.total,
        metodoPago: esCredito ? "credito" : metodoPago,
        montoRecibido: esCredito ? 0 : metodoPago === "efectivo" ? montoRecibido : total,
        cambio: esCredito ? 0 : metodoPago === "efectivo" ? montoRecibido - total : 0,
        vendedor: "Usuario Actual",
        estado: esCredito ? "pendiente" : "completada",
      });
      setShowTicket(true);
      limpiarVenta();

      toast({
        title: "Venta procesada",
        description: `La venta ${facturaGuardada.numero} ya quedo registrada en el sistema contable.`,
      });
    } finally {
      setProcesandoVenta(false);
    }
  }, [
    actualizarStockProducto,
    carrito,
    cliente,
    descuentoGlobal,
    facturas,
    generarAsientoInventario,
    generarAsientoPagoFactura,
    generarAsientoVenta,
    guardarFactura,
    metodoPago,
    montoRecibido,
    procesandoVenta,
    toast,
  ]);

  const imprimirTicket = () => window.print();

  const ventasDelDia = ventasHoy.reduce((total, factura) => total + factura.total, 0);
  const cantidadVentas = ventasHoy.length;
  const productosVendidos = ventasHoy.reduce(
    (sum, factura) => sum + factura.items.reduce((itemsSum, item) => itemsSum + item.cantidad, 0),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="border-b border-border/60 bg-card shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Punto de Venta</h1>
              <p className="text-sm text-muted-foreground">F2: Buscar · F4: Cobrar · F5: Limpiar · F7: Codigo de barras</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-right">
              <div><p className="text-sm text-muted-foreground">Ventas del dia</p><p className="text-lg font-bold text-success">Bs. {ventasDelDia.toFixed(2)}</p></div>
              <div><p className="text-sm text-muted-foreground">Clientes atendidos</p><p className="text-lg font-bold text-primary">{cantidadVentas}</p></div>
              <div><p className="text-sm text-muted-foreground">Productos vendidos</p><p className="text-lg font-bold text-accent-foreground">{productosVendidos} unidades</p></div>
              <div><p className="text-sm text-muted-foreground">Estado</p><p className="text-lg font-bold text-warning">{procesandoVenta ? "Procesando" : "Operativo"}</p></div>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <Button variant="outline" onClick={limpiarVenta}><RotateCcw className="mr-2 h-4 w-4" />Limpiar (F5)</Button>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          <div className="space-y-4 xl:col-span-3">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="productos" className="flex items-center gap-2"><Search className="h-4 w-4" />Buscar</TabsTrigger>
                    <TabsTrigger value="categorias" className="flex items-center gap-2"><Grid3X3 className="h-4 w-4" />Categorias</TabsTrigger>
                    <TabsTrigger value="barras" className="flex items-center gap-2"><ScanLine className="h-4 w-4" />Codigo de Barras</TabsTrigger>
                  </TabsList>

                  <TabsContent value="productos" className="mt-4">
                    <Input ref={inputRef} placeholder="Buscar productos por nombre o codigo..." value={busquedaProducto} onChange={(event) => setBusquedaProducto(event.target.value)} className="h-12 text-lg" />
                    {selectedCategoria && <div className="mt-2"><Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCategoria(null)}>Categoria: {selectedCategoria} ×</Badge></div>}
                  </TabsContent>

                  <TabsContent value="categorias" className="mt-4">
                    <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                      {categoriasDisponibles.map((categoria) => (
                        <Button key={categoria} variant="outline" className="flex h-16 flex-col items-center justify-center" onClick={() => { setSelectedCategoria(categoria); setBusquedaProducto(""); setActiveTab("productos"); }}>
                          <Package className="mb-1 h-6 w-6" />
                          <span className="text-xs">{categoria}</span>
                        </Button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="barras" className="mt-4">
                    <div className="flex gap-2">
                      <Input placeholder="Escanear o escribir codigo de barras..." value={codigoBarras} onChange={(event) => setCodigoBarras(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") buscarPorCodigoBarras(codigoBarras); }} className="h-12 text-lg" />
                      <Button onClick={() => buscarPorCodigoBarras(codigoBarras)} className="h-12 px-6"><Scan className="h-5 w-5" /></Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="grid max-h-[500px] grid-cols-2 gap-3 overflow-y-auto md:grid-cols-3 lg:grid-cols-4">
                  {productosFiltrados.slice(0, 20).map((producto) => (
                    <Card key={producto.id} className="cursor-pointer border-2 transition-all duration-200 hover:scale-105 hover:border-primary/50 hover:shadow-md" onClick={() => agregarAlCarrito(producto)}>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <ProductThumbnail
                            imageUrl={producto.imagen_url}
                            name={producto.nombre}
                            className="aspect-square w-full"
                            iconClassName="h-8 w-8"
                            roundedClassName="rounded-lg"
                          />
                          <div><h4 className="line-clamp-2 text-sm font-medium">{producto.nombre}</h4><p className="text-xs text-muted-foreground">{producto.codigo}</p></div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between"><span className="text-lg font-bold text-primary">Bs. {Number(producto.precio_venta || 0).toFixed(2)}</span></div>
                            <Badge variant={producto.stock_actual > producto.stock_minimo ? "secondary" : "destructive"} className="w-full justify-center">Stock: {producto.stock_actual}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {!loadingProductos && productosFiltrados.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Search className="mx-auto mb-4 h-16 w-16 opacity-50" />
                    <p className="text-lg">No se encontraron productos</p>
                    <p className="text-sm">Intenta con otros terminos de busqueda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" />Cliente</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={cliente?.id || ""} onValueChange={(value) => setCliente(clientesDisponibles.find((item) => item.id === value) || null)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                    <SelectContent>{clientesDisponibles.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre} - {item.nit}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setShowNuevoCliente(true)}><UserPlus className="h-4 w-4" /></Button>
                </div>
                {cliente && cliente.id !== CLIENTE_GENERAL.id && <div className="space-y-1 text-xs text-muted-foreground"><p><strong>NIT:</strong> {cliente.nit}</p>{cliente.telefono && <p><strong>Tel:</strong> {cliente.telefono}</p>}{cliente.email && <p><strong>Email:</strong> {cliente.email}</p>}</div>}
                {loadingClientes && <p className="text-xs text-muted-foreground">Cargando clientes...</p>}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><ShoppingCart className="h-5 w-5" />Carrito ({carrito.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {carrito.map((item) => (
                    <div key={item.id} className="space-y-2 rounded-lg bg-muted/50 p-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.producto.nombre}</p><p className="text-xs text-muted-foreground">Bs. {item.precioUnitario.toFixed(2)} c/u</p></div>
                        <Button size="sm" variant="ghost" onClick={() => eliminarDelCarrito(item.id)} className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} className="h-8 w-8 p-0"><Minus className="h-3 w-3" /></Button>
                        <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                        <Button size="sm" variant="outline" onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} className="h-8 w-8 p-0"><Plus className="h-3 w-3" /></Button>
                        <div className="flex-1 text-right"><p className="font-bold text-primary">Bs. {item.subtotal.toFixed(2)}</p></div>
                      </div>
                    </div>
                  ))}
                  {carrito.length === 0 && <div className="py-8 text-center text-muted-foreground"><ShoppingBag className="mx-auto mb-2 h-12 w-12 opacity-50" /><p className="text-sm">Carrito vacio</p></div>}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Calculator className="h-5 w-5" />Totales</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal:</span><span>Bs. {calcularSubtotal().toFixed(2)}</span></div>
                  <div className="flex items-center justify-between text-destructive"><span className="flex items-center gap-1"><Percent className="h-3.5 w-3.5" />Descuentos:</span><span>-Bs. {calcularDescuentos().toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>IVA incluido (13%):</span><span>Bs. {calcularImpuestos().toFixed(2)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold"><span>TOTAL:</span><span className="text-primary">Bs. {calcularTotal().toFixed(2)}</span></div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Metodo de Pago</label>
                    <Select value={metodoPago} onValueChange={setMetodoPago}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo"><div className="flex items-center gap-2"><Banknote className="h-4 w-4" />Efectivo</div></SelectItem>
                        <SelectItem value="tarjeta"><div className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Tarjeta</div></SelectItem>
                        <SelectItem value="qr"><div className="flex items-center gap-2"><QrCode className="h-4 w-4" />QR</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {metodoPago === "efectivo" && <div><label className="text-sm font-medium">Monto Recibido</label><Input type="number" value={montoRecibido} onChange={(event) => setMontoRecibido(Number(event.target.value))} placeholder="0.00" className="h-12 text-lg" />{montoRecibido > calcularTotal() && <p className="mt-1 text-sm font-medium text-success">Cambio: Bs. {(montoRecibido - calcularTotal()).toFixed(2)}</p>}</div>}
                </div>

                <div className="space-y-2">
                  <Button onClick={() => void procesarVenta(false)} className="h-12 w-full text-lg" disabled={carrito.length === 0 || procesandoVenta}><Receipt className="mr-2 h-5 w-5" />Cobrar (F4)</Button>
                  <Button onClick={() => void procesarVenta(true)} className="h-10 w-full text-sm" variant="outline" disabled={carrito.length === 0 || procesandoVenta || !cliente || cliente.id === CLIENTE_GENERAL.id}><CreditCard className="mr-2 h-4 w-4" />Venta a Credito</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Dialog open={showNuevoCliente} onOpenChange={setShowNuevoCliente}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>Complete los datos del cliente para registrarlo en el POS.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Nombre *</label><Input value={nuevoCliente.nombre} onChange={(event) => setNuevoCliente((prev) => ({ ...prev, nombre: event.target.value }))} placeholder="Nombre completo" /></div>
            <div><label className="text-sm font-medium">NIT/CI *</label><Input value={nuevoCliente.nit} onChange={(event) => setNuevoCliente((prev) => ({ ...prev, nit: event.target.value }))} placeholder="Numero de identificacion" /></div>
            <div><label className="text-sm font-medium">Telefono</label><Input value={nuevoCliente.telefono} onChange={(event) => setNuevoCliente((prev) => ({ ...prev, telefono: event.target.value }))} placeholder="Numero de telefono" /></div>
            <div><label className="text-sm font-medium">Email</label><Input type="email" value={nuevoCliente.email} onChange={(event) => setNuevoCliente((prev) => ({ ...prev, email: event.target.value }))} placeholder="correo@ejemplo.com" /></div>
            <div><label className="text-sm font-medium">Direccion</label><Input value={nuevoCliente.direccion} onChange={(event) => setNuevoCliente((prev) => ({ ...prev, direccion: event.target.value }))} placeholder="Direccion completa" /></div>
            <div className="flex gap-2 pt-4"><Button variant="outline" onClick={() => setShowNuevoCliente(false)} className="flex-1">Cancelar</Button><Button onClick={() => void agregarClientePos()} className="flex-1">Agregar Cliente</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTicket} onOpenChange={setShowTicket}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Ticket de Venta</DialogTitle>
            <DialogDescription>Resumen de la venta procesada. Imprima o cierre para continuar.</DialogDescription>
          </DialogHeader>
          {ultimaVenta && (
            <div className="space-y-4 text-sm font-mono">
              <div className="border-b pb-3 text-center">
                <h3 className="text-lg font-bold">SISTEMA CONTABLE</h3>
                <p className="text-xs">Ticket: {ultimaVenta.numero}</p>
                <p className="text-xs">{ultimaVenta.fecha} - {ultimaVenta.hora}</p>
                <p className="text-xs">Vendedor: {ultimaVenta.vendedor}</p>
              </div>
              <div><p><strong>Cliente:</strong> {ultimaVenta.cliente.nombre}</p><p><strong>NIT/CI:</strong> {ultimaVenta.cliente.nit}</p></div>
              <div className="space-y-1 border-b pb-3">
                <div className="flex justify-between text-xs font-bold"><span>PRODUCTO</span><span>SUBTOTAL</span></div>
                {ultimaVenta.items.map((item, index) => (
                  <div key={`${item.id}-${index}`}>
                    <p className="text-xs">{item.producto.nombre}</p>
                    <div className="flex justify-between text-xs"><span>{item.cantidad} x Bs. {item.precioUnitario.toFixed(2)}</span><span>Bs. {item.subtotal.toFixed(2)}</span></div>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Subtotal:</span><span>Bs. {ultimaVenta.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-destructive"><span>Descuentos:</span><span>-Bs. {ultimaVenta.descuentoTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>IVA incluido:</span><span>Bs. {ultimaVenta.impuestos.toFixed(2)}</span></div>
                <Separator />
                <div className="flex justify-between text-base font-bold"><span>TOTAL:</span><span>Bs. {ultimaVenta.total.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Recibido ({ultimaVenta.metodoPago}):</span><span>Bs. {ultimaVenta.montoRecibido.toFixed(2)}</span></div>
                {ultimaVenta.cambio > 0 && <div className="flex justify-between font-bold"><span>Cambio:</span><span>Bs. {ultimaVenta.cambio.toFixed(2)}</span></div>}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-4"><Button variant="outline" onClick={() => setShowTicket(false)} className="flex-1">Cerrar</Button><Button onClick={() => window.print()} className="flex-1"><Printer className="mr-2 h-4 w-4" />Imprimir</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedPOSModule;
