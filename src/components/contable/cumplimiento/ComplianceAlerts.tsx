import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCumplimientoEjecutivo } from "@/hooks/useCumplimientoEjecutivo";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  XCircle,
} from "lucide-react";

const priorityClasses: Record<string, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-orange-200 bg-orange-50 text-orange-800",
  critical: "border-rose-200 bg-rose-50 text-rose-800",
};

const ComplianceAlerts = () => {
  const { alerts, loading, metrics, refetch } = useCumplimientoEjecutivo();

  if (loading) {
    return (
      <div className="py-10 text-center">
        <Bell className="mx-auto mb-3 h-12 w-12 animate-pulse text-slate-400" />
        <p className="text-sm text-slate-500">Leyendo declaraciones, conciliaciones, nomina y cumplimiento normativo...</p>
      </div>
    );
  }

  const actionableAlerts = alerts.filter((item) => item.id !== "sin-alertas");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_35%),linear-gradient(135deg,#ffffff_0%,#fff7ed_38%,#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="bg-slate-900 text-white hover:bg-slate-900">Control de cierre</Badge>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Alertas ejecutivas de cumplimiento</h2>
              <p className="max-w-3xl text-sm text-slate-600">
                El tablero consolida configuracion tributaria, declaraciones, nomina, retenciones, conciliacion bancaria y seguimiento normativo.
              </p>
            </div>
          </div>
          <Button variant="outline" className="bg-white/80" onClick={() => void refetch()}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Actualizar tablero
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Alertas criticas" value={metrics.criticalAlerts} icon={XCircle} tone="rose" detail="Contingencias que afectan cierre o vencimientos" />
        <MetricCard title="Alertas activas" value={metrics.totalAlerts} icon={ShieldAlert} tone="amber" detail="Hallazgos detectados por el motor de control" />
        <MetricCard title="Declaraciones pendientes" value={metrics.declaracionesPendientes} icon={Calendar} tone="sky" detail="Obligaciones no presentadas aun" />
        <MetricCard title="Conciliaciones abiertas" value={metrics.conciliacionesAbiertas} icon={CheckCircle} tone="slate" detail="Cortes bancarios todavia sin cierre final" />
      </div>

      <Card className="border-slate-200">
        <CardHeader className="border-b bg-slate-50/70">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            Cola de alertas priorizadas
          </CardTitle>
          <CardDescription>
            Cada alerta se construye desde datos persistidos. No se muestran recordatorios simulados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {actionableAlerts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-emerald-600" />
              <h3 className="text-lg font-semibold text-emerald-900">Sin hallazgos mayores</h3>
              <p className="mt-1 text-sm text-emerald-800">El sistema no detecta contingencias criticas en esta lectura del cierre.</p>
            </div>
          ) : (
            actionableAlerts.map((alert) => (
              <Alert key={alert.id} className={`${priorityClasses[alert.priority]} border-l-4`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{alert.type}</Badge>
                      <Badge variant="outline">{alert.priority.toUpperCase()}</Badge>
                      <Badge variant="outline">{alert.source}</Badge>
                      {alert.deadline && (
                        <span className="inline-flex items-center gap-1 text-xs opacity-80">
                          <Calendar className="h-3.5 w-3.5" />
                          Vence o impacta desde {new Date(alert.deadline).toLocaleDateString("es-BO")}
                        </span>
                      )}
                    </div>
                    <div>
                      <AlertTitle className="text-base font-semibold">{alert.title}</AlertTitle>
                      <AlertDescription className="mt-2 text-sm leading-6">{alert.description}</AlertDescription>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">Acciones recomendadas</p>
                      <ul className="space-y-1 text-sm">
                        {alert.actions.map((action) => (
                          <li key={action}>• {action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild size="sm" variant="outline" className="bg-white/80">
                      <a href="/?view=cumplimiento-normativo">
                        Abrir modulo
                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </Alert>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  icon: Icon,
  tone,
  detail,
}: {
  title: string;
  value: number;
  icon: typeof Bell;
  tone: "rose" | "amber" | "sky" | "slate";
  detail: string;
}) => {
  const toneClasses = {
    rose: "border-rose-200 bg-rose-50 text-rose-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    sky: "border-sky-200 bg-sky-50 text-sky-950",
    slate: "border-slate-200 bg-slate-50 text-slate-950",
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

export default ComplianceAlerts;
