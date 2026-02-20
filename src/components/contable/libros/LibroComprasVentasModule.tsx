import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, FileSpreadsheet, Upload, BookOpen, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFacturas } from '@/hooks/useFacturas';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const LibroComprasVentasModule = () => {
  const { toast } = useToast();
  const { facturas } = useFacturas();
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());

  const periodo = `${anioSeleccionado}-${String(mesSeleccionado + 1).padStart(2, '0')}`;

  // Libro de Ventas IVA
  const ventasMes = useMemo(() => {
    return facturas
      .filter((f: any) => f.fecha?.startsWith(periodo) && f.estado !== 'anulada')
      .map((f: any, i: number) => ({
        nro: i + 1,
        fecha: f.fecha,
        nroFactura: f.numero,
        nroAutorizacion: f.autorizacion || 'PENDIENTE',
        nitCliente: f.nit || '0',
        nombreCliente: f.cliente || 'Sin Nombre',
        importeTotal: f.total || 0,
        importeICE: 0,
        importeExento: 0,
        tasaCero: 0,
        subtotal: f.subtotal || f.total || 0,
        debitoFiscal: (f.total || 0) * 0.13,
        estado: f.estado,
        codigoControl: f.codigoControl || '',
      }));
  }, [facturas, periodo]);

  // Totales Ventas
  const totalesVentas = useMemo(() => ({
    importeTotal: ventasMes.reduce((s, v) => s + v.importeTotal, 0),
    debitoFiscal: ventasMes.reduce((s, v) => s + v.debitoFiscal, 0),
    subtotal: ventasMes.reduce((s, v) => s + v.subtotal, 0),
  }), [ventasMes]);

  // Exportar TXT formato SIN para LCV (Libro Compras Ventas)
  const exportarTXTVentas = () => {
    // Formato SIN: N°|Fecha|N°Factura|N°Autorización|NIT/CI|Nombre|Importe Total|ICE|Exento|Tasa Cero|Subtotal|Débito Fiscal|Código Control|Tipo
    const lineas = ventasMes.map(v => 
      `${v.nro}|${v.fecha}|${v.nroFactura}|${v.nroAutorizacion}|${v.nitCliente}|${v.nombreCliente}|${v.importeTotal.toFixed(2)}|${v.importeICE.toFixed(2)}|${v.importeExento.toFixed(2)}|${v.tasaCero.toFixed(2)}|${v.subtotal.toFixed(2)}|${v.debitoFiscal.toFixed(2)}|${v.codigoControl}|1`
    );

    const contenido = lineas.join('\n');
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LCV_VENTAS_${periodo}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Archivo exportado', description: `LCV_VENTAS_${periodo}.txt generado correctamente para carga en SIAT` });
  };

  const exportarTXTCompras = () => {
    // Formato SIN para Libro de Compras
    const contenido = ''; // TODO: conectar con módulo de compras
    const blob = new Blob([contenido || 'SIN REGISTROS'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LCV_COMPRAS_${periodo}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Archivo exportado', description: `LCV_COMPRAS_${periodo}.txt generado` });
  };

  const exportarExcel = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      import('xlsx').then(XLSX => {
        const wsData = [
          ['LIBRO DE VENTAS IVA', '', '', '', '', '', '', '', '', '', '', ''],
          [`Periodo: ${MESES[mesSeleccionado]} ${anioSeleccionado}`, '', '', '', '', '', '', '', '', '', '', ''],
          [],
          ['N°', 'Fecha', 'N° Factura', 'N° Autorización', 'NIT/CI Cliente', 'Nombre/Razón Social', 'Importe Total', 'ICE', 'Exento', 'Tasa Cero', 'Subtotal', 'Débito Fiscal'],
          ...ventasMes.map(v => [v.nro, v.fecha, v.nroFactura, v.nroAutorizacion, v.nitCliente, v.nombreCliente, v.importeTotal, v.importeICE, v.importeExento, v.tasaCero, v.subtotal, v.debitoFiscal]),
          [],
          ['', '', '', '', '', 'TOTALES:', totalesVentas.importeTotal, 0, 0, 0, totalesVentas.subtotal, totalesVentas.debitoFiscal],
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Libro Ventas');
        XLSX.writeFile(wb, `LIBRO_VENTAS_${periodo}.xlsx`);
        toast({ title: 'Excel exportado', description: 'Libro de Ventas generado en Excel' });
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
          <p className="text-muted-foreground">Conforme a normativa SIN — RND 10-0021-16 y actualizaciones vigentes</p>
        </div>
      </div>

      {/* Selector de periodo */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
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
                <Download className="w-4 h-4" /> TXT Ventas (SIAT)
              </Button>
              <Button variant="outline" onClick={exportarTXTCompras} className="gap-2">
                <Download className="w-4 h-4" /> TXT Compras (SIAT)
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
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">N°</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>N° Factura</TableHead>
                          <TableHead>N° Autorización</TableHead>
                          <TableHead>NIT/CI</TableHead>
                          <TableHead>Nombre/Razón Social</TableHead>
                          <TableHead className="text-right">Importe Total</TableHead>
                          <TableHead className="text-right">ICE</TableHead>
                          <TableHead className="text-right">Exento</TableHead>
                          <TableHead className="text-right">Tasa Cero</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-right">Débito Fiscal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ventasMes.map(v => (
                          <TableRow key={v.nro}>
                            <TableCell>{v.nro}</TableCell>
                            <TableCell>{v.fecha}</TableCell>
                            <TableCell className="font-medium">{v.nroFactura}</TableCell>
                            <TableCell className="text-xs">{v.nroAutorizacion}</TableCell>
                            <TableCell>{v.nitCliente}</TableCell>
                            <TableCell>{v.nombreCliente}</TableCell>
                            <TableCell className="text-right">{v.importeTotal.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{v.importeICE.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{v.importeExento.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{v.tasaCero.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{v.subtotal.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">{v.debitoFiscal.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell colSpan={6} className="text-right">TOTALES:</TableCell>
                          <TableCell className="text-right">{totalesVentas.importeTotal.toFixed(2)}</TableCell>
                          <TableCell className="text-right">0.00</TableCell>
                          <TableCell className="text-right">0.00</TableCell>
                          <TableCell className="text-right">0.00</TableCell>
                          <TableCell className="text-right">{totalesVentas.subtotal.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{totalesVentas.debitoFiscal.toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compras">
          <Card>
            <CardHeader>
              <CardTitle>Libro de Compras IVA — {MESES[mesSeleccionado]} {anioSeleccionado}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Conecte el módulo de Compras para generar el Libro de Compras IVA</p>
                <p className="text-sm mt-2">El libro se genera automáticamente desde las compras registradas</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LibroComprasVentasModule;
