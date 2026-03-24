import { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  Edit,
  Eye,
  Filter,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsientos } from "@/hooks/useAsientos";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useToast } from "@/hooks/use-toast";
import type { AsientoContable } from "./diary/DiaryData";
import { EnhancedHeader, EnhancedMetricCard, MetricGrid, Section } from "./dashboard/EnhancedLayout";

const LibroDiario = () => {
  const [fechaInicio, setFechaInicio] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().slice(0, 10));
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [asientoEditando, setAsientoEditando] = useState<AsientoContable | null>(null);
  const [asientoDetalle, setAsientoDetalle] = useState<AsientoContable | null>(null);
  const [savingEditAsiento, setSavingEditAsiento] = useState(false);

  const { asientos, updateAsiento, actualizarEstadoAsiento, refetch } = useAsientos();
  const { getBalanceSheetData } = useContabilidadIntegration();
  const { toast } = useToast();

  const filtrarAsientos = () =>
    asientos.filter((asiento) => {
      const fechaAsiento = new Date(asiento.fecha);
      const fechaInicioObj = new Date(fechaInicio);
      const fechaFinObj = new Date(`${fechaFin}T23:59:59`);
      const cumpleFecha = fechaAsiento >= fechaInicioObj && fechaAsiento <= fechaFinObj;
      const cumpleEstado = filtroEstado === "todos" || asiento.estado === filtroEstado;
      return cumpleFecha && cumpleEstado;
    });

  const exportarDiario = () => {
    const asientosFiltrados = filtrarAsientos();
    let contenido = `LIBRO DIARIO\nPeriodo: ${fechaInicio} al ${fechaFin}\n\n`;

    asientosFiltrados.forEach((asiento) => {
      contenido += `Fecha: ${asiento.fecha} | Asiento: ${asiento.numero} | Estado: ${asiento.estado}\n`;
      contenido += `Concepto: ${asiento.concepto}\n`;
      contenido += `Referencia: ${asiento.referencia}\n`;
      contenido += "CUENTAS:\n";
      asiento.cuentas.forEach((cuenta) => {
        contenido += `  ${cuenta.codigo} - ${cuenta.nombre}: Debe ${cuenta.debe.toFixed(2)} | Haber ${cuenta.haber.toFixed(2)}\n`;
      });
      contenido += `TOTALES: Debe ${asiento.debe.toFixed(2)} | Haber ${asiento.haber.toFixed(2)}\n`;
      contenido += `${"=".repeat(80)}\n\n`;
    });

    const blob = new Blob([contenido], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `libro_diario_${fechaInicio}_${fechaFin}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const verDetalle = (asiento: AsientoContable) => {
    setAsientoDetalle(asiento);
    setShowDetailDialog(true);
  };

  const editarAsiento = (asiento: AsientoContable) => {
    if (asiento.estado !== "borrador") {
      toast({
        title: "Edicion bloqueada",
        description:
          "Los asientos registrados o anulados no se editan. Deben revertirse o anularse segun corresponda.",
        variant: "destructive",
      });
      return;
    }

    setAsientoEditando({ ...asiento });
    setShowEditDialog(true);
  };

  const eliminarAsiento = async (asientoId: string) => {
    if (!confirm('Esta seguro de anular este asiento? Esta accion cambiara su estado a "anulado".')) {
      return;
    }

    const resultado = await actualizarEstadoAsiento(asientoId, "anulado");
    if (!resultado) return;

    toast({
      title: "Asiento anulado",
      description: "El asiento contable ha sido anulado exitosamente.",
      variant: "destructive",
    });
    refetch();
  };

  const cambiarEstadoAsiento = async (
    asientoId: string,
    nuevoEstado: "borrador" | "registrado" | "anulado"
  ) => {
    const resultado = await actualizarEstadoAsiento(asientoId, nuevoEstado);
    if (!resultado) return;

    toast({
      title: "Estado actualizado",
      description: `El asiento ha sido ${nuevoEstado === "anulado" ? "anulado" : nuevoEstado}.`,
    });
    refetch();
  };

  const guardarEdicion = async () => {
    if (!asientoEditando) return;

    try {
      setSavingEditAsiento(true);
      const resultado = await updateAsiento(asientoEditando);
      if (resultado) {
        refetch();
      }

      setShowEditDialog(false);
      setAsientoEditando(null);
    } finally {
      setSavingEditAsiento(false);
    }
  };

  const asientosFiltrados = filtrarAsientos();
  const totalDebe = asientosFiltrados.reduce((sum, asiento) => sum + asiento.debe, 0);
  const totalHaber = asientosFiltrados.reduce((sum, asiento) => sum + asiento.haber, 0);
  const balanceData = getBalanceSheetData();
  const asientosRegistrados = asientosFiltrados.filter((asiento) => asiento.estado === "registrado");
  const asientosBorrador = asientosFiltrados.filter((asiento) => asiento.estado === "borrador");
  const asientosAnulados = asientosFiltrados.filter((asiento) => asiento.estado === "anulado");

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "registrado":
        return "bg-green-100 text-green-800";
      case "anulado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="space-y-8">
      <EnhancedHeader
        title="Libro Diario Integrado"
        subtitle={`Registro cronologico de transacciones · ${asientosFiltrados.length} asientos · Balance: ${balanceData.ecuacionCuadrada ? "Cuadrado" : "Descuadrado"}`}
        badge={{
          text: `${asientosRegistrados.length} Registrados`,
          variant: "default",
        }}
        actions={
          <div className="flex gap-2">
            <Button onClick={exportarDiario} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </div>
        }
      />

      <Section title="Metricas del Libro Diario" subtitle="Analisis de asientos contables del periodo">
        <MetricGrid columns={4}>
          <EnhancedMetricCard
            title="Asientos Registrados"
            value={asientosRegistrados.length}
            subtitle="Definitivos"
            icon={CheckCircle2}
            variant="success"
            trend="up"
            trendValue="Procesados"
          />
          <EnhancedMetricCard
            title="Total Debe"
            value={`Bs. ${totalDebe.toLocaleString()}`}
            subtitle="Suma de debitos"
            icon={BookOpen}
            variant="default"
            trend="neutral"
            trendValue="Balanceado"
          />
          <EnhancedMetricCard
            title="Total Haber"
            value={`Bs. ${totalHaber.toLocaleString()}`}
            subtitle="Suma de creditos"
            icon={BookOpen}
            variant="default"
            trend="neutral"
            trendValue="Balanceado"
          />
          <EnhancedMetricCard
            title="Estado del Balance"
            value={balanceData.ecuacionCuadrada ? "Cuadrado" : "Descuadrado"}
            subtitle={`A: ${balanceData.activos.total.toFixed(0)} | P+E: ${balanceData.totalPasivoPatrimonio.toFixed(0)}`}
            icon={balanceData.ecuacionCuadrada ? CheckCircle2 : AlertCircle}
            variant={balanceData.ecuacionCuadrada ? "success" : "destructive"}
            trend={balanceData.ecuacionCuadrada ? "up" : "down"}
            trendValue={balanceData.ecuacionCuadrada ? "Integrado" : "Revisar"}
          />
        </MetricGrid>
      </Section>

      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BookOpen className="h-6 w-6" />
                Registro de Asientos Contables
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                Control completo de transacciones con edicion restringida y trazable
              </CardDescription>
            </div>
            {(asientosBorrador.length > 0 || asientosAnulados.length > 0) && (
              <div className="flex gap-2">
                {asientosBorrador.length > 0 && (
                  <Badge variant="secondary">{asientosBorrador.length} borradores</Badge>
                )}
                {asientosAnulados.length > 0 && (
                  <Badge variant="destructive">{asientosAnulados.length} anulados</Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="glass-effect mb-6 rounded-lg p-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <Label htmlFor="fecha-inicio">Desde:</Label>
                <Input
                  id="fecha-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(event) => setFechaInicio(event.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="fecha-fin">Hasta:</Label>
                <Input
                  id="fecha-fin"
                  type="date"
                  value={fechaFin}
                  onChange={(event) => setFechaFin(event.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Label>Estado:</Label>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="registrado">Registrado</SelectItem>
                    <SelectItem value="anulado">Anulado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="animate-slide-up stagger-1 border-l-4 border-l-success hover-lift">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-success">Bs. {totalDebe.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Debe</div>
              </CardContent>
            </Card>
            <Card className="animate-slide-up stagger-2 border-l-4 border-l-destructive hover-lift">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-destructive">Bs. {totalHaber.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Haber</div>
              </CardContent>
            </Card>
            <Card
              className={`animate-slide-up stagger-3 border-l-4 hover-lift ${
                Math.abs(totalDebe - totalHaber) < 0.01
                  ? "border-l-success bg-success/5"
                  : "border-l-destructive bg-destructive/5"
              }`}
            >
              <CardContent className="p-4 text-center">
                <div
                  className={`text-2xl font-bold ${
                    Math.abs(totalDebe - totalHaber) < 0.01 ? "text-success" : "text-destructive"
                  }`}
                >
                  Bs. {Math.abs(totalDebe - totalHaber).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {Math.abs(totalDebe - totalHaber) < 0.01 ? "Balanceado OK" : "Diferencia pendiente"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>No. Asiento</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Debe (Bs.)</TableHead>
                <TableHead className="text-right">Haber (Bs.)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asientosFiltrados.map((asiento) => (
                <TableRow key={asiento.id} className="table-row-interactive group">
                  <TableCell>{new Date(asiento.fecha).toLocaleDateString("es-BO")}</TableCell>
                  <TableCell className="font-mono">{asiento.numero}</TableCell>
                  <TableCell>{asiento.concepto}</TableCell>
                  <TableCell>{asiento.referencia}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {asiento.debe.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    {asiento.haber.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getEstadoColor(asiento.estado)}>{asiento.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => verDetalle(asiento)} className="mr-1">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editarAsiento(asiento)}
                        disabled={asiento.estado !== "borrador"}
                        className="mr-1"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {asiento.estado === "borrador" && (
                        <Button size="sm" onClick={() => cambiarEstadoAsiento(asiento.id, "registrado")}>
                          Registrar
                        </Button>
                      )}

                      {asiento.estado === "registrado" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cambiarEstadoAsiento(asiento.id, "anulado")}
                        >
                          Anular
                        </Button>
                      )}

                      <Button size="sm" variant="outline" onClick={() => eliminarAsiento(asiento.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="dialog-animated max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Asiento Contable</DialogTitle>
            <DialogDescription>
              Informacion completa del asiento y sus cuentas afectadas
            </DialogDescription>
          </DialogHeader>

          {asientoDetalle && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Numero</Label>
                  <p className="font-mono text-lg">{asientoDetalle.numero}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fecha</Label>
                  <p>{new Date(asientoDetalle.fecha).toLocaleDateString("es-BO")}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                  <Badge className={getEstadoColor(asientoDetalle.estado)}>{asientoDetalle.estado}</Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Concepto</Label>
                <p className="mt-1">{asientoDetalle.concepto}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Referencia</Label>
                <p className="mt-1">{asientoDetalle.referencia}</p>
              </div>

              <div>
                <Label className="mb-3 block text-sm font-medium text-muted-foreground">
                  Cuentas afectadas
                </Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Nombre de la Cuenta</TableHead>
                      <TableHead className="text-right">Debe (Bs.)</TableHead>
                      <TableHead className="text-right">Haber (Bs.)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asientoDetalle.cuentas.map((cuenta, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{cuenta.codigo}</TableCell>
                        <TableCell>{cuenta.nombre}</TableCell>
                        <TableCell className="text-right font-semibold text-success">
                          {cuenta.debe > 0 ? cuenta.debe.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-destructive">
                          {cuenta.haber > 0 ? cuenta.haber.toFixed(2) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2} className="text-right">
                        TOTALES:
                      </TableCell>
                      <TableCell className="text-right text-success">
                        {asientoDetalle.debe.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {asientoDetalle.haber.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div
                className={`rounded-lg p-4 ${
                  Math.abs(asientoDetalle.debe - asientoDetalle.haber) < 0.01
                    ? "border border-success/20 bg-success/10"
                    : "border border-destructive/20 bg-destructive/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  {Math.abs(asientoDetalle.debe - asientoDetalle.haber) < 0.01 ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span
                    className={`font-medium ${
                      Math.abs(asientoDetalle.debe - asientoDetalle.haber) < 0.01
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {Math.abs(asientoDetalle.debe - asientoDetalle.haber) < 0.01
                      ? "Asiento balanceado correctamente"
                      : `Asiento desbalanceado - Diferencia: ${Math.abs(asientoDetalle.debe - asientoDetalle.haber).toFixed(2)} Bs.`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="dialog-animated max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Asiento Contable</DialogTitle>
            <DialogDescription>
              Solo los asientos en borrador pueden modificarse antes de registrarse
            </DialogDescription>
          </DialogHeader>

          {asientoEditando && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={asientoEditando.fecha}
                    onChange={(event) =>
                      setAsientoEditando({
                        ...asientoEditando,
                        fecha: event.target.value,
                      })
                    }
                    disabled={savingEditAsiento}
                  />
                </div>
                <div>
                  <Label>Numero</Label>
                  <Input
                    value={asientoEditando.numero}
                    onChange={(event) =>
                      setAsientoEditando({
                        ...asientoEditando,
                        numero: event.target.value,
                      })
                    }
                    disabled={savingEditAsiento}
                  />
                </div>
              </div>

              <div>
                <Label>Concepto</Label>
                <Input
                  value={asientoEditando.concepto}
                  onChange={(event) =>
                    setAsientoEditando({
                      ...asientoEditando,
                      concepto: event.target.value,
                    })
                  }
                  disabled={savingEditAsiento}
                />
              </div>

              <div>
                <Label>Referencia</Label>
                <Input
                  value={asientoEditando.referencia}
                  onChange={(event) =>
                    setAsientoEditando({
                      ...asientoEditando,
                      referencia: event.target.value,
                    })
                  }
                  disabled={savingEditAsiento}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Debe (Bs.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={asientoEditando.debe}
                    onChange={(event) =>
                      setAsientoEditando({
                        ...asientoEditando,
                        debe: parseFloat(event.target.value) || 0,
                      })
                    }
                    disabled={savingEditAsiento}
                  />
                </div>
                <div>
                  <Label>Haber (Bs.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={asientoEditando.haber}
                    onChange={(event) =>
                      setAsientoEditando({
                        ...asientoEditando,
                        haber: parseFloat(event.target.value) || 0,
                      })
                    }
                    disabled={savingEditAsiento}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={savingEditAsiento}>
                  Cancelar
                </Button>
                <Button onClick={() => void guardarEdicion()} disabled={savingEditAsiento}>
                  {savingEditAsiento ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LibroDiario;
