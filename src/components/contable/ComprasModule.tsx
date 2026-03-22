import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  PackageCheck,
  Clock,
  Banknote,
  Truck,
  ClipboardCheck,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Compra, Proveedor } from "./purchases/PurchasesData";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useSupabaseProductos } from "@/hooks/useSupabaseProductos";
import { Producto } from "./products/ProductsData";
import { useSupabaseProveedores } from "@/hooks/useSupabaseProveedores";
import CompraForm from "./purchases/CompraForm";
import PurchasesList from "./purchases/PurchasesList";
import ProveedoresList from "./purchases/ProveedoresList";
import {
  EnhancedHeader,
  EnhancedMetricCard,
  MetricGrid,
  Section,
} from "./dashboard/EnhancedLayout";

const ComprasModule = () => {
  const [showNewCompraForm, setShowNewCompraForm] = useState(false);
  const { toast } = useToast();
  const { generarAsientoCompra, generarAsientoPagoCompra } = useContabilidadIntegration();
  const { productos: productosSupabase, actualizarStockProducto } = useSupabaseProductos();
  const {
    proveedores: proveedoresDB,
    compras: comprasDB,
    loading,
    crearProveedor,
    crearCompra,
    actualizarCompra,
  } = useSupabaseProveedores();

  const productos: Producto[] = productosSupabase.map((producto) => ({
    id: producto.id,
    codigo: producto.codigo,
    nombre: producto.nombre,
    descripcion: producto.descripcion || "",
    categoria: producto.categoria_id || "General",
    unidadMedida: producto.unidad_medida,
    precioVenta: producto.precio_venta,
    precioCompra: producto.precio_compra,
    costoUnitario: producto.costo_unitario,
    stockActual: producto.stock_actual,
    stockMinimo: producto.stock_minimo,
    codigoSIN: producto.codigo_sin || "00000000",
    activo: producto.activo,
    fechaCreacion:
      producto.created_at?.split("T")[0] || new Date().toISOString().slice(0, 10),
    fechaActualizacion:
      producto.updated_at?.split("T")[0] || new Date().toISOString().slice(0, 10),
  }));

  const proveedores: Proveedor[] = proveedoresDB.map((proveedor) => ({
    id: proveedor.id,
    nombre: proveedor.nombre,
    nit: proveedor.nit,
    telefono: proveedor.telefono,
    direccion: proveedor.direccion,
    email: proveedor.email || "",
    activo: proveedor.activo,
    fechaCreacion: proveedor.created_at?.split("T")[0] || "",
  }));

  const compras: Compra[] = comprasDB.map((compra) => ({
    id: compra.id,
    numero: compra.numero,
    proveedor:
      proveedores.find((proveedor) => proveedor.id === compra.proveedor_id) || {
        id: "",
        nombre: "Desconocido",
        nit: "",
        telefono: "",
        direccion: "",
        email: "",
        activo: true,
        fechaCreacion: "",
      },
    fecha: compra.fecha,
    fechaVencimiento: compra.fecha_vencimiento || "",
    items: [],
    subtotal: compra.subtotal,
    descuentoTotal: compra.descuento_total,
    iva: compra.iva,
    total: compra.total,
    estado: compra.estado,
    observaciones: compra.observaciones || "",
    fechaCreacion: compra.created_at?.split("T")[0] || "",
  }));

  const comprasRecibidas = compras.filter((compra) => compra.estado === "recibida").length;
  const comprasPendientes = compras.filter((compra) => compra.estado === "pendiente").length;
  const comprasPagadas = compras.filter((compra) => compra.estado === "pagada").length;
  const totalComprado = compras.reduce((sum, compra) => sum + compra.total, 0);

  const handleSaveCompra = async (nuevaCompra: Compra) => {
    try {
      const asientoCompra = await generarAsientoCompra({
        numero: nuevaCompra.numero,
        total: nuevaCompra.total,
        subtotal: nuevaCompra.subtotal,
        iva: nuevaCompra.iva,
      });

      if (!asientoCompra) return;

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
        tipo_pago: "contado",
        monto_pagado: 0,
        saldo_pendiente: nuevaCompra.total,
        observaciones: nuevaCompra.observaciones || null,
      });

      let stockErrors = 0;
      for (const item of nuevaCompra.items) {
        try {
          await actualizarStockProducto(item.productoId, item.cantidad, "entrada");
        } catch (error) {
          console.warn("Error actualizando stock para producto:", item.productoId, error);
          stockErrors++;
        }
      }

      if (stockErrors > 0) {
        toast({
          title: "Compra registrada con advertencia",
          description: `Compra N ${nuevaCompra.numero} guardada, pero ${stockErrors} producto(s) no actualizaron stock.`,
        });
      } else {
        toast({
          title: "Compra creada",
          description: `Compra N ${nuevaCompra.numero} registrada con impacto en inventario y contabilidad.`,
        });
      }

      setShowNewCompraForm(false);
    } catch (error) {
      console.error("Error al guardar la compra:", error);
      toast({
        title: "Error al procesar la compra",
        description:
          error instanceof Error ? error.message : "Ocurrio un error inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleProcessPurchase = async (compra: Compra) => {
    if (compra.estado !== "recibida") {
      toast({
        title: "Accion no permitida",
        description: `La compra ya tiene estado "${compra.estado}".`,
        variant: "destructive",
      });
      return;
    }

    const asientoPago = await generarAsientoPagoCompra(compra);
    if (!asientoPago) return;

    try {
      await actualizarCompra(compra.id, { estado: "pagada" });
      toast({
        title: "Compra procesada",
        description: `La compra ${compra.numero} fue marcada como pagada.`,
      });
    } catch {
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
        saldo_deuda: 0,
      });
    } catch {
      // El hook ya informa el error.
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
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Compras"
        subtitle="Gestiona abastecimiento, recepcion e impacto contable desde una mesa operativa clara y comercial."
        badge={{
          text: `${compras.length} compras`,
          variant: "secondary",
        }}
        actions={
          <Button size="sm" onClick={() => setShowNewCompraForm(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva compra
          </Button>
        }
      />

      <div className="hero-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Centro de abastecimiento
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">
                Compras conectadas a inventario y contabilidad
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Cada compra registra el documento, actualiza stock y deja su impacto
                contable dentro del mismo flujo operativo.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {proveedores.length} proveedores registrados
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {comprasPendientes} recepciones pendientes
                </Badge>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Pulso operativo
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold">Recepcion y pago</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {comprasPagadas > 0
                      ? `${comprasPagadas} compras ya cerraron su ciclo completo de pago.`
                      : "Aun no hay compras pagadas en el periodo visible."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold">Estado de la base</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {loading
                      ? "Actualizando proveedores y compras desde la base de datos."
                      : "La operacion de compras esta conectada a Supabase y lista para seguimiento diario."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Enfoque del dia
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Compras recibidas</p>
                  <p className="text-xs text-slate-500">Ya disponibles en stock</p>
                </div>
                <p className="text-2xl font-bold text-slate-950">{comprasRecibidas}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Pendientes</p>
                  <p className="text-xs text-slate-500">Esperando recepcion o gestion</p>
                </div>
                <p className="text-2xl font-bold text-amber-700">{comprasPendientes}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Volumen de compras</p>
                  <p className="text-xs text-slate-500">Importe acumulado visible</p>
                </div>
                <p className="text-xl font-bold text-slate-950">Bs {totalComprado.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MetricGrid columns={4}>
        <EnhancedMetricCard
          title="Compras recibidas"
          value={comprasRecibidas}
          subtitle="Compras que ya impactaron stock"
          icon={PackageCheck}
        />
        <EnhancedMetricCard
          title="Pendientes"
          value={comprasPendientes}
          subtitle="Documentos a gestionar"
          icon={Clock}
          variant="warning"
        />
        <EnhancedMetricCard
          title="Total comprado"
          value={`Bs ${totalComprado.toFixed(2)}`}
          subtitle="Valor acumulado de compras"
          icon={Banknote}
          variant="success"
        />
        <EnhancedMetricCard
          title="Proveedores"
          value={proveedores.length}
          subtitle="Base operativa disponible"
          icon={Truck}
        />
      </MetricGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Section title="Ordenes de compra" subtitle="Historial con lectura operativa y contable">
          <PurchasesList compras={compras} onProcessPurchase={handleProcessPurchase} />
        </Section>

        <Section title="Proximos pasos" subtitle="Acciones sugeridas para el equipo">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-2.5">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">Recepcion prioritaria</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {comprasPendientes > 0
                      ? `Hay ${comprasPendientes} compras pendientes que conviene recibir o confirmar para no frenar stock.`
                      : "No hay compras pendientes por recepcion en este momento."}
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
                  <p className="font-semibold text-slate-950">Cadena de suministro</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    El modulo ya opera sobre proveedores y compras persistidas, con impacto
                    directo en inventario y asiento contable.
                  </p>
                </div>
              </div>
            </div>

            <ProveedoresList proveedores={proveedores} />
          </div>
        </Section>
      </div>
    </div>
  );
};

export default ComprasModule;
