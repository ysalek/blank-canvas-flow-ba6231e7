import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, Check, DollarSign, BarChart3, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseProductos, ProductoSupabase, CategoriaProductoSupabase } from "@/hooks/useSupabaseProductos";
import ProductoForm from "./products/ProductoForm";
import { EnhancedHeader, MetricGrid, EnhancedMetricCard, Section } from "./dashboard/EnhancedLayout";


const ProductosModule = () => {
  const { productos, categorias, loading, refetch, crearProducto, actualizarProducto } = useSupabaseProductos();
  const [showForm, setShowForm] = useState(false);
  const [editingProducto, setEditingProducto] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const handleSaveProducto = async () => {
    try {
      // Force refresh to get latest data from database
      await refetch();
      
      // Wait a moment to ensure data is fully loaded
      setTimeout(() => {
        setShowForm(false);
        setEditingProducto(null);
      }, 100);
      
      toast({
        title: "Producto actualizado",
        description: "Los cambios se han guardado correctamente",
        variant: "default"
      });
    } catch (error) {
      console.error('Error en handleSaveProducto:', error);
    }
  };

  const handleEditProducto = (producto: any) => {
    setEditingProducto(producto);
    setShowForm(true);
  };

  const handleDeleteProducto = async (productoId: string) => {
    try {
      await actualizarProducto(productoId, { activo: false });
      toast({
        title: "Producto desactivado",
        description: "El producto se ha desactivado correctamente",
        variant: "default"
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
        description: "El producto se ha reactivado correctamente",
        variant: "default"
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

  // Transformar productos para tener categoría como nombre
  const productosConCategoria = productos.map(producto => {
    const categoria = categorias.find(c => c.id === producto.categoria_id);
    console.log('🏷️ Mapping product:', producto.nombre, 'Cost:', producto.costo_unitario, 'Category:', categoria?.nombre);
    return {
      ...producto,
      categoria: categoria?.nombre || 'General',
      descripcion: producto.descripcion || ''
    };
  });

  const productosFiltrados = productosConCategoria.filter(producto =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (producto.categoria?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const productosActivos = productosConCategoria.filter(p => p.activo).length;
  const productosStockBajo = productosConCategoria.filter(p => p.stock_actual <= p.stock_minimo && p.activo).length;
  const valorInventario = productosConCategoria.reduce((sum, p) => sum + ((p.stock_actual || 0) * (p.costo_unitario || 0)), 0);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <h3 className="text-lg font-semibold mb-2">Cargando catálogo de productos</h3>
          <p className="text-muted-foreground">Obteniendo información actualizada...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <ProductoForm
        producto={editingProducto}
        productos={productosConCategoria as any}
        categorias={categorias}
        onSave={handleSaveProducto}
        onCancel={() => {
          setShowForm(false);
          setEditingProducto(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Header */}
      <EnhancedHeader
        title="Productos"
        subtitle="Catálogo, precios y control de stock"
        badge={{
          text: `${productosActivos} activos`,
          variant: "default"
        }}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Actualizar
            </Button>
            <Button size="sm" onClick={() => { setEditingProducto(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo
            </Button>
          </div>
        }
      />

      {/* Enhanced Metrics Section */}
      <Section 
        title="Resumen" 
        subtitle=""
      >
        <MetricGrid columns={4}>
          <EnhancedMetricCard
            title="Productos Activos"
            value={productosActivos}
            subtitle="En catálogo"
            icon={Package}
            variant="success"
            trend="up"
            trendValue="Disponibles"
          />
          <EnhancedMetricCard
            title="Alertas de Stock"
            value={productosStockBajo}
            subtitle="Stock bajo"
            icon={AlertTriangle}
            variant={productosStockBajo > 0 ? "warning" : "success"}
            trend={productosStockBajo > 0 ? "down" : "up"}
            trendValue={productosStockBajo > 0 ? "Requieren reposición" : "Stock óptimo"}
          />
          <EnhancedMetricCard
            title="Valor de Inventario"
            value={`Bs. ${valorInventario.toLocaleString()}`}
            subtitle="Valor total en stock"
            icon={DollarSign}
            variant="success"
            trend="up"
            trendValue="Activo circulante"
          />
          <EnhancedMetricCard
            title="Total Productos"
            value={productosConCategoria.length}
            subtitle="Incluye inactivos"
            icon={BarChart3}
            variant="default"
            trend="up"
            trendValue="Catálogo completo"
          />
        </MetricGrid>
      </Section>

      {/* Enhanced Products List */}
      <Section 
        title="Catálogo"
        subtitle=""
      >
        <Card className="card-gradient">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  Productos Registrados
                </CardTitle>
                <CardDescription>
                  Busca y gestiona tus productos con filtros avanzados
                </CardDescription>
              </div>
              <div className="w-full max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, código o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="divide-y divide-border">
                {productosFiltrados.map((producto) => (
                <div key={producto.id} className="p-4 table-row-interactive group">
                    <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                        {producto.imagen_url && (
                          <img src={producto.imagen_url} alt={`Imagen ${producto.nombre}`} className="h-10 w-10 rounded object-cover border" />
                        )}
                        <h3 className="font-semibold text-lg">{producto.nombre}</h3>
                        <Badge variant="outline">{producto.codigo}</Badge>
                        <Badge variant={producto.activo ? "default" : "secondary"}>
                            {producto.activo ? "Activo" : "Inactivo"}
                        </Badge>
                        {(producto.stock_actual || 0) <= (producto.stock_minimo || 0) && producto.activo && (
                            <Badge variant="destructive">Stock Bajo</Badge>
                        )}
                        </div>
                        
                        <p className="text-muted-foreground">{producto.descripcion}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="font-medium text-foreground">Categoría:</span>
                            <p className="text-muted-foreground">{producto.categoria || 'General'}</p>
                        </div>
                        <div>
                            <span className="font-medium text-foreground">Stock Actual:</span>
                            <p className={(producto.stock_actual || 0) <= (producto.stock_minimo || 0) ? "text-red-600" : "text-muted-foreground"}>
                            {producto.stock_actual || 0} {producto.unidad_medida || 'PZA'}
                            </p>
                        </div>
                        <div>
                            <span className="font-medium text-foreground">Precio Venta:</span>
                            <p className="text-muted-foreground">Bs. {(producto.precio_venta || 0).toFixed(2)} <span className="text-xs">(IVA incl.)</span></p>
                        </div>
                        <div>
                            <span className="font-medium text-foreground">Costo:</span>
                            <p className="text-muted-foreground">Bs. {(producto.costo_unitario || 0).toFixed(2)}</p>
                        </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground pt-2">
                        Actualizado el: {producto.updated_at?.split('T')[0] || new Date().toISOString().slice(0, 10)}
                        </div>
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditProducto(producto)}
                        >
                        <Edit className="w-4 h-4" />
                        </Button>
                        {producto.activo ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteProducto(producto.id)}
                            aria-label="Desactivar producto"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReactivateProducto(producto.id)}
                            aria-label="Reactivar producto"
                        >
                            <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        )}
                    </div>
                    </div>
                </div>
                ))}
                
                {productosFiltrados.length === 0 && !loading && (
                <div className="text-center py-16 text-muted-foreground">
                    <Package className="w-16 h-16 mx-auto mb-4 empty-state-icon" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron productos</h3>
                    <p className="text-sm mb-4">
                      {searchTerm 
                        ? `No hay productos que coincidan con "${searchTerm}"`
                        : "Aún no tienes productos registrados en tu catálogo"
                      }
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => { setEditingProducto(null); setShowForm(true); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Crear primer producto
                      </Button>
                    )}
                </div>
                )}
            </div>
          </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
};

export default ProductosModule;