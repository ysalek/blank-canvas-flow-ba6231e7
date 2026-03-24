import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, Check, DollarSign, BarChart3, RefreshCw, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductoSupabase, useSupabaseProductos } from "@/hooks/useSupabaseProductos";
import ProductoForm from "./products/ProductoForm";
import ProductThumbnail from "./products/ProductThumbnail";
import { EmptyStatePanel, EnhancedHeader, EnhancedMetricCard, MetricGrid, Section } from "./dashboard/EnhancedLayout";

const ProductosModule = () => {
  const { productos, categorias, loading, refetch, actualizarProducto } = useSupabaseProductos();
  const [showForm, setShowForm] = useState(false);
  const [editingProducto, setEditingProducto] = useState<ProductoSupabase | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [savingProducto, setSavingProducto] = useState(false);
  const { toast } = useToast();

  const handleSaveProducto = async () => {
    setSavingProducto(true);
    try {
      await refetch();
      setShowForm(false);
      setEditingProducto(null);

      toast({
        title: "Catalogo actualizado",
        description: "El producto quedo guardado y disponible en el sistema.",
      });
    } catch (error) {
      console.error('Error en handleSaveProducto:', error);
    } finally {
      setSavingProducto(false);
    }
  };

  const handleEditProducto = (producto: ProductoSupabase) => {
    setEditingProducto(producto);
    setShowForm(true);
  };

  const handleDeleteProducto = async (productoId: string) => {
    try {
      await actualizarProducto(productoId, { activo: false });
      toast({
        title: "Producto desactivado",
        description: "El producto se retiro del catalogo activo correctamente.",
      });
      await refetch();
    } catch (error) {
      console.error('Error al desactivar producto:', error);
      toast({
        title: "Error",
        description: "No se pudo desactivar el producto",
        variant: "destructive"
      });
    }
  };

  const handleReactivateProducto = async (productoId: string) => {
    try {
      await actualizarProducto(productoId, { activo: true });
      toast({
        title: "Producto reactivado",
        description: "El producto volvio al catalogo activo.",
      });
      await refetch();
    } catch (error) {
      console.error('Error al reactivar producto:', error);
      toast({
        title: "Error",
        description: "No se pudo reactivar el producto",
        variant: "destructive"
      });
    }
  };

  const productosConCategoria = productos.map((producto) => {
    const categoria = categorias.find((item) => item.id === producto.categoria_id);
    return {
      ...producto,
      categoria: categoria?.nombre || 'General',
      descripcion: producto.descripcion || ''
    };
  });

  const productosFiltrados = productosConCategoria.filter((producto) =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (producto.categoria?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const productosActivos = productosConCategoria.filter((item) => item.activo).length;
  const productosStockBajo = productosConCategoria.filter((item) => (item.stock_actual || 0) <= (item.stock_minimo || 0) && item.activo).length;
  const valorInventario = productosConCategoria.reduce((sum, item) => sum + ((item.stock_actual || 0) * (item.costo_unitario || 0)), 0);
  const productosConImagen = productosConCategoria.filter((item) => item.imagen_url).length;

  if (loading) {
    return (
      <div className="page-shell animate-fade-in">
        <div className="hero-panel rounded-[2rem] p-8 text-center">
          <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground animate-pulse" />
          <h3 className="text-lg font-semibold mb-2">Cargando catalogo de productos</h3>
          <p className="text-muted-foreground">Obteniendo informacion actualizada desde la base de datos...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <ProductoForm
        producto={editingProducto}
        productos={productosConCategoria as ProductoSupabase[]}
        categorias={categorias}
        onSave={handleSaveProducto}
        onCancel={() => {
          if (savingProducto) return;
          setShowForm(false);
          setEditingProducto(null);
        }}
      />
    );
  }

  return (
    <div className="page-shell executive-shell animate-fade-in">
      <EnhancedHeader
        title="Productos"
        subtitle="Gestiona un catalogo visual, comercial y operativo listo para ventas, POS e inventario."
        badge={{
          text: `${productosActivos} activos`,
          variant: "default"
        }}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} className="rounded-2xl bg-white/70">
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Actualizar
            </Button>
            <Button size="sm" onClick={() => { setEditingProducto(null); setShowForm(true); }} className="rounded-2xl">
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo producto
            </Button>
          </div>
        }
      />

      <Section title="Resumen comercial" subtitle="Visibilidad inmediata para inventario y operacion diaria">
        <MetricGrid columns={4}>
          <EnhancedMetricCard
            title="Productos activos"
            value={productosActivos}
            subtitle="En catalogo"
            icon={Package}
            variant="success"
            trend="up"
            trendValue="Disponibles"
          />
          <EnhancedMetricCard
            title="Alertas de stock"
            value={productosStockBajo}
            subtitle="Requieren reposicion"
            icon={AlertTriangle}
            variant={productosStockBajo > 0 ? "warning" : "success"}
            trend={productosStockBajo > 0 ? "down" : "up"}
            trendValue={productosStockBajo > 0 ? "Atencion inmediata" : "Nivel estable"}
          />
          <EnhancedMetricCard
            title="Valor de inventario"
            value={`Bs. ${valorInventario.toLocaleString()}`}
            subtitle="Activo circulante"
            icon={DollarSign}
            variant="success"
            trend="up"
            trendValue="Base operativa"
          />
          <EnhancedMetricCard
            title="Con imagen principal"
            value={productosConImagen}
            subtitle="Listos para POS y catalogo"
            icon={ImagePlus}
            variant="default"
            trend="up"
            trendValue="Mas visual"
          />
        </MetricGrid>
      </Section>

      <Section title="Catalogo" subtitle="Busqueda, gestion y presentacion premium del inventario">
        <Card className="card-gradient rounded-[2rem]">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary" />
                  Productos registrados
                </CardTitle>
                <CardDescription className="mt-2">
                  Busca por nombre, codigo o categoria y administra el catalogo con una experiencia mas comercial.
                </CardDescription>
              </div>
              <div className="w-full max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, codigo o categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="executive-input pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {productosFiltrados.length === 0 ? (
              <EmptyStatePanel
                icon={Package}
                title={searchTerm ? "No encontramos coincidencias" : "Tu catalogo aun esta vacio"}
                description={searchTerm ? `No hay productos que coincidan con "${searchTerm}".` : "Crea tu primer producto para activar catalogo, POS e inventario visual."}
                action={!searchTerm ? (
                  <Button onClick={() => { setEditingProducto(null); setShowForm(true); }} className="rounded-2xl">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primer producto
                  </Button>
                ) : undefined}
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {productosFiltrados.map((producto) => {
                  const lowStock = (producto.stock_actual || 0) <= (producto.stock_minimo || 0) && producto.activo;
                  return (
                    <div key={producto.id} className="card-modern group rounded-[1.75rem] p-4">
                      <div className="flex items-start gap-4">
                        <ProductThumbnail imageUrl={producto.imagen_url} name={producto.nombre} className="h-24 w-24 shrink-0" iconClassName="h-8 w-8" />

                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-foreground">{producto.nombre}</h3>
                            <Badge variant="outline" className="rounded-full">{producto.codigo}</Badge>
                            <Badge variant={producto.activo ? "default" : "secondary"} className="rounded-full">
                              {producto.activo ? "Activo" : "Inactivo"}
                            </Badge>
                            {lowStock && (
                              <Badge variant="destructive" className="rounded-full">Stock bajo</Badge>
                            )}
                          </div>

                          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {producto.descripcion || "Sin descripcion comercial registrada."}
                          </p>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-2xl border border-border/70 bg-white/70 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Categoria</p>
                              <p className="mt-1 font-semibold text-foreground">{producto.categoria || 'General'}</p>
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-white/70 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Stock</p>
                              <p className={`mt-1 font-semibold ${lowStock ? 'text-destructive' : 'text-foreground'}`}>
                                {producto.stock_actual || 0} {producto.unidad_medida || 'PZA'}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-white/70 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Precio venta</p>
                              <p className="mt-1 font-semibold text-foreground">Bs. {(producto.precio_venta || 0).toFixed(2)}</p>
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-white/70 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Costo</p>
                              <p className="mt-1 font-semibold text-foreground">Bs. {(producto.costo_unitario || 0).toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <p className="text-xs text-muted-foreground">
                              Actualizado el {producto.updated_at?.split('T')[0] || new Date().toISOString().slice(0, 10)}
                            </p>
                            <div className="group-action-buttons flex gap-2 opacity-100 lg:opacity-0">
                              <Button size="sm" variant="outline" onClick={() => handleEditProducto(producto)} className="rounded-2xl">
                                <Edit className="h-4 w-4" />
                              </Button>
                              {producto.activo ? (
                                <Button size="sm" variant="outline" onClick={() => handleDeleteProducto(producto.id)} aria-label="Desactivar producto" className="rounded-2xl">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleReactivateProducto(producto.id)} aria-label="Reactivar producto" className="rounded-2xl">
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
};

export default ProductosModule;
