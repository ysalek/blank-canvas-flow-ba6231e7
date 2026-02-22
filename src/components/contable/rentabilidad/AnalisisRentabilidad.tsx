import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Calculator,
  Download,
  DollarSign,
  Package,
  Users,
  Calendar
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import * as XLSX from '@e965/xlsx';

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const AnalisisRentabilidad = () => {
  const [productosRentabilidad, setProductosRentabilidad] = useState<ProductoRentabilidad[]>([]);
  const [categoriasRentabilidad, setCategoriasRentabilidad] = useState<CategoriaRentabilidad[]>([]);
  const [clientesRentabilidad, setClientesRentabilidad] = useState<ClienteRentabilidad[]>([]);
  const [periodosAnalisis, setPeriodosAnalisis] = useState<PeriodoAnalisis[]>([]);
  const [filtroFecha, setFiltroFecha] = useState({ desde: '', hasta: '' });
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [ordenamiento, setOrdenamiento] = useState<'margen' | 'ventas' | 'rotacion'>('margen');
  const { toast } = useToast();

  useEffect(() => {
    calcularRentabilidad();
  }, [filtroFecha, filtroCategoria]);

  const calcularRentabilidad = () => {
    // Obtener datos de las facturas y productos
    const facturas = JSON.parse(localStorage.getItem('facturas') || '[]');
    const productos = JSON.parse(localStorage.getItem('productos') || '[]');
    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');

    // Filtrar facturas por fecha si se especifica
    let facturasFiltradas = facturas.filter((f: any) => f.estado === 'enviada' || f.estado === 'pagada');
    
    if (filtroFecha.desde) {
      facturasFiltradas = facturasFiltradas.filter((f: any) => f.fecha >= filtroFecha.desde);
    }
    
    if (filtroFecha.hasta) {
      facturasFiltradas = facturasFiltradas.filter((f: any) => f.fecha <= filtroFecha.hasta);
    }

    // Calcular rentabilidad por producto
    const productosMap = new Map<string, any>();
    const clientesMap = new Map<string, any>();
    const categoriasMap = new Map<string, any>();

    facturasFiltradas.forEach((factura: any) => {
      factura.items.forEach((item: any) => {
        const producto = productos.find((p: any) => p.id === item.productoId);
        if (!producto) return;

        const ventaTotal = item.precioUnitario * item.cantidad;
        const costoTotal = (producto.costoUnitario || 0) * item.cantidad;
        const margenBruto = ventaTotal - costoTotal;

        // Acumular por producto
        if (!productosMap.has(item.productoId)) {
          productosMap.set(item.productoId, {
            id: item.productoId,
            nombre: item.descripcion,
            codigo: producto.codigo,
            categoria: producto.categoria,
            ventasUnidades: 0,
            ventasTotal: 0,
            costoTotal: 0,
            margenBruto: 0
          });
        }

        const prodData = productosMap.get(item.productoId);
        prodData.ventasUnidades += item.cantidad;
        prodData.ventasTotal += ventaTotal;
        prodData.costoTotal += costoTotal;
        prodData.margenBruto += margenBruto;

        // Acumular por categoría
        if (!categoriasMap.has(producto.categoria)) {
          categoriasMap.set(producto.categoria, {
            categoria: producto.categoria,
            ventasTotal: 0,
            costoTotal: 0,
            margenBruto: 0,
            cantidadProductos: new Set()
          });
        }

        const catData = categoriasMap.get(producto.categoria);
        catData.ventasTotal += ventaTotal;
        catData.costoTotal += costoTotal;
        catData.margenBruto += margenBruto;
        catData.cantidadProductos.add(item.productoId);

        // Acumular por cliente
        if (!clientesMap.has(factura.clienteId)) {
          const cliente = clientes.find((c: any) => c.id === factura.clienteId);
          clientesMap.set(factura.clienteId, {
            id: factura.clienteId,
            nombre: cliente?.nombre || 'Cliente no encontrado',
            ventasTotal: 0,
            costoTotal: 0,
            margenBruto: 0,
            frecuenciaCompra: 0,
            ultimaCompra: factura.fecha
          });
        }

        const clienteData = clientesMap.get(factura.clienteId);
        clienteData.ventasTotal += ventaTotal;
        clienteData.costoTotal += costoTotal;
        clienteData.margenBruto += margenBruto;
        clienteData.frecuenciaCompra += 1;
        if (factura.fecha > clienteData.ultimaCompra) {
          clienteData.ultimaCompra = factura.fecha;
        }
      });
    });

    // Calcular métricas adicionales y totales
    const ventasTotales = Array.from(productosMap.values()).reduce((sum, p) => sum + p.ventasTotal, 0);
    
    // Procesar productos
    const productosResult: ProductoRentabilidad[] = Array.from(productosMap.values())
      .map(p => ({
        ...p,
        margenPorcentaje: p.ventasTotal > 0 ? (p.margenBruto / p.ventasTotal) * 100 : 0,
        rotacion: p.ventasUnidades, // Simplificado - sería mejor usar inventario promedio
        contribucionTotal: p.margenBruto,
        participacionVentas: ventasTotales > 0 ? (p.ventasTotal / ventasTotales) * 100 : 0
      }))
      .filter(p => filtroCategoria === 'todos' || p.categoria === filtroCategoria);

    // Procesar categorías
    const categoriasResult: CategoriaRentabilidad[] = Array.from(categoriasMap.values())
      .map(c => ({
        categoria: c.categoria,
        ventasTotal: c.ventasTotal,
        costoTotal: c.costoTotal,
        margenBruto: c.margenBruto,
        margenPorcentaje: c.ventasTotal > 0 ? (c.margenBruto / c.ventasTotal) * 100 : 0,
        cantidadProductos: c.cantidadProductos.size,
        participacionVentas: ventasTotales > 0 ? (c.ventasTotal / ventasTotales) * 100 : 0
      }));

    // Procesar clientes
    const clientesResult: ClienteRentabilidad[] = Array.from(clientesMap.values())
      .map(c => ({
        ...c,
        margenPorcentaje: c.ventasTotal > 0 ? (c.margenBruto / c.ventasTotal) * 100 : 0,
        participacionVentas: ventasTotales > 0 ? (c.ventasTotal / ventasTotales) * 100 : 0
      }));

    // Ordenar resultados
    const sortFunction = (a: any, b: any) => {
      switch (ordenamiento) {
        case 'ventas':
          return b.ventasTotal - a.ventasTotal;
        case 'rotacion':
          return (b.rotacion || b.frecuenciaCompra) - (a.rotacion || a.frecuenciaCompra);
        default:
          return b.margenBruto - a.margenBruto;
      }
    };

    productosResult.sort(sortFunction);
    clientesResult.sort(sortFunction);
    categoriasResult.sort(sortFunction);

    setProductosRentabilidad(productosResult);
    setCategoriasRentabilidad(categoriasResult);
    setClientesRentabilidad(clientesResult);

    // Análisis por períodos (últimos 6 meses)
    calcularTendenciaPeriodos(facturasFiltradas);
  };

  const calcularTendenciaPeriodos = (facturas: any[]) => {
    const periodosMap = new Map<string, any>();
    
    facturas.forEach(factura => {
      const periodo = factura.fecha.slice(0, 7); // YYYY-MM
      
      if (!periodosMap.has(periodo)) {
        periodosMap.set(periodo, {
          periodo,
          ventasTotal: 0,
          costoTotal: 0,
          margenBruto: 0,
          unidadesVendidas: 0
        });
      }
      
      const periodoData = periodosMap.get(periodo);
      periodoData.ventasTotal += factura.total;
      periodoData.costoTotal += factura.items.reduce((sum: number, item: any) => {
        const productos = JSON.parse(localStorage.getItem('productos') || '[]');
        const producto = productos.find((p: any) => p.id === item.productoId);
        return sum + ((producto?.costoUnitario || 0) * item.cantidad);
      }, 0);
      periodoData.margenBruto = periodoData.ventasTotal - periodoData.costoTotal;
      periodoData.unidadesVendidas += factura.items.reduce((sum: number, item: any) => sum + item.cantidad, 0);
    });

    const periodosResult = Array.from(periodosMap.values())
      .map(p => ({
        ...p,
        margenPorcentaje: p.ventasTotal > 0 ? (p.margenBruto / p.ventasTotal) * 100 : 0
      }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));

    setPeriodosAnalisis(periodosResult);
  };

  const exportarAnalisis = () => {
    const wb = XLSX.utils.book_new();
    
    // Hoja de productos
    const wsProductos = XLSX.utils.json_to_sheet(productosRentabilidad);
    XLSX.utils.book_append_sheet(wb, wsProductos, "Productos");
    
    // Hoja de categorías
    const wsCategorias = XLSX.utils.json_to_sheet(categoriasRentabilidad);
    XLSX.utils.book_append_sheet(wb, wsCategorias, "Categorías");
    
    // Hoja de clientes
    const wsClientes = XLSX.utils.json_to_sheet(clientesRentabilidad);
    XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");
    
    // Hoja de períodos
    const wsPeriodos = XLSX.utils.json_to_sheet(periodosAnalisis);
    XLSX.utils.book_append_sheet(wb, wsPeriodos, "Períodos");
    
    XLSX.writeFile(wb, `analisis_rentabilidad_${new Date().toISOString().slice(0, 10)}.xlsx`);
    
    toast({
      title: "Análisis exportado",
      description: "El análisis de rentabilidad ha sido exportado a Excel",
    });
  };

  const metricas = {
    margenPromedioProductos: productosRentabilidad.length > 0 
      ? productosRentabilidad.reduce((sum, p) => sum + p.margenPorcentaje, 0) / productosRentabilidad.length 
      : 0,
    mejorProducto: productosRentabilidad.length > 0 ? productosRentabilidad[0] : null,
    mejorCategoria: categoriasRentabilidad.length > 0 ? categoriasRentabilidad[0] : null,
    mejorCliente: clientesRentabilidad.length > 0 ? clientesRentabilidad[0] : null
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Análisis de Rentabilidad</h2>
            <p className="text-slate-600">
              Análisis detallado de rentabilidad por productos, categorías y clientes
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarAnalisis}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Análisis
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Desde</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={filtroFecha.desde}
                onChange={(e) => setFiltroFecha(prev => ({ ...prev, desde: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Hasta</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={filtroFecha.hasta}
                onChange={(e) => setFiltroFecha(prev => ({ ...prev, hasta: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoría</label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las categorías</SelectItem>
                  {categoriasRentabilidad.map(cat => (
                    <SelectItem key={cat.categoria} value={cat.categoria}>
                      {cat.categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Ordenar por</label>
              <Select value={ordenamiento} onValueChange={(value: any) => setOrdenamiento(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="margen">Margen de Ganancia</SelectItem>
                  <SelectItem value="ventas">Ventas Totales</SelectItem>
                  <SelectItem value="rotacion">Rotación/Frecuencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.margenPromedioProductos.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Todos los productos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejor Producto</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{metricas.mejorProducto?.nombre || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.mejorProducto ? `${metricas.mejorProducto.margenPorcentaje.toFixed(1)}% margen` : 'Sin datos'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejor Categoría</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{metricas.mejorCategoria?.categoria || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.mejorCategoria ? `${metricas.mejorCategoria.margenPorcentaje.toFixed(1)}% margen` : 'Sin datos'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejor Cliente</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{metricas.mejorCliente?.nombre || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.mejorCliente ? `Bs. ${metricas.mejorCliente.margenBruto.toFixed(2)} ganancia` : 'Sin datos'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="productos" className="w-full">
        <TabsList>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
        </TabsList>

        <TabsContent value="productos">
          <Card>
            <CardHeader>
              <CardTitle>Rentabilidad por Producto</CardTitle>
              <CardDescription>Análisis detallado de cada producto</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Margen Bs.</TableHead>
                    <TableHead className="text-right">Margen %</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Participación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosRentabilidad.map(producto => (
                    <TableRow key={producto.id}>
                      <TableCell className="font-medium">{producto.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{producto.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-right">Bs. {producto.ventasTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Bs. {producto.costoTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <span className={producto.margenBruto >= 0 ? 'text-green-600' : 'text-red-600'}>
                          Bs. {producto.margenBruto.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1">
                          {producto.margenPorcentaje >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span className={producto.margenPorcentaje >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {producto.margenPorcentaje.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{producto.ventasUnidades}</TableCell>
                      <TableCell className="text-right">{producto.participacionVentas.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rentabilidad por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Margen %</TableHead>
                      <TableHead className="text-right">Productos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoriasRentabilidad.map(categoria => (
                      <TableRow key={categoria.categoria}>
                        <TableCell className="font-medium">{categoria.categoria}</TableCell>
                        <TableCell className="text-right">Bs. {categoria.ventasTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <span className={categoria.margenPorcentaje >= 0 ? 'text-green-600' : 'text-red-600'}>
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
                <CardTitle>Participación por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categoriasRentabilidad}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ categoria, participacionVentas }) => `${categoria}: ${participacionVentas.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="participacionVentas"
                    >
                      {categoriasRentabilidad.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Participación']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clientes">
          <Card>
            <CardHeader>
              <CardTitle>Rentabilidad por Cliente</CardTitle>
              <CardDescription>Análisis de clientes más rentables</CardDescription>
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
                    <TableHead className="text-right">Última Compra</TableHead>
                    <TableHead className="text-right">Participación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesRentabilidad.map(cliente => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nombre}</TableCell>
                      <TableCell className="text-right">Bs. {cliente.ventasTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <span className={cliente.margenBruto >= 0 ? 'text-green-600' : 'text-red-600'}>
                          Bs. {cliente.margenBruto.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cliente.margenPorcentaje >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {cliente.margenPorcentaje.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{cliente.frecuenciaCompra}</TableCell>
                      <TableCell className="text-right">{new Date(cliente.ultimaCompra).toLocaleDateString('es-BO')}</TableCell>
                      <TableCell className="text-right">{cliente.participacionVentas.toFixed(1)}%</TableCell>
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
              <CardTitle>Tendencias de Rentabilidad</CardTitle>
              <CardDescription>Evolución de márgenes por período</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={periodosAnalisis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip />
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