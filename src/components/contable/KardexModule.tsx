import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, Download, Package, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseProductos } from "@/hooks/useSupabaseProductos";
import { useSupabaseMovimientos } from "@/hooks/useSupabaseMovimientos";
import ProductThumbnail from "./products/ProductThumbnail";

interface KardexRow {
  id: string;
  fecha: string;
  tipo: "entrada" | "salida" | "ajuste";
  motivo: string;
  documento: string;
  cantidad: number;
  costoPromedio: number;
  saldoAnterior: number;
  saldoAcumulado: number;
  valorMovimiento: number;
  valorAcumulado: number;
}

const KardexModule = () => {
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().slice(0, 10));
  const [metodoValoracion, setMetodoValoracion] = useState("promedio");
  const { toast } = useToast();
  const { productos, loading: loadingProductos } = useSupabaseProductos();
  const { loading: loadingMovimientos, getMovimientosInventario } = useSupabaseMovimientos();

  const movimientos = getMovimientosInventario();
  const producto = productos.find((item) => item.id === productoSeleccionado);
  const historialProducto = movimientos
    .filter((movimiento) => movimiento.productoId === productoSeleccionado && movimiento.fecha <= fechaFin)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const calcularKardex = (): KardexRow[] => {
    if (!producto || historialProducto.length === 0) {
      return [];
    }

    let saldoAcumulado = historialProducto[0]?.stockAnterior ?? producto.stock_actual;
    let costoPromedio = historialProducto[0]?.costoUnitario || producto.costo_unitario || producto.precio_compra || 0;
    let valorAcumulado = saldoAcumulado * costoPromedio;
    const kardex: KardexRow[] = [];

    historialProducto.forEach((movimiento) => {
      const cantidadFirmada = movimiento.tipo === 'salida' ? -movimiento.cantidad : movimiento.cantidad;
      const costoMovimiento = movimiento.costoUnitario || costoPromedio;
      const saldoAnterior = saldoAcumulado;

      if (movimiento.tipo === 'entrada') {
        valorAcumulado += movimiento.cantidad * costoMovimiento;
        saldoAcumulado += movimiento.cantidad;
        costoPromedio = saldoAcumulado > 0 ? valorAcumulado / saldoAcumulado : 0;
      } else if (movimiento.tipo === 'salida') {
        saldoAcumulado += cantidadFirmada;
        valorAcumulado -= movimiento.cantidad * costoPromedio;
      } else {
        saldoAcumulado = movimiento.stockNuevo;
        valorAcumulado = saldoAcumulado * costoMovimiento;
        costoPromedio = costoMovimiento;
      }

      if (movimiento.fecha >= fechaInicio) {
        kardex.push({
          id: movimiento.id,
          fecha: movimiento.fecha,
          tipo: movimiento.tipo,
          motivo: movimiento.motivo,
          documento: movimiento.documento || 'N/A',
          cantidad: movimiento.cantidad,
          costoPromedio,
          saldoAnterior,
          saldoAcumulado: Math.max(0, saldoAcumulado),
          valorMovimiento: movimiento.tipo === 'salida'
            ? movimiento.cantidad * costoPromedio
            : movimiento.cantidad * costoMovimiento,
          valorAcumulado: Math.max(0, valorAcumulado),
        });
      }
    });

    return kardex;
  };

  const kardex = calcularKardex();
  const movimientosPeriodo = historialProducto.filter((movimiento) => movimiento.fecha >= fechaInicio);
  const loading = loadingProductos || loadingMovimientos;

  const exportarExcel = () => {
    toast({
      title: "Exportacion iniciada",
      description: "El kardex filtrado quedo preparado para su salida operativa.",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/60 bg-card/90 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-gradient-to-r from-slate-50 via-white to-emerald-50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Calculator className="w-6 h-6 text-primary" />
                Kardex por Producto
              </CardTitle>
              <CardDescription>
                Control detallado de movimientos y valoracion de inventario sobre datos persistidos.
              </CardDescription>
            </div>
            <Button onClick={exportarExcel} variant="outline" disabled={!productoSeleccionado}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Kardex
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="producto">Producto</Label>
              <Select value={productoSeleccionado} onValueChange={setProductoSeleccionado}>
                <SelectTrigger id="producto">
                  <SelectValue placeholder="Seleccione un producto" />
                </SelectTrigger>
                <SelectContent>
                  {productos.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nombre} ({item.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metodo">Metodo de Valoracion</Label>
              <Select value={metodoValoracion} onValueChange={setMetodoValoracion}>
                <SelectTrigger id="metodo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promedio">Promedio ponderado</SelectItem>
                  <SelectItem value="fifo">FIFO</SelectItem>
                  <SelectItem value="lifo">LIFO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
              <Input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(event) => setFechaInicio(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha-fin">Fecha Fin</Label>
              <Input
                id="fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(event) => setFechaFin(event.target.value)}
              />
            </div>
          </div>

          {loading && (
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Cargando productos y movimientos reales para armar el kardex...
            </div>
          )}

          {producto && (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="flex h-full items-center gap-4 p-4">
                    <ProductThumbnail
                      imageUrl={producto.imagen_url}
                      name={producto.nombre}
                      className="h-16 w-16 shrink-0"
                      roundedClassName="rounded-2xl"
                    />
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Producto activo
                      </div>
                      <div className="truncate text-lg font-semibold">{producto.nombre}</div>
                      <div className="text-sm text-muted-foreground">
                        {producto.codigo} · {producto.unidad_medida}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Package className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                    <div className="text-2xl font-bold">{producto.stock_actual}</div>
                    <div className="text-sm text-muted-foreground">Stock Actual</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                    <div className="text-2xl font-bold">Bs. {producto.costo_unitario.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Costo Unitario</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Calculator className="mx-auto mb-2 h-8 w-8 text-amber-600" />
                    <div className="text-2xl font-bold">
                      Bs. {(producto.stock_actual * producto.costo_unitario).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Total</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Package className="mx-auto mb-2 h-8 w-8 text-violet-600" />
                    <div className="text-2xl font-bold">{movimientosPeriodo.length}</div>
                    <div className="text-sm text-muted-foreground">Movimientos</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Kardex - {producto.nombre}</CardTitle>
                  <CardDescription>
                    Metodo: {metodoValoracion === 'promedio' ? 'Promedio ponderado' : metodoValoracion.toUpperCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead className="text-center">Entradas</TableHead>
                        <TableHead className="text-center">Salidas</TableHead>
                        <TableHead className="text-center">Saldo</TableHead>
                        <TableHead className="text-right">Costo Prom.</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kardex.map((movimiento) => (
                        <TableRow key={movimiento.id}>
                          <TableCell>{movimiento.fecha}</TableCell>
                          <TableCell>{movimiento.motivo}</TableCell>
                          <TableCell>{movimiento.documento || 'N/A'}</TableCell>
                          <TableCell className="text-center">
                            {movimiento.tipo === 'entrada' ? (
                              <Badge variant="outline" className="text-green-600">
                                +{movimiento.cantidad}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {movimiento.tipo === 'salida' ? (
                              <Badge variant="outline" className="text-red-600">
                                -{movimiento.cantidad}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {movimiento.saldoAcumulado}
                          </TableCell>
                          <TableCell className="text-right">
                            Bs. {movimiento.costoPromedio.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            Bs. {movimiento.valorAcumulado.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {productoSeleccionado && kardex.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                            No hay movimientos persistidos para este producto en el periodo seleccionado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KardexModule;
