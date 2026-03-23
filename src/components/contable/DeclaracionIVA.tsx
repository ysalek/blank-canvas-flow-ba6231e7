
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useContabilidadIntegration } from '@/hooks/useContabilidadIntegration';
import { DeclaracionIVAData } from '@/hooks/useReportesContables';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ArrowLeft, BookCheck } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useToast } from '@/hooks/use-toast';

interface DeclaracionIVAProps {
  onBack: () => void;
}

const DeclaracionIVA = ({ onBack }: DeclaracionIVAProps) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [fechaInicio, setFechaInicio] = useState<Date>(firstDayOfMonth);
  const [fechaFin, setFechaFin] = useState<Date>(today);
  const [ivaData, setIvaData] = useState<DeclaracionIVAData | null>(null);
  const [generandoAsiento, setGenerandoAsiento] = useState(false);

  const { getDeclaracionIVAData, generarAsientoCompensacionIVA } = useContabilidadIntegration();
  const { toast } = useToast();

  const handleGenerate = () => {
    const data = getDeclaracionIVAData({
      fechaInicio: format(fechaInicio, 'yyyy-MM-dd'),
      fechaFin: format(fechaFin, 'yyyy-MM-dd'),
    });
    setIvaData(data);
  };

  const handleGenerarAsientoCompensacion = async () => {
    if (!ivaData) return;
    setGenerandoAsiento(true);
    try {
      const periodo = `${format(fechaInicio, 'yyyy-MM')}`;
      const resultado = await generarAsientoCompensacionIVA(
        ivaData.ventas.debitoFiscal,
        ivaData.compras.creditoFiscal,
        periodo
      );
      if (resultado) {
        toast({
          title: 'Asiento generado',
          description: `Compensación IVA del periodo ${periodo} registrada correctamente`,
        });
      } else {
        toast({
          title: 'Sin asiento necesario',
          description: 'El Débito Fiscal y Crédito Fiscal son iguales, no se requiere compensación',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo generar el asiento de compensación',
        variant: 'destructive',
      });
    } finally {
      setGenerandoAsiento(false);
    }
  };

  const formatCurrency = (value: number) => `Bs. ${value.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className='h-8 w-8'>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-bold">Declaración de IVA</h2>
          </div>
          <p className="text-slate-600">Genera los datos para el Formulario 200 v.3 - SIAT en Línea (RND 102500000016)</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Periodo Fiscal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>Desde:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(fechaInicio, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={fechaInicio} onSelect={(d) => d && setFechaInicio(d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>Hasta:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(fechaFin, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={fechaFin} onSelect={(d) => d && setFechaFin(d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={handleGenerate}>Generar Declaración</Button>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Este modulo calcula el Formulario 200 y puede generar el asiento de compensacion IVA, pero no registra por
        si solo una declaracion tributaria oficial en el historial. Ese registro se controla desde el modulo de
        declaraciones tributarias.
      </div>

      {ivaData && (
        <div className="grid md:grid-cols-2 gap-6 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Resumen de IVA</CardTitle>
                    <CardDescription>Cifras calculadas para el periodo seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Concepto</TableHead>
                                <TableHead className='text-right'>Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className='font-semibold bg-blue-50'>
                                <TableCell>Total Débito Fiscal (Ventas)</TableCell>
                                <TableCell className='text-right'>{formatCurrency(ivaData.ventas.debitoFiscal)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className='pl-8 text-muted-foreground'>Base Imponible Ventas</TableCell>
                                <TableCell className='text-right text-muted-foreground'>{formatCurrency(ivaData.ventas.baseImponible)}</TableCell>
                            </TableRow>
                            <TableRow className='font-semibold bg-green-50'>
                                <TableCell>Total Crédito Fiscal (Compras)</TableCell>
                                <TableCell className='text-right'>{formatCurrency(ivaData.compras.creditoFiscal)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className='pl-8 text-muted-foreground'>Base Imponible Compras</TableCell>
                                <TableCell className='text-right text-muted-foreground'>{formatCurrency(ivaData.compras.baseImponible)}</TableCell>
                            </TableRow>
                             <TableRow className='font-bold text-lg border-t-2 border-primary'>
                                <TableCell>
                                    {ivaData.saldo.aFavorFisco > 0 ? "Saldo a Favor del Fisco" : "Saldo a Favor del Contribuyente"}
                                </TableCell>
                                <TableCell className='text-right'>
                                    {formatCurrency(ivaData.saldo.aFavorFisco > 0 ? ivaData.saldo.aFavorFisco : ivaData.saldo.aFavorContribuyente)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={handleGenerarAsientoCompensacion}
                        disabled={generandoAsiento}
                        className="w-full gap-2"
                        variant="outline"
                      >
                        <BookCheck className="w-4 h-4" />
                        {generandoAsiento ? 'Generando...' : 'Generar Asiento de Compensación IVA'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Art. 7, 8 y 9 Ley 843 — Cierre mensual DF vs CF
                      </p>
                    </div>
                </CardContent>
            </Card>
            <div className='space-y-4 text-sm'>
                <Card>
                    <CardHeader className='pb-2'>
                        <CardTitle className='text-base'>Próximos Pasos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className='list-decimal list-inside space-y-2 text-muted-foreground'>
                            <li>Verifique que las cifras sean correctas y coincidan con sus registros.</li>
                            <li>Genere el <strong>asiento de compensación IVA</strong> para cerrar el periodo contable.</li>
                            <li>Utilice estos datos para llenar el <strong>Formulario 200 v.3</strong> en el portal del SIN.</li>
                            <li>Declare y pague el impuesto (si corresponde) antes de la fecha de vencimiento según la terminación de su NIT.</li>
                            <li>Guarde una copia de esta simulación y de la declaración presentada.</li>
                        </ol>
                    </CardContent>
                </Card>
                <p className='text-xs text-center text-muted-foreground italic p-2'>
                    Esto es una simulación basada en los datos contables registrados en el sistema. No reemplaza la declaración oficial ante el SIN.
                </p>
            </div>
        </div>
      )}
    </div>
  );
};

export default DeclaracionIVA;
