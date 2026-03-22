import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsientos } from "@/hooks/useAsientos";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useFacturas } from "@/hooks/useFacturas";
import { useProductosValidated } from "@/hooks/useProductosValidated";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle,
  Lightbulb,
  LineChart,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

interface MetricaAnalisis {
  nombre: string;
  valor: number;
  objetivo: number;
  tendencia: "subida" | "bajada" | "estable";
  porcentaje: number;
  interpretacion: string;
  sugerencia: string;
  color: string;
  sufijo?: string;
}

interface RecomendacionIA {
  tipo: "critico" | "importante" | "sugerencia";
  titulo: string;
  descripcion: string;
  accion: string;
  impacto: string;
  prioridad: number;
}

const getCurrentMonthRange = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    fechaInicio: start.toISOString().slice(0, 10),
    fechaFin: end.toISOString().slice(0, 10),
  };
};

const AnalisisInteligente = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { facturas, loading: facturasLoading, refetch: refetchFacturas } = useFacturas();
  const { productos, loading: productosLoading, refetch: refetchProductos } = useProductosValidated();
  const { asientos, loading: asientosLoading, refetch: refetchAsientos } = useAsientos();
  const { getBalanceSheetData, getIncomeStatementData } = useContabilidadIntegration();

  const currentMonth = getCurrentMonthRange();
  const isLoading = facturasLoading || productosLoading || asientosLoading;

  const analysis = useMemo(() => {
    const balance = getBalanceSheetData();
    const estadoResultadosMes = getIncomeStatementData(currentMonth);

    const facturasVigentes = facturas.filter((factura) => factura.estado !== "anulada");
    const facturasPendientes = facturasVigentes.filter((factura) => factura.estado === "enviada");
    const facturasPagadas = facturasVigentes.filter((factura) => factura.estado === "pagada");
    const asientosRegistrados = asientos.filter((asiento) => asiento.estado === "registrado");

    const ingresosMes = estadoResultadosMes.ingresos.total;
    const gastosMes = estadoResultadosMes.gastos.total;
    const margenOperativo = ingresosMes > 0 ? ((ingresosMes - gastosMes) / ingresosMes) * 100 : 0;
    const liquidez = balance.pasivos.total > 0 ? balance.activos.total / balance.pasivos.total : balance.activos.total;
    const disciplinaRegistro = asientos.length > 0 ? (asientosRegistrados.length / asientos.length) * 100 : 0;
    const efectividadCobranza =
      facturasVigentes.length > 0 ? (facturasPagadas.length / facturasVigentes.length) * 100 : 0;
    const rotacionInventario =
      balance.inventario.saldoContable > 0 ? ingresosMes / balance.inventario.saldoContable : 0;

    const metricas: MetricaAnalisis[] = [
      {
        nombre: "Margen Operativo",
        valor: margenOperativo,
        objetivo: 20,
        tendencia: margenOperativo >= 20 ? "subida" : margenOperativo >= 10 ? "estable" : "bajada",
        porcentaje: Math.min((margenOperativo / 20) * 100, 100),
        interpretacion:
          margenOperativo >= 20
            ? "La operacion esta dejando un margen saludable."
            : margenOperativo >= 10
              ? "El margen es aceptable, pero tiene espacio para mejorar."
              : "La estructura de costos esta presionando la utilidad.",
        sugerencia:
          margenOperativo < 15
            ? "Revisar costos, descuentos y precios de venta."
            : "Mantener control sobre gastos y costo de ventas.",
        color:
          margenOperativo >= 20
            ? "text-green-600"
            : margenOperativo >= 10
              ? "text-yellow-600"
              : "text-red-600",
        sufijo: "%",
      },
      {
        nombre: "Indice de Liquidez",
        valor: liquidez,
        objetivo: 1.5,
        tendencia: liquidez >= 1.5 ? "subida" : liquidez >= 1 ? "estable" : "bajada",
        porcentaje: Math.min((liquidez / 1.5) * 100, 100),
        interpretacion:
          liquidez >= 1.5
            ? "La posicion de corto plazo es solida."
            : liquidez >= 1
              ? "La liquidez es justa y requiere seguimiento."
              : "Hay riesgo para cubrir obligaciones de corto plazo.",
        sugerencia:
          liquidez < 1.2
            ? "Acelerar cobranzas y ordenar pagos segun vencimiento."
            : "Monitorear cartera y caja diariamente.",
        color:
          liquidez >= 1.5 ? "text-green-600" : liquidez >= 1 ? "text-yellow-600" : "text-red-600",
      },
      {
        nombre: "Disciplina de Registro",
        valor: disciplinaRegistro,
        objetivo: 95,
        tendencia: disciplinaRegistro >= 95 ? "subida" : disciplinaRegistro >= 80 ? "estable" : "bajada",
        porcentaje: Math.min(disciplinaRegistro, 100),
        interpretacion:
          disciplinaRegistro >= 95
            ? "La mayor parte de los asientos ya esta formalizada."
            : disciplinaRegistro >= 80
              ? "Existen borradores pendientes de cierre."
              : "Hay demasiados registros sin formalizar.",
        sugerencia:
          disciplinaRegistro < 95
            ? "Cerrar o depurar borradores antes del cierre del periodo."
            : "Mantener el flujo de registro sin rezagos.",
        color:
          disciplinaRegistro >= 95
            ? "text-green-600"
            : disciplinaRegistro >= 80
              ? "text-yellow-600"
              : "text-red-600",
        sufijo: "%",
      },
      {
        nombre: "Cobranza Efectiva",
        valor: efectividadCobranza,
        objetivo: 85,
        tendencia: efectividadCobranza >= 85 ? "subida" : efectividadCobranza >= 65 ? "estable" : "bajada",
        porcentaje: Math.min(efectividadCobranza, 100),
        interpretacion:
          efectividadCobranza >= 85
            ? "La cartera muestra buen nivel de recuperacion."
            : efectividadCobranza >= 65
              ? "La cobranza es aceptable, pero requiere seguimiento."
              : "Existe acumulacion de cartera pendiente.",
        sugerencia:
          facturasPendientes.length > 0
            ? `Priorizar ${facturasPendientes.length} facturas pendientes de cobro.`
            : "Mantener la politica de seguimiento a cartera.",
        color:
          efectividadCobranza >= 85
            ? "text-green-600"
            : efectividadCobranza >= 65
              ? "text-yellow-600"
              : "text-red-600",
        sufijo: "%",
      },
    ];

    const recomendaciones: RecomendacionIA[] = [];

    if (margenOperativo < 15) {
      recomendaciones.push({
        tipo: "critico",
        titulo: "Margen operativo comprometido",
        descripcion:
          "La utilidad del periodo esta siendo absorbida por costos y gastos. Esto reduce la capacidad de sostener crecimiento y cumplir cierres sanos.",
        accion: "Conciliar costo de ventas, revisar descuentos y validar gastos con respaldo.",
        impacto: "Alto - afecta rentabilidad y cierre contable.",
        prioridad: 1,
      });
    }

    if (liquidez < 1.2) {
      recomendaciones.push({
        tipo: "importante",
        titulo: "Liquidez ajustada",
        descripcion:
          "El balance muestra una cobertura estrecha de obligaciones frente a los activos disponibles.",
        accion: "Definir calendario de cobranzas y pagos por prioridad tributaria y operativa.",
        impacto: "Alto - riesgo de tension de caja.",
        prioridad: 2,
      });
    }

    if (!balance.inventario.conciliado) {
      recomendaciones.push({
        tipo: "importante",
        titulo: "Inventario no conciliado",
        descripcion:
          "El saldo fisico de existencias no coincide con el saldo contable usado en el balance.",
        accion: "Levantar un ajuste o acta de conciliacion antes del siguiente cierre.",
        impacto: "Alto - impacta balance y costo de ventas.",
        prioridad: 3,
      });
    }

    if (disciplinaRegistro < 95) {
      recomendaciones.push({
        tipo: "sugerencia",
        titulo: "Borradores pendientes de formalizacion",
        descripcion:
          "Todavia existen asientos fuera de estado registrado, lo que debilita trazabilidad y cierre mensual.",
        accion: "Depurar borradores y establecer control de aprobacion por periodo.",
        impacto: "Medio - mejora trazabilidad y auditoria.",
        prioridad: 4,
      });
    }

    if (rotacionInventario > 0 && rotacionInventario < 1) {
      recomendaciones.push({
        tipo: "sugerencia",
        titulo: "Rotacion de inventario lenta",
        descripcion:
          "Las ventas del mes muestran un movimiento bajo frente al inventario contable disponible.",
        accion: "Revisar productos de baja salida y politicas de reposicion.",
        impacto: "Medio - libera capital de trabajo.",
        prioridad: 5,
      });
    }

    if (recomendaciones.length === 0) {
      recomendaciones.push({
        tipo: "sugerencia",
        titulo: "Base contable estable",
        descripcion:
          "Los indicadores revisados no muestran alertas mayores en esta lectura del sistema.",
        accion: "Continuar con conciliaciones mensuales y controles de cierre.",
        impacto: "Medio - sostiene disciplina operativa.",
        prioridad: 6,
      });
    }

    return {
      balance,
      facturasPendientes,
      ingresosMes,
      gastosMes,
      rotacionInventario,
      metricas,
      recomendaciones: recomendaciones.sort((a, b) => a.prioridad - b.prioridad),
    };
  }, [
    asientos,
    currentMonth,
    facturas,
    getBalanceSheetData,
    getIncomeStatementData,
  ]);

  const refrescarAnalisis = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchFacturas(), refetchProductos(), refetchAsientos()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTendenciaIcon = (tendencia: MetricaAnalisis["tendencia"]) => {
    switch (tendencia) {
      case "subida":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "bajada":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getTipoIcon = (tipo: RecomendacionIA["tipo"]) => {
    switch (tipo) {
      case "critico":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "importante":
        return <Target className="w-5 h-5 text-yellow-600" />;
      default:
        return <Lightbulb className="w-5 h-5 text-blue-600" />;
    }
  };

  const getTipoColor = (tipo: RecomendacionIA["tipo"]) => {
    switch (tipo) {
      case "critico":
        return "border-red-200 bg-red-50";
      case "importante":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-blue-200 bg-blue-50";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary animate-pulse" />
          <h1 className="text-2xl font-bold">Analisis Inteligente</h1>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="mb-4 h-4 w-3/4 rounded bg-muted" />
                <div className="mb-2 h-8 w-1/2 rounded bg-muted" />
                <div className="h-2 w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Analisis Inteligente</h1>
          <Badge variant="secondary" className="ml-2">
            <Sparkles className="mr-1 h-3 w-3" />
            Motor contable
          </Badge>
        </div>
        <Button variant="outline" onClick={refrescarAnalisis} disabled={isRefreshing}>
          <Zap className="mr-2 h-4 w-4" />
          {isRefreshing ? "Actualizando..." : "Actualizar analisis"}
        </Button>
      </div>

      {!analysis.balance.inventario.conciliado && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Existe una diferencia entre inventario fisico y contable por Bs.{" "}
            {Math.abs(analysis.balance.inventario.diferencia).toFixed(2)}. La lectura inteligente ya
            la considera como alerta de cierre.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="metricas" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metricas">Metricas clave</TabsTrigger>
          <TabsTrigger value="recomendaciones">Recomendaciones</TabsTrigger>
          <TabsTrigger value="proyecciones">Proyecciones</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {analysis.metricas.map((metrica) => (
              <Card key={metrica.nombre} className="transition-all duration-300 hover:shadow-elegant">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{metrica.nombre}</CardTitle>
                    {getTendenciaIcon(metrica.tendencia)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className={`text-2xl font-bold ${metrica.color}`}>
                      {metrica.valor.toFixed(1)}
                      {metrica.sufijo ?? ""}
                    </div>
                    <Progress value={metrica.porcentaje} className="h-2" />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{metrica.interpretacion}</p>
                      <p className="text-xs font-medium text-blue-600">{metrica.sugerencia}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Lectura financiera del periodo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Ingresos del mes</p>
                  <p className="text-xl font-semibold text-green-600">
                    Bs. {analysis.ingresosMes.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Gastos del mes</p>
                  <p className="text-xl font-semibold text-red-600">
                    Bs. {analysis.gastosMes.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Facturas pendientes</p>
                  <p className="text-xl font-semibold text-amber-600">
                    {analysis.facturasPendientes.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recomendaciones" className="space-y-6">
          <div className="grid gap-4">
            {analysis.recomendaciones.map((recomendacion) => (
              <Card
                key={recomendacion.titulo}
                className={`${getTipoColor(recomendacion.tipo)} border-l-4`}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {getTipoIcon(recomendacion.tipo)}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{recomendacion.titulo}</CardTitle>
                      <CardDescription className="mt-1">
                        {recomendacion.descripcion}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        recomendacion.tipo === "critico"
                          ? "destructive"
                          : recomendacion.tipo === "importante"
                            ? "default"
                            : "secondary"
                      }
                    >
                      Prioridad {recomendacion.prioridad}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Accion recomendada:</span>
                      <span className="text-sm">{recomendacion.accion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Impacto esperado:</span>
                      <span className="text-sm">{recomendacion.impacto}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="proyecciones" className="space-y-6">
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              Las proyecciones de esta vista son orientativas y se basan en la lectura actual de
              ingresos, gastos, inventario y cartera. No sustituyen un cierre formal.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Proyeccion operativa</CardTitle>
                <CardDescription>Siguiente revision de corto plazo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Rentabilidad</span>
                    <span className="font-bold text-green-600">
                      {analysis.metricas[0]?.valor.toFixed(1) ?? "0.0"}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Liquidez</span>
                    <span className="font-bold text-blue-600">
                      {analysis.metricas[1]?.valor.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rotacion inventario</span>
                    <span className="font-bold text-amber-600">
                      {analysis.rotacionInventario.toFixed(2)}x
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Semaforo de control</CardTitle>
                <CardDescription>Factores de cierre a monitorear</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        analysis.metricas[1]?.valor >= 1.2 ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    />
                    <span className="text-sm">Liquidez</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        analysis.balance.inventario.conciliado ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm">Conciliacion de inventario</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        analysis.facturasPendientes.length === 0 ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    />
                    <span className="text-sm">Cartera pendiente</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalisisInteligente;
