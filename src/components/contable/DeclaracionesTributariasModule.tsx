import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Calculator,
  CheckCircle2,
  ExternalLink,
  FileText,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useConfiguracionSistema } from "@/hooks/useConfiguracionSistema";
import {
  calcularFechaVencimiento,
  DECLARACION_DEFINITIONS,
  DeclaracionDraft,
  DeclaracionTipo,
  inferirCierreFiscal,
  NIT_VENCIMIENTO_ROWS,
  useDeclaracionesTributarias,
} from "@/hooks/useDeclaracionesTributarias";

type EstadoCalendario =
  | "no_registrada"
  | "pendiente"
  | "presentada"
  | "vencida"
  | "aceptada"
  | "observada";

interface ObligacionProxima {
  id: string;
  tipo: DeclaracionTipo;
  periodo: string;
  fechaVencimiento: string;
  estado: EstadoCalendario;
  diasRestantes: number;
}

interface EstimadorState {
  montoImpuesto: number;
  fechaVencimiento: string;
  fechaPago: string;
  multaManual: number;
  tasaDiaria: number;
}

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-BO");
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(value || 0);

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const addMonths = (year: number, month: number, offset: number) => {
  const date = new Date(year, month - 1 + offset, 1);
  return {
    periodo: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
  };
};

const getSuggestedRate = (tipo: DeclaracionTipo, ivaRate: number) => {
  switch (tipo) {
    case "iva":
      return ivaRate;
    case "it":
      return 3;
    case "iue":
      return 25;
    case "rc_iva_agente":
    case "rc_iva_directo":
      return 13;
    default:
      return 0;
  }
};

const getEstadoBadge = (estado: EstadoCalendario) => {
  switch (estado) {
    case "presentada":
    case "aceptada":
      return "default";
    case "vencida":
      return "destructive";
    case "pendiente":
      return "secondary";
    case "observada":
      return "outline";
    default:
      return "outline";
  }
};

const getEstadoLabel = (estado: EstadoCalendario) => {
  switch (estado) {
    case "presentada":
      return "Presentada";
    case "aceptada":
      return "Aceptada";
    case "vencida":
      return "Vencida";
    case "pendiente":
      return "Pendiente";
    case "observada":
      return "Observada";
    default:
      return "No registrada";
  }
};

const DeclaracionesTributariasModule = () => {
  const [showNewDeclaracion, setShowNewDeclaracion] = useState(false);
  const [estimador, setEstimador] = useState<EstimadorState>({
    montoImpuesto: 0,
    fechaVencimiento: new Date().toISOString().slice(0, 10),
    fechaPago: new Date().toISOString().slice(0, 10),
    multaManual: 0,
    tasaDiaria: 0,
  });

  const { empresa, configFiscal, loading: configLoading } = useConfiguracionSistema();
  const {
    declaraciones,
    loading,
    resumen,
    refetch,
    crearDeclaracion,
    marcarComoPresentada,
  } = useDeclaracionesTributarias({
    nit: empresa.nit,
    actividadEconomica: empresa.actividadEconomica,
    codigoActividadCaeb: empresa.codigoSin,
    modalidadFacturacion: configFiscal.modalidadFacturacion,
  });

  const cierreFiscal = useMemo(
    () => inferirCierreFiscal(empresa.actividadEconomica),
    [empresa.actividadEconomica],
  );

  const nitDigito = useMemo(() => {
    const digits = empresa.nit.replace(/\D/g, "");
    return digits ? Number(digits[digits.length - 1]) : null;
  }, [empresa.nit]);

  const diaVencimientoMensual = nitDigito === null ? null : 13 + nitDigito;

  const obligacionesProximas = useMemo<ObligacionProxima[]>(() => {
    const today = startOfToday();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const resultado: ObligacionProxima[] = [];
    const tiposMensuales: DeclaracionTipo[] = ["iva", "it", "rc_iva_agente"];

    for (let offset = 0; offset < 4; offset += 1) {
      const { periodo } = addMonths(currentYear, currentMonth, offset);
      for (const tipo of tiposMensuales) {
        const fechaVencimiento = calcularFechaVencimiento(tipo, periodo, empresa.nit);
        const existente = declaraciones.find(
          (item) => item.tipo === tipo && item.periodo === periodo,
        );
        const fecha = new Date(`${fechaVencimiento}T00:00:00`);
        const diasRestantes = Math.ceil((fecha.getTime() - today.getTime()) / 86400000);

        resultado.push({
          id: `${tipo}-${periodo}`,
          tipo,
          periodo,
          fechaVencimiento,
          estado: existente?.estado || (fecha < today ? "vencida" : "no_registrada"),
          diasRestantes,
        });
      }
    }

    const annualPeriod = `${today.getFullYear()}-${String(cierreFiscal.cierreMes).padStart(2, "0")}`;
    const annualDueDate = calcularFechaVencimiento("iue", annualPeriod, empresa.nit);
    const annualExisting = declaraciones.find(
      (item) => item.tipo === "iue" && item.periodo === annualPeriod,
    );
    const annualDays = Math.ceil(
      (new Date(`${annualDueDate}T00:00:00`).getTime() - today.getTime()) / 86400000,
    );

    resultado.push({
      id: `iue-${annualPeriod}`,
      tipo: "iue",
      periodo: annualPeriod,
      fechaVencimiento: annualDueDate,
      estado: annualExisting?.estado || (annualDays < 0 ? "vencida" : "no_registrada"),
      diasRestantes: annualDays,
    });

    return resultado
      .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))
      .slice(0, 8);
  }, [cierreFiscal.cierreMes, declaraciones, empresa.nit]);

  const totalPendiente = resumen.totalDeterminado - resumen.totalPagado;

  const diasRetraso = useMemo(() => {
    const vencimiento = new Date(`${estimador.fechaVencimiento}T00:00:00`);
    const pago = new Date(`${estimador.fechaPago}T00:00:00`);
    const diferencia = Math.ceil((pago.getTime() - vencimiento.getTime()) / 86400000);
    return Math.max(0, diferencia);
  }, [estimador.fechaPago, estimador.fechaVencimiento]);

  const interesEstimado = useMemo(
    () => estimador.montoImpuesto * estimador.tasaDiaria * diasRetraso,
    [diasRetraso, estimador.montoImpuesto, estimador.tasaDiaria],
  );

  const totalEstimado = estimador.montoImpuesto + estimador.multaManual + interesEstimado;

  if (configLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Declaraciones Tributarias</h2>
          <p className="text-slate-600">Cargando calendario fiscal y declaraciones centralizadas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Declaraciones Tributarias</h2>
            <p className="text-slate-600">
              Calendario por NIT, formularios SIAT y persistencia tributaria centralizada
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recargar
          </Button>
          <Dialog open={showNewDeclaracion} onOpenChange={setShowNewDeclaracion}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva declaracion
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar declaracion tributaria</DialogTitle>
                <DialogDescription>
                  El vencimiento y formulario se calculan con reglas bolivianas base y quedan guardados en Supabase.
                </DialogDescription>
              </DialogHeader>
              <NewDeclaracionForm
                nit={empresa.nit}
                actividadEconomica={empresa.actividadEconomica}
                ivaRate={configFiscal.ivaGeneral}
                onSave={async (draft) => {
                  const ok = await crearDeclaracion(draft);
                  if (ok) {
                    setShowNewDeclaracion(false);
                  }
                }}
                onCancel={() => setShowNewDeclaracion(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Este modulo ya no depende del navegador para el historial de declaraciones. Los registros se guardan
        en Supabase y, si existian datos heredados en almacenamiento local, se migran una sola vez.
      </div>

      {configFiscal.regimen !== "general" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          El regimen configurado es <strong>{configFiscal.regimen}</strong>. Los formularios generales
          mostrados aqui sirven como base operativa, pero los regimens especiales requieren parametrizacion
          adicional antes de usarse como calendario definitivo.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.pendientes}</div>
            <p className="text-sm text-slate-500">Declaraciones aun no presentadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{resumen.vencidas}</div>
            <p className="text-sm text-slate-500">Requieren regularizacion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Presentadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{resumen.presentadas}</div>
            <p className="text-sm text-slate-500">Con trazabilidad en base de datos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saldo tributario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPendiente)}</div>
            <p className="text-sm text-slate-500">Impuesto determinado menos pago registrado</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendario" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
          <TabsTrigger value="declaraciones">Declaraciones</TabsTrigger>
          <TabsTrigger value="periodos">Proximos periodos</TabsTrigger>
          <TabsTrigger value="calculadora">Calculadora</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Vencimiento mensual por ultimo digito del NIT
                </CardTitle>
                <CardDescription>
                  Referencia para obligaciones mensuales como IVA, IT y RC-IVA agente de retencion.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ultimo digito</TableHead>
                      <TableHead>Dia de vencimiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {NIT_VENCIMIENTO_ROWS.map((row) => (
                      <TableRow key={row.digito}>
                        <TableCell className="font-semibold">{row.digito}</TableCell>
                        <TableCell>Dia {row.dia} del mes siguiente</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tu empresa</CardTitle>
                <CardDescription>Base calculada desde la configuracion tributaria</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-slate-500">NIT</div>
                  <div className="font-semibold">{empresa.nit || "No configurado"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Razon social</div>
                  <div className="font-semibold">{empresa.razonSocial}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Vencimiento mensual sugerido</div>
                  <div className="font-semibold">
                    {diaVencimientoMensual ? `Dia ${diaVencimientoMensual}` : "Definir NIT en configuracion"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Cierre fiscal estimado</div>
                  <div className="font-semibold">{cierreFiscal.cierreLabel}</div>
                  <div className="text-xs text-slate-500">{cierreFiscal.descripcion}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Formularios principales del modulo</CardTitle>
                <CardDescription>
                  Se priorizan obligaciones recurrentes del regimen general y flujos frecuentes del SIAT.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.values(DECLARACION_DEFINITIONS).map((item) => (
                  <div key={item.tipo} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-sm text-slate-500">
                          {item.formulario} · {item.frecuencia}
                        </div>
                      </div>
                      <Badge variant="outline">{item.formulario}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{item.normativa}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ciclos oficiales de cierre fiscal</CardTitle>
                <CardDescription>
                  El IUE vence a los 120 dias posteriores al cierre de gestion fiscal asignado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="font-semibold">Industrial y petrolera</div>
                  <div className="text-slate-600">Cierre al 31 de marzo</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="font-semibold">Agropecuaria, gomera, castanera y agroindustrial</div>
                  <div className="text-slate-600">Cierre al 30 de junio</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="font-semibold">Mineria</div>
                  <div className="text-slate-600">Cierre al 30 de septiembre</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="font-semibold">Comercio, servicios, banca, seguros y demas</div>
                  <div className="text-slate-600">Cierre al 31 de diciembre</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="declaraciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registro de declaraciones</CardTitle>
              <CardDescription>
                Historial tributario persistido en base de datos con estado, pago y presentacion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {declaraciones.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">
                  Aun no hay declaraciones registradas. Puedes crear la primera desde este modulo.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Formulario</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Impuesto</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {declaraciones.map((declaracion) => (
                      <TableRow key={declaracion.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{declaracion.tipoLabel}</div>
                            <div className="text-sm text-slate-500">{declaracion.formulario}</div>
                          </div>
                        </TableCell>
                        <TableCell>{declaracion.periodo}</TableCell>
                        <TableCell>{formatDate(declaracion.fechaVencimiento)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(declaracion.montoBase)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(declaracion.montoImpuesto)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(declaracion.montoPagado)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEstadoBadge(declaracion.estado)}>
                            {getEstadoLabel(declaracion.estado)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(declaracion.estado === "pendiente" ||
                            declaracion.estado === "vencida") && (
                            <Button size="sm" onClick={() => void marcarComoPresentada(declaracion.id)}>
                              Marcar presentada
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periodos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proximas obligaciones sugeridas</CardTitle>
              <CardDescription>
                Se calculan desde el NIT de la empresa y el cierre fiscal estimado configurado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {obligacionesProximas.map((obligacion) => {
                  const definition = DECLARACION_DEFINITIONS[obligacion.tipo];
                  const alertClass =
                    obligacion.estado === "vencida"
                      ? "border-red-200 bg-red-50"
                      : obligacion.estado === "pendiente"
                        ? "border-amber-200 bg-amber-50"
                        : obligacion.estado === "presentada" || obligacion.estado === "aceptada"
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200";

                  return (
                    <Card key={obligacion.id} className={alertClass}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{definition.formulario}</CardTitle>
                        <CardDescription>{definition.label}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="text-sm text-slate-500">Periodo</div>
                          <div className="font-semibold">{obligacion.periodo}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-500">Vencimiento</div>
                          <div className="font-semibold">{formatDate(obligacion.fechaVencimiento)}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant={getEstadoBadge(obligacion.estado)}>
                            {getEstadoLabel(obligacion.estado)}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {obligacion.diasRestantes >= 0
                              ? `${obligacion.diasRestantes} dias`
                              : `${Math.abs(obligacion.diasRestantes)} dias atraso`}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculadora" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Estimador parametrico
                </CardTitle>
                <CardDescription>
                  Herramienta preliminar. La deuda oficial debe validarse con la calculadora tributaria del SIN.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="montoImpuesto">Monto impuesto</Label>
                    <Input
                      id="montoImpuesto"
                      type="number"
                      value={estimador.montoImpuesto}
                      onChange={(event) =>
                        setEstimador((prev) => ({
                          ...prev,
                          montoImpuesto: parseFloat(event.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="multaManual">Multa manual</Label>
                    <Input
                      id="multaManual"
                      type="number"
                      value={estimador.multaManual}
                      onChange={(event) =>
                        setEstimador((prev) => ({
                          ...prev,
                          multaManual: parseFloat(event.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fechaVencimientoCalc">Fecha vencimiento</Label>
                    <Input
                      id="fechaVencimientoCalc"
                      type="date"
                      value={estimador.fechaVencimiento}
                      onChange={(event) =>
                        setEstimador((prev) => ({
                          ...prev,
                          fechaVencimiento: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fechaPagoCalc">Fecha pago</Label>
                    <Input
                      id="fechaPagoCalc"
                      type="date"
                      value={estimador.fechaPago}
                      onChange={(event) =>
                        setEstimador((prev) => ({
                          ...prev,
                          fechaPago: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="tasaDiaria">Tasa diaria editable</Label>
                    <Input
                      id="tasaDiaria"
                      type="number"
                      step="0.000001"
                      value={estimador.tasaDiaria}
                      onChange={(event) =>
                        setEstimador((prev) => ({
                          ...prev,
                          tasaDiaria: parseFloat(event.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-slate-50 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-sm text-slate-500">Dias de retraso</div>
                      <div className="text-xl font-semibold">{diasRetraso}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Interes estimado</div>
                      <div className="text-xl font-semibold">{formatCurrency(interesEstimado)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Total estimado</div>
                      <div className="text-xl font-semibold">{formatCurrency(totalEstimado)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Buenas practicas de control</CardTitle>
                <CardDescription>
                  El sistema deja una estimacion interna, pero la liquidacion oficial debe validarse externamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Recomendado
                  </div>
                  <p>
                    Validar multas, intereses y actualizaciones en la calculadora oficial del SIN antes de emitir
                    una liquidacion definitiva o registrar provisiones por contingencias.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Riesgo que ya evitamos
                  </div>
                  <p>
                    Se elimino la logica anterior que fijaba plazos especiales y formulas historicas dentro del
                    codigo. Eso podia inducir errores al cambiar la normativa o las tasas vigentes.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    window.open(
                      "https://ov.impuestos.gob.bo/Paginas/Publico/CalculadoraTributariaExterna.aspx",
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir calculadora tributaria oficial
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface NewDeclaracionFormProps {
  nit?: string;
  actividadEconomica?: string;
  ivaRate: number;
  onSave: (draft: DeclaracionDraft) => Promise<void>;
  onCancel: () => void;
}

const NewDeclaracionForm = ({
  nit,
  actividadEconomica,
  ivaRate,
  onSave,
  onCancel,
}: NewDeclaracionFormProps) => {
  const cierreFiscal = useMemo(() => inferirCierreFiscal(actividadEconomica), [actividadEconomica]);
  const periodoInicial = useMemo(() => {
    const current = new Date();
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [formData, setFormData] = useState<DeclaracionDraft>({
    tipo: "iva",
    periodo: periodoInicial,
    montoBase: 0,
    montoImpuesto: 0,
    montoPagado: 0,
    observaciones: "",
  });
  const [saving, setSaving] = useState(false);

  const fechaVencimiento = useMemo(
    () => calcularFechaVencimiento(formData.tipo, formData.periodo, nit),
    [formData.periodo, formData.tipo, nit],
  );

  const tasaSugerida = useMemo(
    () => getSuggestedRate(formData.tipo, ivaRate),
    [formData.tipo, ivaRate],
  );

  const impuestoSugerido = useMemo(
    () => Number(((formData.montoBase * tasaSugerida) / 100).toFixed(2)),
    [formData.montoBase, tasaSugerida],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de declaracion</Label>
          <Select
            value={formData.tipo}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, tipo: value as DeclaracionTipo }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(DECLARACION_DEFINITIONS).map((item) => (
                <SelectItem key={item.tipo} value={item.tipo}>
                  {item.formulario} - {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Periodo fiscal</Label>
          <Input
            type="month"
            value={formData.periodo}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, periodo: event.target.value }))
            }
            required
          />
        </div>
      </div>

      <div className="rounded-lg border bg-slate-50 p-4 text-sm">
        <div className="font-semibold">{DECLARACION_DEFINITIONS[formData.tipo].formulario}</div>
        <div className="text-slate-600">
          Vencimiento calculado: <strong>{formatDate(fechaVencimiento)}</strong>
        </div>
        {formData.tipo === "iue" && (
          <div className="text-slate-600">
            Referencia de cierre fiscal estimado para la empresa: {cierreFiscal.cierreLabel}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Monto base</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.montoBase}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                montoBase: parseFloat(event.target.value) || 0,
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Impuesto determinado</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.montoImpuesto}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                montoImpuesto: parseFloat(event.target.value) || 0,
              }))
            }
            required
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Tasa sugerida: {tasaSugerida}% · calculado: {formatCurrency(impuestoSugerido)}
            </span>
            <button
              type="button"
              className="font-medium text-primary"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  montoImpuesto: impuestoSugerido,
                }))
              }
            >
              Usar sugerido
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Monto pagado</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.montoPagado || 0}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                montoPagado: parseFloat(event.target.value) || 0,
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observaciones</Label>
        <Textarea
          value={formData.observaciones || ""}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              observaciones: event.target.value,
            }))
          }
          placeholder="Notas de respaldo, numero de tramite o comentario de control interno"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Registrar declaracion"}
        </Button>
      </div>
    </form>
  );
};

export default DeclaracionesTributariasModule;
