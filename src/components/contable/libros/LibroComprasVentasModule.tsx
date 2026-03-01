import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, BookOpen, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFacturas } from '@/hooks/useFacturas';
import { useSupabaseProveedores } from '@/hooks/useSupabaseProveedores';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const LibroComprasVentasModule = () => {
  const { toast } = useToast();
  const { facturas } = useFacturas();
  const { compras } = useSupabaseProveedores();
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());

  const periodo = `${anioSeleccionado}-${String(mesSeleccionado + 1).padStart(2, '0')}`;

  // ===== LIBRO DE VENTAS IVA (24 columnas formato SIAT) =====
  const ventasMes = useMemo(() => {
    return facturas
      .filter((f: any) => f.fecha?.startsWith(periodo))
      .map((f: any, i: number) => {
        const importeTotal = f.total || 0;
        const ice = 0;
        const iehd = 0;
        const ipj = 0;
        const tasas = 0;
        const otrosNoSujetosIVA = 0;
        const exportacionesExentas = 0;
        const ventasTasaCero = 0;
        // Subtotal = Importe Total - ICE - IEHD - IPJ - Tasas - Exentos - Tasa Cero
        const subtotal = importeTotal - ice - iehd - ipj - tasas - otrosNoSujetosIVA - exportacionesExentas - ventasTasaCero;
        const descuentos = f.descuentoTotal || 0;
        const giftCard = 0;
        // Importe Base para DF = Subtotal - Descuentos - Gift Card
        const importeBaseDF = subtotal - descuentos - giftCard;
        // Débito Fiscal = Base * 13 / 113 (IVA incluido en precio)
        const debitoFiscal = Number((importeBaseDF * 13 / 113).toFixed(2));
        const estado = f.estado === 'anulada' ? 'A' : 'V'; // V=Válida, A=Anulada
        const tipoVenta = 1; // 1=Venta estándar

        return {
          nro: i + 1,
          fecha: f.fecha,
          nroFactura: f.numero,
          nroAutorizacion: f.cuf || f.autorizacion || 'PENDIENTE',
          estado: f.estadoSIN || 'pendiente',
          nitCliente: f.cliente?.nit || '0',
          complemento: '', // Col 7
          nombreCliente: f.cliente?.nombre || 'Sin Nombre',
          importeTotal,
          ice,
          iehd,
          ipj,
          tasas,
          otrosNoSujetosIVA,
          exportacionesExentas,
          ventasTasaCero,
          subtotal,
          descuentos,
          giftCard,
          importeBaseDF,
          debitoFiscal,
          estadoVenta: estado,
          codigoControl: f.codigoControl || '',
          tipoVenta,
        };
      });
  }, [facturas, periodo]);

  // ===== LIBRO DE COMPRAS IVA (23 columnas formato SIAT) =====
  const comprasMes = useMemo(() => {
    return (compras || [])
      .filter((c: any) => c.fecha?.startsWith(periodo))
      .map((c: any, i: number) => {
        const importeTotal = c.total || 0;
        const ice = 0;
        const iehd = 0;
        const ipj = 0;
        const tasas = 0;
        const otrosNoSujetos = 0;
        const exentos = 0;
        const tasaCero = 0;
        const subtotal = importeTotal - ice - iehd - ipj - tasas - otrosNoSujetos - exentos - tasaCero;
        const descuentos = c.descuento_total || c.descuentoTotal || 0;
        const giftCard = 0;
        const importeBaseCF = subtotal - descuentos - giftCard;
        const creditoFiscal = Number((importeBaseCF * 13 / 113).toFixed(2));
        const estado = c.estado === 'anulada' ? 'A' : 'V';

        return {
          nro: i + 1,
          nitProveedor: c.proveedor?.nit || c.nit_proveedor || '0',
          razonSocial: c.proveedor?.nombre || c.razon_social || 'Sin Nombre',
          codigoAutorizacion: c.codigo_autorizacion || c.cuf || 'N/A',
          nroFactura: c.numero_factura || c.numero || '',
          duiDim: c.dui_dim || '',
          fecha: c.fecha,
          importeTotal,
          ice,
          iehd,
          ipj,
          tasas,
          otrosNoSujetos,
          exentos,
          tasaCero,
          subtotal,
          descuentos,
          giftCard,
          importeBaseCF,
          creditoFiscal,
          estadoCompra: estado,
          tipoCompra: 1, // 1=Compra para mercado interno
          codigoControl: c.codigo_control || '',
        };
      });
  }, [compras, periodo]);

  // Totales Ventas
  const totalesVentas = useMemo(() => ({
    importeTotal: ventasMes.reduce((s, v) => s + v.importeTotal, 0),
    debitoFiscal: ventasMes.reduce((s, v) => s + v.debitoFiscal, 0),
    subtotal: ventasMes.reduce((s, v) => s + v.subtotal, 0),
    importeBaseDF: ventasMes.reduce((s, v) => s + v.importeBaseDF, 0),
    descuentos: ventasMes.reduce((s, v) => s + v.descuentos, 0),
  }), [ventasMes]);

  // Totales Compras
  const totalesCompras = useMemo(() => ({
    importeTotal: comprasMes.reduce((s, v) => s + v.importeTotal, 0),
    creditoFiscal: comprasMes.reduce((s, v) => s + v.creditoFiscal, 0),
    subtotal: comprasMes.reduce((s, v) => s + v.subtotal, 0),
    importeBaseCF: comprasMes.reduce((s, v) => s + v.importeBaseCF, 0),
  }), [comprasMes]);

  // Exportar TXT Ventas - 24 columnas formato SIAT
  const exportarTXTVentas = () => {
    const lineas = ventasMes.map(v =>
      [
        v.nro, v.fecha, v.nroFactura, v.nroAutorizacion, v.estado,
        v.nitCliente, v.complemento, v.nombreCliente,
        v.importeTotal.toFixed(2), v.ice.toFixed(2), v.iehd.toFixed(2),
        v.ipj.toFixed(2), v.tasas.toFixed(2), v.otrosNoSujetosIVA.toFixed(2),
        v.exportacionesExentas.toFixed(2), v.ventasTasaCero.toFixed(2),
        v.subtotal.toFixed(2), v.descuentos.toFixed(2), v.giftCard.toFixed(2),
        v.importeBaseDF.toFixed(2), v.debitoFiscal.toFixed(2),
        v.estadoVenta, v.codigoControl, v.tipoVenta
      ].join('|')
    );

    const contenido = lineas.join('\n');
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LCV_VENTAS_${periodo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Archivo exportado', description: `LCV_VENTAS_${periodo}.txt — 24 columnas formato SIAT` });
  };

  // Exportar TXT Compras - 23 columnas formato SIAT
  const exportarTXTCompras = () => {
    if (comprasMes.length === 0) {
      const blob = new Blob(['SIN REGISTROS'], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LCV_COMPRAS_${periodo}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Sin registros', description: 'No hay compras en este periodo' });
      return;
    }

    const lineas = comprasMes.map(c =>
      [
        c.nro, c.nitProveedor, c.razonSocial, c.codigoAutorizacion,
        c.nroFactura, c.duiDim, c.fecha,
        c.importeTotal.toFixed(2), c.ice.toFixed(2), c.iehd.toFixed(2),
        c.ipj.toFixed(2), c.tasas.toFixed(2), c.otrosNoSujetos.toFixed(2),
        c.exentos.toFixed(2), c.tasaCero.toFixed(2),
        c.subtotal.toFixed(2), c.descuentos.toFixed(2), c.giftCard.toFixed(2),
        c.importeBaseCF.toFixed(2), c.creditoFiscal.toFixed(2),
        c.estadoCompra, c.tipoCompra, c.codigoControl
      ].join('|')
    );

    const contenido = lineas.join('\n');
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LCV_COMPRAS_${periodo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Archivo exportado', description: `LCV_COMPRAS_${periodo}.txt — 23 columnas formato SIAT` });
  };

  const exportarExcel = () => {
    try {
      import('@e965/xlsx').then(XLSX => {
        // Hoja Ventas
        const wsVentasData = [
          ['LIBRO DE VENTAS IVA — Formato SIAT (24 columnas)'],
          [`Periodo: ${MESES[mesSeleccionado]} ${anioSeleccionado}`],
          [],
          ['N°', 'Fecha', 'N° Factura', 'N° Autorización', 'Estado SIN', 'NIT/CI', 'Complemento', 'Nombre/Razón Social',
           'Importe Total', 'ICE', 'IEHD', 'IPJ', 'Tasas', 'Otros No Sujetos', 'Export/Exentas', 'Tasa Cero',
           'Subtotal', 'Descuentos', 'Gift Card', 'Importe Base DF', 'Débito Fiscal', 'Estado', 'Cód. Control', 'Tipo Venta'],
          ...ventasMes.map(v => [
            v.nro, v.fecha, v.nroFactura, v.nroAutorizacion, v.estado, v.nitCliente, v.complemento, v.nombreCliente,
            v.importeTotal, v.ice, v.iehd, v.ipj, v.tasas, v.otrosNoSujetosIVA, v.exportacionesExentas, v.ventasTasaCero,
            v.subtotal, v.descuentos, v.giftCard, v.importeBaseDF, v.debitoFiscal, v.estadoVenta, v.codigoControl, v.tipoVenta
          ]),
          [],
          ['', '', '', '', '', '', '', 'TOTALES:', totalesVentas.importeTotal, 0, 0, 0, 0, 0, 0, 0,
           totalesVentas.subtotal, totalesVentas.descuentos, 0, totalesVentas.importeBaseDF, totalesVentas.debitoFiscal],
        ];

        // Hoja Compras
        const wsComprasData = [
          ['LIBRO DE COMPRAS IVA — Formato SIAT (23 columnas)'],
          [`Periodo: ${MESES[mesSeleccionado]} ${anioSeleccionado}`],
          [],
          ['N°', 'NIT Proveedor', 'Razón Social', 'Cód. Autorización', 'N° Factura', 'DUI/DIM', 'Fecha',
           'Importe Total', 'ICE', 'IEHD', 'IPJ', 'Tasas', 'Otros No Sujetos', 'Exentos', 'Tasa Cero',
           'Subtotal', 'Descuentos', 'Gift Card', 'Importe Base CF', 'Crédito Fiscal', 'Estado', 'Tipo Compra', 'Cód. Control'],
          ...comprasMes.map(c => [
            c.nro, c.nitProveedor, c.razonSocial, c.codigoAutorizacion, c.nroFactura, c.duiDim, c.fecha,
            c.importeTotal, c.ice, c.iehd, c.ipj, c.tasas, c.otrosNoSujetos, c.exentos, c.tasaCero,
            c.subtotal, c.descuentos, c.giftCard, c.importeBaseCF, c.creditoFiscal, c.estadoCompra, c.tipoCompra, c.codigoControl
          ]),
          [],
          ['', '', '', '', '', '', 'TOTALES:', totalesCompras.importeTotal, 0, 0, 0, 0, 0, 0, 0,
           totalesCompras.subtotal, 0, 0, totalesCompras.importeBaseCF, totalesCompras.creditoFiscal],
        ];

        const wb = XLSX.utils.book_new();
        const wsVentas = XLSX.utils.aoa_to_sheet(wsVentasData);
        const wsCompras = XLSX.utils.aoa_to_sheet(wsComprasData);
        XLSX.utils.book_append_sheet(wb, wsVentas, 'Libro Ventas');
        XLSX.utils.book_append_sheet(wb, wsCompras, 'Libro Compras');
        XLSX.writeFile(wb, `LCV_${periodo}.xlsx`);
        toast({ title: 'Excel exportado', description: 'Libro de Compras y Ventas generado en Excel' });
      });
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar el Excel', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Libro de Compras y Ventas IVA</h2>
          <p className="text-muted-foreground">Formato SIAT — 24 columnas Ventas / 23 columnas Compras (RND 10-0021-16)</p>
        </div>
      </div>

      {/* Selector de periodo */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <Label>Mes</Label>
              <Select value={String(mesSeleccionado)} onValueChange={v => setMesSeleccionado(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Año</Label>
              <Select value={String(anioSeleccionado)} onValueChange={v => setAnioSeleccionado(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={exportarTXTVentas} className="gap-2">
                <Download className="w-4 h-4" /> TXT Ventas
              </Button>
              <Button variant="outline" onClick={exportarTXTCompras} className="gap-2">
                <Download className="w-4 h-4" /> TXT Compras
              </Button>
              <Button variant="outline" onClick={exportarExcel} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="ventas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ventas" className="gap-2"><BookOpen className="w-4 h-4" /> Libro de Ventas</TabsTrigger>
          <TabsTrigger value="compras" className="gap-2"><ShoppingCart className="w-4 h-4" /> Libro de Compras</TabsTrigger>
        </TabsList>

        {/* ===== TAB VENTAS ===== */}
        <TabsContent value="ventas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Libro de Ventas IVA — {MESES[mesSeleccionado]} {anioSeleccionado}</span>
                <Badge variant="secondary">{ventasMes.length} registros</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ventasMes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No hay ventas registradas en este periodo</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">N°</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>N° Factura</TableHead>
                        <TableHead>N° Autorización</TableHead>
                        <TableHead>NIT/CI</TableHead>
                        <TableHead>Nombre/Razón Social</TableHead>
                        <TableHead className="text-right">Importe Total</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Descuentos</TableHead>
                        <TableHead className="text-right">Importe Base DF</TableHead>
                        <TableHead className="text-right">Débito Fiscal</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventasMes.map(v => (
                        <TableRow key={v.nro} className={v.estadoVenta === 'A' ? 'opacity-50 line-through' : ''}>
                          <TableCell>{v.nro}</TableCell>
                          <TableCell>{v.fecha}</TableCell>
                          <TableCell className="font-medium">{v.nroFactura}</TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{v.nroAutorizacion}</TableCell>
                          <TableCell>{v.nitCliente}</TableCell>
                          <TableCell>{v.nombreCliente}</TableCell>
                          <TableCell className="text-right">{v.importeTotal.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{v.subtotal.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{v.descuentos.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{v.importeBaseDF.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">{v.debitoFiscal.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={v.estadoVenta === 'V' ? 'default' : 'destructive'} className="text-xs">
                              {v.estadoVenta === 'V' ? 'Válida' : 'Anulada'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={6} className="text-right">TOTALES:</TableCell>
                        <TableCell className="text-right">{totalesVentas.importeTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{totalesVentas.subtotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{totalesVentas.descuentos.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{totalesVentas.importeBaseDF.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{totalesVentas.debitoFiscal.toFixed(2)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB COMPRAS ===== */}
        <TabsContent value="compras">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Libro de Compras IVA — {MESES[mesSeleccionado]} {anioSeleccionado}</span>
                <Badge variant="secondary">{comprasMes.length} registros</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comprasMes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No hay compras registradas en este periodo</p>
                  <p className="text-sm mt-2">Registre compras en el módulo de Compras para que aparezcan aquí</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">N°</TableHead>
                        <TableHead>NIT Proveedor</TableHead>
                        <TableHead>Razón Social</TableHead>
                        <TableHead>N° Factura</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Importe Total</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Descuentos</TableHead>
                        <TableHead className="text-right">Importe Base CF</TableHead>
                        <TableHead className="text-right">Crédito Fiscal</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comprasMes.map(c => (
                        <TableRow key={c.nro} className={c.estadoCompra === 'A' ? 'opacity-50 line-through' : ''}>
                          <TableCell>{c.nro}</TableCell>
                          <TableCell>{c.nitProveedor}</TableCell>
                          <TableCell>{c.razonSocial}</TableCell>
                          <TableCell className="font-medium">{c.nroFactura}</TableCell>
                          <TableCell>{c.fecha}</TableCell>
                          <TableCell className="text-right">{c.importeTotal.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{c.subtotal.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{c.descuentos.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{c.importeBaseCF.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">{c.creditoFiscal.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={c.estadoCompra === 'V' ? 'default' : 'destructive'} className="text-xs">
                              {c.estadoCompra === 'V' ? 'Válida' : 'Anulada'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={5} className="text-right">TOTALES:</TableCell>
                        <TableCell className="text-right">{totalesCompras.importeTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{totalesCompras.subtotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">0.00</TableCell>
                        <TableCell className="text-right">{totalesCompras.importeBaseCF.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{totalesCompras.creditoFiscal.toFixed(2)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LibroComprasVentasModule;
