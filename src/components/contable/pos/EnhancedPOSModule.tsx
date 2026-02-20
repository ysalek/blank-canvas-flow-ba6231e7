import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Receipt, 
  Search,
  Calculator,
  Users,
  RotateCcw,
  Edit,
  Percent,
  QrCode,
  Printer,
  Package,
  UserPlus,
  Clock,
  TrendingUp,
  ShoppingBag,
  Scan,
  Grid3X3,
  ScanLine
} from "lucide-react";
import { Producto } from "../products/ProductsData";
import { useSupabaseProductos } from "@/hooks/useSupabaseProductos";

interface ItemVenta {
  id: string;
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

interface Cliente {
  id: string;
  nombre: string;
  nit: string;
  telefono: string;
  email?: string;
  direccion?: string;
}

interface Venta {
  id: string;
  numero: string;
  fecha: string;
  hora: string;
  cliente: Cliente;
  items: ItemVenta[];
  subtotal: number;
  descuentoTotal: number;
  impuestos: number;
  total: number;
  metodoPago: string;
  montoRecibido: number;
  cambio: number;
  vendedor: string;
  estado: 'completada' | 'pendiente' | 'anulada';
}

const EnhancedPOSModule = () => {
  const { productos: productosSupabase, categorias } = useSupabaseProductos();
  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");
  const [montoRecibido, setMontoRecibido] = useState<number>(0);
  const [showTicket, setShowTicket] = useState(false);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<Venta | null>(null);
  const [ventasHoy, setVentasHoy] = useState<Venta[]>([]);
  const [activeTab, setActiveTab] = useState("productos");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Función para obtener el nombre de la categoría por ID
  const obtenerNombreCategoria = (categoriaId: string | null) => {
    if (!categoriaId) return 'General';
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'General';
  };

  // Convertir productos de Supabase al formato del POS
  const productos: Producto[] = productosSupabase.map(p => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion || '',
    categoria: obtenerNombreCategoria(p.categoria_id),
    unidadMedida: p.unidad_medida,
    precioVenta: p.precio_venta,
    precioCompra: p.precio_compra,
    costoUnitario: p.costo_unitario,
    stockActual: p.stock_actual,
    stockMinimo: p.stock_minimo,
    codigoSIN: p.codigo_sin || '00000000',
    activo: p.activo,
    fechaCreacion: p.created_at?.split('T')[0] || new Date().toISOString().slice(0, 10),
    fechaActualizacion: p.updated_at?.split('T')[0] || new Date().toISOString().slice(0, 10)
  }));

  // Cargar datos al inicio
  useEffect(() => {
    const ventasGuardadas = localStorage.getItem('ventas');
    const clientesGuardados = localStorage.getItem('clientes');
    
    if (ventasGuardadas) {
      const todasVentas = JSON.parse(ventasGuardadas);
      const hoy = new Date().toISOString().slice(0, 10);
      setVentasHoy(todasVentas.filter((v: Venta) => v.fecha === hoy));
    }

    if (clientesGuardados) {
      const clientes = JSON.parse(clientesGuardados);
      setClientesPredefinidos([...clientesPredefinidos, ...clientes]);
    }
  }, [productosSupabase]);

  // Auto-focus en búsqueda
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeTab]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 - Buscar producto
      if (e.key === 'F2') { e.preventDefault(); inputRef.current?.focus(); }
      // F4 - Procesar venta
      if (e.key === 'F4' && carrito.length > 0) { e.preventDefault(); procesarVenta(false); }
      // F5 - Limpiar venta
      if (e.key === 'F5') { e.preventDefault(); limpiarVenta(); }
      // F7 - Código de barras
      if (e.key === 'F7') { e.preventDefault(); setActiveTab('barras'); }
      // Escape - Cerrar modales
      if (e.key === 'Escape') { setShowTicket(false); setShowNuevoCliente(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carrito.length]);

  const [clientesPredefinidos, setClientesPredefinidos] = useState<Cliente[]>([
    { id: "1", nombre: "Cliente General", nit: "0", telefono: "", email: "", direccion: "" },
    { id: "2", nombre: "María González", nit: "1234567020", telefono: "70123456", email: "maria@email.com", direccion: "Av. Principal 123" },
    { id: "3", nombre: "Carlos Mendoza", nit: "9876543021", telefono: "71987654", email: "carlos@email.com", direccion: "Calle Comercio 456" },
  ]);

  const [nuevoCliente, setNuevoCliente] = useState<Partial<Cliente>>({
    nombre: "",
    nit: "",
    telefono: "",
    email: "",
    direccion: ""
  });

  // Categorías de productos para navegación rápida
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);
  const categoriasDisponibles = [...new Set(productos.map(p => p.categoria || 'Sin categoría'))];
  const productosFiltrados = productos.filter(p => 
    p.activo &&
    (!selectedCategoria || (p.categoria || 'Sin categoría') === selectedCategoria) &&
    (
      p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
      (codigoBarras && p.codigo === codigoBarras)
    )
  );

  // Búsqueda por código de barras
  const buscarPorCodigoBarras = (codigo: string) => {
    const producto = productos.find(p => p.codigo === codigo && p.activo);
    if (producto) {
      agregarAlCarrito(producto);
      setCodigoBarras("");
    } else {
      toast({
        title: "Producto no encontrado",
        description: `No se encontró un producto con código: ${codigo}`,
        variant: "destructive"
      });
    }
  };

  const agregarAlCarrito = (producto: Producto) => {
    const itemExistente = carrito.find(item => item.producto.id === producto.id);
    
    if (itemExistente) {
      const nuevaCantidad = itemExistente.cantidad + 1;
      if (nuevaCantidad > producto.stockActual) {
        toast({
          title: "Stock insuficiente",
          description: `Solo hay ${producto.stockActual} unidades disponibles`,
          variant: "destructive"
        });
        return;
      }
      
      setCarrito(carrito.map(item => 
        item.producto.id === producto.id 
          ? { ...item, cantidad: nuevaCantidad, subtotal: (nuevaCantidad * item.precioUnitario) - item.descuento }
          : item
      ));
    } else {
      if (producto.stockActual < 1) {
        toast({
          title: "Sin stock",
          description: "Este producto no tiene stock disponible",
          variant: "destructive"
        });
        return;
      }
      
      const nuevoItem: ItemVenta = {
        id: Date.now().toString(),
        producto,
        cantidad: 1,
        precioUnitario: producto.precioVenta || 0,
        descuento: 0,
        subtotal: producto.precioVenta || 0
      };
      setCarrito([...carrito, nuevoItem]);
    }

    toast({
      title: "Producto agregado",
      description: `${producto.nombre} agregado al carrito`,
    });
  };

  const actualizarCantidad = (itemId: string, nuevaCantidad: number) => {
    if (nuevaCantidad === 0) {
      eliminarDelCarrito(itemId);
      return;
    }

    const item = carrito.find(i => i.id === itemId);
    if (item && nuevaCantidad > item.producto.stockActual) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${item.producto.stockActual} unidades disponibles`,
        variant: "destructive"
      });
      return;
    }

    setCarrito(carrito.map(item => 
      item.id === itemId 
        ? { ...item, cantidad: nuevaCantidad, subtotal: (nuevaCantidad * item.precioUnitario) - item.descuento }
        : item
    ));
  };

  const aplicarDescuentoItem = (itemId: string, descuento: number) => {
    setCarrito(carrito.map(item => 
      item.id === itemId 
        ? { ...item, descuento, subtotal: (item.cantidad * item.precioUnitario) - descuento }
        : item
    ));
  };

  const eliminarDelCarrito = (itemId: string) => {
    setCarrito(carrito.filter(item => item.id !== itemId));
  };

  const calcularSubtotal = () => {
    return carrito.reduce((total, item) => total + (item.cantidad * item.precioUnitario), 0);
  };

  const calcularDescuentos = () => {
    const descuentoItems = carrito.reduce((total, item) => total + item.descuento, 0);
    return descuentoItems + descuentoGlobal;
  };

  const calcularImpuestos = () => {
    const baseInclIVA = calcularSubtotal() - calcularDescuentos();
    const ivaIncluido = baseInclIVA - (baseInclIVA / 1.13);
    return ivaIncluido;
  };

  const calcularTotal = () => {
    // Precios incluyen IVA: el total ya incluye el impuesto
    return calcularSubtotal() - calcularDescuentos();
  };

  const agregarCliente = () => {
    if (!nuevoCliente.nombre || !nuevoCliente.nit) {
      toast({
        title: "Datos incompletos",
        description: "Nombre y NIT son obligatorios",
        variant: "destructive"
      });
      return;
    }

    const clienteCompleto: Cliente = {
      id: Date.now().toString(),
      nombre: nuevoCliente.nombre,
      nit: nuevoCliente.nit,
      telefono: nuevoCliente.telefono || "",
      email: nuevoCliente.email || "",
      direccion: nuevoCliente.direccion || ""
    };

    const clientesActualizados = [...clientesPredefinidos, clienteCompleto];
    setClientesPredefinidos(clientesActualizados);
    
    // Guardar en localStorage
    const clientesParaGuardar = clientesActualizados.filter(c => c.id !== "1" && c.id !== "2" && c.id !== "3");
    localStorage.setItem('clientes', JSON.stringify(clientesParaGuardar));

    setCliente(clienteCompleto);
    setNuevoCliente({ nombre: "", nit: "", telefono: "", email: "", direccion: "" });
    setShowNuevoCliente(false);

    toast({
      title: "Cliente agregado",
      description: `${clienteCompleto.nombre} agregado exitosamente`,
    });
  };

  const procesarVenta = (esCredito = false) => {
    if (carrito.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agregue productos al carrito antes de procesar la venta",
        variant: "destructive"
      });
      return;
    }

    const total = calcularTotal();
    
    if (!esCredito && metodoPago === "efectivo" && montoRecibido < total) {
      toast({
        title: "Monto insuficiente",
        description: "El monto recibido es menor al total de la venta",
        variant: "destructive"
      });
      return;
    }

    // Los productos se actualizan automáticamente en Supabase mediante useSupabaseProductos
    // La actualización del stock se maneja através del sistema de facturación integrado

    // Generar venta
    const venta: Venta = {
      id: Date.now().toString(),
      numero: `PV-${Date.now()}`,
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toLocaleTimeString('es-BO'),
      cliente: cliente || clientesPredefinidos[0],
      items: carrito,
      subtotal: calcularSubtotal(),
      descuentoTotal: calcularDescuentos(),
      impuestos: calcularImpuestos(),
      total: total,
      metodoPago: esCredito ? 'credito' : metodoPago,
      montoRecibido: esCredito ? 0 : (metodoPago === "efectivo" ? montoRecibido : total),
      cambio: esCredito ? 0 : (metodoPago === "efectivo" ? montoRecibido - total : 0),
      vendedor: "Usuario Actual",
      estado: esCredito ? 'pendiente' : 'completada'
    };

    // Guardar venta
    const ventasGuardadas = JSON.parse(localStorage.getItem('ventas') || '[]');
    localStorage.setItem('ventas', JSON.stringify([venta, ...ventasGuardadas]));

    setVentasHoy([venta, ...ventasHoy]);
    setUltimaVenta(venta);
    setShowTicket(true);
    limpiarVenta();

    toast({
      title: "Venta procesada",
      description: `Venta ${venta.numero} procesada exitosamente`,
    });
  };

  const limpiarVenta = () => {
    setCarrito([]);
    setCliente(null);
    setMontoRecibido(0);
    setBusquedaProducto("");
    setCodigoBarras("");
    setDescuentoGlobal(0);
  };

  const imprimirTicket = () => {
    window.print();
  };

  // Estadísticas del día
  const ventasDelDia = ventasHoy.reduce((total, venta) => total + venta.total, 0);
  const cantidadVentas = ventasHoy.length;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Punto de Venta</h1>
              <p className="text-muted-foreground text-sm">F2: Buscar · F4: Cobrar · F5: Limpiar · F7: Código barras</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="grid grid-cols-2 gap-4 text-right">
                <div>
                  <p className="text-sm text-muted-foreground">Ventas del día</p>
                  <p className="text-lg font-bold text-success">Bs. {ventasDelDia.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clientes atendidos</p>
                  <p className="text-lg font-bold text-primary">{cantidadVentas} personas</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Productos vendidos</p>
                  <p className="text-lg font-bold text-accent-foreground">
                    {ventasHoy.reduce((sum, venta) => sum + venta.items.reduce((itemSum, item) => itemSum + item.cantidad, 0), 0)} unidades
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cajero 1</p>
                  <p className="text-lg font-bold text-warning">{cantidadVentas} ventas</p>
                </div>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <Button variant="outline" onClick={limpiarVenta}>
                <RotateCcw className="w-4 h-4 mr-2" /> Limpiar (F5)
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Panel principal de productos - 3 columnas */}
          <div className="xl:col-span-3 space-y-4">
            {/* Búsqueda y navegación */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="productos" className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Buscar
                    </TabsTrigger>
                    <TabsTrigger value="categorias" className="flex items-center gap-2">
                      <Grid3X3 className="w-4 h-4" />
                      Categorías
                    </TabsTrigger>
                    <TabsTrigger value="barras" className="flex items-center gap-2">
                      <ScanLine className="w-4 h-4" />
                      Código de Barras
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="productos" className="mt-4">
                    <Input
                      ref={inputRef}
                      placeholder="Buscar productos por nombre o código..."
                      value={busquedaProducto}
                      onChange={(e) => setBusquedaProducto(e.target.value)}
                      className="text-lg h-12"
                    />
                    {selectedCategoria && (
                      <div className="mt-2">
                        <Badge
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => setSelectedCategoria(null)}
                        >
                          Categoría: {selectedCategoria} ×
                        </Badge>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="categorias" className="mt-4">
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {categoriasDisponibles.map((categoria) => (
                        <Button
                          key={categoria}
                          variant="outline"
                          className="h-16 flex flex-col items-center justify-center"
                          onClick={() => {
                            setSelectedCategoria(categoria);
                            setBusquedaProducto("");
                            setActiveTab("productos");
                          }}
                        >
                          <Package className="w-6 h-6 mb-1" />
                          <span className="text-xs">{categoria}</span>
                        </Button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="barras" className="mt-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Escanear o escribir código de barras..."
                        value={codigoBarras}
                        onChange={(e) => setCodigoBarras(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            buscarPorCodigoBarras(codigoBarras);
                          }
                        }}
                        className="text-lg h-12"
                      />
                      <Button
                        onClick={() => buscarPorCodigoBarras(codigoBarras)}
                        className="h-12 px-6"
                      >
                        <Scan className="w-5 h-5" />
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Grid de productos mejorado */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
                  {productosFiltrados.slice(0, 20).map((producto) => (
                    <Card
                      key={producto.id}
                      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border-2 hover:border-primary/50"
                      onClick={() => agregarAlCarrito(producto)}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                            {producto.imagenUrl ? (
                              <img
                                src={producto.imagenUrl}
                                alt={`Imagen producto ${producto.nombre}`}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm line-clamp-2">{producto.nombre}</h4>
                            <p className="text-xs text-muted-foreground">{producto.codigo}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-primary text-lg">
                                Bs. {(producto.precioVenta || 0).toFixed(2)}
                              </span>
                            </div>
                            <Badge 
                              variant={producto.stockActual > producto.stockMinimo ? "secondary" : "destructive"}
                              className="w-full justify-center"
                            >
                              Stock: {producto.stockActual}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {productosFiltrados.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No se encontraron productos</p>
                    <p className="text-sm">Intenta con otros términos de búsqueda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel de venta - 1 columna */}
          <div className="space-y-4">
            {/* Cliente */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={cliente?.id || ""} onValueChange={(value) => {
                    const clienteSeleccionado = clientesPredefinidos.find(c => c.id === value);
                    setCliente(clienteSeleccionado || null);
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientesPredefinidos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre} - {c.nit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNuevoCliente(true)}
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
                {cliente && cliente.id !== "1" && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>NIT:</strong> {cliente.nit}</p>
                    {cliente.telefono && <p><strong>Tel:</strong> {cliente.telefono}</p>}
                    {cliente.email && <p><strong>Email:</strong> {cliente.email}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Carrito */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="w-5 h-5" />
                  Carrito ({carrito.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {carrito.map((item) => (
                    <div key={item.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.producto.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            Bs. {item.precioUnitario.toFixed(2)} c/u
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => eliminarDelCarrito(item.id)}
                          className="text-destructive hover:text-destructive/80 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <div className="flex-1 text-right">
                          <p className="font-bold text-primary">
                            Bs. {item.subtotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {carrito.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Carrito vacío</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Totales y Pago */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calculator className="w-5 h-5" />
                  Totales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Bs. {calcularSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Descuentos:</span>
                    <span>-Bs. {calcularDescuentos().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA incluido (13%):</span>
                    <span>Bs. {calcularImpuestos().toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>TOTAL:</span>
                    <span className="text-primary">Bs. {calcularTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Método de Pago</label>
                    <Select value={metodoPago} onValueChange={setMetodoPago}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">
                          <div className="flex items-center gap-2">
                            <Banknote className="w-4 h-4" />
                            Efectivo
                          </div>
                        </SelectItem>
                        <SelectItem value="tarjeta">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Tarjeta
                          </div>
                        </SelectItem>
                        <SelectItem value="qr">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4" />
                            QR
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {metodoPago === "efectivo" && (
                    <div>
                      <label className="text-sm font-medium">Monto Recibido</label>
                      <Input
                        type="number"
                        value={montoRecibido}
                        onChange={(e) => setMontoRecibido(Number(e.target.value))}
                        placeholder="0.00"
                        className="text-lg h-12"
                      />
                      {montoRecibido > calcularTotal() && (
                        <p className="text-sm text-success mt-1 font-medium">
                          Cambio: Bs. {(montoRecibido - calcularTotal()).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={() => procesarVenta(false)} 
                    className="w-full h-12 text-lg" 
                    disabled={carrito.length === 0}
                  >
                    <Receipt className="w-5 h-5 mr-2" />
                    Cobrar (F4)
                  </Button>
                  <Button 
                    onClick={() => procesarVenta(true)} 
                    className="w-full h-10 text-sm" 
                    variant="outline"
                    disabled={carrito.length === 0 || !cliente || cliente.id === "1"}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Venta a Crédito
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal Nuevo Cliente */}
      <Dialog open={showNuevoCliente} onOpenChange={setShowNuevoCliente}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>Complete los datos del cliente para registrarlo en el POS.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="text-sm font-medium">NIT/CI *</label>
              <Input
                value={nuevoCliente.nit}
                onChange={(e) => setNuevoCliente({...nuevoCliente, nit: e.target.value})}
                placeholder="Número de identificación"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                placeholder="Número de teléfono"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={nuevoCliente.email}
                onChange={(e) => setNuevoCliente({...nuevoCliente, email: e.target.value})}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dirección</label>
              <Input
                value={nuevoCliente.direccion}
                onChange={(e) => setNuevoCliente({...nuevoCliente, direccion: e.target.value})}
                placeholder="Dirección completa"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowNuevoCliente(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={agregarCliente} className="flex-1">
                Agregar Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal del Ticket mejorado */}
      <Dialog open={showTicket} onOpenChange={setShowTicket}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Ticket de Venta</DialogTitle>
            <DialogDescription>Resumen de la venta procesada. Imprima o cierre para continuar.</DialogDescription>
          </DialogHeader>
          
          {ultimaVenta && (
            <div className="space-y-4 text-sm font-mono">
              <div className="text-center border-b pb-3">
                <h3 className="font-bold text-lg">SISTEMA CONTABLE</h3>
                <p className="text-xs">NIT: 123456789</p>
                <p className="text-xs">Av. Principal #123, La Paz</p>
                <p className="text-xs">Tel: 2-2345678</p>
                <Separator className="my-2" />
                <p><strong>Ticket:</strong> {ultimaVenta.numero}</p>
                <p>{ultimaVenta.fecha} - {ultimaVenta.hora}</p>
                <p><strong>Vendedor:</strong> {ultimaVenta.vendedor}</p>
              </div>

              <div>
                <p><strong>Cliente:</strong> {ultimaVenta.cliente.nombre}</p>
                <p><strong>NIT/CI:</strong> {ultimaVenta.cliente.nit}</p>
              </div>

              <div className="space-y-1 border-b pb-3">
                <div className="flex justify-between font-bold text-xs">
                  <span>PRODUCTO</span>
                  <span>SUBTOTAL</span>
                </div>
                {ultimaVenta.items.map((item: ItemVenta, index: number) => (
                  <div key={index}>
                    <p className="text-xs">{item.producto.nombre}</p>
                    <div className="flex justify-between text-xs">
                      <span>{item.cantidad} x Bs. {item.precioUnitario.toFixed(2)}</span>
                      <span>Bs. {item.subtotal.toFixed(2)}</span>
                    </div>
                    {item.descuento > 0 && (
                      <div className="flex justify-between text-xs text-destructive">
                        <span>Descuento:</span>
                        <span>-Bs. {item.descuento.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Bs. {ultimaVenta.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Descuentos:</span>
                  <span>-Bs. {ultimaVenta.descuentoTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA incluido (13%):</span>
                  <span>Bs. {ultimaVenta.impuestos.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>TOTAL:</span>
                  <span>Bs. {ultimaVenta.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recibido ({ultimaVenta.metodoPago}):</span>
                  <span>Bs. {ultimaVenta.montoRecibido.toFixed(2)}</span>
                </div>
                {ultimaVenta.cambio > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Cambio:</span>
                    <span>Bs. {ultimaVenta.cambio.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-xs border-t pt-3">
                <p>¡Gracias por su compra!</p>
                <p>Vuelva pronto</p>
                <p className="mt-2">Fecha de impresión: {new Date().toLocaleString('es-BO')}</p>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowTicket(false)} className="flex-1">
              Cerrar
            </Button>
            <Button onClick={imprimirTicket} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedPOSModule;