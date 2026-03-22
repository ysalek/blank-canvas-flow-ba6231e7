import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { AsientoContable, CuentaAsiento } from "@/components/contable/diary/DiaryData";
import { useAsientos } from "./useAsientos";
import {
  CuentaBancaria,
  MovimientoBancario,
  NaturalezaMovimientoBancario,
  TipoMovimientoBancario,
} from "./useSupabaseBancos";

type ConciliacionInsert = Database["public"]["Tables"]["conciliaciones_bancarias"]["Insert"];
type ConciliacionItemInsert =
  Database["public"]["Tables"]["conciliacion_bancaria_items"]["Insert"];

export type EstadoConciliacionBancaria =
  | "borrador"
  | "conciliado"
  | "con_diferencias";

export type TipoPartidaConciliacion =
  | "coincidencia"
  | "cheque_transito"
  | "deposito_transito"
  | "cargo_bancario"
  | "abono_bancario"
  | "diferencia_manual";

export interface PartidaConciliacion {
  id: string;
  movimientoBancarioId: string | null;
  asientoId: string | null;
  origen: "movimiento_bancario" | "asiento_contable" | "ajuste_propuesto";
  tipoPartida: TipoPartidaConciliacion;
  fecha: string;
  referencia: string;
  descripcion: string;
  monto: number;
  conciliado: boolean;
  requiereAjuste: boolean;
  estado: "pendiente" | "aplicado" | "omitido";
  categoria: "coincidencia" | "excepcion_banco" | "excepcion_libros" | "ajuste";
  sugerida: boolean;
  naturalezaMovimiento: NaturalezaMovimientoBancario;
  tipoMovimiento: TipoMovimientoBancario | null;
  contracuentaSugeridaCodigo: string;
  contracuentaSugeridaNombre: string;
}

export interface ResumenConciliacion {
  saldoBanco: number;
  saldoLibros: number;
  diferencia: number;
  coincidencias: number;
  sugerenciasPendientes: number;
  excepcionesBanco: number;
  excepcionesLibros: number;
  ajustesPendientes: number;
}

export interface ConciliacionPersistida {
  id: string;
  fechaCorte: string;
  estado: EstadoConciliacionBancaria;
  observaciones: string;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const normalizeText = (value: string | null | undefined) =>
  (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const normalizeReference = (value: string | null | undefined) =>
  normalizeText(value).replace(/\s+/g, "");

const numbersEqual = (left: number, right: number) => Math.abs(left - right) <= 0.01;

const diffInDays = (left: string, right: string) => {
  const leftDate = new Date(`${left}T00:00:00`);
  const rightDate = new Date(`${right}T00:00:00`);
  return Math.abs(Math.round((leftDate.getTime() - rightDate.getTime()) / DAY_IN_MS));
};

const movementAmount = (line: CuentaAsiento) => (line.debe > 0 ? line.debe : line.haber);

const lineNaturaleza = (line: CuentaAsiento): NaturalezaMovimientoBancario =>
  line.debe > 0 ? "credito" : "debito";

const buildPairKey = (movimientoId: string | null, asientoId: string | null) =>
  `${movimientoId || "none"}::${asientoId || "none"}`;

const getSuggestedCounterAccount = (
  tipoPartida: TipoPartidaConciliacion,
  tipoMovimiento: TipoMovimientoBancario | null,
  naturaleza: NaturalezaMovimientoBancario,
) => {
  if (tipoPartida === "cargo_bancario" || tipoMovimiento === "comision") {
    return { codigo: "5241", nombre: "Gastos Bancarios" };
  }

  if (tipoMovimiento === "interes" || tipoPartida === "abono_bancario") {
    return { codigo: "4211", nombre: "Otros Ingresos" };
  }

  if (tipoMovimiento === "deposito") {
    return { codigo: "1121", nombre: "Cuentas por Cobrar Comerciales" };
  }

  if (tipoMovimiento === "cheque") {
    return { codigo: "2111", nombre: "Cuentas por Pagar Comerciales" };
  }

  return naturaleza === "credito"
    ? { codigo: "4211", nombre: "Otros Ingresos" }
    : { codigo: "5191", nombre: "Gastos Varios" };
};

const isAdjustmentCandidate = (tipoMovimiento: TipoMovimientoBancario | null) =>
  tipoMovimiento === "comision" ||
  tipoMovimiento === "interes" ||
  tipoMovimiento === "nota_credito" ||
  tipoMovimiento === "nota_debito";

const referencesMatch = ({
  movimiento,
  asiento,
  cuentaId,
}: {
  movimiento: MovimientoBancario;
  asiento: AsientoContable;
  cuentaId: string;
}) => {
  const movimientoRef = normalizeReference(movimiento.numero_comprobante || "");
  const asientoRef = normalizeReference(asiento.referencia || "");
  const bankMovementToken = normalizeReference(`BANK:${cuentaId}:${movimiento.id}`);

  if (
    movimientoRef &&
    asientoRef &&
    (asientoRef.includes(movimientoRef) || movimientoRef.includes(asientoRef))
  ) {
    return true;
  }

  if (bankMovementToken && asientoRef.includes(bankMovementToken)) {
    return true;
  }

  if (movimiento.id && asientoRef.includes(normalizeReference(movimiento.id))) {
    return true;
  }

  return false;
};

const findBankLine = (asiento: AsientoContable, cuenta: CuentaBancaria) => {
  const exact = cuenta.codigo_cuenta_contable
    ? asiento.cuentas.find((line) => line.codigo === cuenta.codigo_cuenta_contable)
    : undefined;

  if (exact) return exact;

  return asiento.cuentas.find((line) => line.codigo.startsWith("111"));
};

export const useConciliacionBancaria = ({
  cuenta,
  fechaCorte,
}: {
  cuenta: CuentaBancaria | null;
  fechaCorte: string;
}) => {
  const { toast } = useToast();
  const { asientos, guardarAsiento, loading: loadingAsientos, refetch: refetchAsientos } = useAsientos();

  const [movimientosBanco, setMovimientosBanco] = useState<MovimientoBancario[]>([]);
  const [conciliacionActual, setConciliacionActual] = useState<ConciliacionPersistida | null>(null);
  const [confirmedMatchKeys, setConfirmedMatchKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchContext = useCallback(async () => {
    if (!cuenta || !fechaCorte) {
      setMovimientosBanco([]);
      setConciliacionActual(null);
      setConfirmedMatchKeys(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMovimientosBanco([]);
        setConciliacionActual(null);
        setConfirmedMatchKeys(new Set());
        return;
      }

      const [movimientosResult, conciliacionResult] = await Promise.all([
        supabase
          .from("movimientos_bancarios")
          .select(
            "id, cuenta_bancaria_id, fecha, tipo, naturaleza_movimiento, monto, descripcion, numero_comprobante, beneficiario, saldo_anterior, saldo_actual, origen_registro, detalle_importacion, user_id, created_at",
          )
          .eq("user_id", user.id)
          .eq("cuenta_bancaria_id", cuenta.id)
          .lte("fecha", fechaCorte)
          .order("fecha", { ascending: true }),
        supabase
          .from("conciliaciones_bancarias")
          .select("id, fecha_corte, estado, observaciones")
          .eq("user_id", user.id)
          .eq("cuenta_bancaria_id", cuenta.id)
          .eq("fecha_corte", fechaCorte)
          .maybeSingle(),
      ]);

      if (movimientosResult.error) throw movimientosResult.error;
      if (conciliacionResult.error) throw conciliacionResult.error;

      setMovimientosBanco((movimientosResult.data || []) as MovimientoBancario[]);

      if (!conciliacionResult.data) {
        setConciliacionActual(null);
        setConfirmedMatchKeys(new Set());
        return;
      }

      setConciliacionActual({
        id: conciliacionResult.data.id,
        fechaCorte: conciliacionResult.data.fecha_corte,
        estado: conciliacionResult.data.estado as EstadoConciliacionBancaria,
        observaciones: conciliacionResult.data.observaciones || "",
      });

      const { data: itemsData, error: itemsError } = await supabase
        .from("conciliacion_bancaria_items")
        .select("movimiento_bancario_id, asiento_id, conciliado")
        .eq("conciliacion_id", conciliacionResult.data.id);

      if (itemsError) throw itemsError;

      setConfirmedMatchKeys(
        new Set(
          (itemsData || [])
            .filter((item) => item.conciliado)
            .map((item) => buildPairKey(item.movimiento_bancario_id, item.asiento_id)),
        ),
      );
    } catch (error) {
      console.error("Error cargando conciliacion bancaria:", error);
      toast({
        title: "Error al cargar conciliacion",
        description: "No se pudo leer la informacion bancaria y contable necesaria.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [cuenta, fechaCorte, toast]);

  useEffect(() => {
    void fetchContext();
  }, [fetchContext]);

  const partidas = useMemo<PartidaConciliacion[]>(() => {
    if (!cuenta || !fechaCorte) return [];

    const bankAsientos = asientos
      .filter((asiento) => asiento.estado === "registrado" && asiento.fecha <= fechaCorte)
      .map((asiento) => {
        const line = findBankLine(asiento, cuenta);
        if (!line) return null;
        return {
          asiento,
          line,
          monto: movementAmount(line),
          naturaleza: lineNaturaleza(line),
        };
      })
      .filter(Boolean) as Array<{
      asiento: AsientoContable;
      line: CuentaAsiento;
      monto: number;
      naturaleza: NaturalezaMovimientoBancario;
    }>;

    const exactMatchedAsientos = new Set<string>();
    const reservedMovements = new Set<string>();
    const reservedAsientos = new Set<string>();
    const computed: PartidaConciliacion[] = [];

    for (const movimiento of movimientosBanco) {
      const match = bankAsientos.find(({ asiento, monto, naturaleza }) => {
        if (exactMatchedAsientos.has(asiento.id)) return false;
        if (!numbersEqual(monto, Math.abs(movimiento.monto))) return false;
        if (naturaleza !== movimiento.naturaleza_movimiento) return false;
        return referencesMatch({ movimiento, asiento, cuentaId: cuenta.id });
      });

      if (!match) continue;

      exactMatchedAsientos.add(match.asiento.id);
      reservedMovements.add(movimiento.id);
      reservedAsientos.add(match.asiento.id);

      const pairKey = buildPairKey(movimiento.id, match.asiento.id);
      computed.push({
        id: `match-${movimiento.id}-${match.asiento.id}`,
        movimientoBancarioId: movimiento.id,
        asientoId: match.asiento.id,
        origen: "movimiento_bancario",
        tipoPartida: "coincidencia",
        fecha: movimiento.fecha,
        referencia: movimiento.numero_comprobante || match.asiento.referencia || "",
        descripcion: movimiento.descripcion,
        monto: Math.abs(movimiento.monto),
        conciliado: true,
        requiereAjuste: false,
        estado: confirmedMatchKeys.has(pairKey) ? "aplicado" : "aplicado",
        categoria: "coincidencia",
        sugerida: false,
        naturalezaMovimiento: movimiento.naturaleza_movimiento as NaturalezaMovimientoBancario,
        tipoMovimiento: movimiento.tipo as TipoMovimientoBancario,
        ...getSuggestedCounterAccount(
          "coincidencia",
          movimiento.tipo as TipoMovimientoBancario,
          movimiento.naturaleza_movimiento as NaturalezaMovimientoBancario,
        ),
      });
    }

    for (const movimiento of movimientosBanco) {
      if (reservedMovements.has(movimiento.id)) continue;

      const suggestion = bankAsientos.find(({ asiento, monto, naturaleza }) => {
        if (reservedAsientos.has(asiento.id)) return false;
        if (!numbersEqual(monto, Math.abs(movimiento.monto))) return false;
        if (naturaleza !== movimiento.naturaleza_movimiento) return false;
        return diffInDays(asiento.fecha, movimiento.fecha) <= 3;
      });

      if (!suggestion) continue;

      reservedMovements.add(movimiento.id);
      reservedAsientos.add(suggestion.asiento.id);

      const pairKey = buildPairKey(movimiento.id, suggestion.asiento.id);
      const confirmed = confirmedMatchKeys.has(pairKey);

      computed.push({
        id: `suggest-${movimiento.id}-${suggestion.asiento.id}`,
        movimientoBancarioId: movimiento.id,
        asientoId: suggestion.asiento.id,
        origen: "movimiento_bancario",
        tipoPartida: "coincidencia",
        fecha: movimiento.fecha,
        referencia: movimiento.numero_comprobante || suggestion.asiento.referencia || "",
        descripcion: movimiento.descripcion,
        monto: Math.abs(movimiento.monto),
        conciliado: confirmed,
        requiereAjuste: false,
        estado: confirmed ? "aplicado" : "pendiente",
        categoria: "coincidencia",
        sugerida: true,
        naturalezaMovimiento: movimiento.naturaleza_movimiento as NaturalezaMovimientoBancario,
        tipoMovimiento: movimiento.tipo as TipoMovimientoBancario,
        ...getSuggestedCounterAccount(
          "coincidencia",
          movimiento.tipo as TipoMovimientoBancario,
          movimiento.naturaleza_movimiento as NaturalezaMovimientoBancario,
        ),
      });
    }

    for (const movimiento of movimientosBanco) {
      if (reservedMovements.has(movimiento.id)) continue;

      const tipoMovimiento = movimiento.tipo as TipoMovimientoBancario;
      const adjustmentCandidate = isAdjustmentCandidate(tipoMovimiento);
      const tipoPartida: TipoPartidaConciliacion = adjustmentCandidate
        ? movimiento.naturaleza_movimiento === "debito"
          ? "cargo_bancario"
          : "abono_bancario"
        : "diferencia_manual";

      const suggestion = getSuggestedCounterAccount(
        tipoPartida,
        tipoMovimiento,
        movimiento.naturaleza_movimiento as NaturalezaMovimientoBancario,
      );

      computed.push({
        id: `bank-${movimiento.id}`,
        movimientoBancarioId: movimiento.id,
        asientoId: null,
        origen: "ajuste_propuesto",
        tipoPartida,
        fecha: movimiento.fecha,
        referencia: movimiento.numero_comprobante || "",
        descripcion: movimiento.descripcion,
        monto: Math.abs(movimiento.monto),
        conciliado: false,
        requiereAjuste: adjustmentCandidate,
        estado: "pendiente",
        categoria: adjustmentCandidate ? "ajuste" : "excepcion_banco",
        sugerida: false,
        naturalezaMovimiento: movimiento.naturaleza_movimiento as NaturalezaMovimientoBancario,
        tipoMovimiento,
        contracuentaSugeridaCodigo: suggestion.codigo,
        contracuentaSugeridaNombre: suggestion.nombre,
      });
    }

    for (const item of bankAsientos) {
      if (reservedAsientos.has(item.asiento.id)) continue;

      const tipoPartida: TipoPartidaConciliacion =
        item.naturaleza === "debito" ? "cheque_transito" : "deposito_transito";

      const suggestion = getSuggestedCounterAccount(
        tipoPartida,
        null,
        item.naturaleza,
      );

      computed.push({
        id: `book-${item.asiento.id}`,
        movimientoBancarioId: null,
        asientoId: item.asiento.id,
        origen: "asiento_contable",
        tipoPartida,
        fecha: item.asiento.fecha,
        referencia: item.asiento.referencia || "",
        descripcion: item.asiento.concepto,
        monto: item.monto,
        conciliado: false,
        requiereAjuste: false,
        estado: "pendiente",
        categoria: "excepcion_libros",
        sugerida: false,
        naturalezaMovimiento: item.naturaleza,
        tipoMovimiento: null,
        contracuentaSugeridaCodigo: suggestion.codigo,
        contracuentaSugeridaNombre: suggestion.nombre,
      });
    }

    return computed.sort((left, right) => left.fecha.localeCompare(right.fecha));
  }, [asientos, confirmedMatchKeys, cuenta, fechaCorte, movimientosBanco]);

  const resumen = useMemo<ResumenConciliacion>(() => {
    const saldoBanco =
      movimientosBanco.length > 0
        ? movimientosBanco[movimientosBanco.length - 1].saldo_actual || 0
        : cuenta?.saldo || 0;

    const saldoLibros = asientos.reduce((total, asiento) => {
      if (!cuenta || asiento.estado !== "registrado" || asiento.fecha > fechaCorte) {
        return total;
      }

      const line = findBankLine(asiento, cuenta);
      if (!line) return total;
      return total + line.debe - line.haber;
    }, 0);

    const coincidencias = partidas.filter((item) => item.categoria === "coincidencia" && item.conciliado).length;
    const sugerenciasPendientes = partidas.filter(
      (item) => item.categoria === "coincidencia" && !item.conciliado,
    ).length;
    const excepcionesBanco = partidas.filter((item) => item.categoria === "excepcion_banco").length;
    const excepcionesLibros = partidas.filter((item) => item.categoria === "excepcion_libros").length;
    const ajustesPendientes = partidas.filter(
      (item) => item.categoria === "ajuste" && item.estado !== "aplicado",
    ).length;

    return {
      saldoBanco,
      saldoLibros,
      diferencia: Number((saldoBanco - saldoLibros).toFixed(2)),
      coincidencias,
      sugerenciasPendientes,
      excepcionesBanco,
      excepcionesLibros,
      ajustesPendientes,
    };
  }, [asientos, cuenta, fechaCorte, movimientosBanco, partidas]);

  const persistConciliacion = useCallback(
    async (estado: EstadoConciliacionBancaria, observaciones: string) => {
      if (!cuenta) return null;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuario no autenticado");

      const payload: ConciliacionInsert = {
        user_id: user.id,
        cuenta_bancaria_id: cuenta.id,
        fecha_corte: fechaCorte,
        saldo_banco: resumen.saldoBanco,
        saldo_libros: resumen.saldoLibros,
        diferencia: resumen.diferencia,
        estado,
        observaciones: observaciones || null,
      };

      const { data: conciliacionData, error: conciliacionError } = await supabase
        .from("conciliaciones_bancarias")
        .upsert(payload, { onConflict: "user_id,cuenta_bancaria_id,fecha_corte" })
        .select("*")
        .maybeSingle();

      if (conciliacionError) throw conciliacionError;
      if (!conciliacionData) throw new Error("No se pudo persistir la conciliacion");

      const { error: deleteItemsError } = await supabase
        .from("conciliacion_bancaria_items")
        .delete()
        .eq("conciliacion_id", conciliacionData.id);

      if (deleteItemsError) throw deleteItemsError;

      const itemsToPersist: ConciliacionItemInsert[] = partidas.map((item) => ({
        user_id: user.id,
        conciliacion_id: conciliacionData.id,
        movimiento_bancario_id: item.movimientoBancarioId,
        asiento_id: item.asientoId,
        origen: item.origen,
        tipo_partida: item.tipoPartida,
        fecha: item.fecha,
        referencia: item.referencia || null,
        descripcion: item.descripcion,
        monto: item.monto,
        conciliado: item.conciliado,
        requiere_ajuste: item.requiereAjuste,
        estado: item.estado,
      }));

      if (itemsToPersist.length > 0) {
        const { error: itemsError } = await supabase
          .from("conciliacion_bancaria_items")
          .insert(itemsToPersist);

        if (itemsError) throw itemsError;
      }

      setConciliacionActual({
        id: conciliacionData.id,
        fechaCorte: conciliacionData.fecha_corte,
        estado: conciliacionData.estado as EstadoConciliacionBancaria,
        observaciones: conciliacionData.observaciones || "",
      });

      return conciliacionData;
    },
    [cuenta, fechaCorte, partidas, resumen],
  );

  const guardarBorrador = useCallback(
    async (observaciones: string) => {
      try {
        await persistConciliacion("borrador", observaciones);
        toast({
          title: "Conciliacion guardada",
          description: "El corte bancario quedo guardado como borrador auditable.",
        });
        return true;
      } catch (error) {
        console.error("Error guardando conciliacion:", error);
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar la conciliacion bancaria.",
          variant: "destructive",
        });
        return false;
      }
    },
    [persistConciliacion, toast],
  );

  const cerrarConciliacion = useCallback(
    async (observaciones: string) => {
      try {
        const estadoFinal: EstadoConciliacionBancaria =
          Math.abs(resumen.diferencia) <= 0.01 &&
          resumen.ajustesPendientes === 0 &&
          resumen.sugerenciasPendientes === 0
            ? "conciliado"
            : "con_diferencias";

        await persistConciliacion(estadoFinal, observaciones);

        toast({
          title:
            estadoFinal === "conciliado"
              ? "Conciliacion cerrada"
              : "Conciliacion cerrada con diferencias",
          description:
            estadoFinal === "conciliado"
              ? "El corte bancario quedo conciliado sin diferencias pendientes."
              : "El corte bancario se guardo con observaciones y partidas pendientes.",
        });

        return estadoFinal;
      } catch (error) {
        console.error("Error cerrando conciliacion:", error);
        toast({
          title: "Error al cerrar",
          description: "No se pudo cerrar la conciliacion bancaria.",
          variant: "destructive",
        });
        return null;
      }
    },
    [persistConciliacion, resumen, toast],
  );

  const confirmarCoincidencia = useCallback((partida: PartidaConciliacion) => {
    if (!partida.movimientoBancarioId || !partida.asientoId) return;

    setConfirmedMatchKeys((prev) => {
      const next = new Set(prev);
      next.add(buildPairKey(partida.movimientoBancarioId, partida.asientoId));
      return next;
    });
  }, []);

  const crearAsientoAjuste = useCallback(
    async ({
      partida,
      contracuentaCodigo,
      contracuentaNombre,
    }: {
      partida: PartidaConciliacion;
      contracuentaCodigo: string;
      contracuentaNombre: string;
    }) => {
      if (!cuenta?.codigo_cuenta_contable) {
        toast({
          title: "Cuenta contable requerida",
          description: "La cuenta bancaria debe estar vinculada a una cuenta contable para ajustar.",
          variant: "destructive",
        });
        return false;
      }

      const numero = `CONC-${Date.now().toString().slice(-6)}`;
      const referencia = `BANK:${cuenta.id}:${partida.movimientoBancarioId || partida.id}:${partida.referencia || "AJUSTE"}`;
      const monto = Math.abs(partida.monto);

      const lineas: CuentaAsiento[] =
        partida.naturalezaMovimiento === "credito"
          ? [
              {
                codigo: cuenta.codigo_cuenta_contable,
                nombre: cuenta.nombre_cuenta_contable || "Bancos",
                debe: monto,
                haber: 0,
              },
              {
                codigo: contracuentaCodigo,
                nombre: contracuentaNombre,
                debe: 0,
                haber: monto,
              },
            ]
          : [
              {
                codigo: contracuentaCodigo,
                nombre: contracuentaNombre,
                debe: monto,
                haber: 0,
              },
              {
                codigo: cuenta.codigo_cuenta_contable,
                nombre: cuenta.nombre_cuenta_contable || "Bancos",
                debe: 0,
                haber: monto,
              },
            ];

      const asiento: AsientoContable = {
        id: numero,
        numero,
        fecha: partida.fecha,
        concepto: `Ajuste de conciliacion bancaria - ${partida.descripcion}`,
        referencia,
        debe: monto,
        haber: monto,
        estado: "registrado",
        cuentas: lineas,
        origen: "conciliacion_bancaria",
      };

      const result = await guardarAsiento(asiento);
      if (!result) return false;

      await refetchAsientos();

      toast({
        title: "Asiento de ajuste registrado",
        description: "La partida quedo respaldada por un asiento contable auditable.",
      });

      return true;
    },
    [cuenta, guardarAsiento, refetchAsientos, toast],
  );

  return {
    partidas,
    resumen,
    loading: loading || loadingAsientos,
    conciliacionActual,
    confirmarCoincidencia,
    crearAsientoAjuste,
    guardarBorrador,
    cerrarConciliacion,
    refetch: fetchContext,
  };
};
