import { useState } from "react";
import * as XLSX from "@e965/xlsx";
import { format } from "date-fns";
import {
  AlertCircle,
  Calendar,
  CalendarIcon,
  CheckCircle,
  Download,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { cn } from "@/lib/utils";

const BalanceGeneralModule = () => {
  const [fechaInicio, setFechaInicio] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [fechaCorte, setFechaCorte] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const { getBalanceSheetData } = useContabilidadIntegration();

  const generarReporte = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsGenerating(false);
    window.location.hash = `#${Date.now()}`;
  };

  const balanceData = getBalanceSheetData({
    fechaInicio: format(fechaInicio, "yyyy-MM-dd"),
    fechaFin: format(fechaCorte, "yyyy-MM-dd"),
  });

  const { activos, pasivos, patrimonio, totalPasivoPatrimonio, ecuacionCuadrada, inventario } =
    balanceData;

  const exportarExcel = () => {
    const fechaInicioStr = format(fechaInicio, "dd/MM/yyyy");
    const fechaCorteStr = format(fechaCorte, "dd/MM/yyyy");

    const datos = [
      ["BALANCE GENERAL"],
      [`Periodo: ${fechaInicioStr} al ${fechaCorteStr}`],
      [""],
      ["ACTIVOS", "", "Bs."],
      ...activos.cuentas.map((cuenta) => [cuenta.codigo, cuenta.nombre, cuenta.saldo.toFixed(2)]),
      ["", "TOTAL ACTIVOS", activos.total.toFixed(2)],
      [""],
      ["PASIVOS", "", "Bs."],
      ...pasivos.cuentas.map((cuenta) => [cuenta.codigo, cuenta.nombre, cuenta.saldo.toFixed(2)]),
      ["", "TOTAL PASIVOS", pasivos.total.toFixed(2)],
      [""],
      ["PATRIMONIO", "", "Bs."],
      ...patrimonio.cuentas.map((cuenta) => [cuenta.codigo, cuenta.nombre, cuenta.saldo.toFixed(2)]),
      ["", "TOTAL PATRIMONIO", patrimonio.total.toFixed(2)],
      [""],
      ["", "TOTAL PASIVO + PATRIMONIO", totalPasivoPatrimonio.toFixed(2)],
      [""],
      ["Ecuacion contable:", ecuacionCuadrada ? "BALANCEADA" : "DESBALANCEADA"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance General");
    XLSX.writeFile(
      wb,
      `Balance_General_${format(fechaInicio, "yyyy-MM-dd")}_${format(fechaCorte, "yyyy-MM-dd")}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-6 w-6" />
              Balance General
            </div>
            <Button
              onClick={generarReporte}
              disabled={isGenerating}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              <Scale className="h-4 w-4" />
              {isGenerating ? "Generando..." : "Generar reporte"}
            </Button>
          </CardTitle>
          <CardDescription>
            Estado de situacion financiera por periodo con criterio contable trazable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Label>Fecha inicio:</Label>
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
                    className={cn("pointer-events-auto p-3")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <Label>Fecha corte:</Label>
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
                    className={cn("pointer-events-auto p-3")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={exportarExcel} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
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
                  <CheckCircle className="h-4 w-4" />
                  Balance cuadrado
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Balance descuadrado
                </>
              )}
            </Badge>
          </div>

          {!inventario.conciliado && (
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Conciliacion de inventario pendiente</p>
              <p>
                El balance usa el saldo contable de inventarios: Bs. {inventario.saldoContable.toFixed(2)}.
                El valor fisico calculado desde existencias es Bs. {inventario.saldoFisico.toFixed(2)}.
                Diferencia detectada: Bs. {Math.abs(inventario.diferencia).toFixed(2)}.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ACTIVOS</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead className="text-right">Saldo (Bs.)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activos.cuentas.map((cuenta) => {
                      const esInventario = cuenta.codigo === "1131" || cuenta.codigo === "1141";
                      return (
                        <TableRow key={cuenta.codigo}>
                          <TableCell className="font-mono text-sm">{cuenta.codigo}</TableCell>
                          <TableCell>
                            {cuenta.nombre}
                            {esInventario && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Saldo contable usado en el balance general
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {cuenta.saldo.toFixed(2)}
                            {esInventario && cuenta.saldo === 0 && (
                              <div className="mt-1 text-xs text-amber-600">
                                Revisar conciliacion o clasificacion contable
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-blue-50">
                      <TableCell colSpan={2} className="font-bold">
                        TOTAL ACTIVOS
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        Bs. {activos.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">PASIVOS Y PATRIMONIO</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 font-semibold text-red-600">PASIVOS</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Codigo</TableHead>
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
                          <TableCell colSpan={2} className="font-bold">
                            TOTAL PASIVOS
                          </TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            Bs. {pasivos.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  <div>
                    <h4 className="mb-3 font-semibold text-green-600">PATRIMONIO</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Codigo</TableHead>
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
                          <TableCell colSpan={2} className="font-bold">
                            TOTAL PATRIMONIO
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            Bs. {patrimonio.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  <div className="border-t-2 pt-4">
                    <Table>
                      <TableFooter>
                        <TableRow className={ecuacionCuadrada ? "bg-green-100" : "bg-red-100"}>
                          <TableCell colSpan={2} className="font-bold text-lg">
                            TOTAL PASIVO + PATRIMONIO
                          </TableCell>
                          <TableCell
                            className={`text-right text-lg font-bold ${
                              ecuacionCuadrada ? "text-green-600" : "text-red-600"
                            }`}
                          >
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

          <div className="mt-6 rounded-lg bg-muted p-4">
            <h3 className="mb-2 font-semibold">Verificacion de la ecuacion contable</h3>
            <div className="space-y-1 text-sm">
              <p>Activos: Bs. {activos.total.toFixed(2)}</p>
              <p>Pasivos + Patrimonio: Bs. {totalPasivoPatrimonio.toFixed(2)}</p>
              <p className={`font-semibold ${ecuacionCuadrada ? "text-green-600" : "text-red-600"}`}>
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
