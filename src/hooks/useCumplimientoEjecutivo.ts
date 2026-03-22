import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ComplianceAlertType = "vencimiento" | "normativa" | "configuracion" | "critico";
export type ComplianceAlertPriority = "low" | "medium" | "high" | "critical";
export type AutomatedReportStatus = "pending" | "generated" | "submitted" | "overdue";
export type AutomatedReportType = "iva" | "it" | "iue" | "rc-iva" | "rc-it" | "estados-financieros" | "cumplimiento";
export type AutomatedReportFrequency = "monthly" | "quarterly" | "annually";

export interface ComplianceAlertItem {
  id: string;
  type: ComplianceAlertType;
  priority: ComplianceAlertPriority;
  title: string;
  description: string;
  deadline?: string;
  actions: string[];
  source: string;
}

export interface AutomatedReportItem {
  id: string;
  name: string;
  type: AutomatedReportType;
  frequency: AutomatedReportFrequency;
  nextDue: string;
  status: AutomatedReportStatus;
  lastGenerated?: string;
  autoSubmit: boolean;
  recipients: string[];
  payload: Record<string, unknown>;
}

interface DeclaracionRow {
  id: string;
  tipo: string;
  periodo: string;
  fecha_vencimiento: string;
  estado: string | null;
  monto_impuesto: number | null;
}

interface CumplimientoRow {
  id: string;
  norma_rnd: string;
  descripcion: string;
  fecha_vigencia: string;
  estado: string | null;
}

interface RetencionRow {
  id: string;
  fecha_retencion: string;
  tipo_retencion: string;
  estado: string;
  monto_retencion: number;
}

interface ConciliacionRow {
  id: string;
  fecha_corte: string;
  estado: string;
  diferencia: number;
}

interface NominaRow {
  id: string;
  periodo: string;
  estado: string;
  total_neto: number;
  total_rciva: number;
  fecha_generacion: string;
}

interface ConfigRow {
  nit: string | null;
  razon_social: string | null;
  actividad_economica: string | null;
  sistema_contable: string | null;
}

const DECLARACIONES_TABLE = "declaraciones_tributarias" as const;
const CUMPLIMIENTO_TABLE = "cumplimiento_normativo_2025" as const;
const RETENCIONES_TABLE = "retenciones_fiscales" as never;
const CONCILIACIONES_TABLE = "conciliaciones_bancarias" as const;
const NOMINA_TABLE = "nomina_planillas" as never;
const CONFIG_TABLE = "configuracion_tributaria" as const;

const daysBetween = (targetDate: string) => {
  const today = new Date();
  const target = new Date(targetDate);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const startOfCurrentMonth = () => {
  const current = new Date();
  return new Date(current.getFullYear(), current.getMonth(), 1).toISOString().slice(0, 10);
};

const endOfQuarter = () => {
  const current = new Date();
  const quarterEndMonth = Math.floor(current.getMonth() / 3) * 3 + 3;
  return new Date(current.getFullYear(), quarterEndMonth, 0).toISOString().slice(0, 10);
};

const nextMarch31 = () => {
  const current = new Date();
  const year = current.getMonth() > 2 ? current.getFullYear() + 1 : current.getFullYear();
  return new Date(year, 2, 31).toISOString().slice(0, 10);
};

export const useCumplimientoEjecutivo = () => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfigRow | null>(null);
  const [declaraciones, setDeclaraciones] = useState<DeclaracionRow[]>([]);
  const [cumplimiento, setCumplimiento] = useState<CumplimientoRow[]>([]);
  const [retenciones, setRetenciones] = useState<RetencionRow[]>([]);
  const [conciliaciones, setConciliaciones] = useState<ConciliacionRow[]>([]);
  const [planillas, setPlanillas] = useState<NominaRow[]>([]);
  const [reportSnapshots, setReportSnapshots] = useState<Record<string, { generatedAt: string; status: AutomatedReportStatus }>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) {
        setConfig(null);
        setDeclaraciones([]);
        setCumplimiento([]);
        setRetenciones([]);
        setConciliaciones([]);
        setPlanillas([]);
        return;
      }

      const [configResult, declaracionesResult, cumplimientoResult, retencionesResult, conciliacionesResult, planillasResult] = await Promise.all([
        supabase.from(CONFIG_TABLE).select("nit, razon_social, actividad_economica, sistema_contable").eq("user_id", userId).maybeSingle(),
        supabase.from(DECLARACIONES_TABLE).select("id, tipo, periodo, fecha_vencimiento, estado, monto_impuesto").eq("user_id", userId).order("fecha_vencimiento", { ascending: true }),
        supabase.from(CUMPLIMIENTO_TABLE).select("id, norma_rnd, descripcion, fecha_vigencia, estado").eq("user_id", userId).order("fecha_vigencia", { ascending: true }),
        supabase.from(RETENCIONES_TABLE).select("id, fecha_retencion, tipo_retencion, estado, monto_retencion").eq("user_id", userId).order("fecha_retencion", { ascending: false }),
        supabase.from(CONCILIACIONES_TABLE).select("id, fecha_corte, estado, diferencia").eq("user_id", userId).order("fecha_corte", { ascending: false }),
        supabase.from(NOMINA_TABLE).select("id, periodo, estado, total_neto, total_rciva, fecha_generacion").eq("user_id", userId).order("periodo", { ascending: false }),
      ]);

      if (configResult.error) throw configResult.error;
      if (declaracionesResult.error) throw declaracionesResult.error;
      if (cumplimientoResult.error) throw cumplimientoResult.error;
      if (retencionesResult.error) throw retencionesResult.error;
      if (conciliacionesResult.error) throw conciliacionesResult.error;
      if (planillasResult.error) throw planillasResult.error;

      setConfig((configResult.data as ConfigRow | null) || null);
      setDeclaraciones((declaracionesResult.data as DeclaracionRow[]) || []);
      setCumplimiento((cumplimientoResult.data as CumplimientoRow[]) || []);
      setRetenciones((retencionesResult.data as unknown as RetencionRow[]) || []);
      setConciliaciones((conciliacionesResult.data as ConciliacionRow[]) || []);
      setPlanillas((planillasResult.data as unknown as NominaRow[]) || []);
    } catch (error) {
      console.error("Error cargando cumplimiento ejecutivo:", error);
      setConfig(null);
      setDeclaraciones([]);
      setCumplimiento([]);
      setRetenciones([]);
      setConciliaciones([]);
      setPlanillas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const alerts = useMemo<ComplianceAlertItem[]>(() => {
    const items: ComplianceAlertItem[] = [];
    const todayIso = new Date().toISOString();

    if (!config?.nit || !config?.razon_social) {
      items.push({
        id: "config-tributaria",
        type: "configuracion",
        priority: "critical",
        title: "Configuracion tributaria incompleta",
        description: "Faltan datos base de la empresa para sostener declaraciones, libros y trazabilidad de cumplimiento.",
        actions: ["Completar NIT", "Registrar razon social", "Validar actividad economica y regimen"],
        source: "Configuracion tributaria",
      });
    }

    const overdueDeclaraciones = declaraciones.filter((item) => item.estado !== "presentada" && daysBetween(item.fecha_vencimiento) < 0);
    if (overdueDeclaraciones.length > 0) {
      items.push({
        id: "declaraciones-vencidas",
        type: "critico",
        priority: "critical",
        title: `${overdueDeclaraciones.length} declaracion(es) vencida(s)`,
        description: "Existen obligaciones tributarias con fecha vencida que no figuran como presentadas.",
        deadline: overdueDeclaraciones[0].fecha_vencimiento,
        actions: ["Revisar modulo de declaraciones", "Regularizar presentacion y pago", "Documentar contingencia tributaria"],
        source: "Declaraciones tributarias",
      });
    }

    const upcomingDeclaraciones = declaraciones.filter((item) => item.estado !== "presentada" && daysBetween(item.fecha_vencimiento) >= 0 && daysBetween(item.fecha_vencimiento) <= 7);
    if (upcomingDeclaraciones.length > 0) {
      items.push({
        id: "declaraciones-proximas",
        type: "vencimiento",
        priority: "high",
        title: `${upcomingDeclaraciones.length} declaracion(es) por vencer en 7 dias`,
        description: "El sistema detecto obligaciones proximas a vencimiento que deberian entrar en la mesa de cierre.",
        deadline: upcomingDeclaraciones[0].fecha_vencimiento,
        actions: ["Preparar formularios", "Conciliar impuestos del periodo", "Aprobar pagos y soportes"],
        source: "Calendario tributario",
      });
    }

    const overdueCompliance = cumplimiento.filter((item) => item.estado !== "cumplido" && item.estado !== "implementado" && daysBetween(item.fecha_vigencia) < 0);
    if (overdueCompliance.length > 0) {
      items.push({
        id: "normativa-vencida",
        type: "normativa",
        priority: "high",
        title: `${overdueCompliance.length} requisito(s) normativo(s) pendientes`,
        description: "Hay registros de cumplimiento cuyo plazo de vigencia ya vencio y siguen pendientes.",
        deadline: overdueCompliance[0].fecha_vigencia,
        actions: ["Actualizar seguimiento normativo", "Registrar evidencias de implementacion", "Escalar riesgos al responsable contable"],
        source: "Cumplimiento normativo",
      });
    }

    const conciliacionesConDiferencia = conciliaciones.filter((item) => item.estado !== "conciliado" || Math.abs(Number(item.diferencia || 0)) > 0.01);
    if (conciliacionesConDiferencia.length > 0) {
      items.push({
        id: "conciliacion-pendiente",
        type: "critico",
        priority: "high",
        title: `${conciliacionesConDiferencia.length} conciliacion(es) bancaria(s) abierta(s)`,
        description: "Todavia existen cortes bancarios con diferencias o sin cierre conciliado.",
        deadline: conciliacionesConDiferencia[0].fecha_corte,
        actions: ["Revisar excepciones de banco", "Confirmar ajustes pendientes", "Cerrar la conciliacion antes del cierre mensual"],
        source: "Tesoreria",
      });
    }

    const planillasSinPago = planillas.filter((item) => item.estado !== "pagada");
    if (planillasSinPago.length > 0) {
      items.push({
        id: "nomina-pendiente",
        type: "vencimiento",
        priority: "medium",
        title: `${planillasSinPago.length} planilla(s) sin pago registrado`,
        description: "La nomina muestra periodos aun no pagados o no cerrados contablemente.",
        actions: ["Revisar aprobacion de planillas", "Registrar pago contable", "Verificar RC-IVA retenido del periodo"],
        source: "Nomina",
      });
    }

    const retencionesPendientes = retenciones.filter((item) => item.estado !== "presentada" && daysBetween(item.fecha_retencion) >= 0 ? false : item.estado !== "presentada");
    if (retencionesPendientes.length > 0) {
      items.push({
        id: "retenciones-pendientes",
        type: "vencimiento",
        priority: "medium",
        title: `${retencionesPendientes.length} retencion(es) fiscales pendientes`,
        description: "Hay retenciones emitidas que todavia no figuran como presentadas o regularizadas.",
        actions: ["Revisar RC-IVA y otras retenciones", "Preparar reporte mensual", "Confirmar asiento y declaracion relacionada"],
        source: "Retenciones fiscales",
      });
    }

    if (items.length === 0) {
      items.push({
        id: "sin-alertas",
        type: "configuracion",
        priority: "low",
        title: "Panel de cumplimiento sin hallazgos mayores",
        description: "La lectura actual no detecta contingencias criticas en configuracion, declaraciones, nomina o conciliacion.",
        actions: ["Mantener monitoreo de cierre", "Actualizar reportes antes de vencimientos"],
        source: "Motor de control",
      });
    }

    return items.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [config, conciliaciones, cumplimiento, declaraciones, planillas, retenciones]);

  const reports = useMemo<AutomatedReportItem[]>(() => {
    const declaracionesPendientes = declaraciones.filter((item) => item.estado !== "presentada");
    const ivaPendiente = declaracionesPendientes.filter((item) => item.tipo === "IVA");
    const itPendiente = declaracionesPendientes.filter((item) => item.tipo === "IT");
    const rcIvaPendiente = declaracionesPendientes.filter((item) => item.tipo.toLowerCase().includes("rc-iva"));
    const iuePendiente = declaracionesPendientes.filter((item) => item.tipo === "IUE");
    const currentMonthStart = startOfCurrentMonth();

    const definitions: Omit<AutomatedReportItem, "status" | "lastGenerated">[] = [
      {
        id: "iva-monthly",
        name: "Declaracion IVA mensual",
        type: "iva",
        frequency: "monthly",
        nextDue: ivaPendiente[0]?.fecha_vencimiento || currentMonthStart,
        autoSubmit: false,
        recipients: [],
        payload: {
          pendientes: ivaPendiente.length,
          montoImpuesto: ivaPendiente.reduce((sum, item) => sum + Number(item.monto_impuesto || 0), 0),
        },
      },
      {
        id: "it-monthly",
        name: "Declaracion IT mensual",
        type: "it",
        frequency: "monthly",
        nextDue: itPendiente[0]?.fecha_vencimiento || currentMonthStart,
        autoSubmit: false,
        recipients: [],
        payload: {
          pendientes: itPendiente.length,
          montoImpuesto: itPendiente.reduce((sum, item) => sum + Number(item.monto_impuesto || 0), 0),
        },
      },
      {
        id: "rc-iva-monthly",
        name: "Retenciones RC-IVA",
        type: "rc-iva",
        frequency: "monthly",
        nextDue: rcIvaPendiente[0]?.fecha_vencimiento || currentMonthStart,
        autoSubmit: false,
        recipients: [],
        payload: {
          retencionesEmitidas: retenciones.filter((item) => item.tipo_retencion === "rc_iva").length,
          montoRetenido: retenciones
            .filter((item) => item.tipo_retencion === "rc_iva")
            .reduce((sum, item) => sum + Number(item.monto_retencion || 0), 0),
          planillasConRCIVA: planillas.filter((item) => Number(item.total_rciva || 0) > 0).length,
        },
      },
      {
        id: "rc-it-monthly",
        name: "Retenciones RC-IT",
        type: "rc-it",
        frequency: "monthly",
        nextDue: currentMonthStart,
        autoSubmit: false,
        recipients: [],
        payload: {
          retencionesEmitidas: retenciones.filter((item) => item.tipo_retencion.includes("it")).length,
        },
      },
      {
        id: "iue-quarterly",
        name: "Control IUE y cierre fiscal",
        type: "iue",
        frequency: "quarterly",
        nextDue: iuePendiente[0]?.fecha_vencimiento || endOfQuarter(),
        autoSubmit: false,
        recipients: [],
        payload: {
          pendientes: iuePendiente.length,
          conciliacionesAbiertas: conciliaciones.filter((item) => item.estado !== "conciliado").length,
        },
      },
      {
        id: "estados-financieros",
        name: "Estados financieros ejecutivos",
        type: "estados-financieros",
        frequency: "annually",
        nextDue: nextMarch31(),
        autoSubmit: false,
        recipients: [],
        payload: {
          planillasPagadas: planillas.filter((item) => item.estado === "pagada").length,
          conciliacionesCerradas: conciliaciones.filter((item) => item.estado === "conciliado").length,
        },
      },
      {
        id: "cumplimiento-report",
        name: "Reporte de cumplimiento normativo",
        type: "cumplimiento",
        frequency: "monthly",
        nextDue: declaracionesPendientes[0]?.fecha_vencimiento || currentMonthStart,
        autoSubmit: true,
        recipients: config?.razon_social ? [`cumplimiento@${config.razon_social.toLowerCase().replace(/\s+/g, "")}.bo`] : ["admin@empresa.com"],
        payload: {
          totalAlertas: alerts.filter((item) => item.id !== "sin-alertas").length,
          pendientesNormativos: cumplimiento.filter((item) => item.estado !== "cumplido").length,
          declaracionesPendientes: declaracionesPendientes.length,
        },
      },
    ];

    return definitions.map((definition) => {
      const snapshot = reportSnapshots[definition.id];
      const overdue = daysBetween(definition.nextDue) < 0;
      const status = snapshot?.status || (overdue ? "overdue" : "pending");
      return {
        ...definition,
        status,
        lastGenerated: snapshot?.generatedAt,
      };
    });
  }, [alerts, conciliaciones, config?.razon_social, cumplimiento, declaraciones, planillas, reportSnapshots, retenciones]);

  const metrics = useMemo(() => {
    const activeAlerts = alerts.filter((item) => item.id !== "sin-alertas");
    return {
      totalAlerts: activeAlerts.length,
      criticalAlerts: activeAlerts.filter((item) => item.priority === "critical").length,
      declaracionesPendientes: declaraciones.filter((item) => item.estado !== "presentada").length,
      cumplimientoPendiente: cumplimiento.filter((item) => item.estado !== "cumplido").length,
      conciliacionesAbiertas: conciliaciones.filter((item) => item.estado !== "conciliado").length,
      planillasPendientes: planillas.filter((item) => item.estado !== "pagada").length,
      retencionesPendientes: retenciones.filter((item) => item.estado !== "presentada").length,
    };
  }, [alerts, conciliaciones, cumplimiento, declaraciones, planillas, retenciones]);

  const markReportGenerated = useCallback((reportId: string, submitted = false) => {
    setReportSnapshots((prev) => ({
      ...prev,
      [reportId]: {
        generatedAt: new Date().toISOString(),
        status: submitted ? "submitted" : "generated",
      },
    }));
  }, []);

  return {
    loading,
    config,
    alerts,
    reports,
    metrics,
    markReportGenerated,
    refetch: fetchData,
  };
};
