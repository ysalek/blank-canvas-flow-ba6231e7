import { useMemo, useState } from "react";
import * as XLSX from "@e965/xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useFacturas } from "@/hooks/useFacturas";
import { useProductosValidated } from "@/hooks/useProductosValidated";
import {
  BarChart3,
  Calculator,
  DollarSign,
  Download,
  Package,
  PieChart,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

interface ProductoRentabilidad {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  ventasUnidades: number;
  ventasTotal: number;
  costoTotal: number;
  margenBruto: number;
  margenPorcentaje: number;
  rotacion: number;
  contribucionTotal: number;
  participacionVentas: number;
}

interface CategoriaRentabilidad {
  categoria: string;
  ventasTotal: number;
  costoTotal: number;
  margenBruto: number;
  margenPorcentaje: number;
  cantidadProductos: number;
  participacionVentas: number;
  rotacion: number;
}

interface ClienteRentabilidad {
  id: string;
  nombre: string;
  ventasTotal: number;
  costoTotal: number;
  margenBruto: number;
  margenPorcentaje: number;
  frecuenciaCompra: number;
  ultimaCompra: string;
  participacionVentas: number;
}

interface PeriodoAnalisis {
  periodo: string;
  ventasTotal: number;
  costoTotal: number;
  margenBruto: number;
  margenPorcentaje: number;
  unidadesVendidas: number;
}

type SortMode = "margen" | "ventas" | "rotacion";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

const AnalisisRentabilidad = () => {
  const [filtroFecha, setFiltroFecha] = useState({ desde: "", hasta: "" });
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [ordenamiento, setOrdenamiento] = useState<SortMode>("margen");
  const { toast } = useToast();
  const { facturas, loading: facturasLoading } = useFacturas();
  const { productos, loading: productosLoading } = useProductosValidated();

  const analytics = useMemo(() => {
    const productosMap = new Map(productos.map((producto) => [producto.id, producto]));

    const facturasFiltradas = facturas.filter((factura) => {
      if (factura.estado !== "enviada" && factura.estado !== "pagada") return false;
      if (filtroFecha.desde && factura.fecha < filtroFecha.desde) return false;
      if (filtroFecha.hasta && factura.fecha > filtroFecha.hasta) return false;
      return true;
    });

    const productosRentabilidadMap = new Map<string, ProductoRentabilidad>();
    const categoriasBaseMap = new Map<
      string,
      {
        categoria: string;
        ventasTotal: number;
        costoTotal: number;
        margenBruto: number;
        productos: Set<string>;
        rotacion: number;
      }
    >();
    const clientesRentabilidadMap = new Map<string, ClienteRentabilidad>();
    const periodosMap = new Map<string, PeriodoAnalisis>();

    facturasFiltradas.forEach((factura) => {
      const clienteId = factura.cliente.id || factura.numero;
      const clienteNombre = factura.cliente.nombre || "Cliente sin nombre";

      factura.items.forEach((item) => {
        const producto = productosMap.get(item.productoId);
        const costoUnitario = Number(producto?.costo_unitario ?? producto?.costoUnitario ?? 0);
        const categoria = producto?.categoria || "Sin categoria";
        const productoId = item.productoId || item.codigo;
        const ventaTotal = item.subtotal || item.precioUnitario * item.cantidad;
        const costoTotal = costoUnitario * item.cantidad;
        const margenBruto = ventaTotal - costoTotal;
        const periodo = factura.fecha.slice(0, 7);

        if (!productosRentabilidadMap.has(productoId)) {
          productosRentabilidadMap.set(productoId, {
            id: productoId,
            nombre: producto?.nombre || item.descripcion,
            codigo: producto?.codigo || item.codigo,
            categoria,
            ventasUnidades: 0,
            ventasTotal: 0,
            costoTotal: 0,
            margenBruto: 0,
            margenPorcentaje: 0,
            rotacion: 0,
            contribucionTotal: 0,
            participacionVentas: 0,
          });
        }

        const productoData = productosRentabilidadMap.get(productoId);
        if (productoData) {
          productoData.ventasUnidades += item.cantidad;
          productoData.ventasTotal += ventaTotal;
          productoData.costoTotal += costoTotal;
          productoData.margenBruto += margenBruto;
        }

        if (!categoriasBaseMap.has(categoria)) {
          categoriasBaseMap.set(categoria, {
            categoria,
            ventasTotal: 0,
            costoTotal: 0,
            margenBruto: 0,
            productos: new Set<string>(),
            rotacion: 0,
          });
        }

        const categoriaData = categoriasBaseMap.get(categoria);
        if (categoriaData) {
          categoriaData.ventasTotal += ventaTotal;
          categoriaData.costoTotal += costoTotal;
          categoriaData.margenBruto += margenBruto;
          categoriaData.rotacion += item.cantidad;
          categoriaData.productos.add(productoId);
        }

        if (!clientesRentabilidadMap.has(clienteId)) {
          clientesRentabilidadMap.set(clienteId, {
            id: clienteId,
            nombre: clienteNombre,
            ventasTotal: 0,
            costoTotal: 0,
            margenBruto: 0,
            margenPorcentaje: 0,
            frecuenciaCompra: 0,
            ultimaCompra: factura.fecha,
            participacionVentas: 0,
          });
        }

        const clienteData = clientesRentabilidadMap.get(clienteId);
        if (clienteData) {
          clienteData.ventasTotal += ventaTotal;
          clienteData.costoTotal += costoTotal;
          clienteData.margenBruto += margenBruto;
          clienteData.frecuenciaCompra += 1;
          if (factura.fecha > clienteData.ultimaCompra) {
            clienteData.ultimaCompra = factura.fecha;
          }
        }

        if (!periodosMap.has(periodo)) {
          periodosMap.set(periodo, {
            periodo,
            ventasTotal: 0,
            costoTotal: 0,
            margenBruto: 0,
            margenPorcentaje: 0,
            unidadesVendidas: 0,
          });
        }

        const periodoData = periodosMap.get(periodo);
        if (periodoData) {
          periodoData.ventasTotal += ventaTotal;
          periodoData.costoTotal += costoTotal;
          periodoData.margenBruto += margenBruto;
          periodoData.unidadesVendidas += item.cantidad;
        }
      });
    });

    const ventasTotales = Array.from(productosRentabilidadMap.values()).reduce(
      (sum, producto) => sum + producto.ventasTotal,
      0
    );

    const categoriasDisponibles = Array.from(categoriasBaseMap.keys()).sort((a, b) =>
      a.localeCompare(b)
    );

    const productosRentabilidad = Array.from(productosRentabilidadMap.values())
      .map((producto) => ({
        ...producto,
        margenPorcentaje:
          producto.ventasTotal > 0 ? (producto.margenBruto / producto.ventasTotal) * 100 : 0,
        rotacion: producto.ventasUnidades,
        contribucionTotal: producto.margenBruto,
        participacionVentas: ventasTotales > 0 ? (producto.ventasTotal / ventasTotales) * 100 : 0,
      }))
      .filter((producto) => filtroCategoria === "todos" || producto.categoria === filtroCategoria);

    const categoriasRentabilidad = Array.from(categoriasBaseMap.values())
      .map((categoria) => ({
        categoria: categoria.categoria,
        ventasTotal: categoria.ventasTotal,
        costoTotal: categoria.costoTotal,
        margenBruto: categoria.margenBruto,
        margenPorcentaje:
          categoria.ventasTotal > 0 ? (categoria.margenBruto / categoria.ventasTotal) * 100 : 0,
        cantidadProductos: categoria.productos.size,
        participacionVentas: ventasTotales > 0 ? (categoria.ventasTotal / ventasTotales) * 100 : 0,
        rotacion: categoria.rotacion,
      }))
      .filter((categoria) => filtroCategoria === "todos" || categoria.categoria === filtroCategoria);

    const clientesRentabilidad = Array.from(clientesRentabilidadMap.values()).map((cliente) => ({
      ...cliente,
      margenPorcentaje:
        cliente.ventasTotal > 0 ? (cliente.margenBruto / cliente.ventasTotal) * 100 : 0,
      participacionVentas: ventasTotales > 0 ? (cliente.ventasTotal / ventasTotales) * 100 : 0,
    }));

    const periodosAnalisis = Array.from(periodosMap.values())
      .map((periodo) => ({
        ...periodo,
        margenPorcentaje:
          periodo.ventasTotal > 0 ? (periodo.margenBruto / periodo.ventasTotal) * 100 : 0,
      }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));

    const sortFunction = <T extends { ventasTotal: number; margenBruto: number }>(
      a: T & Partial<{ rotacion: number; frecuenciaCompra: number }>,
      b: T & Partial<{ rotacion: number; frecuenciaCompra: number }>
    ) => {
      switch (ordenamiento) {
        case "ventas":
          return b.ventasTotal - a.ventasTotal;
        case "rotacion":
          return (b.rotacion ?? b.frecuenciaCompra ?? 0) - (a.rotacion ?? a.frecuenciaCompra ?? 0);
        default:
          return b.margenBruto - a.margenBruto;
      }
    };

    productosRentabilidad.sort(sortFunction);
    categoriasRentabilidad.sort(sortFunction);
    clientesRentabilidad.sort(sortFunction);

    return {
      categoriasDisponibles,
      productosRentabilidad,
      categoriasRentabilidad,
      clientesRentabilidad,
      periodosAnalisis,
    };
  }, [facturas, filtroCategoria, filtroFecha.desde, filtroFecha.hasta, ordenamiento, productos]);

  const loading = facturasLoading || productosLoading;

  const exportarAnalisis = () => {
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(analytics.productosRentabilidad),
      "Productos"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(analytics.categoriasRentabilidad),
      "Categorias"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(analytics.clientesRentabilidad),
      "Clientes"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(analytics.periodosAnalisis),
      "Periodos"
    );

    XLSX.writeFile(wb, `analisis_rentabilidad_${new Date().toISOString().slice(0, 10)}.xlsx`);

    toast({
      title: "Analisis exportado",
      description: "La rentabilidad consolidada se exporto a Excel.",
    });
  };

  const metricas = {
    margenPromedioProductos:
      analytics.productosRentabilidad.length > 0
        ? analytics.productosRentabilidad.reduce(
            (sum, producto) => sum + producto.margenPorcentaje,
            0
          ) / analytics.productosRentabilidad.length
        : 0,
    mejorProducto: analytics.productosRentabilidad[0] ?? null,
    mejorCategoria: analytics.categoriasRentabilidad[0] ?? null,
    mejorCliente: analytics.clientesRentabilidad[0] ?? null,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary animate-pulse" />
          <div>
            <h2 className="text-2xl font-bold">Analisis de Rentabilidad</h2>
            <p className="text-slate-600">Cargando ventas y costos reales...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Analisis de Rentabilidad</h2>
            <p className="text-slate-600">
              Margenes calculados desde facturas y costos de productos persistidos en Supabase
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={exportarAnalisis}>
          <Download className="mr-2 h-4 w-4" />
          Exportar analisis
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de analisis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Desde</label>
              <input
                type="date"
                className="w-full rounded border p-2"
                value={filtroFecha.desde}
                onChange={(event) =>
                  setFiltroFecha((prev) => ({ ...prev, desde: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Hasta</label>
              <input
                type="date"
                className="w-full rounded border p-2"
                value={filtroFecha.hasta}
                onChange={(event) =>
                  setFiltroFecha((prev) => ({ ...prev, hasta: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las categorias</SelectItem>
                  {analytics.categoriasDisponibles.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Ordenar por</label>
              <Select
                value={ordenamiento}
                onValueChange={(value) => setOrdenamiento(value as SortMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="margen">Margen de ganancia</SelectItem>
                  <SelectItem value="ventas">Ventas totales</SelectItem>
                  <SelectItem value="rotacion">Rotacion/frecuencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen promedio</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.margenPromedioProductos.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Promedio de productos vendidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejor producto</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{metricas.mejorProducto?.nombre || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.mejorProducto
                ? `${metricas.mejorProducto.margenPorcentaje.toFixed(1)}% de margen`
                : "Sin datos"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejor categoria</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{metricas.mejorCategoria?.categoria || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.mejorCategoria
                ? `${metricas.mejorCategoria.margenPorcentaje.toFixed(1)}% de margen`
                : "Sin datos"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejor cliente</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{metricas.mejorCliente?.nombre || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.mejorCliente
                ? `Bs. ${metricas.mejorCliente.margenBruto.toFixed(2)} de margen`
                : "Sin datos"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventas analizadas</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            Bs.{" "}
            {analytics.productosRentabilidad
              .reduce((sum, producto) => sum + producto.ventasTotal, 0)
              .toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Basado en facturas enviadas y pagadas del periodo
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="productos" className="w-full">
        <TabsList>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
        </TabsList>

        <TabsContent value="productos">
          <Card>
            <CardHeader>
              <CardTitle>Rentabilidad por producto</CardTitle>
              <CardDescription>Analisis basado en ventas reales y costo actual del producto</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Margen Bs.</TableHead>
                    <TableHead className="text-right">Margen %</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Participacion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.productosRentabilidad.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell className="font-medium">{producto.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{producto.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-right">Bs. {producto.ventasTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Bs. {producto.costoTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <span className={producto.margenBruto >= 0 ? "text-green-600" : "text-red-600"}>
                          Bs. {producto.margenBruto.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1">
                          {producto.margenPorcentaje >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span
                            className={
                              producto.margenPorcentaje >= 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            {producto.margenPorcentaje.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{producto.ventasUnidades}</TableCell>
                      <TableCell className="text-right">
                        {producto.participacionVentas.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rentabilidad por categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Margen %</TableHead>
                      <TableHead className="text-right">Productos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.categoriasRentabilidad.map((categoria) => (
                      <TableRow key={categoria.categoria}>
                        <TableCell className="font-medium">{categoria.categoria}</TableCell>
                        <TableCell className="text-right">Bs. {categoria.ventasTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              categoria.margenPorcentaje >= 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            {categoria.margenPorcentaje.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{categoria.cantidadProductos}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Participacion por categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={analytics.categoriasRentabilidad}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ categoria, participacionVentas }) =>
                        `${categoria}: ${Number(participacionVentas).toFixed(1)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="participacionVentas"
                    >
                      {analytics.categoriasRentabilidad.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${Number(value).toFixed(1)}%`, "Participacion"]}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clientes">
          <Card>
            <CardHeader>
              <CardTitle>Rentabilidad por cliente</CardTitle>
              <CardDescription>Clientes con mayor aporte de margen en el periodo</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Margen Bs.</TableHead>
                    <TableHead className="text-right">Margen %</TableHead>
                    <TableHead className="text-right">Frecuencia</TableHead>
                    <TableHead className="text-right">Ultima compra</TableHead>
                    <TableHead className="text-right">Participacion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.clientesRentabilidad.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nombre}</TableCell>
                      <TableCell className="text-right">Bs. {cliente.ventasTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <span className={cliente.margenBruto >= 0 ? "text-green-600" : "text-red-600"}>
                          Bs. {cliente.margenBruto.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            cliente.margenPorcentaje >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          {cliente.margenPorcentaje.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{cliente.frecuenciaCompra}</TableCell>
                      <TableCell className="text-right">
                        {new Date(cliente.ultimaCompra).toLocaleDateString("es-BO")}
                      </TableCell>
                      <TableCell className="text-right">
                        {cliente.participacionVentas.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tendencias">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias de rentabilidad</CardTitle>
              <CardDescription>Evolucion de margenes por periodo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.periodosAnalisis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${Number(value).toFixed(1)}%`} />
                  <Bar dataKey="margenPorcentaje" fill="#8884d8" name="Margen %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalisisRentabilidad;
