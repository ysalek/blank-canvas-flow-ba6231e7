import { useCallback, useEffect, useState } from "react";
import * as XLSX from "@e965/xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Database, Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type TipoMovimientoBancario =
  | "deposito"
  | "transferencia"
  | "cheque"
  | "comision"
  | "interes"
  | "nota_credito"
  | "nota_debito"
  | "otro";

export type NaturalezaMovimientoBancario = "debito" | "credito";

export type CuentaBancaria = Database["public"]["Tables"]["cuentas_bancarias"]["Row"];
export type MovimientoBancario = Database["public"]["Tables"]["movimientos_bancarios"]["Row"];

type CuentaBancariaInsert = Database["public"]["Tables"]["cuentas_bancarias"]["Insert"];
type MovimientoBancarioInsert = Database["public"]["Tables"]["movimientos_bancarios"]["Insert"];

export interface CuentaBancariaInput {
  banco: string;
  numero_cuenta: string;
  tipo_cuenta?: string | null;
  nombre: string;
  moneda?: string | null;
  saldo?: number | null;
  activa?: boolean | null;
  codigo_cuenta_contable?: string | null;
  nombre_cuenta_contable?: string | null;
}

export interface MovimientoBancarioInput {
  cuenta_bancaria_id: string;
  fecha: string;
  tipo: TipoMovimientoBancario;
  naturaleza_movimiento: NaturalezaMovimientoBancario;
  monto: number;
  descripcion: string;
  numero_comprobante?: string | null;
  beneficiario?: string | null;
  saldo_anterior?: number | null;
  saldo_actual?: number | null;
  origen_registro?: "manual" | "importado";
  detalle_importacion?: Json | null;
}

export interface MovimientosFiltro {
  cuentaId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface ExtractoPreviewRow {
  rowNumber: number;
  fecha: string;
  descripcion: string;
  referencia: string;
  debito: number;
  credito: number;
  monto: number;
  saldo: number | null;
  tipo: TipoMovimientoBancario;
  naturaleza_movimiento: NaturalezaMovimientoBancario;
  beneficiario: string;
  duplicado: boolean;
  motivoDuplicado?: string;
  detalle_importacion: Json;
}

export interface ExtractoPreview {
  rows: ExtractoPreviewRow[];
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  cuentaId: string;
  fileName: string;
}

export const MOVIMIENTO_TIPO_OPTIONS: Array<{
  value: TipoMovimientoBancario;
  label: string;
  naturalezaDefault: NaturalezaMovimientoBancario;
}> = [
  { value: "deposito", label: "Depositos", naturalezaDefault: "credito" },
  { value: "transferencia", label: "Transferencias", naturalezaDefault: "credito" },
  { value: "cheque", label: "Cheques", naturalezaDefault: "debito" },
  { value: "comision", label: "Comisiones", naturalezaDefault: "debito" },
  { value: "interes", label: "Intereses", naturalezaDefault: "credito" },
  { value: "nota_credito", label: "Notas de credito", naturalezaDefault: "credito" },
  { value: "nota_debito", label: "Notas de debito", naturalezaDefault: "debito" },
  { value: "otro", label: "Otro", naturalezaDefault: "debito" },
];

export const MOVIMIENTO_NATURALEZA_OPTIONS: Array<{
  value: NaturalezaMovimientoBancario;
  label: string;
}> = [
  { value: "credito", label: "Credito bancario" },
  { value: "debito", label: "Debito bancario" },
];

const COLUMN_ALIASES = {
  fecha: ["fecha", "date", "fecha operacion", "fecha operación", "fec op"],
  descripcion: ["descripcion", "descripción", "detalle", "concepto", "glosa"],
  referencia: [
    "referencia",
    "nro",
    "nro comprobante",
    "numero comprobante",
    "documento",
    "transaccion",
    "operacion",
  ],
  debito: ["debito", "débito", "cargo"],
  credito: ["credito", "crédito", "abono"],
  monto: ["monto", "importe", "valor"],
  saldo: ["saldo", "balance"],
  beneficiario: ["beneficiario", "contraparte", "cliente", "proveedor"],
};

const CUENTAS_BANCARIAS_SELECT_BASE =
  "id, nombre, banco, numero_cuenta, tipo_cuenta, moneda, saldo, activa, user_id, created_at, updated_at";
const CUENTAS_BANCARIAS_SELECT =
  `${CUENTAS_BANCARIAS_SELECT_BASE}, codigo_cuenta_contable, nombre_cuenta_contable`;
const MOVIMIENTOS_BANCARIOS_SELECT_BASE =
  "id, cuenta_bancaria_id, fecha, tipo, monto, descripcion, numero_comprobante, beneficiario, saldo_anterior, saldo_actual, user_id, created_at";
const MOVIMIENTOS_BANCARIOS_SELECT =
  `${MOVIMIENTOS_BANCARIOS_SELECT_BASE}, naturaleza_movimiento, origen_registro, detalle_importacion`;
const CUENTAS_BANCARIAS_EXTENSION_COLUMNS = [
  "codigo_cuenta_contable",
  "nombre_cuenta_contable",
];
const MOVIMIENTOS_BANCARIOS_EXTENSION_COLUMNS = [
  "naturaleza_movimiento",
  "origen_registro",
  "detalle_importacion",
];

const normalizeText = (value: string | null | undefined) =>
  (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const normalizeReference = (value: string | null | undefined) =>
  normalizeText(value).replace(/\s+/g, "");

const getErrorText = (error: unknown) => {
  if (!error) return "";
  if (typeof error === "string") return error.toLowerCase();
  if (typeof error === "object") {
    return JSON.stringify(error).toLowerCase();
  }
  return String(error).toLowerCase();
};

const hasMissingColumnError = (error: unknown, columns: string[]) => {
  const text = getErrorText(error);
  return columns.some((column) => text.includes(column.toLowerCase()));
};

const parseNumeric = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;

  const raw = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=.*\.)/g, "")
    .replace(",", ".");

  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDateValue = (value: unknown) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const raw = String(value || "").trim();
  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;

  const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    return `${normalizedYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return "";
};

const getSignedDelta = (
  monto: number,
  naturaleza: NaturalezaMovimientoBancario,
) => (naturaleza === "credito" ? monto : -monto);

const inferTipoMovimiento = (
  descripcion: string,
  naturaleza: NaturalezaMovimientoBancario,
): TipoMovimientoBancario => {
  const text = normalizeText(descripcion);

  if (text.includes("comision")) return "comision";
  if (text.includes("interes")) return "interes";
  if (text.includes("nota credito")) return "nota_credito";
  if (text.includes("nota debito")) return "nota_debito";
  if (text.includes("cheque")) return "cheque";
  if (text.includes("transfer")) return "transferencia";
  if (naturaleza === "credito") return "deposito";
  return "otro";
};

const toJsonValue = (value: unknown): Json => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }
  if (typeof value === "object") {
    const record: Record<string, Json | undefined> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      record[key] = toJsonValue(nested);
    }
    return record;
  }
  return String(value);
};

const getColumnValue = (row: Record<string, unknown>, aliases: string[]) => {
  for (const [key, value] of Object.entries(row)) {
    if (aliases.includes(normalizeText(key))) {
      return value;
    }
  }
  return undefined;
};

const buildDuplicateKey = ({
  fecha,
  referencia,
  monto,
  descripcion,
}: {
  fecha: string;
  referencia?: string;
  monto: number;
  descripcion: string;
}) => {
  const reference = normalizeReference(referencia);
  if (reference) {
    return `ref|${reference}|${fecha}|${monto.toFixed(2)}`;
  }

  return `free|${fecha}|${monto.toFixed(2)}|${normalizeText(descripcion)}`;
};

const stripCuentaBancariaExtensions = (payload: CuentaBancariaInsert) => {
  const {
    codigo_cuenta_contable: _codigoCuentaContable,
    nombre_cuenta_contable: _nombreCuentaContable,
    ...basePayload
  } = payload;

  return basePayload;
};

const stripMovimientoBancarioExtensions = (payload: MovimientoBancarioInsert) => {
  const {
    naturaleza_movimiento: _naturalezaMovimiento,
    origen_registro: _origenRegistro,
    detalle_importacion: _detalleImportacion,
    ...basePayload
  } = payload;

  return basePayload;
};

const normalizeStoredTipo = (value: unknown): TipoMovimientoBancario => {
  const tipo = String(value || "").trim().toLowerCase();

  switch (tipo) {
    case "deposito":
    case "transferencia":
    case "cheque":
    case "comision":
    case "interes":
    case "nota_credito":
    case "nota_debito":
    case "otro":
      return tipo;
    case "ingreso":
      return "deposito";
    case "egreso":
      return "otro";
    default:
      return "otro";
  }
};

const inferStoredNaturaleza = ({
  tipo,
  naturaleza,
}: {
  tipo: unknown;
  naturaleza: unknown;
}): NaturalezaMovimientoBancario => {
  if (naturaleza === "credito" || naturaleza === "debito") {
    return naturaleza;
  }

  const tipoNormalizado = String(tipo || "").trim().toLowerCase();
  if (tipoNormalizado === "ingreso") return "credito";
  if (tipoNormalizado === "egreso") return "debito";

  const tipoTesoreria = normalizeStoredTipo(tipo);
  return MOVIMIENTO_TIPO_OPTIONS.find((item) => item.value === tipoTesoreria)?.naturalezaDefault || "debito";
};

const mapCuentaBancariaRow = (row: Record<string, unknown>) =>
  ({
    id: String(row.id || ""),
    user_id: String(row.user_id || ""),
    nombre: String(row.nombre || ""),
    banco: String(row.banco || ""),
    numero_cuenta: String(row.numero_cuenta || ""),
    tipo_cuenta: typeof row.tipo_cuenta === "string" ? row.tipo_cuenta : null,
    moneda: typeof row.moneda === "string" ? row.moneda : null,
    saldo: Number(row.saldo || 0),
    activa: typeof row.activa === "boolean" ? row.activa : true,
    codigo_cuenta_contable:
      typeof row.codigo_cuenta_contable === "string" ? row.codigo_cuenta_contable : null,
    nombre_cuenta_contable:
      typeof row.nombre_cuenta_contable === "string" ? row.nombre_cuenta_contable : null,
    created_at:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updated_at:
      typeof row.updated_at === "string"
        ? row.updated_at
        : typeof row.created_at === "string"
          ? row.created_at
          : new Date().toISOString(),
  }) as CuentaBancaria;

const mapMovimientoBancarioRow = (row: Record<string, unknown>) =>
  ({
    id: String(row.id || ""),
    user_id: String(row.user_id || ""),
    cuenta_bancaria_id: String(row.cuenta_bancaria_id || ""),
    fecha: String(row.fecha || ""),
    tipo: normalizeStoredTipo(row.tipo),
    naturaleza_movimiento: inferStoredNaturaleza({
      tipo: row.tipo,
      naturaleza: row.naturaleza_movimiento,
    }),
    monto: Number(row.monto || 0),
    descripcion: String(row.descripcion || ""),
    numero_comprobante:
      typeof row.numero_comprobante === "string" ? row.numero_comprobante : null,
    beneficiario: typeof row.beneficiario === "string" ? row.beneficiario : null,
    saldo_anterior: Number(row.saldo_anterior || 0),
    saldo_actual: Number(row.saldo_actual || 0),
    origen_registro:
      typeof row.origen_registro === "string" ? row.origen_registro : "manual",
    detalle_importacion: (row.detalle_importacion as Json | null | undefined) || null,
    created_at:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
  }) as MovimientoBancario;

export const useSupabaseBancos = () => {
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);
  const [movimientosBancarios, setMovimientosBancarios] = useState<MovimientoBancario[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCuentasBancarias = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCuentasBancarias([]);
        return;
      }

      const extendedResult = await supabase
        .from("cuentas_bancarias")
        .select(CUENTAS_BANCARIAS_SELECT)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (extendedResult.error && hasMissingColumnError(extendedResult.error, CUENTAS_BANCARIAS_EXTENSION_COLUMNS)) {
        const legacyResult = await supabase
          .from("cuentas_bancarias")
          .select(CUENTAS_BANCARIAS_SELECT_BASE)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (legacyResult.error) throw legacyResult.error;
        setCuentasBancarias((legacyResult.data || []).map((row) => mapCuentaBancariaRow(row)));
        return;
      }

      if (extendedResult.error) throw extendedResult.error;
      setCuentasBancarias((extendedResult.data || []).map((row) => mapCuentaBancariaRow(row)));
    } catch (error) {
      console.error("Error fetching cuentas bancarias:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las cuentas bancarias.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchMovimientosBancarios = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMovimientosBancarios([]);
        return;
      }

      const extendedResult = await supabase
        .from("movimientos_bancarios")
        .select(MOVIMIENTOS_BANCARIOS_SELECT)
        .eq("user_id", user.id)
        .order("fecha", { ascending: false });

      if (
        extendedResult.error &&
        hasMissingColumnError(extendedResult.error, MOVIMIENTOS_BANCARIOS_EXTENSION_COLUMNS)
      ) {
        const legacyResult = await supabase
          .from("movimientos_bancarios")
          .select(MOVIMIENTOS_BANCARIOS_SELECT_BASE)
          .eq("user_id", user.id)
          .order("fecha", { ascending: false });

        if (legacyResult.error) throw legacyResult.error;
        setMovimientosBancarios((legacyResult.data || []).map((row) => mapMovimientoBancarioRow(row)));
        return;
      }

      if (extendedResult.error) throw extendedResult.error;
      setMovimientosBancarios((extendedResult.data || []).map((row) => mapMovimientoBancarioRow(row)));
    } catch (error) {
      console.error("Error fetching movimientos bancarios:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los movimientos bancarios.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const getMovimientosFiltrados = useCallback(
    async ({ cuentaId, fechaDesde, fechaHasta }: MovimientosFiltro) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return [] as MovimientoBancario[];
      }

      let query = supabase
        .from("movimientos_bancarios")
        .select(MOVIMIENTOS_BANCARIOS_SELECT)
        .eq("user_id", user.id)
        .order("fecha", { ascending: true });

      if (cuentaId) {
        query = query.eq("cuenta_bancaria_id", cuentaId);
      }
      if (fechaDesde) {
        query = query.gte("fecha", fechaDesde);
      }
      if (fechaHasta) {
        query = query.lte("fecha", fechaHasta);
      }

      const extendedResult = await query;
      if (
        extendedResult.error &&
        hasMissingColumnError(extendedResult.error, MOVIMIENTOS_BANCARIOS_EXTENSION_COLUMNS)
      ) {
        let legacyQuery = supabase
          .from("movimientos_bancarios")
          .select(MOVIMIENTOS_BANCARIOS_SELECT_BASE)
          .eq("user_id", user.id)
          .order("fecha", { ascending: true });

        if (cuentaId) {
          legacyQuery = legacyQuery.eq("cuenta_bancaria_id", cuentaId);
        }
        if (fechaDesde) {
          legacyQuery = legacyQuery.gte("fecha", fechaDesde);
        }
        if (fechaHasta) {
          legacyQuery = legacyQuery.lte("fecha", fechaHasta);
        }

        const legacyResult = await legacyQuery;
        if (legacyResult.error) throw legacyResult.error;
        return (legacyResult.data || []).map((row) => mapMovimientoBancarioRow(row));
      }

      if (extendedResult.error) throw extendedResult.error;
      return (extendedResult.data || []).map((row) => mapMovimientoBancarioRow(row));
    },
    [],
  );

  const createCuentaBancaria = useCallback(
    async (cuenta: CuentaBancariaInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuario no autenticado");

      const payload: CuentaBancariaInsert = {
        ...cuenta,
        saldo: cuenta.saldo || 0,
        activa: cuenta.activa ?? true,
        user_id: user.id,
      };

      let result = await supabase
        .from("cuentas_bancarias")
        .insert(payload)
        .select(CUENTAS_BANCARIAS_SELECT)
        .maybeSingle();

      if (result.error && hasMissingColumnError(result.error, CUENTAS_BANCARIAS_EXTENSION_COLUMNS)) {
        result = await supabase
          .from("cuentas_bancarias")
          .insert(stripCuentaBancariaExtensions(payload))
          .select(CUENTAS_BANCARIAS_SELECT_BASE)
          .maybeSingle();
      }

      if (result.error) throw result.error;

      const data = result.data ? mapCuentaBancariaRow(result.data) : null;

      if (data) {
        setCuentasBancarias((prev) => [data, ...prev]);
      }

      toast({
        title: "Cuenta bancaria creada",
        description: "La cuenta bancaria quedo disponible en tesoreria.",
      });

      return data as CuentaBancaria;
    },
    [toast],
  );

  const updateCuentaBancaria = useCallback(
    async (
      id: string,
      updates: Partial<CuentaBancariaInput>,
      options?: { silent?: boolean },
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuario no autenticado");

      let result = await supabase
        .from("cuentas_bancarias")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select(CUENTAS_BANCARIAS_SELECT)
        .maybeSingle();

      if (result.error && hasMissingColumnError(result.error, CUENTAS_BANCARIAS_EXTENSION_COLUMNS)) {
        result = await supabase
          .from("cuentas_bancarias")
          .update(stripCuentaBancariaExtensions(updates as CuentaBancariaInsert))
          .eq("id", id)
          .eq("user_id", user.id)
          .select(CUENTAS_BANCARIAS_SELECT_BASE)
          .maybeSingle();
      }

      if (result.error) throw result.error;

      const data = result.data ? mapCuentaBancariaRow(result.data) : null;

      if (data) {
        setCuentasBancarias((prev) => prev.map((item) => (item.id === id ? data : item)));
      }

      if (!options?.silent) {
        toast({
          title: "Cuenta actualizada",
          description: "La cuenta bancaria fue actualizada correctamente.",
        });
      }

      return data as CuentaBancaria;
    },
    [toast],
  );

  const createMovimientoBancario = useCallback(
    async (movimiento: MovimientoBancarioInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuario no autenticado");

      const cuenta = cuentasBancarias.find((item) => item.id === movimiento.cuenta_bancaria_id);
      const saldoAnterior = movimiento.saldo_anterior ?? cuenta?.saldo ?? 0;
      const saldoActual =
        movimiento.saldo_actual ??
        saldoAnterior +
          getSignedDelta(Math.abs(movimiento.monto), movimiento.naturaleza_movimiento);

      const payload: MovimientoBancarioInsert = {
        cuenta_bancaria_id: movimiento.cuenta_bancaria_id,
        fecha: movimiento.fecha,
        tipo: movimiento.tipo,
        naturaleza_movimiento: movimiento.naturaleza_movimiento,
        monto: Math.abs(movimiento.monto),
        descripcion: movimiento.descripcion,
        numero_comprobante: movimiento.numero_comprobante || null,
        beneficiario: movimiento.beneficiario || null,
        saldo_anterior: saldoAnterior,
        saldo_actual: saldoActual,
        origen_registro: movimiento.origen_registro || "manual",
        detalle_importacion: movimiento.detalle_importacion || null,
        user_id: user.id,
      };

      let result = await supabase
        .from("movimientos_bancarios")
        .insert(payload)
        .select(MOVIMIENTOS_BANCARIOS_SELECT)
        .maybeSingle();

      if (
        result.error &&
        hasMissingColumnError(result.error, MOVIMIENTOS_BANCARIOS_EXTENSION_COLUMNS)
      ) {
        result = await supabase
          .from("movimientos_bancarios")
          .insert(stripMovimientoBancarioExtensions(payload))
          .select(MOVIMIENTOS_BANCARIOS_SELECT_BASE)
          .maybeSingle();
      }

      if (result.error) throw result.error;

      const data = result.data ? mapMovimientoBancarioRow(result.data) : null;

      await updateCuentaBancaria(
        movimiento.cuenta_bancaria_id,
        { saldo: saldoActual },
        { silent: true },
      );

      if (data) {
        setMovimientosBancarios((prev) =>
          [data, ...prev].sort((a, b) => {
            const byDate = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
            return byDate !== 0
              ? byDate
              : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }),
        );
      }

      toast({
        title: "Movimiento bancario registrado",
        description: "El movimiento quedo persistido y la cuenta fue actualizada una sola vez.",
      });

      return data as MovimientoBancario;
    },
    [cuentasBancarias, toast, updateCuentaBancaria],
  );

  const parseExtractoFile = useCallback(
    async (file: File, cuentaId: string): Promise<ExtractoPreview> => {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
      });

      const movimientosCuenta = movimientosBancarios.filter(
        (item) => item.cuenta_bancaria_id === cuentaId,
      );

      const existingKeys = new Set(
        movimientosCuenta.map((item) =>
          buildDuplicateKey({
            fecha: item.fecha,
            referencia: item.numero_comprobante || "",
            monto: Math.abs(item.monto),
            descripcion: item.descripcion,
          }),
        ),
      );

      const previewRows: ExtractoPreviewRow[] = [];
      const fileKeys = new Set<string>();

      rows.forEach((row, index) => {
        const fecha = parseDateValue(getColumnValue(row, COLUMN_ALIASES.fecha));
        const descripcion = String(getColumnValue(row, COLUMN_ALIASES.descripcion) || "").trim();
        const referencia = String(getColumnValue(row, COLUMN_ALIASES.referencia) || "").trim();
        const debito = Math.abs(parseNumeric(getColumnValue(row, COLUMN_ALIASES.debito)));
        const credito = Math.abs(parseNumeric(getColumnValue(row, COLUMN_ALIASES.credito)));
        const montoPlano = Math.abs(parseNumeric(getColumnValue(row, COLUMN_ALIASES.monto)));
        const saldoRaw = parseNumeric(getColumnValue(row, COLUMN_ALIASES.saldo));
        const beneficiario = String(getColumnValue(row, COLUMN_ALIASES.beneficiario) || "").trim();

        const naturaleza: NaturalezaMovimientoBancario = credito > 0 ? "credito" : "debito";
        const monto = montoPlano > 0 ? montoPlano : credito > 0 ? credito : debito;
        const tipo = inferTipoMovimiento(descripcion, naturaleza);
        const duplicateKey = buildDuplicateKey({
          fecha,
          referencia,
          monto,
          descripcion,
        });

        let duplicado = false;
        let motivoDuplicado = "";

        if (!fecha || !descripcion || monto <= 0) {
          previewRows.push({
            rowNumber: index + 2,
            fecha,
            descripcion,
            referencia,
            debito,
            credito,
            monto,
            saldo: Number.isFinite(saldoRaw) && saldoRaw !== 0 ? saldoRaw : null,
            tipo,
            naturaleza_movimiento: naturaleza,
            beneficiario,
            duplicado: false,
            motivoDuplicado: "Fila invalida",
            detalle_importacion: toJsonValue(row),
          });
          return;
        }

        if (existingKeys.has(duplicateKey)) {
          duplicado = true;
          motivoDuplicado = "Ya existe un movimiento equivalente en la cuenta.";
        } else if (fileKeys.has(duplicateKey)) {
          duplicado = true;
          motivoDuplicado = "La fila se repite dentro del archivo importado.";
        }

        fileKeys.add(duplicateKey);

        previewRows.push({
          rowNumber: index + 2,
          fecha,
          descripcion,
          referencia,
          debito,
          credito,
          monto,
          saldo: Number.isFinite(saldoRaw) && saldoRaw !== 0 ? saldoRaw : null,
          tipo,
          naturaleza_movimiento: naturaleza,
          beneficiario,
          duplicado,
          motivoDuplicado,
          detalle_importacion: toJsonValue(row),
        });
      });

      const validRows = previewRows.filter(
        (row) => row.fecha && row.descripcion && row.monto > 0 && !row.duplicado,
      ).length;
      const duplicateRows = previewRows.filter((row) => row.duplicado).length;
      const invalidRows = previewRows.filter(
        (row) => !row.fecha || !row.descripcion || row.monto <= 0,
      ).length;

      return {
        rows: previewRows,
        totalRows: previewRows.length,
        validRows,
        duplicateRows,
        invalidRows,
        cuentaId,
        fileName: file.name,
      };
    },
    [movimientosBancarios],
  );

  const importMovimientosDesdePreview = useCallback(
    async (preview: ExtractoPreview) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuario no autenticado");

      const cuenta = cuentasBancarias.find((item) => item.id === preview.cuentaId);
      if (!cuenta) throw new Error("Cuenta bancaria no encontrada");

      const rowsToPersist = preview.rows
        .filter((row) => row.fecha && row.descripcion && row.monto > 0 && !row.duplicado)
        .sort((a, b) => {
          const byDate = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
          return byDate !== 0 ? byDate : a.rowNumber - b.rowNumber;
        });

      if (!rowsToPersist.length) {
        toast({
          title: "Sin filas para importar",
          description: "Todas las filas del archivo fueron descartadas por duplicado o invalidez.",
          variant: "destructive",
        });
        return {
          importedCount: 0,
        };
      }

      let runningBalance = cuenta.saldo || 0;
      const payload: MovimientoBancarioInsert[] = rowsToPersist.map((row) => {
        const saldoAnterior = runningBalance;
        const saldoActual =
          row.saldo !== null
            ? row.saldo
            : saldoAnterior + getSignedDelta(row.monto, row.naturaleza_movimiento);

        runningBalance = saldoActual;

        return {
          user_id: user.id,
          cuenta_bancaria_id: preview.cuentaId,
          fecha: row.fecha,
          tipo: row.tipo,
          naturaleza_movimiento: row.naturaleza_movimiento,
          monto: row.monto,
          descripcion: row.descripcion,
          numero_comprobante: row.referencia || null,
          beneficiario: row.beneficiario || null,
          saldo_anterior: saldoAnterior,
          saldo_actual: saldoActual,
          origen_registro: "importado",
          detalle_importacion: row.detalle_importacion,
        };
      });

      let result = await supabase
        .from("movimientos_bancarios")
        .insert(payload)
        .select(MOVIMIENTOS_BANCARIOS_SELECT);

      if (
        result.error &&
        hasMissingColumnError(result.error, MOVIMIENTOS_BANCARIOS_EXTENSION_COLUMNS)
      ) {
        result = await supabase
          .from("movimientos_bancarios")
          .insert(payload.map((item) => stripMovimientoBancarioExtensions(item)))
          .select(MOVIMIENTOS_BANCARIOS_SELECT_BASE);
      }

      if (result.error) throw result.error;

      const data = (result.data || []).map((row) => mapMovimientoBancarioRow(row));

      await updateCuentaBancaria(preview.cuentaId, { saldo: runningBalance }, { silent: true });

      if (data.length) {
        setMovimientosBancarios((prev) =>
          [...data, ...prev].sort((a, b) => {
            const byDate = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
            return byDate !== 0
              ? byDate
              : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }),
        );
      }

      toast({
        title: "Extracto importado",
        description: `Se registraron ${data.length} movimientos bancarios nuevos.`,
      });

      return {
        importedCount: data.length,
      };
    },
    [cuentasBancarias, toast, updateCuentaBancaria],
  );

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchCuentasBancarias(), fetchMovimientosBancarios()]);
    } finally {
      setLoading(false);
    }
  }, [fetchCuentasBancarias, fetchMovimientosBancarios]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    cuentasBancarias,
    movimientosBancarios,
    loading,
    createCuentaBancaria,
    updateCuentaBancaria,
    createMovimientoBancario,
    getMovimientosFiltrados,
    parseExtractoFile,
    importMovimientosDesdePreview,
    refetch,
  };
};
