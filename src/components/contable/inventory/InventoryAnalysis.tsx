import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFacturas } from "@/hooks/useFacturas";
import { useProductosValidated, type Producto } from "@/hooks/useProductosValidated";
import { useSupabaseProveedores } from "@/hooks/useSupabaseProveedores";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Calculator, Clock, Package, TrendingDown } from "lucide-react";

interface UltimaCompraProducto {
  fecha: string;
  precioCompra: number;
  cantidad: number;
}

interface ProductAnalysis {
  producto: Producto;
  ultimaCompra: UltimaCompraProducto | null;
  diasEnDeposito: number;
  margenUtilidad: number;
  posibleDescuento: number;
  rotacion: "Alta" | "Media" | "Baja";
  recomendacion: string;
}

interface ItemCompraRecord {
  compra_id: string | null;
  producto_id: string | null;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
  descripcion: string;
}

const getStockActual = (producto: Producto): number =>
  Number(producto.stock_actual ?? producto.stockActual ?? 0);

const getStockMinimo = (producto: Producto): number =>
  Number(producto.stock_minimo ?? producto.stockMinimo ?? 0);

const getCostoUnitario = (producto: Producto): number =>
  Number(producto.costo_unitario ?? producto.costoUnitario ?? 0);

const getPrecioVenta = (producto: Producto): number =>
  Number(producto.precio_venta ?? producto.precioVenta ?? 0);

const InventoryAnalysis = () => {
  const [itemsCompra, setItemsCompra] = useState<ItemCompraRecord[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const { productos, loading: productosLoading } = useProductosValidated();
  const { facturas, loading: facturasLoading } = useFacturas();
  const { compras, loading: comprasLoading } = useSupabaseProveedores();

  useEffect(() => {
    const cargarItemsCompra = async () => {
      if (compras.length === 0) {
        setItemsCompra([]);
        setItemsLoading(false);
        return;
      }

      setItemsLoading(true);
      try {
        const compraIds = compras.map((compra) => compra.id);
        const { data, error } = await supabase
          .from("items_compras")
          .select("compra_id, producto_id, cantidad, costo_unitario, subtotal, descripcion")
          .in("compra_id", compraIds);

        if (error) throw error;
        setItemsCompra((data || []) as ItemCompraRecord[]);
      } catch (error) {
        console.error("Error cargando items de compras:", error);
        setItemsCompra([]);
      } finally {
        setItemsLoading(false);
      }
    };

    void cargarItemsCompra();
  }, [compras]);

  const analisisProductos = useMemo(() => {
    const comprasMap = new Map(compras.map((compra) => [compra.id, compra]));
    const ventasUltimos3Meses = new Map<string, number>();
    const hoy = new Date();
    const hace3Meses = new Date();
    hace3Meses.setMonth(hace3Meses.getMonth() - 3);

    facturas
      .filter((factura) => factura.estado !== "anulada")
      .forEach((factura) => {
        const fechaFactura = new Date(factura.fecha);
        if (fechaFactura < hace3Meses) return;

        factura.items.forEach((item) => {
          const productoId = item.productoId || item.codigo;
          ventasUltimos3Meses.set(
            productoId,
            (ventasUltimos3Meses.get(productoId) || 0) + item.cantidad
          );
        });
      });

    return productos.map((producto) => {
      const productoItems = itemsCompra.filter((item) => item.producto_id === producto.id);

      const ultimaCompra = productoItems.reduce<UltimaCompraProducto | null>((ultima, item) => {
        const compra = item.compra_id ? comprasMap.get(item.compra_id) : undefined;
        if (!compra) return ultima;

        if (!ultima || compra.fecha > ultima.fecha) {
          return {
            fecha: compra.fecha,
            precioCompra: Number(item.costo_unitario || 0),
            cantidad: Number(item.cantidad || 0),
          };
        }

        return ultima;
      }, null);

      const fechaBase = ultimaCompra?.fecha || producto.updated_at || producto.created_at;
      const diasEnDeposito = fechaBase
        ? Math.max(
            0,
            Math.floor((hoy.getTime() - new Date(fechaBase).getTime()) / (1000 * 60 * 60 * 24))
          )
        : 0;

      const precioCompraBase = ultimaCompra?.precioCompra || getCostoUnitario(producto);
      const precioVenta = getPrecioVenta(producto);
      const stockActual = getStockActual(producto);
      const stockMinimo = getStockMinimo(producto);
      const ventasRecientes = ventasUltimos3Meses.get(producto.id) || 0;
      const margenUtilidad =
        precioCompraBase > 0 ? ((precioVenta - precioCompraBase) / precioCompraBase) * 100 : 0;
      const posibleDescuento =
        margenUtilidad > 20 ? Math.min(margenUtilidad * 0.5, 30) : Math.max(margenUtilidad * 0.3, 5);

      let rotacion: ProductAnalysis["rotacion"] = "Baja";
      if (ventasRecientes > stockActual * 2) rotacion = "Alta";
      else if (ventasRecientes > stockActual) rotacion = "Media";

      let recomendacion = "Producto en condiciones normales";
      if (diasEnDeposito > 180 && rotacion === "Baja") {
        recomendacion = "Considerar descuento agresivo o liquidacion controlada.";
      } else if (diasEnDeposito > 90 && margenUtilidad > 30) {
        recomendacion = "Aplicar promocion antes de que el inventario siga envejeciendo.";
      } else if (rotacion === "Alta" && stockActual < stockMinimo) {
        recomendacion = "Reabastecer con prioridad para evitar ruptura de stock.";
      } else if (margenUtilidad < 15) {
        recomendacion = "Revisar costo, precio de venta o condiciones comerciales.";
      }

      return {
        producto,
        ultimaCompra,
        diasEnDeposito,
        margenUtilidad,
        posibleDescuento,
        rotacion,
        recomendacion,
      };
    });
  }, [compras, facturas, itemsCompra, productos]);

  const productosAntiguos = analisisProductos.filter((item) => item.diasEnDeposito > 90);
  const productosConProblemas = analisisProductos.filter(
    (item) => item.margenUtilidad < 15 || (item.diasEnDeposito > 180 && item.rotacion === "Baja")
  );

  const loading = productosLoading || facturasLoading || comprasLoading || itemsLoading;

  const getRotationColor = (rotacion: ProductAnalysis["rotacion"]) => {
    switch (rotacion) {
      case "Alta":
        return "bg-green-100 text-green-800 border-green-200";
      case "Media":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary animate-pulse" />
          <div>
            <h2 className="text-2xl font-bold">Analisis de Inventario</h2>
            <p className="text-muted-foreground">Cargando inventario, ventas y compras reales...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos antiguos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productosAntiguos.length}</div>
            <p className="text-xs text-muted-foreground">Mas de 90 dias en deposito</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con problemas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productosConProblemas.length}</div>
            <p className="text-xs text-muted-foreground">Requieren revision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen promedio</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analisisProductos.length > 0
                ? (
                    analisisProductos.reduce((sum, item) => sum + item.margenUtilidad, 0) /
                    analisisProductos.length
                  ).toFixed(1)
                : "0.0"}
              %
            </div>
            <p className="text-xs text-muted-foreground">Rentabilidad del inventario vendido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor inventario</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Bs.{" "}
              {analisisProductos
                .reduce((sum, item) => sum + getStockActual(item.producto) * getCostoUnitario(item.producto), 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Valorizado a costo contable</p>
          </CardContent>
        </Card>
      </div>

      {productosConProblemas.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {productosConProblemas.length} productos requieren seguimiento por antiguedad, baja
            rotacion o margen reducido.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Analisis detallado de inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Ultima compra</TableHead>
                <TableHead className="text-center">Dias en stock</TableHead>
                <TableHead className="text-right">Margen %</TableHead>
                <TableHead className="text-right">Desc. sugerido</TableHead>
                <TableHead className="text-center">Rotacion</TableHead>
                <TableHead>Recomendacion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analisisProductos.map((analisis) => (
                <TableRow key={analisis.producto.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{analisis.producto.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock: {getStockActual(analisis.producto)} | Precio: Bs.{" "}
                        {getPrecioVenta(analisis.producto).toFixed(2)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {analisis.ultimaCompra ? (
                      <div>
                        <p className="text-sm">
                          {new Date(analisis.ultimaCompra.fecha).toLocaleDateString("es-BO")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Bs. {analisis.ultimaCompra.precioCompra.toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin compras registradas</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        analisis.diasEnDeposito > 180
                          ? "destructive"
                          : analisis.diasEnDeposito > 90
                            ? "secondary"
                            : "default"
                      }
                    >
                      {analisis.diasEnDeposito} dias
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-medium ${
                        analisis.margenUtilidad > 30
                          ? "text-green-600"
                          : analisis.margenUtilidad > 15
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {analisis.margenUtilidad.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{analisis.posibleDescuento.toFixed(1)}%</TableCell>
                  <TableCell className="text-center">
                    <Badge className={getRotationColor(analisis.rotacion)}>{analisis.rotacion}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{analisis.recomendacion}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Observacion auditora
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Este analisis ya no usa datos simulados del navegador. Cruza existencias, ventas y ultimas
          compras persistidas para apoyar decisiones de reposicion y liquidacion con mejor trazabilidad.
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryAnalysis;
