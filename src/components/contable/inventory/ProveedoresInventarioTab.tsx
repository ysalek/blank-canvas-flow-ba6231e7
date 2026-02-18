import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, CreditCard, Banknote, Search, DollarSign, AlertCircle, CheckCircle, Building2, Phone, Mail, MapPin } from "lucide-react";
import { ProductoInventario } from "./InventoryData";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSupabaseProveedores, ProveedorSupabase } from "@/hooks/useSupabaseProveedores";

interface CompraProveedor {
  id: string;
  proveedorId: string;
  proveedor: ProveedorSupabase;
  numero: string;
  fecha: string;
  items: {
    productoId: string;
    descripcion: string;
    cantidad: number;
    costoUnitario: number;
    subtotal: number;
  }[];
  subtotal: number;
  iva: number;
  total: number;
  tipoPago: 'contado' | 'credito';
  estado: 'pendiente' | 'pagada' | 'parcial';
  montoPagado: number;
  saldoPendiente: number;
  fechaVencimiento?: string;
  observaciones?: string;
}

interface Props {
  productos: ProductoInventario[];
  onCompraCreada: () => void;
}

const ProveedoresInventarioTab = ({ productos, onCompraCreada }: Props) => {
  const [showProveedorForm, setShowProveedorForm] = useState(false);
  const [showCompraForm, setShowCompraForm] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const { toast } = useToast();
  const { generarAsientoCompra, actualizarStockProducto } = useContabilidadIntegration();
  
  // Usar hook de Supabase
  const { 
    proveedores, 
    compras: comprasSupabase,
    loading,
    crearProveedor,
    crearCompra 
  } = useSupabaseProveedores();

  // Convertir compras de Supabase al formato esperado
  const compras: CompraProveedor[] = comprasSupabase.map(compra => {
    const proveedor = proveedores.find(p => p.id === compra.proveedor_id);
    const estadoMapeado = 
      compra.estado === 'pagada' ? 'pagada' :
      compra.estado === 'recibida' ? 'pendiente' :
      compra.estado === 'anulada' ? 'pendiente' :
      'parcial';
    
    return {
      id: compra.id,
      proveedorId: compra.proveedor_id,
      proveedor: proveedor!,
      numero: compra.numero,
      fecha: compra.fecha,
      fechaVencimiento: compra.fecha_vencimiento,
      items: [], // Los items se manejan en items_compras
      subtotal: compra.subtotal,
      iva: compra.iva,
      total: compra.total,
      tipoPago: compra.tipo_pago,
      estado: estadoMapeado as 'pendiente' | 'pagada' | 'parcial',
      montoPagado: compra.monto_pagado,
      saldoPendiente: compra.saldo_pendiente,
      observaciones: compra.observaciones
    };
  }).filter(c => c.proveedor); // Filtrar solo compras con proveedor válido

  const guardarProveedor = async (nuevoProveedor: ProveedorSupabase) => {
    await crearProveedor(nuevoProveedor);
  };

  const guardarCompra = async (nuevaCompra: CompraProveedor) => {
    await crearCompra({
      proveedor_id: nuevaCompra.proveedorId,
      numero: nuevaCompra.numero,
      fecha: nuevaCompra.fecha,
      fecha_vencimiento: nuevaCompra.fechaVencimiento,
      subtotal: nuevaCompra.subtotal,
      descuento_total: 0,
      iva: nuevaCompra.iva,
      total: nuevaCompra.total,
      estado: nuevaCompra.estado === 'pagada' ? 'pagada' : nuevaCompra.estado === 'parcial' ? 'recibida' : 'pendiente',
      tipo_pago: nuevaCompra.tipoPago,
      monto_pagado: nuevaCompra.montoPagado,
      saldo_pendiente: nuevaCompra.saldoPendiente,
      observaciones: nuevaCompra.observaciones
    });
  };

  const proveedoresFiltrados = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nit.includes(busqueda) ||
    p.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalDeuda = proveedores.reduce((sum, p) => sum + p.saldo_deuda, 0);
  const comprasPendientes = compras.filter(c => c.estado === 'pendiente' || c.estado === 'parcial').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando proveedores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores Activos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proveedores.filter(p => p.activo).length}</div>
            <p className="text-xs text-muted-foreground">Total registrados: {proveedores.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deuda</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Bs. {totalDeuda.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{comprasPendientes} compras pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compras del Mes</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compras.length}</div>
            <p className="text-xs text-muted-foreground">Este período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comprado</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {compras.reduce((sum, c) => sum + c.total, 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Suma total</p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedor por nombre, NIT o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowProveedorForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proveedor
          </Button>
          <Button
            variant="default"
            onClick={() => setShowCompraForm(true)}
            disabled={proveedores.length === 0}
          >
            <Truck className="w-4 h-4 mr-2" />
            Nueva Compra
          </Button>
        </div>
      </div>

      {/* Lista de Proveedores */}
      <Card>
        <CardHeader>
          <CardTitle>Proveedores Registrados</CardTitle>
          <CardDescription>
            Gestión de proveedores de mercadería con control de deudas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {proveedoresFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay proveedores registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proveedoresFiltrados.map((proveedor) => (
                <Card key={proveedor.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">{proveedor.codigo}</Badge>
                          <h3 className="font-semibold text-lg">{proveedor.nombre}</h3>
                          {proveedor.activo ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactivo</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>NIT: {proveedor.nit}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{proveedor.telefono}</span>
                          </div>
                          {proveedor.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{proveedor.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{proveedor.direccion}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {proveedor.saldo_deuda > 0 ? (
                          <div>
                            <p className="text-xs text-muted-foreground">Deuda Pendiente</p>
                            <p className="text-xl font-bold text-red-600">
                              Bs. {proveedor.saldo_deuda.toFixed(2)}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Sin Deuda
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compras Recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Compras Registradas</CardTitle>
          <CardDescription>
            Historial de compras con estado de pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          {compras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay compras registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {compras.slice(0, 10).map((compra) => (
                <Card key={compra.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">{compra.numero}</Badge>
                          <span className="font-semibold">{compra.proveedor.nombre}</span>
                          <Badge variant={compra.tipoPago === 'contado' ? 'default' : 'secondary'}>
                            {compra.tipoPago === 'contado' ? (
                              <><Banknote className="w-3 h-3 mr-1" />Contado</>
                            ) : (
                              <><CreditCard className="w-3 h-3 mr-1" />Crédito</>
                            )}
                          </Badge>
                          <Badge
                            variant={
                              compra.estado === 'pagada' ? 'default' :
                              compra.estado === 'parcial' ? 'secondary' : 'destructive'
                            }
                            className={
                              compra.estado === 'pagada' ? 'bg-green-500' : ''
                            }
                          >
                            {compra.estado === 'pagada' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {compra.estado === 'pendiente' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {compra.estado.charAt(0).toUpperCase() + compra.estado.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {compra.items.length} item(s) - Fecha: {compra.fecha}
                          {compra.fechaVencimiento && ` - Vence: ${compra.fechaVencimiento}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">Bs. {compra.total.toFixed(2)}</p>
                        {compra.tipoPago === 'credito' && compra.saldoPendiente > 0 && (
                          <p className="text-sm text-red-600">
                            Debe: Bs. {compra.saldoPendiente.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      <FormularioProveedor
        open={showProveedorForm}
        onOpenChange={setShowProveedorForm}
        onGuardar={guardarProveedor}
        ultimoCodigo={proveedores.length > 0 ? Math.max(...proveedores.map(p => parseInt(p.codigo.split('-')[1]))) : 0}
      />

      <FormularioCompra
        open={showCompraForm}
        onOpenChange={setShowCompraForm}
        proveedores={proveedores}
        productos={productos}
        onGuardar={guardarCompra}
        onCompraCreada={onCompraCreada}
        ultimoNumero={compras.length > 0 ? Math.max(...compras.map(c => parseInt(c.numero.split('-')[1]))) : 0}
        generarAsientoCompra={generarAsientoCompra}
        actualizarStockProducto={actualizarStockProducto}
      />
    </div>
  );
};

// Formulario de Proveedor
interface FormularioProveedorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardar: (proveedor: ProveedorSupabase) => void;
  ultimoCodigo: number;
}

const FormularioProveedor = ({ open, onOpenChange, onGuardar, ultimoCodigo }: FormularioProveedorProps) => {
  const [formData, setFormData] = useState({
    nombre: "",
    nit: "",
    telefono: "",
    direccion: "",
    email: ""
  });
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!formData.nombre || !formData.nit || !formData.telefono || !formData.direccion) {
      toast({
        title: "Campos requeridos",
        description: "Complete todos los campos obligatorios.",
        variant: "destructive"
      });
      return;
    }

    const nuevoProveedor: ProveedorSupabase = {
      id: '', // Generado por Supabase
      codigo: `PROV-${(ultimoCodigo + 1).toString().padStart(4, '0')}`,
      nombre: formData.nombre,
      nit: formData.nit,
      telefono: formData.telefono,
      direccion: formData.direccion,
      email: formData.email,
      activo: true,
      saldo_deuda: 0
    };

    onGuardar(nuevoProveedor);
    setFormData({ nombre: "", nit: "", telefono: "", direccion: "", email: "" });
    onOpenChange(false);

    toast({
      title: "Proveedor creado",
      description: `${nuevoProveedor.nombre} registrado exitosamente.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Proveedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre de la Empresa *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Distribuidora XYZ S.R.L."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nit">NIT *</Label>
              <Input
                id="nit"
                value={formData.nit}
                onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                placeholder="1234567890"
              />
            </div>
            <div>
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="77777777"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contacto@proveedor.com"
            />
          </div>
          <div>
            <Label htmlFor="direccion">Dirección *</Label>
            <Textarea
              id="direccion"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Dirección completa del proveedor"
              rows={2}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar Proveedor</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Formulario de Compra
interface FormularioCompraProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedores: ProveedorSupabase[];
  productos: ProductoInventario[];
  onGuardar: (compra: CompraProveedor) => void;
  onCompraCreada: () => void;
  ultimoNumero: number;
  generarAsientoCompra: any;
  actualizarStockProducto: any;
}

const FormularioCompra = ({
  open,
  onOpenChange,
  proveedores,
  productos,
  onGuardar,
  onCompraCreada,
  ultimoNumero,
  generarAsientoCompra,
  actualizarStockProducto
}: FormularioCompraProps) => {
  const [proveedorId, setProveedorId] = useState("");
  const [tipoPago, setTipoPago] = useState<'contado' | 'credito'>('contado');
  const [items, setItems] = useState<Array<{
    productoId: string;
    cantidad: number;
    costoUnitario: number;
  }>>([{ productoId: "", cantidad: 1, costoUnitario: 0 }]);
  const [observaciones, setObservaciones] = useState("");
  const { toast } = useToast();

  const handleAddItem = () => {
    setItems([...items, { productoId: "", cantidad: 1, costoUnitario: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calcularTotales = () => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.cantidad * item.costoUnitario);
    }, 0);
    const iva = subtotal * 0.13;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  const handleSubmit = async () => {
    if (!proveedorId || items.some(i => !i.productoId || i.cantidad <= 0 || i.costoUnitario <= 0)) {
      toast({
        title: "Datos incompletos",
        description: "Complete todos los campos de la compra.",
        variant: "destructive"
      });
      return;
    }

    const proveedor = proveedores.find(p => p.id === proveedorId)!;
    const { subtotal, iva, total } = calcularTotales();
    const numero = `COMP-${(ultimoNumero + 1).toString().padStart(4, '0')}`;

    // Generar asiento contable
    const asiento = await generarAsientoCompra({
      numero,
      total,
      subtotal,
      iva
    });

    if (!asiento) {
      return;
    }

    // Actualizar stock
    items.forEach(item => {
      actualizarStockProducto(item.productoId, item.cantidad, 'entrada');
    });

    const nuevaCompra: CompraProveedor = {
      id: Date.now().toString(),
      proveedorId,
      proveedor,
      numero,
      fecha: new Date().toISOString().slice(0, 10),
      items: items.map(item => {
        const producto = productos.find(p => p.id === item.productoId)!;
        return {
          productoId: item.productoId,
          descripcion: producto.nombre,
          cantidad: item.cantidad,
          costoUnitario: item.costoUnitario,
          subtotal: item.cantidad * item.costoUnitario
        };
      }),
      subtotal,
      iva,
      total,
      tipoPago,
      estado: tipoPago === 'contado' ? 'pagada' : 'pendiente',
      montoPagado: tipoPago === 'contado' ? total : 0,
      saldoPendiente: tipoPago === 'credito' ? total : 0,
      fechaVencimiento: tipoPago === 'credito'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : undefined,
      observaciones
    };

    onGuardar(nuevaCompra);
    onCompraCreada();

    // Limpiar formulario
    setProveedorId("");
    setTipoPago('contado');
    setItems([{ productoId: "", cantidad: 1, costoUnitario: 0 }]);
    setObservaciones("");
    onOpenChange(false);

    toast({
      title: "Compra registrada",
      description: `Compra ${numero} procesada exitosamente.`,
    });
  };

  const { subtotal, iva, total } = calcularTotales();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Compra de Mercadería</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Proveedor *</Label>
              <Select value={proveedorId} onValueChange={setProveedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.filter(p => p.activo).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo} - {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Pago *</Label>
              <Select value={tipoPago} onValueChange={(v) => setTipoPago(v as 'contado' | 'credito')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contado">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Contado
                    </div>
                  </SelectItem>
                  <SelectItem value="credito">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Crédito (30 días)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Items de la Compra *</Label>
              <Button size="sm" variant="outline" onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar Item
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                <div className="col-span-5">
                  <Label className="text-xs">Producto</Label>
                  <Select
                    value={item.productoId}
                    onValueChange={(v) => {
                      const newItems = [...items];
                      const producto = productos.find(p => p.id === v);
                      newItems[index] = {
                        ...newItems[index],
                        productoId: v,
                        costoUnitario: producto?.costoUnitario || 0
                      };
                      setItems(newItems);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.codigo} - {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Cantidad</Label>
                  <Input
                    type="number"
                    value={item.cantidad}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].cantidad = parseInt(e.target.value) || 0;
                      setItems(newItems);
                    }}
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Costo Unit.</Label>
                  <Input
                    type="number"
                    value={item.costoUnitario}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].costoUnitario = parseFloat(e.target.value) || 0;
                      setItems(newItems);
                    }}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Subtotal</Label>
                  <Input
                    value={`Bs. ${(item.cantidad * item.costoUnitario).toFixed(2)}`}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="col-span-1">
                  {items.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales sobre la compra..."
              rows={2}
            />
          </div>

          <div className="border-t pt-4 space-y-2 bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>Bs. {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA (13%):</span>
              <span>Bs. {iva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-primary">Bs. {total.toFixed(2)}</span>
            </div>
            {tipoPago === 'credito' && (
              <div className="flex items-center gap-2 text-sm text-orange-600 mt-2">
                <AlertCircle className="w-4 h-4" />
                <span>Esta compra generará una deuda de Bs. {total.toFixed(2)} a pagar en 30 días</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar Compra</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProveedoresInventarioTab;
