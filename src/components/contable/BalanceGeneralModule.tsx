
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale, Download, Calendar, CheckCircle, AlertCircle, CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useContabilidadIntegration } from '@/hooks/useContabilidadIntegration';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import * as XLSX from '@e965/xlsx';

const BalanceGeneralModule = () => {
  const [fechaInicio, setFechaInicio] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [fechaCorte, setFechaCorte] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const { getBalanceSheetData } = useContabilidadIntegration();

  const generarReporte = async () => {
    setIsGenerating(true);
    // Simular proceso de generación
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsGenerating(false);
    // Forzar actualización de datos
    window.location.hash = `#${Date.now()}`;
  };

  const balanceData = getBalanceSheetData({
    fechaInicio: format(fechaInicio, 'yyyy-MM-dd'),
    fechaFin: format(fechaCorte, 'yyyy-MM-dd'),
  });
  const { activos, pasivos, patrimonio, totalPasivoPatrimonio, ecuacionCuadrada } = balanceData;

  const exportarExcel = () => {
    const fechaInicioStr = format(fechaInicio, 'dd/MM/yyyy');
    const fechaCorteStr = format(fechaCorte, 'dd/MM/yyyy');
    
    const datos = [
      ['BALANCE GENERAL'],
      [`Período: ${fechaInicioStr} al ${fechaCorteStr}`],
      [''],
      ['ACTIVOS', '', 'Bs.'],
      ...activos.cuentas.map(cuenta => [cuenta.codigo, cuenta.nombre, cuenta.saldo.toFixed(2)]),
      ['', 'TOTAL ACTIVOS', activos.total.toFixed(2)],
      [''],
      ['PASIVOS', '', 'Bs.'],
      ...pasivos.cuentas.map(cuenta => [cuenta.codigo, cuenta.nombre, cuenta.saldo.toFixed(2)]),
      ['', 'TOTAL PASIVOS', pasivos.total.toFixed(2)],
      [''],
      ['PATRIMONIO', '', 'Bs.'],
      ...patrimonio.cuentas.map(cuenta => [cuenta.codigo, cuenta.nombre, cuenta.saldo.toFixed(2)]),
      ['', 'TOTAL PATRIMONIO', patrimonio.total.toFixed(2)],
      [''],
      ['', 'TOTAL PASIVO + PATRIMONIO', totalPasivoPatrimonio.toFixed(2)],
      [''],
      ['Ecuación Contable:', ecuacionCuadrada ? 'BALANCEADA' : 'DESBALANCEADA']
    ];

    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Balance General');
    XLSX.writeFile(wb, `Balance_General_${format(fechaInicio, 'yyyy-MM-dd')}_${format(fechaCorte, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-6 h-6" />
              Balance General
            </div>
            <Button 
              onClick={generarReporte}
              disabled={isGenerating}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              <Scale className="w-4 h-4" />
              {isGenerating ? 'Generando...' : 'Generar Reporte'}
            </Button>
          </CardTitle>
          <CardDescription>
            Estado de situación financiera por período - Cumple normativa SIN Bolivia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <Label>Fecha Inicio:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !fechaInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaInicio ? format(fechaInicio, "dd/MM/yyyy") : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={fechaInicio}
                    onSelect={(date) => date && setFechaInicio(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <Label>Fecha Corte:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !fechaCorte && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaCorte ? format(fechaCorte, "dd/MM/yyyy") : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={fechaCorte}
                    onSelect={(date) => date && setFechaCorte(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={exportarExcel} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar Excel
            </Button>
          </div>

          <div className="mb-6">
            <Badge 
              variant={ecuacionCuadrada ? "default" : "destructive"}
              className="flex items-center gap-2"
            >
              {ecuacionCuadrada ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Balance Cuadrado
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Balance Descuadrado
                </>
              )}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ACTIVOS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ACTIVOS</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead className="text-right">Saldo (Bs.)</TableHead>
                    </TableRow>
                  </TableHeader>
                   <TableBody>
                     {activos.cuentas.map((cuenta) => (
                       <TableRow key={cuenta.codigo}>
                         <TableCell className="font-mono text-sm">{cuenta.codigo}</TableCell>
                         <TableCell>
                           {cuenta.nombre}
                           {cuenta.codigo === '1141' && (
                             <div className="text-xs text-muted-foreground mt-1">
                               📦 Inventario físico según normativa boliviana
                             </div>
                           )}
                         </TableCell>
                         <TableCell className="text-right font-semibold">
                           {cuenta.saldo.toFixed(2)}
                           {cuenta.codigo === '1141' && cuenta.saldo === 0 && (
                             <div className="text-xs text-amber-600 mt-1">
                               ⚠️ Sin inventario valorizado
                             </div>
                           )}
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                  <TableFooter>
                    <TableRow className="bg-blue-50">
                      <TableCell colSpan={2} className="font-bold">TOTAL ACTIVOS</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        Bs. {activos.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>

            {/* PASIVOS Y PATRIMONIO */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">PASIVOS Y PATRIMONIO</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* PASIVOS */}
                  <div>
                    <h4 className="font-semibold mb-3 text-red-600">PASIVOS</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Cuenta</TableHead>
                          <TableHead className="text-right">Saldo (Bs.)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pasivos.cuentas.map((cuenta) => (
                          <TableRow key={cuenta.codigo}>
                            <TableCell className="font-mono text-sm">{cuenta.codigo}</TableCell>
                            <TableCell>{cuenta.nombre}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {cuenta.saldo.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-red-50">
                          <TableCell colSpan={2} className="font-bold">TOTAL PASIVOS</TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            Bs. {pasivos.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  {/* PATRIMONIO */}
                  <div>
                    <h4 className="font-semibold mb-3 text-green-600">PATRIMONIO</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Cuenta</TableHead>
                          <TableHead className="text-right">Saldo (Bs.)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patrimonio.cuentas.map((cuenta) => (
                          <TableRow key={cuenta.codigo}>
                            <TableCell className="font-mono text-sm">{cuenta.codigo}</TableCell>
                            <TableCell>{cuenta.nombre}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {cuenta.saldo.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-green-50">
                          <TableCell colSpan={2} className="font-bold">TOTAL PATRIMONIO</TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            Bs. {patrimonio.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  {/* TOTAL PASIVO + PATRIMONIO */}
                  <div className="border-t-2 pt-4">
                    <Table>
                      <TableFooter>
                        <TableRow className={`${ecuacionCuadrada ? 'bg-green-100' : 'bg-red-100'}`}>
                          <TableCell colSpan={2} className="font-bold text-lg">
                            TOTAL PASIVO + PATRIMONIO
                          </TableCell>
                          <TableCell className={`text-right font-bold text-lg ${ecuacionCuadrada ? 'text-green-600' : 'text-red-600'}`}>
                            Bs. {totalPasivoPatrimonio.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Verificación de la Ecuación Contable</h3>
            <div className="text-sm space-y-1">
              <p>Activos: Bs. {activos.total.toFixed(2)}</p>
              <p>Pasivos + Patrimonio: Bs. {totalPasivoPatrimonio.toFixed(2)}</p>
              <p className={`font-semibold ${ecuacionCuadrada ? 'text-green-600' : 'text-red-600'}`}>
                Diferencia: Bs. {Math.abs(activos.total - totalPasivoPatrimonio).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceGeneralModule;
