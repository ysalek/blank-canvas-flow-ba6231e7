import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowRightLeft,
  ArrowUpCircle,
  DollarSign,
  Eye,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ComprobanteForm from "./ComprobanteForm";
import ComprobantePreview from "./ComprobantePreview";
import {
  useComprobantesIntegrados,
  type ComprobanteDraft,
  type ComprobanteIntegrado,
} from "@/hooks/useComprobantesIntegrados";

const ComprobantesModule = () => {
  const [showComprobanteDialog, setShowComprobanteDialog] = useState<{
    open: boolean;
    tipo: "ingreso" | "egreso" | "traspaso" | null;
  }>({ open: false, tipo: null });
  const [selectedComprobante, setSelectedComprobante] = useState<ComprobanteIntegrado | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const {
    comprobantes,
    loading,
    resumen,
    createComprobante,
    autorizarComprobante,
    anularComprobante,
    refetch,
  } = useComprobantesIntegrados();

  const guardarComprobante = async (datos: Omit<ComprobanteDraft, "numero"> & { numero?: string }) => {
    const contadorTipo = comprobantes.filter((comprobante) => comprobante.tipo === datos.tipo).length + 1;
    const prefijo = datos.tipo === "ingreso" ? "ING" : datos.tipo === "egreso" ? "EGR" : "TRA";

    await createComprobante({
      ...datos,
      numero: `${prefijo}-${contadorTipo.toString().padStart(4, "0")}`,
      monto:
        datos.tipo === "traspaso"
          ? datos.cuentas.reduce((sum, cuenta) => sum + cuenta.debe, 0)
          : datos.monto,
    });

    setShowComprobanteDialog({ open: false, tipo: null });
  };

  const comprobantesFiltrados = useMemo(
    () =>
      comprobantes.filter((comprobante) => {
        const cumpleTipo = filtroTipo === "todos" || comprobante.tipo === filtroTipo;
        const cumpleEstado = filtroEstado === "todos" || comprobante.estado === filtroEstado;
        return cumpleTipo && cumpleEstado;
      }),
    [comprobantes, filtroEstado, filtroTipo]
  );

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "ingreso":
        return ArrowUpCircle;
      case "egreso":
        return ArrowDownCircle;
      case "traspaso":
        return ArrowRightLeft;
      default:
        return FileText;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "autorizado":
        return "bg-green-100 text-green-800";
      case "anulado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Comprobantes Contables</h2>
            <p className="text-slate-600">
              Persistencia unificada en Supabase con autorizacion y reversion contable trazables
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowComprobanteDialog({ open: true, tipo: "ingreso" })}
            className="bg-green-600 hover:bg-green-700"
          >
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Ingreso
          </Button>
          <Button
            onClick={() => setShowComprobanteDialog({ open: true, tipo: "egreso" })}
            className="bg-red-600 hover:bg-red-700"
          >
            <ArrowDownCircle className="mr-2 h-4 w-4" />
            Egreso
          </Button>
          <Button
            onClick={() => setShowComprobanteDialog({ open: true, tipo: "traspaso" })}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Traspaso
          </Button>
          <Button variant="outline" onClick={refetch}>
            Actualizar
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Los comprobantes autorizados generan asiento contable. Si luego se anulan, el sistema emite
        un asiento de reversion en lugar de borrar historia operativa.
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Bs. {resumen.totalIngresos.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Comprobantes autorizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Bs. {resumen.totalEgresos.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Comprobantes autorizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Bs. {resumen.saldoNeto.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Diferencia ingresos - egresos</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="ingreso">Ingresos</SelectItem>
            <SelectItem value="egreso">Egresos</SelectItem>
            <SelectItem value="traspaso">Traspasos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="autorizado">Autorizado</SelectItem>
            <SelectItem value="anulado">Anulado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Comprobantes</CardTitle>
          <CardDescription>Fuente unica de comprobantes persistidos y listos para auditoria</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Cargando comprobantes desde la base de datos...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comprobantesFiltrados.map((comprobante) => {
                  const IconComponent = getTipoIcon(comprobante.tipo);
                  return (
                    <TableRow key={comprobante.id}>
                      <TableCell className="font-medium">{comprobante.numero}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {comprobante.tipo.charAt(0).toUpperCase() + comprobante.tipo.slice(1)}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(comprobante.fecha).toLocaleDateString("es-BO")}</TableCell>
                      <TableCell>{comprobante.concepto}</TableCell>
                      <TableCell>{comprobante.beneficiario}</TableCell>
                      <TableCell className="text-right font-semibold">
                        Bs. {comprobante.monto.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getEstadoColor(comprobante.estado)}>{comprobante.estado}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {comprobante.estado === "borrador" && (
                            <Button size="sm" onClick={() => autorizarComprobante(comprobante.id)}>
                              Autorizar
                            </Button>
                          )}
                          {comprobante.estado === "autorizado" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => anularComprobante(comprobante.id)}
                            >
                              Anular
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setSelectedComprobante(comprobante)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showComprobanteDialog.open}
        onOpenChange={(open) => !open && setShowComprobanteDialog({ open: false, tipo: null })}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Nuevo Comprobante de{" "}
              {showComprobanteDialog.tipo?.charAt(0).toUpperCase() + showComprobanteDialog.tipo?.slice(1)}
            </DialogTitle>
            <DialogDescription>
              El comprobante se guarda en Supabase y, si se autoriza, genera el asiento contable
              correspondiente.
            </DialogDescription>
          </DialogHeader>
          {showComprobanteDialog.tipo && (
            <ComprobanteForm
              tipo={showComprobanteDialog.tipo}
              onSave={guardarComprobante}
              onCancel={() => setShowComprobanteDialog({ open: false, tipo: null })}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedComprobante} onOpenChange={(open) => !open && setSelectedComprobante(null)}>
        <DialogContent className="max-h-[95vh] max-w-5xl overflow-y-auto p-0">
          {selectedComprobante && (
            <ComprobantePreview
              comprobante={selectedComprobante}
              onClose={() => setSelectedComprobante(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComprobantesModule;
