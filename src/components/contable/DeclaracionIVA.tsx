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
  const [generandoDeclaracion, setGenerandoDeclaracion] = useState(false);
  const [generandoAsiento, setGenerandoAsiento] = useState(false);

  const { getDeclaracionIVAData, generarAsientoCompensacionIVA } = useContabilidadIntegration();
  const { toast } = useToast();

  const bloqueado = generandoDeclaracion || generandoAsiento;

  const handleGenerate = async () => {
    if (fechaInicio > fechaFin) {
      toast({
        title: 'Periodo invalido',
        description: 'La fecha inicial no puede ser mayor a la fecha final.',
        variant: 'destructive',
      });
      return;
    }

    setGenerandoDeclaracion(true);
    try {
      const data = getDeclaracionIVAData({
        fechaInicio: format(fechaInicio, 'yyyy-MM-dd'),
        fechaFin: format(fechaFin, 'yyyy-MM-dd'),
      });
      setIvaData(data);
    } finally {
      setGenerandoDeclaracion(false);
    }
  };

  const handleGenerarAsientoCompensacion = async () => {
    if (!ivaData) return;

    setGenerandoAsiento(true);
    try {
      const periodo = format(fechaInicio, 'yyyy-MM');
      const resultado = await generarAsientoCompensacionIVA(
        ivaData.ventas.debitoFiscal,
        ivaData.compras.creditoFiscal,
        periodo
      );

      if (resultado) {
        toast({
          title: 'Asiento generado',
          description: `Compensacion IVA del periodo ${periodo} registrada correctamente.`,
        });
      } else {
        toast({
          title: 'Sin asiento necesario',
          description: 'El debito fiscal y el credito fiscal son iguales, no se requiere compensacion.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo generar el asiento de compensacion.',
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
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
              disabled={bloqueado}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-bold">Declaracion de IVA</h2>
          </div>
          <p className="text-slate-600">
            Genera los datos base para el Formulario 200 v.3 - SIAT en linea (RND 102500000016).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar periodo fiscal</CardTitle>
          <CardDescription>
            Define el rango del periodo antes de calcular el debito y credito fiscal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Desde:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-[240px] justify-start text-left font-normal")}
                  disabled={bloqueado}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(fechaInicio, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={fechaInicio}
                  onSelect={(date) => date && setFechaInicio(date)}
                  initialFocus
                  disabled={bloqueado}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Hasta:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-[240px] justify-start text-left font-normal")}
                  disabled={bloqueado}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(fechaFin, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={fechaFin}
                  onSelect={(date) => date && setFechaFin(date)}
                  initialFocus
                  disabled={bloqueado}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={() => void handleGenerate()} disabled={bloqueado}>
            {generandoDeclaracion ? 'Generando...' : 'Generar declaracion'}
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Este modulo calcula el Formulario 200 y puede generar el asiento de compensacion IVA, pero no registra por
        si solo una declaracion tributaria oficial en el historial. Ese registro se controla desde el modulo de
        declaraciones tributarias.
      </div>

      {ivaData && (
        <div className="grid items-start gap-6 md:grid-cols-2">
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
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-blue-50 font-semibold">
                    <TableCell>Total debito fiscal (ventas)</TableCell>
                    <TableCell className="text-right">{formatCurrency(ivaData.ventas.debitoFiscal)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8 text-muted-foreground">Base imponible ventas</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(ivaData.ventas.baseImponible)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-green-50 font-semibold">
                    <TableCell>Total credito fiscal (compras)</TableCell>
                    <TableCell className="text-right">{formatCurrency(ivaData.compras.creditoFiscal)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8 text-muted-foreground">Base imponible compras</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(ivaData.compras.baseImponible)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-t-2 border-primary text-lg font-bold">
                    <TableCell>
                      {ivaData.saldo.aFavorFisco > 0
                        ? "Saldo a favor del fisco"
                        : "Saldo a favor del contribuyente"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        ivaData.saldo.aFavorFisco > 0
                          ? ivaData.saldo.aFavorFisco
                          : ivaData.saldo.aFavorContribuyente
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="mt-4 border-t pt-4">
                <Button
                  onClick={() => void handleGenerarAsientoCompensacion()}
                  disabled={generandoAsiento}
                  className="w-full gap-2"
                  variant="outline"
                >
                  <BookCheck className="w-4 h-4" />
                  {generandoAsiento ? 'Generando...' : 'Generar asiento de compensacion IVA'}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Art. 7, 8 y 9 Ley 843 - Cierre mensual DF vs CF
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 text-sm">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Proximos pasos</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Verifique que las cifras sean correctas y coincidan con sus registros.</li>
                  <li>Genere el asiento de compensacion IVA para cerrar el periodo contable.</li>
                  <li>Utilice estos datos para llenar el Formulario 200 v.3 en el portal del SIN.</li>
                  <li>Declare y pague el impuesto antes del vencimiento segun la terminacion de su NIT.</li>
                  <li>Guarde una copia de esta simulacion y de la declaracion presentada.</li>
                </ol>
              </CardContent>
            </Card>
            <p className="p-2 text-center text-xs italic text-muted-foreground">
              Esto es una simulacion basada en los datos contables registrados en el sistema. No reemplaza la
              declaracion oficial ante el SIN.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeclaracionIVA;
