import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "./use-toast";

type DeclaracionRow = Database["public"]["Tables"]["declaraciones_tributarias"]["Row"];
type DeclaracionInsert = Database["public"]["Tables"]["declaraciones_tributarias"]["Insert"];

export type DeclaracionTipo =
  | "iva"
  | "it"
  | "iue"
  | "rc_iva_agente"
  | "rc_iva_directo";

export type DeclaracionEstado =
  | "pendiente"
  | "presentada"
  | "vencida"
  | "observada"
  | "aceptada";

export interface DeclaracionDefinicion {
  tipo: DeclaracionTipo;
  label: string;
  formulario: string;
  frecuencia: "mensual" | "trimestral" | "anual";
  normativa: string;
  aplicaSegunRegimen?: "general" | "cuando_corresponda";
}

export interface DeclaracionTributaria {
  id: string;
  tipo: DeclaracionTipo;
  tipoLabel: string;
  formulario: string;
  frecuencia: DeclaracionDefinicion["frecuencia"];
  periodo: string;
  fechaVencimiento: string;
  fechaPresentacion: string | null;
  estado: DeclaracionEstado;
  montoBase: number;
  montoImpuesto: number;
  montoPagado: number;
  observaciones: string;
  normativaAplicable: string;
  modalidadFacturacion: string | null;
  codigoActividadCaeb: string | null;
  beneficioIvaCero: boolean;
}

export interface DeclaracionDraft {
  tipo: DeclaracionTipo;
  periodo: string;
  montoBase: number;
  montoImpuesto: number;
  montoPagado?: number;
  observaciones?: string;
}

interface DeclaracionesContexto {
  nit?: string;
  actividadEconomica?: string;
  codigoActividadCaeb?: string;
  modalidadFacturacion?: string;
}

interface LegacyDeclaracion {
  id?: string;
  tipoDeclaracion?: string;
  periodo?: string;
  fechaVencimiento?: string;
  fechaPresentacion?: string;
  estado?: string;
  montoBase?: number;
  montoImpuesto?: number;
  totalPagar?: number;
  observaciones?: string;
}

export const DECLARACION_DEFINITIONS: Record<DeclaracionTipo, DeclaracionDefinicion> = {
  iva: {
    tipo: "iva",
    label: "IVA mensual",
    formulario: "Formulario 200",
    frecuencia: "mensual",
    normativa: "Obligacion recurrente SIAT - IVA",
    aplicaSegunRegimen: "general",
  },
  it: {
    tipo: "it",
    label: "IT mensual",
    formulario: "Formulario 400",
    frecuencia: "mensual",
    normativa: "Obligacion recurrente SIAT - IT",
    aplicaSegunRegimen: "general",
  },
  iue: {
    tipo: "iue",
    label: "IUE anual",
    formulario: "Formulario 500",
    frecuencia: "anual",
    normativa: "Obligacion recurrente SIAT - IUE contribuyentes con registros contables",
    aplicaSegunRegimen: "general",
  },
  rc_iva_agente: {
    tipo: "rc_iva_agente",
    label: "RC-IVA agente de retencion",
    formulario: "Formulario 608",
    frecuencia: "mensual",
    normativa: "Obligacion recurrente SIAT - RC IVA agente de retencion",
    aplicaSegunRegimen: "cuando_corresponda",
  },
  rc_iva_directo: {
    tipo: "rc_iva_directo",
    label: "RC-IVA contribuyente directo",
    formulario: "Formulario 610",
    frecuencia: "trimestral",
    normativa: "Obligacion SIAT - RC IVA contribuyente directo",
    aplicaSegunRegimen: "cuando_corresponda",
  },
};

export const NIT_VENCIMIENTO_ROWS = Array.from({ length: 10 }, (_, index) => ({
  digito: index,
  dia: 13 + index,
}));

const LEGACY_STORAGE_KEY = "declaracionesTributarias";

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getLastNitDigit = (nit?: string) => {
  if (!nit) return null;
  const digits = nit.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits[digits.length - 1]);
};

const getMonthlyDueDay = (nit?: string) => {
  const lastDigit = getLastNitDigit(nit);
  if (lastDigit === null) return 20;
  return 13 + lastDigit;
};

const getQuarterEndMonth = (month: number) => {
  if (month <= 3) return 3;
  if (month <= 6) return 6;
  if (month <= 9) return 9;
  return 12;
};

const normalizeTipo = (value?: string | null): DeclaracionTipo => {
  switch (value) {
    case "iva":
      return "iva";
    case "it":
      return "it";
    case "iue":
    case "formulario_500":
      return "iue";
    case "rc_iva":
    case "formulario_110":
      return "rc_iva_agente";
    case "rc_iva_directo":
    case "rc_iva_profesionales":
      return "rc_iva_directo";
    default:
      return "iva";
  }
};

export const inferirCierreFiscal = (actividadEconomica?: string) => {
  const actividad = (actividadEconomica || "").toLowerCase();

  if (actividad.includes("industrial") || actividad.includes("petrol")) {
    return {
      cierreMes: 3,
      cierreLabel: "31 de marzo",
      descripcion: "Industrial y petrolera",
    };
  }

  if (
    actividad.includes("agro") ||
    actividad.includes("ganad") ||
    actividad.includes("gom") ||
    actividad.includes("cast")
  ) {
    return {
      cierreMes: 6,
      cierreLabel: "30 de junio",
      descripcion: "Agropecuaria, gomera, castanera o agroindustrial",
    };
  }

  if (actividad.includes("miner")) {
    return {
      cierreMes: 9,
      cierreLabel: "30 de septiembre",
      descripcion: "Mineria",
    };
  }

  return {
    cierreMes: 12,
    cierreLabel: "31 de diciembre",
    descripcion: "Comercial, servicios, bancaria, seguros u otra actividad general",
  };
};

export const calcularFechaVencimiento = (
  tipo: DeclaracionTipo,
  periodo: string,
  nit?: string,
) => {
  const [yearPart, monthPart] = periodo.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!year || !month) {
    return toIsoDate(new Date());
  }

  if (tipo === "iue") {
    const cierre = new Date(year, month, 0);
    const vencimiento = new Date(cierre);
    vencimiento.setDate(vencimiento.getDate() + 120);
    return toIsoDate(vencimiento);
  }

  if (tipo === "rc_iva_directo") {
    const quarterEndMonth = getQuarterEndMonth(month);
    const vencimiento = new Date(year, quarterEndMonth, 20);
    return toIsoDate(vencimiento);
  }

  const dueDay = getMonthlyDueDay(nit);
  const vencimiento = new Date(year, month, dueDay);
  return toIsoDate(vencimiento);
};

const normalizarEstado = (
  estado: string | null,
  fechaVencimiento: string,
): DeclaracionEstado => {
  if (estado === "presentada" || estado === "aceptada" || estado === "observada") {
    return estado;
  }

  const dueDate = new Date(fechaVencimiento);
  const today = startOfToday();
  if (dueDate < today) {
    return "vencida";
  }

  return "pendiente";
};

const mapRow = (row: DeclaracionRow): DeclaracionTributaria => {
  const tipo = normalizeTipo(row.tipo);
  const definition = DECLARACION_DEFINITIONS[tipo];

  return {
    id: row.id,
    tipo,
    tipoLabel: definition.label,
    formulario: row.formulario_tipo || definition.formulario,
    frecuencia: definition.frecuencia,
    periodo: row.periodo,
    fechaVencimiento: row.fecha_vencimiento,
    fechaPresentacion: row.fecha_presentacion,
    estado: normalizarEstado(row.estado, row.fecha_vencimiento),
    montoBase: Number(row.monto_base || 0),
    montoImpuesto: Number(row.monto_impuesto || 0),
    montoPagado: Number(row.monto_pagado || 0),
    observaciones: row.observaciones || "",
    normativaAplicable: row.normativa_aplicable || definition.normativa,
    modalidadFacturacion: row.modalidad_facturacion,
    codigoActividadCaeb: row.codigo_actividad_caeb,
    beneficioIvaCero: Boolean(row.beneficio_iva_cero),
  };
};

const mapLegacyToInsert = (
  value: LegacyDeclaracion,
  userId: string,
  contexto: DeclaracionesContexto,
): DeclaracionInsert => {
  const tipo = normalizeTipo(value.tipoDeclaracion);
  const periodo = value.periodo || toIsoDate(new Date()).slice(0, 7);

  return {
    user_id: userId,
    tipo,
    periodo,
    gestion: Number(periodo.slice(0, 4)),
    mes: Number(periodo.slice(5, 7)),
    fecha_vencimiento:
      value.fechaVencimiento || calcularFechaVencimiento(tipo, periodo, contexto.nit),
    fecha_presentacion: value.fechaPresentacion || null,
    estado: value.estado || "pendiente",
    monto_base: Number(value.montoBase || 0),
    monto_impuesto: Number(value.montoImpuesto || 0),
    monto_pagado: Number(value.totalPagar || 0),
    formulario_tipo: DECLARACION_DEFINITIONS[tipo].formulario,
    modalidad_facturacion: contexto.modalidadFacturacion || null,
    codigo_actividad_caeb: contexto.codigoActividadCaeb || null,
    normativa_aplicable: DECLARACION_DEFINITIONS[tipo].normativa,
    observaciones: value.observaciones || "Migrado desde almacenamiento local",
    beneficio_iva_cero: false,
  };
};

export const useDeclaracionesTributarias = (contexto: DeclaracionesContexto) => {
  const { toast } = useToast();
  const [declaraciones, setDeclaraciones] = useState<DeclaracionTributaria[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeclaraciones = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) {
      setDeclaraciones([]);
      return;
    }

    const { data, error } = await supabase
      .from("declaraciones_tributarias")
      .select("*")
      .eq("user_id", user.id)
      .order("fecha_vencimiento", { ascending: true });

    if (error) throw error;

    if (!data?.length) {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyData = JSON.parse(legacyRaw) as LegacyDeclaracion[];
        if (legacyData.length) {
          const migradas = legacyData.map((item) => mapLegacyToInsert(item, user.id, contexto));
          const { data: migratedRows, error: migrationError } = await supabase
            .from("declaraciones_tributarias")
            .insert(migradas)
            .select("*");

          if (migrationError) throw migrationError;

          setDeclaraciones((migratedRows || []).map(mapRow));
          toast({
            title: "Declaraciones tributarias migradas",
            description:
              "Se movio el historial tributario heredado a Supabase para mantener trazabilidad.",
          });
          return;
        }
      }
    }

    setDeclaraciones((data || []).map(mapRow));
  }, [contexto, toast]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchDeclaraciones();
      } catch (error) {
        console.error("Error cargando declaraciones tributarias:", error);
        toast({
          title: "Error al cargar declaraciones",
          description: "No se pudo leer el historial tributario desde Supabase.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fetchDeclaraciones, toast]);

  const crearDeclaracion = useCallback(
    async (draft: DeclaracionDraft) => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error("Usuario no autenticado");

        const tipo = normalizeTipo(draft.tipo);
        const definition = DECLARACION_DEFINITIONS[tipo];
        const fechaVencimiento = calcularFechaVencimiento(tipo, draft.periodo, contexto.nit);
        const payload: DeclaracionInsert = {
          user_id: user.id,
          tipo,
          periodo: draft.periodo,
          gestion: Number(draft.periodo.slice(0, 4)),
          mes: Number(draft.periodo.slice(5, 7)),
          fecha_vencimiento: fechaVencimiento,
          estado: "pendiente",
          monto_base: Number(draft.montoBase || 0),
          monto_impuesto: Number(draft.montoImpuesto || 0),
          monto_pagado: Number(draft.montoPagado || 0),
          formulario_tipo: definition.formulario,
          modalidad_facturacion: contexto.modalidadFacturacion || null,
          codigo_actividad_caeb: contexto.codigoActividadCaeb || null,
          normativa_aplicable: definition.normativa,
          observaciones: draft.observaciones || null,
          beneficio_iva_cero: false,
        };

        const { data, error } = await supabase
          .from("declaraciones_tributarias")
          .insert(payload)
          .select("*")
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setDeclaraciones((prev) =>
            [...prev, mapRow(data)].sort((a, b) =>
              a.fechaVencimiento.localeCompare(b.fechaVencimiento),
            ),
          );
        }

        toast({
          title: "Declaracion registrada",
          description: `${definition.formulario} - ${definition.label} para el periodo ${draft.periodo}.`,
        });

        return true;
      } catch (error) {
        console.error("Error creando declaracion:", error);
        toast({
          title: "Error al registrar declaracion",
          description: "No se pudo guardar la declaracion tributaria.",
          variant: "destructive",
        });
        return false;
      }
    },
    [contexto.codigoActividadCaeb, contexto.modalidadFacturacion, contexto.nit, toast],
  );

  const marcarComoPresentada = useCallback(
    async (id: string) => {
      try {
        const fechaPresentacion = toIsoDate(new Date());
        const { data, error } = await supabase
          .from("declaraciones_tributarias")
          .update({
            estado: "presentada",
            fecha_presentacion: fechaPresentacion,
          })
          .eq("id", id)
          .select("*")
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setDeclaraciones((prev) => prev.map((item) => (item.id === id ? mapRow(data) : item)));
        }

        toast({
          title: "Declaracion presentada",
          description: "La declaracion fue marcada como presentada y queda trazable en Supabase.",
        });

        return true;
      } catch (error) {
        console.error("Error marcando declaracion como presentada:", error);
        toast({
          title: "Error al actualizar declaracion",
          description: "No se pudo actualizar el estado de la declaracion.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast],
  );

  const resumen = useMemo(() => {
    return declaraciones.reduce(
      (accumulator, item) => {
        if (item.estado === "presentada" || item.estado === "aceptada") {
          accumulator.presentadas += 1;
        }
        if (item.estado === "vencida") {
          accumulator.vencidas += 1;
        }
        if (item.estado === "pendiente") {
          accumulator.pendientes += 1;
        }
        accumulator.totalDeterminado += item.montoImpuesto;
        accumulator.totalPagado += item.montoPagado;
        return accumulator;
      },
      {
        presentadas: 0,
        vencidas: 0,
        pendientes: 0,
        totalDeterminado: 0,
        totalPagado: 0,
      },
    );
  }, [declaraciones]);

  return {
    declaraciones,
    loading,
    resumen,
    refetch: fetchDeclaraciones,
    crearDeclaracion,
    marcarComoPresentada,
  };
};
