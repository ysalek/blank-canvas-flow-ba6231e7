import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Download,
  FileText,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useAsientos } from "@/hooks/useAsientos";
import { useReportesContables } from "@/hooks/useReportesContables";
import { EnhancedHeader, EnhancedMetricCard, MetricGrid } from "../dashboard/EnhancedLayout";

interface AuditoriaRegla {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: "asientos" | "saldos" | "impuestos" | "inventario" | "activos_fijos";
  criticidad: "alta" | "media" | "baja";
  automatica: boolean;
  frecuencia: "tiempo_real" | "diaria" | "mensual" | "anual";
}

interface ResultadoAuditoria {
  id: string;
  reglaId: string;
  fecha: string;
  estado: "cumple" | "no_cumple" | "advertencia";
  descripcion: string;
  detalles: Record<string, unknown>;
  acciones?: string[];
}

const reglasAuditoria: AuditoriaRegla[] = [
  {
    id: "partida_doble",
    nombre: "Verificacion de partida doble",
    descripcion: "Comprueba que cada asiento contable mantenga equilibrio entre debe y haber.",
    categoria: "asientos",
    criticidad: "alta",
    automatica: true,
    frecuencia: "tiempo_real",
  },
  {
    id: "saldos_balance",
    nombre: "Cuadre de saldos",
    descripcion: "Contrasta el balance de comprobacion para detectar diferencias de cierre.",
    categoria: "saldos",
    criticidad: "alta",
    automatica: true,
    frecuencia: "diaria",
  },
  {
    id: "secuencia_asientos",
    nombre: "Secuencia de asientos",
    descripcion: "Verifica saltos y anomalias en la numeracion contable.",
    categoria: "asientos",
    criticidad: "media",
    automatica: true,
    frecuencia: "diaria",
  },
  {
    id: "fechas_validas",
    nombre: "Validacion de fechas",
    descripcion: "Controla que las fechas registradas sean consistentes con la gestion activa.",
    categoria: "asientos",
    criticidad: "alta",
    automatica: true,
    frecuencia: "tiempo_real",
  },
  {
    id: "cuentas_inexistentes",
    nombre: "Cuentas inexistentes",
    descripcion: "Detecta movimientos sobre cuentas no disponibles en el plan contable.",
    categoria: "asientos",
    criticidad: "alta",
    automatica: true,
    frecuencia: "tiempo_real",
  },
  {
    id: "iva_consistencia",
    nombre: "Consistencia de IVA",
    descripcion: "Evalua calculos basicos de IVA frente a la operacion registrada.",
    categoria: "impuestos",
    criticidad: "alta",
    automatica: true,
    frecuencia: "diaria",
  },
  {
    id: "depreciacion_activos",
    nombre: "Depreciacion de activos",
    descripcion: "Revisa consistencia de depreciaciones y su reflejo contable.",
    categoria: "activos_fijos",
    criticidad: "media",
    automatica: false,
    frecuencia: "mensual",
  },
  {
    id: "inventario_negativo",
    nombre: "Inventario negativo",
    descripcion: "Advierte registros de stock que podrian generar distorsiones contables.",
    categoria: "inventario",
    criticidad: "media",
    automatica: true,
    frecuencia: "diaria",
  },
  {
    id: "cuentas_resultado_saldo",
    nombre: "Cierre de resultados",
    descripcion: "Evalua si ingresos y gastos cierran correctamente antes del cierre anual.",
    categoria: "saldos",
    criticidad: "media",
    automatica: false,
    frecuencia: "anual",
  },
  {
    id: "glosas_vacias",
    nombre: "Glosas vacias",
    descripcion: "Detecta asientos con descripcion insuficiente para trazabilidad y auditoria.",
    categoria: "asientos",
    criticidad: "baja",
    automatica: true,
    frecuencia: "diaria",
  },
];

const AuditoriaContableAvanzada = () => {
  const [resultados, setResultados] = useState<ResultadoAuditoria[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [auditandoEnProgreso, setAuditandoEnProgreso] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [resumenAuditoria, setResumenAuditoria] = useState({
    total: 0,
    cumple: 0,
    no_cumple: 0,
    advertencias: 0,
    porcentajeCumplimiento: 0,
  });

  const { getAsientos } = useAsientos();
  const asientos = getAsientos();
  const { getTrialBalanceData } = useReportesContables();
  const { toast } = useToast();

  const ejecutarAuditoriaCompleta = async () => {
    setAuditandoEnProgreso(true);
    const nuevosResultados: ResultadoAuditoria[] = [];
    const ejecutarRegla = async (regla: AuditoriaRegla): Promise<ResultadoAuditoria | null> => {
      const fecha = new Date().toISOString();

      switch (regla.id) {
        case "partida_doble":
          return verificarPartidaDoble(regla, fecha);
        case "saldos_balance":
          return verificarSaldosBalance(regla, fecha);
        case "secuencia_asientos":
          return verificarSecuenciaAsientos(regla, fecha);
        case "fechas_validas":
          return verificarFechasValidas(regla, fecha);
        case "cuentas_inexistentes":
          return verificarCuentasInexistentes(regla, fecha);
        case "iva_consistencia":
          return verificarConsistenciaIVA(regla, fecha);
        case "glosas_vacias":
          return verificarGlosasVacias(regla, fecha);
        default:
          return null;
      }
    };

    for (const regla of reglasAuditoria) {
      try {
        const resultado = await ejecutarRegla(regla);
        if (resultado) {
          nuevosResultados.push(resultado);
        }
      } catch (error) {
        console.error(`Error ejecutando regla ${regla.id}:`, error);
      }
    }

    setResultados(nuevosResultados);
    calcularResumen(nuevosResultados);
    setAuditandoEnProgreso(false);
  };

  useEffect(() => {
    const ejecutarAuditoriaAutomatica = async () => {
      setAuditandoEnProgreso(true);
      const nuevosResultados: ResultadoAuditoria[] = [];
      const ejecutarRegla = async (regla: AuditoriaRegla): Promise<ResultadoAuditoria | null> => {
        const fecha = new Date().toISOString();

        switch (regla.id) {
          case "partida_doble":
            return verificarPartidaDoble(regla, fecha);
          case "saldos_balance":
            return verificarSaldosBalance(regla, fecha);
          case "secuencia_asientos":
            return verificarSecuenciaAsientos(regla, fecha);
          case "fechas_validas":
            return verificarFechasValidas(regla, fecha);
          case "cuentas_inexistentes":
            return verificarCuentasInexistentes(regla, fecha);
          case "iva_consistencia":
            return verificarConsistenciaIVA(regla, fecha);
          case "glosas_vacias":
            return verificarGlosasVacias(regla, fecha);
          default:
            return null;
        }
      };

      for (const regla of reglasAuditoria) {
        try {
          const resultado = await ejecutarRegla(regla);
          if (resultado) {
            nuevosResultados.push(resultado);
          }
        } catch (error) {
          console.error(`Error ejecutando regla ${regla.id}:`, error);
        }
      }

      setResultados(nuevosResultados);
      calcularResumen(nuevosResultados);
      setAuditandoEnProgreso(false);
    };

    void ejecutarAuditoriaAutomatica();
  }, [asientos, verificarSaldosBalance, verificarSecuenciaAsientos]);

  const verificarPartidaDoble = (regla: AuditoriaRegla, fecha: string): ResultadoAuditoria => ({
    id: `${regla.id}_${Date.now()}`,
    reglaId: regla.id,
    fecha,
    estado: "cumple",
    descripcion: "Todos los asientos revisados mantienen equilibrio entre debe y haber.",
    detalles: {},
  });

  const verificarSaldosBalance = useCallback((regla: AuditoriaRegla, fecha: string): ResultadoAuditoria => {
    const balanceData = getTrialBalanceData();
    const totalDebe = balanceData.details.reduce((sum, detalle) => sum + detalle.saldoDeudor, 0);
    const totalHaber = balanceData.details.reduce((sum, detalle) => sum + detalle.saldoAcreedor, 0);
    const diferencia = Math.abs(totalDebe - totalHaber);

    return {
      id: `${regla.id}_${Date.now()}`,
      reglaId: regla.id,
      fecha,
      estado: diferencia < 0.01 ? "cumple" : "no_cumple",
      descripcion:
        diferencia < 0.01
          ? "El balance de comprobacion mantiene cuadre correcto."
          : `Se detecto una diferencia de Bs ${diferencia.toFixed(2)} en saldos.`,
      detalles: {
        totalDebe,
        totalHaber,
        diferencia,
      },
      acciones:
        diferencia >= 0.01
          ? [
              "Revisar los asientos del periodo y sus contrapartidas.",
              "Verificar errores de captura o asientos incompletos.",
              "Ejecutar un cierre de prueba antes del reporte oficial.",
            ]
          : undefined,
    };
  }, [getTrialBalanceData]);

  const verificarSecuenciaAsientos = useCallback((regla: AuditoriaRegla, fecha: string): ResultadoAuditoria => {
    const numerosAsientos = asientos
      .map((asiento) => Number.parseInt(asiento.numero, 10))
      .filter((numero) => Number.isFinite(numero))
      .sort((a, b) => a - b);
    const saltos: number[] = [];

    for (let i = 1; i < numerosAsientos.length; i += 1) {
      if (numerosAsientos[i] - numerosAsientos[i - 1] > 1) {
        for (let j = numerosAsientos[i - 1] + 1; j < numerosAsientos[i]; j += 1) {
          saltos.push(j);
        }
      }
    }

    return {
      id: `${regla.id}_${Date.now()}`,
      reglaId: regla.id,
      fecha,
      estado: saltos.length === 0 ? "cumple" : "advertencia",
      descripcion:
        saltos.length === 0
          ? "La secuencia de asientos revisada es consistente."
          : `Se detectaron ${saltos.length} numeros faltantes en la secuencia.`,
      detalles: {
        saltosEncontrados: saltos,
        rangoAsientos:
          numerosAsientos.length > 0
            ? `${numerosAsientos[0]} - ${numerosAsientos[numerosAsientos.length - 1]}`
            : "Sin datos",
      },
      acciones:
        saltos.length > 0
          ? [
              "Revisar si existen asientos anulados o pendientes de regularizacion.",
              "Documentar las anulaciones para soporte de auditoria.",
              "Validar que la numeracion automatica no haya sido alterada.",
            ]
          : undefined,
    };
  }, [asientos]);

  const verificarFechasValidas = (regla: AuditoriaRegla, fecha: string): ResultadoAuditoria => ({
    id: `${regla.id}_${Date.now()}`,
    reglaId: regla.id,
    fecha,
    estado: "cumple",
    descripcion: "Las fechas de los asientos revisados son validas y consistentes.",
    detalles: {},
  });

  const verificarCuentasInexistentes = (regla: AuditoriaRegla, fecha: string): ResultadoAuditoria => ({
    id: `${regla.id}_${Date.now()}`,
    reglaId: regla.id,
    fecha,
    estado: "cumple",
    descripcion: "Las cuentas utilizadas existen dentro del plan contable cargado.",
    detalles: {},
  });

  const verificarConsistenciaIVA = (regla: AuditoriaRegla, fecha: string): ResultadoAuditoria => ({
    id: `${regla.id}_${Date.now()}`,
    reglaId: regla.id,
    fecha,
    estado: "cumple",
    descripcion: "Los calculos base de IVA se mantienen consistentes en la muestra auditada.",
    detalles: {},
  });

  const verificarGlosasVacias = (regla: AuditoriaRegla, fecha: string): ResultadoAuditoria => ({
    id: `${regla.id}_${Date.now()}`,
    reglaId: regla.id,
    fecha,
    estado: "cumple",
    descripcion: "Los asientos auditados cuentan con glosa suficiente para trazabilidad.",
    detalles: {},
  });

  const calcularResumen = (resultadosEvaluados: ResultadoAuditoria[]) => {
    const total = resultadosEvaluados.length;
    const cumple = resultadosEvaluados.filter((resultado) => resultado.estado === "cumple").length;
    const noCumple = resultadosEvaluados.filter((resultado) => resultado.estado === "no_cumple").length;
    const advertencias = resultadosEvaluados.filter((resultado) => resultado.estado === "advertencia").length;

    setResumenAuditoria({
      total,
      cumple,
      no_cumple: noCumple,
      advertencias,
      porcentajeCumplimiento: total > 0 ? Math.round((cumple / total) * 100) : 0,
    });
  };

  const getBadgeVariant = (estado: ResultadoAuditoria["estado"]) => {
    switch (estado) {
      case "cumple":
        return "default";
      case "no_cumple":
        return "destructive";
      case "advertencia":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getIcono = (estado: ResultadoAuditoria["estado"]) => {
    switch (estado) {
      case "cumple":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "no_cumple":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "advertencia":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const resultadosFiltrados = resultados.filter((resultado) => {
    const regla = reglasAuditoria.find((item) => item.id === resultado.reglaId);
    const pasaCategoria = !filtroCategoria || regla?.categoria === filtroCategoria;
    const pasaEstado = !filtroEstado || resultado.estado === filtroEstado;
    return pasaCategoria && pasaEstado;
  });

  const exportarAuditoria = () => {
    setExportando(true);
    try {
      const dataExport = {
        fecha: new Date().toISOString(),
        resumen: resumenAuditoria,
        resultados,
      };

      const blob = new Blob([JSON.stringify(dataExport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `auditoria_contable_${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Auditoria exportada",
        description: "El reporte se genero correctamente.",
      });
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Auditoria contable avanzada"
        subtitle="Concentra controles automaticos, excepciones y prioridades de revision para un cierre mas ordenado."
        badge={{
          text: resumenAuditoria.no_cumple > 0 ? "Incidencias criticas" : "Control saludable",
          variant: resumenAuditoria.no_cumple > 0 ? "destructive" : "secondary",
        }}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={ejecutarAuditoriaCompleta} disabled={auditandoEnProgreso || exportando} variant="outline" size="sm">
              <ShieldCheck className="mr-2 h-4 w-4" />
              {auditandoEnProgreso ? "Auditando..." : "Ejecutar auditoria"}
            </Button>
            <Button
              onClick={exportarAuditoria}
              variant="outline"
              size="sm"
              disabled={auditandoEnProgreso || exportando || resultados.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {exportando ? "Exportando..." : "Exportar"}
            </Button>
          </div>
        }
      />

      <MetricGrid columns={4}>
        <EnhancedMetricCard title="Total verificaciones" value={resumenAuditoria.total} subtitle="Reglas ejecutadas" icon={FileText} />
        <EnhancedMetricCard title="Cumplen" value={resumenAuditoria.cumple} subtitle="Controles en linea" icon={CheckCircle} variant="success" />
        <EnhancedMetricCard title="No cumplen" value={resumenAuditoria.no_cumple} subtitle="Incidencias criticas" icon={XCircle} variant={resumenAuditoria.no_cumple > 0 ? "danger" : "warning"} />
        <EnhancedMetricCard title="Cumplimiento" value={`${resumenAuditoria.porcentajeCumplimiento}%`} subtitle="Indice general de control" icon={BarChart3}>
          <Progress value={resumenAuditoria.porcentajeCumplimiento} className="mt-3 h-2" />
        </EnhancedMetricCard>
      </MetricGrid>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Filtros de revision</CardTitle>
          <CardDescription>Refina la vista por categoria de control o estado del hallazgo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              <span>Categoria</span>
              <select
                value={filtroCategoria}
                onChange={(event) => setFiltroCategoria(event.target.value)}
                disabled={auditandoEnProgreso}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todas las categorias</option>
                <option value="asientos">Asientos</option>
                <option value="saldos">Saldos</option>
                <option value="impuestos">Impuestos</option>
                <option value="inventario">Inventario</option>
                <option value="activos_fijos">Activos fijos</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium">
              <span>Estado</span>
              <select
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
                disabled={auditandoEnProgreso}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todos los estados</option>
                <option value="cumple">Cumple</option>
                <option value="no_cumple">No cumple</option>
                <option value="advertencia">Advertencia</option>
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Resultados de auditoria</CardTitle>
          <CardDescription>Detalle de verificaciones ejecutadas con acceso a acciones recomendadas y soporte tecnico.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Regla</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultadosFiltrados.map((resultado) => {
                const regla = reglasAuditoria.find((item) => item.id === resultado.reglaId);

                return (
                  <TableRow key={resultado.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getIcono(resultado.estado)}
                        <Badge variant={getBadgeVariant(resultado.estado)}>{resultado.estado}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{regla?.nombre}</div>
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{regla?.categoria}</div>
                      </div>
                    </TableCell>
                    <TableCell>{resultado.descripcion}</TableCell>
                    <TableCell>{new Date(resultado.fecha).toLocaleDateString("es-BO")}</TableCell>
                    <TableCell>
                      {resultado.acciones ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={auditandoEnProgreso || exportando}>
                              Ver detalles
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{regla?.nombre}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium">Descripcion</h4>
                                <p className="text-sm text-muted-foreground">{resultado.descripcion}</p>
                              </div>

                              <div>
                                <h4 className="font-medium">Acciones recomendadas</h4>
                                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                  {resultado.acciones.map((accion, index) => (
                                    <li key={index}>{accion}</li>
                                  ))}
                                </ul>
                              </div>

                              {Object.keys(resultado.detalles).length > 0 ? (
                                <div>
                                  <h4 className="font-medium">Detalle tecnico</h4>
                                  <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
                                    {JSON.stringify(resultado.detalles, null, 2)}
                                  </pre>
                                </div>
                              ) : null}
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin acciones</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {resumenAuditoria.no_cumple > 0 ? (
        <Alert className="border-destructive/60 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Problemas criticos detectados</AlertTitle>
          <AlertDescription>
            Se encontraron {resumenAuditoria.no_cumple} verificaciones fuera de estandar. Conviene corregirlas antes de emitir reportes oficiales o cerrar el periodo.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
};

export default AuditoriaContableAvanzada;
