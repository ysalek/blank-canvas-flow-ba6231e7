import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AutomatedReportItem, useCumplimientoEjecutivo } from "@/hooks/useCumplimientoEjecutivo";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Settings,
} from "lucide-react";
import * as XLSX from "@e965/xlsx";

interface ReportTemplate {
  id: string;
  name: string;
  type: AutomatedReportItem["type"];
  description: string;
  fields: string[];
  validations: string[];
}

const templates: ReportTemplate[] = [
  {
    id: "form-200",
    name: "Formulario 200 - IVA",
    type: "iva",
    description: "Resumen mensual del IVA pendiente basado en declaraciones persistidas.",
    fields: ["Declaraciones pendientes", "Monto impuesto", "Fecha de vencimiento"],
    validations: ["Validar ventas e IVA debito", "Cruzar obligaciones pendientes", "Confirmar presentaciones del periodo"],
  },
  {
    id: "form-401",
    name: "Formulario 401 - IT",
    type: "it",
    description: "Control operativo de IT mensual apoyado en declaraciones tributarias.",
    fields: ["Declaraciones IT", "Monto impuesto", "Proximo vencimiento"],
    validations: ["Verificar base imponible", "Revisar obligaciones pendientes"],
  },
  {
    id: "form-110",
    name: "Formulario 110 - RC-IVA",
    type: "rc-iva",
    description: "Consolidado de retenciones y planillas con RC-IVA del periodo.",
    fields: ["Retenciones emitidas", "Monto retenido", "Planillas con RC-IVA"],
    validations: ["Cruzar facturas RC-IVA", "Confirmar retenciones pendientes"],
  },
  {
    id: "compliance-pack",
    name: "Paquete de cierre y cumplimiento",
    type: "cumplimiento",
    description: "Reporte ejecutivo de alertas, obligaciones, nomina y conciliacion.",
    fields: ["Alertas activas", "Declaraciones pendientes", "Conciliaciones abiertas", "Planillas pendientes"],
    validations: ["Verificar alertas criticas", "Confirmar cierres bancarios", "Revisar nomina sin pago"],
  },
];

const AutomatedReporting = () => {
  const { toast } = useToast();
  const { reports, metrics, loading, markReportGenerated, refetch } = useCumplimientoEjecutivo();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generationProgress, setGenerationProgress] = useState<Record<string, number>>({});

  const overdueReports = reports.filter((report) => report.status === "overdue");
  const generatedReports = reports.filter((report) => report.status === "generated" || report.status === "submitted");

  const navigateTo = (view: string, params?: Record<string, string>) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const selectedTemplateData = useMemo(
    () => templates.find((template) => template.id === selectedTemplate) || null,
    [selectedTemplate],
  );

  const runProgress = async (reportId: string) => {
    for (let step = 0; step <= 100; step += 25) {
      setGenerationProgress((prev) => ({ ...prev, [reportId]: step }));
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    setGenerationProgress((prev) => {
      const next = { ...prev };
      delete next[reportId];
      return next;
    });
  };

  const exportReport = (report: AutomatedReportItem) => {
    const rows = Object.entries(report.payload).map(([key, value]) => ({
      Indicador: key,
      Valor: typeof value === "number" ? Number(value.toFixed(2)) : String(value),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, `${report.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const generateReport = async (report: AutomatedReportItem) => {
    await runProgress(report.id);
    markReportGenerated(report.id, report.autoSubmit);

    toast({
      title: report.autoSubmit ? "Reporte generado y enviado" : "Reporte generado",
      description: report.autoSubmit
        ? `${report.name} quedo preparado y marcado como enviado al circuito definido.`
        : `${report.name} quedo generado con datos reales del sistema.`,
    });
  };

  const generateSelectedTemplate = async () => {
    if (!selectedTemplateData) return;
    const linkedReport = reports.find((report) => report.type === selectedTemplateData.type);
    if (!linkedReport) return;
    await generateReport(linkedReport);
  };

  const getStatusColor = (status: AutomatedReportItem["status"]) => {
    const colors = {
      pending: "text-amber-700 bg-amber-100 border-amber-200",
      generated: "text-sky-700 bg-sky-100 border-sky-200",
      submitted: "text-emerald-700 bg-emerald-100 border-emerald-200",
      overdue: "text-rose-700 bg-rose-100 border-rose-200",
    };
    return colors[status];
  };

  const getStatusIcon = (status: AutomatedReportItem["status"]) => {
    if (status === "submitted") return <CheckCircle className="h-4 w-4" />;
    if (status === "generated") return <FileText className="h-4 w-4" />;
    if (status === "overdue") return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,#ffffff_0%,#ecfeff_35%,#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="bg-slate-900 text-white hover:bg-slate-900">Reporting ejecutivo</Badge>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Centro de reportes automaticos y cierres</h2>
              <p className="max-w-3xl text-sm text-slate-600">
                Los reportes ahora toman payload real desde declaraciones, retenciones, nomina, conciliacion bancaria y cumplimiento.
              </p>
            </div>
          </div>
          <Button variant="outline" className="bg-white/80" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sincronizar datos
          </Button>
        </div>
      </section>

      {overdueReports.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" />
            Hay {overdueReports.length} reporte(s) vencido(s) que requieren atencion inmediata.
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Pendientes tributarios" value={metrics.declaracionesPendientes} detail="Declaraciones no presentadas" icon={Calendar} tone="amber" />
        <MetricCard title="Cumplimiento abierto" value={metrics.cumplimientoPendiente} detail="Requisitos normativos sin cerrar" icon={Settings} tone="slate" />
        <MetricCard title="Reportes generados" value={generatedReports.length} detail="Cortes ya documentados" icon={CheckCircle} tone="emerald" />
        <MetricCard title="Planillas pendientes" value={metrics.planillasPendientes} detail="Nomina aun no pagada o cerrada" icon={FileText} tone="sky" />
      </div>

      <Card className="border-slate-200">
        <CardHeader className="border-b bg-slate-50/70">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-sky-700" />
            Generador guiado de reportes
          </CardTitle>
          <CardDescription>Selecciona una plantilla y el sistema armara el paquete usando la data real actualmente disponible.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex-1">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plantilla de reporte" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void generateSelectedTemplate()} disabled={!selectedTemplate || loading}>
              <FileText className="mr-2 h-4 w-4" />
              Generar reporte
            </Button>
          </div>

          {selectedTemplateData && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900">{selectedTemplateData.name}</h4>
              <p className="mt-1 text-sm text-slate-600">{selectedTemplateData.description}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Campos incluidos</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {selectedTemplateData.fields.map((field) => (
                      <li key={field}>• {field}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Validaciones</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {selectedTemplateData.validations.map((validation) => (
                      <li key={validation}>• {validation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="border-b bg-slate-50/70">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-700" />
            Calendario operativo de reportes
          </CardTitle>
          <CardDescription>Cada fila refleja el estado actual del circuito y permite generar o exportar el paquete correspondiente.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reporte</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead>Proximo vencimiento</TableHead>
                <TableHead>Ultima generacion</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{report.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>Tipo: {report.type.toUpperCase()}</span>
                        {report.autoSubmit && <Badge variant="outline">Auto-envio</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {report.frequency === "monthly" ? "Mensual" : report.frequency === "quarterly" ? "Trimestral" : "Anual"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(report.nextDue).toLocaleDateString("es-BO")}</TableCell>
                  <TableCell>{report.lastGenerated ? new Date(report.lastGenerated).toLocaleDateString("es-BO") : "Nunca"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${getStatusColor(report.status)} flex w-fit items-center gap-1`}>
                      {getStatusIcon(report.status)}
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {generationProgress[report.id] !== undefined ? (
                      <div className="ml-auto flex min-w-[140px] items-center gap-2">
                        <Progress value={generationProgress[report.id]} className="flex-1" />
                        <span className="text-xs text-slate-500">{generationProgress[report.id]}%</span>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        {report.navigation && (
                          <Button size="sm" variant="outline" onClick={() => navigateTo(report.navigation!.view, report.navigation!.params)}>
                            <ExternalLink className="mr-1 h-3.5 w-3.5" />
                            Abrir origen
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => void generateReport(report)} disabled={loading}>
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          Generar
                        </Button>
                        {(report.status === "generated" || report.status === "submitted") && (
                          <Button size="sm" variant="outline" onClick={() => exportReport(report)}>
                            <Download className="mr-1 h-3.5 w-3.5" />
                            Descargar
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  detail: string;
  icon: typeof Calendar;
  tone: "amber" | "slate" | "emerald" | "sky";
}) => {
  const toneClasses = {
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    sky: "border-sky-200 bg-sky-50 text-sky-950",
  };

  return (
    <Card className={toneClasses[tone]}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-600">{title}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-sm text-slate-600">{detail}</p>
          </div>
          <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutomatedReporting;
