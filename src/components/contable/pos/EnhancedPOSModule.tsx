import { useEffect, useMemo, useRef, useState } from "react";
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

  const calcularSubtotal = () => carrito.reduce((total, item) => total + item.cantidad * item.precioUnitario, 0);
  const calcularDescuentos = () => carrito.reduce((total, item) => total + item.descuento, 0) + descuentoGlobal;
  const calcularImpuestos = () => {
    const baseInclIVA = calcularSubtotal() - calcularDescuentos();
    return baseInclIVA - baseInclIVA / 1.13;
  };
  const calcularTotal = () => calcularSubtotal() - calcularDescuentos();

  const generarNumeroFactura = () => {
    const ultimoNumero = facturas.reduce((maximo, factura) => {
      const numero = parseInt(factura.numero || "0", 10);
      return Number.isFinite(numero) && numero > maximo ? numero : maximo;
    }, 0);
    return String(ultimoNumero + 1).padStart(6, "0");
  };

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
