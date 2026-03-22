import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { ProductoInventario } from "./InventoryData";
import { getStockStatus, getStatusColor, getStatusText } from "./inventoryUtils";
import ProductThumbnail from "../products/ProductThumbnail";

interface ProductListTabProps {
  productos: ProductoInventario[];
  busqueda: string;
  setBusqueda: (value: string) => void;
  filtroCategoria: string;
  setFiltroCategoria: (value: string) => void;
}

const ProductListTab = ({
  productos,
  busqueda,
  setBusqueda,
  filtroCategoria,
  setFiltroCategoria,
}: ProductListTabProps) => {
  const productosFiltrados = productos.filter((producto) => {
    const coincideBusqueda = producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      producto.codigo.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = filtroCategoria === "all" || producto.categoria === filtroCategoria;
    return coincideBusqueda && coincideCategoria;
  });

  const categoriasDisponibles = ["all", ...new Set(productos.map((producto) => producto.categoria).filter(Boolean))];

  return (
    <Card className="card-gradient rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>Inventario de productos</CardTitle>
        <CardDescription>
          Lista visual con valuacion por promedio ponderado, estado de stock y presentacion comercial del catalogo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar productos..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="executive-input pl-10"
              />
            </div>
          </div>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="executive-input w-full xl:w-56">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              {categoriasDisponibles.map((categoria) => (
                <SelectItem key={categoria} value={categoria}>
                  {categoria === "all" ? "Todas las categorias" : categoria}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {productosFiltrados.map((producto) => {
            const status = getStockStatus(producto);
            return (
              <div key={producto.id} className="card-modern rounded-[1.5rem] p-4">
                <div className="flex items-start gap-4">
                  <ProductThumbnail
                    imageUrl={producto.imagenUrl}
                    name={producto.nombre}
                    className="h-20 w-20 shrink-0"
                    iconClassName="h-8 w-8"
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-foreground">{producto.nombre}</h3>
                      <Badge variant="outline" className="rounded-full">{producto.codigo}</Badge>
                      <Badge className={getStatusColor(status)}>{getStatusText(status)}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl border border-border/70 bg-white/70 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Categoria</p>
                        <p className="mt-1 font-semibold text-foreground">{producto.categoria}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-white/70 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Stock actual</p>
                        <p className="mt-1 font-semibold text-foreground">{producto.stockActual}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-white/70 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Costo promedio</p>
                        <p className="mt-1 font-semibold text-primary">Bs. {producto.costoPromedioPonderado.toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-white/70 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Valor total</p>
                        <p className="mt-1 font-semibold text-foreground">Bs. {producto.valorTotalInventario.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductListTab;
