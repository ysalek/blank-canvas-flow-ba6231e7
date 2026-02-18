
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, PackageCheck, Clock, Banknote, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Compra, Proveedor } from "./purchases/PurchasesData";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useSupabaseProductos } from "@/hooks/useSupabaseProductos";
import { Producto } from "./products/ProductsData";
import { useSupabaseProveedores } from "@/hooks/useSupabaseProveedores";
import CompraForm from "./purchases/CompraForm";
import PurchasesList from "./purchases/PurchasesList";
import ProveedoresList from "./purchases/ProveedoresList";

const ComprasModule = () => {
  const [showNewCompraForm, setShowNewCompraForm] = useState(false);
  const { toast } = useToast();
  const { generarAsientoCompra, actualizarStockProducto, generarAsientoPagoCompra } = useContabilidadIntegration();
  const { productos: productosSupabase } = useSupabaseProductos();
  const {
    proveedores: proveedoresDB,
    compras: comprasDB,
    loading,
    crearProveedor,
    crearCompra,
    actualizarCompra,
    refetch
  } = useSupabaseProveedores();

  // Convert Supabase products to expected format
  const productos: Producto[] = productosSupabase.map(p => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion || '',
    categoria: p.categoria_id || 'General',
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

  // Convert DB proveedores to local format
  const proveedores: Proveedor[] = proveedoresDB.map(p => ({
    id: p.id,
    nombre: p.nombre,
    nit: p.nit,
    telefono: p.telefono,
    direccion: p.direccion,
    email: p.email || '',
    activo: p.activo,
    fechaCreacion: p.created_at?.split('T')[0] || ''
  }));

  // Convert DB compras to local format
  const compras: Compra[] = comprasDB.map(c => ({
    id: c.id,
    numero: c.numero,
    proveedor: proveedores.find(p => p.id === c.proveedor_id) || { id: '', nombre: 'Desconocido', nit: '', telefono: '', direccion: '', email: '', activo: true, fechaCreacion: '' },
    fecha: c.fecha,
    fechaVencimiento: c.fecha_vencimiento || '',
    items: [],
    subtotal: c.subtotal,
    descuentoTotal: c.descuento_total,
    iva: c.iva,
    total: c.total,
    estado: c.estado,
    observaciones: c.observaciones || '',
    fechaCreacion: c.created_at?.split('T')[0] || ''
  }));

  const handleSaveCompra = async (nuevaCompra: Compra) => {
    try {
      const asientoCompra = await generarAsientoCompra({
        numero: nuevaCompra.numero,
        total: nuevaCompra.total,
        subtotal: nuevaCompra.subtotal,
        iva: nuevaCompra.iva
      });

      if (!asientoCompra) return;

      nuevaCompra.items.forEach(item => {
        actualizarStockProducto(item.productoId, item.cantidad, 'entrada');
      });

      // Save to Supabase
      await crearCompra({
        proveedor_id: nuevaCompra.proveedor.id,
        numero: nuevaCompra.numero,
        fecha: nuevaCompra.fecha,
        fecha_vencimiento: nuevaCompra.fechaVencimiento || null,
        subtotal: nuevaCompra.subtotal,
        descuento_total: nuevaCompra.descuentoTotal,
        iva: nuevaCompra.iva,
        total: nuevaCompra.total,
        estado: nuevaCompra.estado,
        tipo_pago: 'contado',
        monto_pagado: 0,
        saldo_pendiente: nuevaCompra.total,
        observaciones: nuevaCompra.observaciones || null
      });

      toast({
        title: "Compra Creada Exitosamente",
        description: `Compra N° ${nuevaCompra.numero} registrada. Inventario actualizado.`,
      });

      setShowNewCompraForm(false);
    } catch (error) {
      console.error("Error al guardar la compra:", error);
      toast({
        title: "Error al Procesar la Compra",
        description: "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleProcessPurchase = async (compra: Compra) => {
    if (compra.estado !== 'recibida') {
      toast({
        title: "Acción no permitida",
        description: `La compra ya tiene estado "${compra.estado}".`,
        variant: "destructive",
      });
      return;
    }

    const asientoPago = await generarAsientoPagoCompra(compra);
    if (!asientoPago) return;

    try {
      await actualizarCompra(compra.id, { estado: 'pagada' });
      toast({
        title: "Compra Procesada y Pagada",
        description: `La compra ${compra.numero} ha sido marcada como "pagada".`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la compra.",
        variant: "destructive",
      });
    }
  };

  const handleAddProveedor = async (nuevoProveedor: Proveedor) => {
    try {
      await crearProveedor({
        codigo: nuevoProveedor.nit,
        nombre: nuevoProveedor.nombre,
        nit: nuevoProveedor.nit,
        telefono: nuevoProveedor.telefono,
        direccion: nuevoProveedor.direccion,
        email: nuevoProveedor.email || null,
        activo: nuevoProveedor.activo,
        saldo_deuda: 0
      });
    } catch (error) {
      // Toast already shown by hook
    }
  };

  if (showNewCompraForm) {
    return (
      <CompraForm
        proveedores={proveedores}
        productos={productos}
        compras={compras}
        onSave={handleSaveCompra}
        onCancel={() => setShowNewCompraForm(false)}
        onAddProveedor={handleAddProveedor}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Compras</h2>
          <p className="text-muted-foreground">Control de compras y proveedores con integración contable.</p>
        </div>
        <Button onClick={() => setShowNewCompraForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Compra
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recibidas</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compras.filter(c => c.estado === 'recibida').length}</div>
            <p className="text-xs text-muted-foreground">Compras en stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compras.filter(c => c.estado === 'pendiente').length}</div>
            <p className="text-xs text-muted-foreground">Esperando recepción</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comprado</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {compras.reduce((sum, c) => sum + c.total, 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Valor total de las compras</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proveedores.length}</div>
            <p className="text-xs text-muted-foreground">Proveedores activos</p>
          </CardContent>
        </Card>
      </div>

      <PurchasesList compras={compras} onProcessPurchase={handleProcessPurchase} />
      <ProveedoresList proveedores={proveedores} />
    </div>
  );
};

export default ComprasModule;
