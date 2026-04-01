import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, FileWarning, Filter, Scale } from "lucide-react";
import { useReportesContables } from "@/hooks/useReportesContables";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { EnhancedHeader, EnhancedMetricCard, MetricGrid } from "./dashboard/EnhancedLayout";

const BalanceComprobacionModule = () => {
  const { getTrialBalanceData } = useReportesContables();
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
  const [fechaFin, setFechaFin] = useState<Date | undefined>();
  const [cuentaInicio, setCuentaInicio] = useState("");
  const [cuentaFin, setCuentaFin] = useState("");
  const [formato4Columnas, setFormato4Columnas] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { details, totals } = getTrialBalanceData({
    fechaInicio: fechaInicio ? format(fechaInicio, "yyyy-MM-dd") : "",
    fechaFin: fechaFin ? format(fechaFin, "yyyy-MM-dd") : "",
    cuentaInicio,
    cuentaFin,
  });

  const totalsMatch = Math.abs(totals.sumaDebe - totals.sumaHaber) < 0.01;
  const balancesMatch = Math.abs(totals.saldoDeudor - totals.saldoAcreedor) < 0.01;
  const uiBlocked = isGenerating || isExporting;

  const generarReporte = async () => {
    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setIsGenerating(false);
    }
  };

  const exportarReporte = async () => {
    setIsExporting(true);
    try {
      const contenido = JSON.stringify(
        {
          filtros: {
            fechaInicio: fechaInicio ? format(fechaInicio, "yyyy-MM-dd") : "",
            fechaFin: fechaFin ? format(fechaFin, "yyyy-MM-dd") : "",
            cuentaInicio,
            cuentaFin,
            formato4Columnas,
          },
          details,
          totals,
        },
        null,
        2
      );

      const blob = new Blob([contenido], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `balance_comprobacion_${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Balance de comprobacion"
        subtitle="Controla sumas, saldos y cuadre contable con filtros claros para revision operativa y auditoria."
        badge={{
          text: totalsMatch && balancesMatch ? "Cuadre correcto" : "Revisar diferencias",
          variant: totalsMatch && balancesMatch ? "secondary" : "destructive",
        }}
      />

      <MetricGrid columns={4}>
        <EnhancedMetricCard
          title="Suma debe"
          value={`Bs ${totals.sumaDebe.toFixed(2)}`}
          subtitle="Movimiento acumulado"
          icon={Scale}
        />
        <EnhancedMetricCard
          title="Suma haber"
          value={`Bs ${totals.sumaHaber.toFixed(2)}`}
          subtitle="Contrapartida acumulada"
          icon={Scale}
        />
        <EnhancedMetricCard
          title="Saldo deudor"
          value={`Bs ${totals.saldoDeudor.toFixed(2)}`}
          subtitle="Saldos del periodo"
          icon={FileWarning}
          variant={balancesMatch ? "success" : "warning"}
        />
        <EnhancedMetricCard
          title="Saldo acreedor"
          value={`Bs ${totals.saldoAcreedor.toFixed(2)}`}
          subtitle="Comparativo de saldos"
          icon={Filter}
          variant={balancesMatch ? "success" : "warning"}
        />
      </MetricGrid>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scale className="h-6 w-6" />
              Balance de Comprobacion de Sumas y Saldos
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => void exportarReporte()}
                disabled={uiBlocked}
                variant="outline"
                size="sm"
              >
                {isExporting ? "Exportando..." : "Exportar"}
              </Button>
              <Button
                onClick={() => void generarReporte()}
                disabled={uiBlocked}
                variant="default"
                size="sm"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {isGenerating ? "Generando..." : "Generar reporte"}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Balance de sumas y saldos por periodo con lectura contable trazable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {details.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <p>No hay datos suficientes para generar el balance de comprobacion.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-6">
                    <div>
                      <Label>Fecha inicio</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={uiBlocked}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !fechaInicio && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {fechaInicio ? format(fechaInicio, "dd/MM/yyyy") : <span>Seleccionar</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={fechaInicio}
                            onSelect={setFechaInicio}
                            initialFocus
                            className={cn("pointer-events-auto p-3")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label>Fecha fin</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={uiBlocked}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !fechaFin && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {fechaFin ? format(fechaFin, "dd/MM/yyyy") : <span>Seleccionar</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={fechaFin}
                            onSelect={setFechaFin}
                            initialFocus
                            className={cn("pointer-events-auto p-3")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="cuentaInicio">Cuenta inicio</Label>
                      <Input
                        id="cuentaInicio"
                        placeholder="Ej: 1000"
                        value={cuentaInicio}
                        onChange={(event) => setCuentaInicio(event.target.value)}
                        disabled={uiBlocked}
                      />
                    </div>

                    <div>
                      <Label htmlFor="cuentaFin">Cuenta fin</Label>
                      <Input
                        id="cuentaFin"
                        placeholder="Ej: 9999"
                        value={cuentaFin}
                        onChange={(event) => setCuentaFin(event.target.value)}
                        disabled={uiBlocked}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="formato4Columnas"
                        checked={formato4Columnas}
                        onCheckedChange={setFormato4Columnas}
                        disabled={uiBlocked}
                      />
                      <Label htmlFor="formato4Columnas">Formato 4 columnas</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Cuenta</TableHead>
                      {formato4Columnas ? (
                        <>
                          <TableHead className="text-right">Debe</TableHead>
                          <TableHead className="text-right">Haber</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-right">Debe (Sumas)</TableHead>
                          <TableHead className="text-right">Haber (Sumas)</TableHead>
                          <TableHead className="text-right">Deudor (Saldos)</TableHead>
                          <TableHead className="text-right">Acreedor (Saldos)</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.map((cuenta) => (
                      <TableRow key={cuenta.codigo}>
                        <TableCell>{cuenta.codigo}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{cuenta.nombre}</TableCell>
                        {formato4Columnas ? (
                          <>
                            <TableCell className="text-right">
                              {cuenta.sumaDebe > 0 ? `Bs. ${cuenta.sumaDebe.toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {cuenta.sumaHaber > 0 ? `Bs. ${cuenta.sumaHaber.toFixed(2)}` : "-"}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-right">Bs. {cuenta.sumaDebe.toFixed(2)}</TableCell>
                            <TableCell className="text-right">Bs. {cuenta.sumaHaber.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              {cuenta.saldoDeudor > 0 ? `Bs. ${cuenta.saldoDeudor.toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {cuenta.saldoAcreedor > 0 ? `Bs. ${cuenta.saldoAcreedor.toFixed(2)}` : "-"}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2}>Totales</TableCell>
                      {formato4Columnas ? (
                        <>
                          <TableCell className={`text-right ${!totalsMatch ? "text-red-500" : ""}`}>
                            Bs. {totals.sumaDebe.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right ${!totalsMatch ? "text-red-500" : ""}`}>
                            Bs. {totals.sumaHaber.toFixed(2)}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className={`text-right ${!totalsMatch ? "text-red-500" : ""}`}>
                            Bs. {totals.sumaDebe.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right ${!totalsMatch ? "text-red-500" : ""}`}>
                            Bs. {totals.sumaHaber.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right ${!balancesMatch ? "text-red-500" : ""}`}>
                            Bs. {totals.saldoDeudor.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right ${!balancesMatch ? "text-red-500" : ""}`}>
                            Bs. {totals.saldoAcreedor.toFixed(2)}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {(!totalsMatch || !balancesMatch) && (
                <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
                  <FileWarning className="h-5 w-5" />
                  <div>
                    <h4 className="font-bold">Descuadre contable</h4>
                    <p className="text-sm">
                      Los totales de sumas y/o saldos no coinciden. Revisa los asientos contables
                      antes del cierre.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceComprobacionModule;
