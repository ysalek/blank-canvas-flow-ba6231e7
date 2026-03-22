import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  Percent,
  ChartColumnIncreasing,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useReportesContables } from "@/hooks/useReportesContables";
import {
  EnhancedHeader,
  EnhancedMetricCard,
  MetricGrid,
  Section,
} from "../dashboard/EnhancedLayout";

interface RatioFinanciero {
  nombre: string;
  valor: number;
  optimo: { min: number; max: number };
  categoria: "liquidez" | "rentabilidad" | "endeudamiento" | "actividad";
  interpretacion: string;
  estado: "bueno" | "regular" | "malo";
}

interface TendenciaFinanciera {
  periodo: string;
  ventas: number;
  utilidad: number;
  activos: number;
  patrimonio: number;
}

const AnalisisFinanciero = () => {
  const [ratios, setRatios] = useState<RatioFinanciero[]>([]);
  const [tendencias, setTendencias] = useState<TendenciaFinanciera[]>([]);
  const [alertas, setAlertas] = useState<string[]>([]);
  const { getBalanceSheetData, getIncomeStatementData } = useReportesContables();

  useEffect(() => {
    const balanceData = getBalanceSheetData();
    const estadoResultados = getIncomeStatementData();

    const activoCorriente = balanceData.activos.cuentas
      .filter((cuenta) => cuenta.codigo.startsWith("11"))
      .reduce((sum, cuenta) => sum + cuenta.saldo, 0);

    const pasivoCorriente = balanceData.pasivos.cuentas
      .filter((cuenta) => cuenta.codigo.startsWith("21"))
      .reduce((sum, cuenta) => sum + cuenta.saldo, 0);

    const totalActivos = balanceData.activos.total;
    const totalPasivos = balanceData.pasivos.total;
    const patrimonio = balanceData.patrimonio.total;
    const ventas = estadoResultados.ingresos.total;
    const utilidadNeta = estadoResultados.utilidadNeta;

    const ratiosCalculados: RatioFinanciero[] = [
      {
        nombre: "Razon corriente",
        valor: pasivoCorriente > 0 ? activoCorriente / pasivoCorriente : 0,
        optimo: { min: 1.2, max: 2.0 },
        categoria: "liquidez",
        interpretacion: "Capacidad para cubrir deudas de corto plazo.",
        estado: "bueno",
      },
      {
        nombre: "Prueba acida",
        valor: pasivoCorriente > 0 ? (activoCorriente * 0.8) / pasivoCorriente : 0,
        optimo: { min: 0.8, max: 1.5 },
        categoria: "liquidez",
        interpretacion: "Liquidez inmediata sin considerar inventarios.",
        estado: "bueno",
      },
      {
        nombre: "ROA",
        valor: totalActivos > 0 ? (utilidadNeta / totalActivos) * 100 : 0,
        optimo: { min: 5, max: 15 },
        categoria: "rentabilidad",
        interpretacion: "Eficiencia en el uso de activos.",
        estado: "bueno",
      },
      {
        nombre: "ROE",
        valor: patrimonio > 0 ? (utilidadNeta / patrimonio) * 100 : 0,
        optimo: { min: 10, max: 25 },
        categoria: "rentabilidad",
        interpretacion: "Rendimiento para los accionistas.",
        estado: "bueno",
      },
      {
        nombre: "Margen neto",
        valor: ventas > 0 ? (utilidadNeta / ventas) * 100 : 0,
        optimo: { min: 3, max: 15 },
        categoria: "rentabilidad",
        interpretacion: "Porcentaje de utilidad sobre ventas.",
        estado: "bueno",
      },
      {
        nombre: "Razon de endeudamiento",
        valor: totalActivos > 0 ? (totalPasivos / totalActivos) * 100 : 0,
        optimo: { min: 30, max: 60 },
        categoria: "endeudamiento",
        interpretacion: "Porcentaje de activos financiados con deuda.",
        estado: "bueno",
      },
      {
        nombre: "Deuda patrimonio",
        valor: patrimonio > 0 ? (totalPasivos / patrimonio) * 100 : 0,
        optimo: { min: 40, max: 100 },
        categoria: "endeudamiento",
        interpretacion: "Relacion de deuda frente al patrimonio.",
        estado: "bueno",
      },
      {
        nombre: "Rotacion de activos",
        valor: totalActivos > 0 ? ventas / totalActivos : 0,
        optimo: { min: 0.5, max: 2.0 },
        categoria: "actividad",
        interpretacion: "Eficiencia para transformar activos en ventas.",
        estado: "bueno",
      },
    ];

    const ratiosConEstado = ratiosCalculados.map((ratio) => {
      let estado: "bueno" | "regular" | "malo" = "bueno";

      if (ratio.valor < ratio.optimo.min || ratio.valor > ratio.optimo.max) {
        if (Math.abs(ratio.valor - ratio.optimo.min) > (ratio.optimo.max - ratio.optimo.min) * 0.5) {
          estado = "malo";
        } else {
          estado = "regular";
        }
      }

      return { ...ratio, estado };
    });

    setRatios(ratiosConEstado);

    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio"];
    const tendenciasData: TendenciaFinanciera[] = meses.map((mes, index) => ({
      periodo: mes,
      ventas: 50000 + index * 5000 + (Math.random() * 10000 - 5000),
      utilidad: 8000 + index * 800 + (Math.random() * 2000 - 1000),
      activos: 200000 + index * 10000,
      patrimonio: 120000 + index * 6000,
    }));

    setTendencias(tendenciasData);
  }, [getBalanceSheetData, getIncomeStatementData]);

  useEffect(() => {
    const alertasGeneradas: string[] = [];

    ratios.forEach((ratio) => {
      if (ratio.estado === "malo") {
        alertasGeneradas.push(`${ratio.nombre} esta fuera del rango optimo (${ratio.valor.toFixed(2)}).`);
      }
    });

    if (alertasGeneradas.length === 0) {
      alertasGeneradas.push("Todos los ratios financieros estan dentro de rangos aceptables.");
    }

    setAlertas(alertasGeneradas);
  }, [ratios]);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "bueno":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "regular":
        return "text-amber-700 bg-amber-50 border-amber-200";
      case "malo":
        return "text-rose-700 bg-rose-50 border-rose-200";
      default:
        return "text-slate-700 bg-slate-50 border-slate-200";
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "bueno":
        return <CheckCircle className="h-4 w-4" />;
      case "regular":
        return <AlertTriangle className="h-4 w-4" />;
      case "malo":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const ratiosBuenos = ratios.filter((ratio) => ratio.estado === "bueno").length;
  const ratiosRegulares = ratios.filter((ratio) => ratio.estado === "regular").length;
  const ratiosCriticos = ratios.filter((ratio) => ratio.estado === "malo").length;
  const scoreGeneral = ratios.length > 0 ? Math.round((ratiosBuenos / ratios.length) * 100) : 0;

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Analisis financiero"
        subtitle="Traduce balance, resultados y tendencias en una lectura ejecutiva mas clara para direccion y control."
        badge={{
          text: `${scoreGeneral}% score general`,
          variant: "secondary",
        }}
      />

      <div className="hero-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Vision ejecutiva
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">
                Riesgo, rentabilidad y solvencia en una sola lectura
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Este modulo toma balance y resultados para convertirlos en indicadores,
                alertas y tendencias que facilitan el cierre y la toma de decisiones.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {ratios.length} ratios evaluados
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {alertas.length} alertas visibles
                </Badge>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Lectura rapida
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold">Solidez visible</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {ratiosBuenos >= ratiosCriticos
                      ? "La mayoria de ratios se mantiene en rango saludable."
                      : "Existen mas indicadores criticos de lo deseado."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold">Foco de revision</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Prioriza ratios fuera de rango y tendencias de utilidad o patrimonio.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Tablero del dia
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ratios sanos</p>
                  <p className="text-xs text-slate-500">Indicadores en rango</p>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{ratiosBuenos}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Regulares</p>
                  <p className="text-xs text-slate-500">Indicadores a seguir</p>
                </div>
                <p className="text-2xl font-bold text-amber-700">{ratiosRegulares}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Criticos</p>
                  <p className="text-xs text-slate-500">Indicadores fuera de rango</p>
                </div>
                <p className="text-2xl font-bold text-rose-700">{ratiosCriticos}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MetricGrid columns={4}>
        <EnhancedMetricCard
          title="Ratios buenos"
          value={ratiosBuenos}
          subtitle="En rango esperado"
          icon={CheckCircle}
          variant="success"
        />
        <EnhancedMetricCard
          title="Ratios regulares"
          value={ratiosRegulares}
          subtitle="Requieren seguimiento"
          icon={AlertTriangle}
          variant="warning"
        />
        <EnhancedMetricCard
          title="Ratios criticos"
          value={ratiosCriticos}
          subtitle="Fuera del rango optimo"
          icon={TrendingDown}
          variant="destructive"
        />
        <EnhancedMetricCard
          title="Score general"
          value={`${scoreGeneral}%`}
          subtitle="Lectura sintetica del periodo"
          icon={Percent}
        />
      </MetricGrid>

      <Tabs defaultValue="ratios" className="space-y-5">
        <TabsList className="grid w-full grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-2 md:grid-cols-3">
          <TabsTrigger value="ratios" className="rounded-xl">
            Ratios
          </TabsTrigger>
          <TabsTrigger value="tendencias" className="rounded-xl">
            Tendencias
          </TabsTrigger>
          <TabsTrigger value="alertas" className="rounded-xl">
            Alertas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ratios">
          <Section title="Ratios" subtitle="Indicadores financieros organizados por categoria">
            <div className="grid gap-6 lg:grid-cols-2">
              {["liquidez", "rentabilidad", "endeudamiento", "actividad"].map((categoria) => (
                <Card key={categoria} className="rounded-[1.75rem] border-slate-200 bg-white/90 shadow-sm">
                  <CardHeader>
                    <CardTitle className="capitalize">Ratios de {categoria}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {ratios
                        .filter((ratio) => ratio.categoria === categoria)
                        .map((ratio) => (
                          <div key={ratio.nombre} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-slate-950">{ratio.nombre}</span>
                              <Badge className={getEstadoColor(ratio.estado)}>
                                {getEstadoIcon(ratio.estado)}
                                <span className="ml-1">{ratio.estado}</span>
                              </Badge>
                            </div>
                            <div className="flex justify-between text-sm text-slate-500">
                              <span>
                                Valor: {ratio.valor.toFixed(2)}
                                {ratio.categoria === "rentabilidad" || ratio.categoria === "endeudamiento" ? "%" : ""}
                              </span>
                              <span>
                                Optimo: {ratio.optimo.min} - {ratio.optimo.max}
                              </span>
                            </div>
                            <Progress
                              value={Math.min((ratio.valor / ratio.optimo.max) * 100, 100)}
                              className="h-2"
                            />
                            <p className="text-xs text-slate-500">{ratio.interpretacion}</p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="tendencias">
          <Section title="Tendencias" subtitle="Comportamiento de ventas, utilidad y estructura financiera">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-[1.75rem] border-slate-200 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Evolucion de ventas y utilidad</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={tendencias}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="periodo" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [`Bs ${value.toLocaleString()}`, ""]} />
                      <Line type="monotone" dataKey="ventas" stroke="#0f766e" name="Ventas" />
                      <Line type="monotone" dataKey="utilidad" stroke="#2563eb" name="Utilidad" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] border-slate-200 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Evolucion de activos y patrimonio</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={tendencias}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="periodo" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [`Bs ${value.toLocaleString()}`, ""]} />
                      <Bar dataKey="activos" fill="#0f766e" name="Activos" />
                      <Bar dataKey="patrimonio" fill="#2563eb" name="Patrimonio" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="alertas">
          <Section title="Alertas y recomendaciones" subtitle="Hallazgos clave para direccion financiera y control">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="rounded-[1.75rem] border-slate-200 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Alertas financieras
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alertas.map((alerta, index) => (
                      <Alert key={index}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{alerta}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] border-slate-200 bg-slate-950 text-slate-50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-50">
                    <ChartColumnIncreasing className="h-5 w-5 text-emerald-300" />
                    Recomendaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Alert className="border-white/10 bg-white/5 text-slate-50">
                    <CheckCircle className="h-4 w-4 text-emerald-300" />
                    <AlertDescription className="text-slate-200">
                      Mantener seguimiento mensual de ratios de liquidez para asegurar solvencia de corto plazo.
                    </AlertDescription>
                  </Alert>
                  <Alert className="border-white/10 bg-white/5 text-slate-50">
                    <CheckCircle className="h-4 w-4 text-emerald-300" />
                    <AlertDescription className="text-slate-200">
                      Revisar estructura de capital si el endeudamiento se mantiene fuera del rango objetivo.
                    </AlertDescription>
                  </Alert>
                  <Alert className="border-white/10 bg-white/5 text-slate-50">
                    <CheckCircle className="h-4 w-4 text-emerald-300" />
                    <AlertDescription className="text-slate-200">
                      Ajustar margen y eficiencia operativa si la rentabilidad cae por debajo de la meta.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalisisFinanciero;
