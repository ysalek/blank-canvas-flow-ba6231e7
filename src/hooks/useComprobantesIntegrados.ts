import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useContabilidadIntegration } from "./useContabilidadIntegration";

export interface CuentaComprobante {
  codigo: string;
  nombre: string;
  debe: number;
  haber: number;
}

export interface ComprobanteIntegrado {
  id: string;
  tipo: "ingreso" | "egreso" | "traspaso";
  numero: string;
  fecha: string;
  concepto: string;
  beneficiario: string;
  monto: number;
  metodoPago: string;
  referencia: string;
  observaciones: string;
  estado: "borrador" | "autorizado" | "anulado";
  creadoPor: string;
  fechaCreacion: string;
  cuentas: CuentaComprobante[];
}

export interface ComprobanteDraft {
  tipo: "ingreso" | "egreso" | "traspaso";
  numero: string;
  fecha: string;
  concepto: string;
  beneficiario: string;
  monto: number;
  metodoPago: string;
  referencia: string;
  observaciones: string;
  estado: "borrador" | "autorizado";
  cuentas: CuentaComprobante[];
}

interface ComprobanteRow {
  id: string;
  tipo_comprobante: string;
  numero_comprobante: string;
  fecha: string;
  razon_social: string;
  nit: string;
  total: number;
  codigo_control: string | null;
  estado_sin: string | null;
  estado: string | null;
  created_at: string;
  items_comprobantes_integrados?: Array<{
    codigo: string;
    descripcion: string;
    subtotal: number;
  }>;
}

const mapComprobante = (row: ComprobanteRow): ComprobanteIntegrado => ({
  id: row.id,
  tipo: row.tipo_comprobante as ComprobanteIntegrado["tipo"],
  numero: row.numero_comprobante,
  fecha: row.fecha,
  concepto: row.razon_social,
  beneficiario: row.nit,
  monto: Number(row.total || 0),
  metodoPago: "",
  referencia: row.codigo_control || "",
  observaciones: row.estado_sin || "",
  estado: (row.estado || "borrador") as ComprobanteIntegrado["estado"],
  creadoPor: "Sistema",
  fechaCreacion: row.created_at,
  cuentas: (row.items_comprobantes_integrados || []).map((item) => ({
    codigo: item.codigo,
    nombre: item.descripcion,
    debe: item.subtotal > 0 ? Number(item.subtotal) : 0,
    haber: item.subtotal < 0 ? Math.abs(Number(item.subtotal)) : 0,
  })),
});

export const useComprobantesIntegrados = () => {
  const [comprobantes, setComprobantes] = useState<ComprobanteIntegrado[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();

  const fetchComprobantes = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setComprobantes([]);
        return;
      }

      const { data, error } = await supabase
        .from("comprobantes_integrados")
        .select("id, tipo_comprobante, numero_comprobante, fecha, razon_social, nit, total, codigo_control, estado_sin, estado, created_at, items_comprobantes_integrados(codigo, descripcion, subtotal)")
        .eq("user_id", user.id)
        .order("fecha", { ascending: false });

      if (error) throw error;

      setComprobantes(((data || []) as ComprobanteRow[]).map(mapComprobante));
    } catch (error) {
      console.error("Error cargando comprobantes:", error);
      setComprobantes([]);
      toast({
        title: "Error al cargar comprobantes",
        description: "No se pudieron obtener los comprobantes desde la base de datos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchComprobantes();
  }, [fetchComprobantes]);

  const obtenerUsuario = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuario no autenticado");
    }

    return user;
  };

  const existeAsientoConReferencia = async (userId: string, referencia: string) => {
    const { data, error } = await supabase
      .from("asientos_contables")
      .select("id")
      .eq("user_id", userId)
      .eq("referencia", referencia)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  };

  const fetchComprobanteById = async (userId: string, id: string) => {
    const { data, error } = await supabase
      .from("comprobantes_integrados")
      .select("id, tipo_comprobante, numero_comprobante, fecha, razon_social, nit, total, codigo_control, estado_sin, estado, created_at, items_comprobantes_integrados(codigo, descripcion, subtotal)")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapComprobante(data as ComprobanteRow) : null;
  };

  const construirAsiento = (
    comprobante: ComprobanteIntegrado | ComprobanteDraft,
    tipo: "normal" | "reversion"
  ) => {
    const esReversion = tipo === "reversion";
    const referencia = esReversion ? `ANULACION-${comprobante.numero}` : comprobante.numero;
    const cuentas = comprobante.cuentas.map((cuenta) => ({
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      debe: esReversion ? cuenta.haber : cuenta.debe,
      haber: esReversion ? cuenta.debe : cuenta.haber,
    }));

    const totalDebe = cuentas.reduce((sum, cuenta) => sum + cuenta.debe, 0);
    const totalHaber = cuentas.reduce((sum, cuenta) => sum + cuenta.haber, 0);

    return {
      id: `${esReversion ? "REV" : "COMP"}-${Date.now()}`,
      numero: `${esReversion ? "REV" : "COMP"}-${comprobante.numero}`,
      fecha: comprobante.fecha,
      concepto: esReversion
        ? `Reversion de comprobante ${comprobante.numero} - ${comprobante.concepto}`
        : `${comprobante.tipo.charAt(0).toUpperCase() + comprobante.tipo.slice(1)} - ${comprobante.concepto}`,
      referencia,
      debe: totalDebe,
      haber: totalHaber,
      estado: "registrado" as const,
      cuentas,
    };
  };

  const insertarBaseComprobante = async (
    userId: string,
    comprobante: ComprobanteDraft,
    estadoInicial: "borrador" | "autorizado"
  ) => {
    const { data: comprobanteData, error: comprobanteError } = await supabase
      .from("comprobantes_integrados")
      .insert({
        numero_comprobante: comprobante.numero,
        tipo_comprobante: comprobante.tipo,
        fecha: comprobante.fecha,
        razon_social: comprobante.concepto,
        nit: comprobante.beneficiario,
        subtotal: comprobante.monto,
        iva: 0,
        total: comprobante.monto,
        estado: estadoInicial,
        codigo_control: comprobante.referencia || null,
        estado_sin: comprobante.observaciones || null,
        user_id: userId,
      })
      .select("id")
      .maybeSingle();

    if (comprobanteError) throw comprobanteError;
    if (!comprobanteData?.id) {
      throw new Error("No se pudo crear el encabezado del comprobante");
    }

    if (comprobante.cuentas.length > 0) {
      const items = comprobante.cuentas.map((cuenta) => {
        const valor = cuenta.debe > 0 ? cuenta.debe : -cuenta.haber;
        return {
          comprobante_id: comprobanteData.id,
          codigo: cuenta.codigo,
          descripcion: cuenta.nombre,
          cantidad: 1,
          precio_unitario: Math.abs(valor),
          subtotal: valor,
        };
      });

      const { error: itemsError } = await supabase
        .from("items_comprobantes_integrados")
        .insert(items);

      if (itemsError) throw itemsError;
    }

    return comprobanteData.id;
  };

  const createComprobante = async (draft: ComprobanteDraft) => {
    try {
      const user = await obtenerUsuario();
      const estadoInicial = draft.estado === "autorizado" ? "borrador" : draft.estado;
      const comprobanteId = await insertarBaseComprobante(user.id, draft, estadoInicial);

      if (draft.estado === "autorizado") {
        await autorizarComprobante(comprobanteId);
      } else {
        await fetchComprobantes();
        toast({
          title: "Comprobante creado",
          description: `Se guardo el comprobante ${draft.numero} en estado borrador.`,
        });
      }

      return comprobanteId;
    } catch (error) {
      console.error("Error creando comprobante:", error);
      toast({
        title: "Error al crear comprobante",
        description: "No se pudo registrar el comprobante de forma consistente.",
        variant: "destructive",
      });
      return null;
    }
  };

  const autorizarComprobante = async (id: string) => {
    try {
      const user = await obtenerUsuario();
      const comprobanteActual =
        comprobantes.find((item) => item.id === id) || (await fetchComprobanteById(user.id, id));

      if (!comprobanteActual) {
        throw new Error("Comprobante no encontrado");
      }

      const referencia = comprobanteActual.numero;
      const asientoExiste = await existeAsientoConReferencia(user.id, referencia);
      if (!asientoExiste) {
        const asiento = construirAsiento(comprobanteActual, "normal");
        const guardado = await guardarAsiento(asiento);
        if (!guardado) {
          throw new Error("No se pudo generar el asiento contable del comprobante");
        }
      }

      const { error } = await supabase
        .from("comprobantes_integrados")
        .update({ estado: "autorizado" })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchComprobantes();
      toast({
        title: "Comprobante autorizado",
        description: `El comprobante ${referencia} quedo integrado al libro diario.`,
      });

      return true;
    } catch (error) {
      console.error("Error autorizando comprobante:", error);
      toast({
        title: "Error al autorizar comprobante",
        description: "No se pudo completar la autorizacion e integracion contable.",
        variant: "destructive",
      });
      return false;
    }
  };

  const anularComprobante = async (id: string) => {
    try {
      const user = await obtenerUsuario();
      const comprobante = comprobantes.find((item) => item.id === id);
      if (!comprobante) {
        throw new Error("Comprobante no encontrado");
      }

      if (comprobante.estado === "autorizado") {
        const referenciaReversion = `ANULACION-${comprobante.numero}`;
        const yaExisteReversion = await existeAsientoConReferencia(user.id, referenciaReversion);

        if (!yaExisteReversion) {
          const asientoReversion = construirAsiento(comprobante, "reversion");
          const guardado = await guardarAsiento(asientoReversion);
          if (!guardado) {
            throw new Error("No se pudo generar el asiento de reversion");
          }
        }
      }

      const { error } = await supabase
        .from("comprobantes_integrados")
        .update({ estado: "anulado" })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchComprobantes();
      toast({
        title: "Comprobante anulado",
        description: `El comprobante ${comprobante.numero} fue anulado con trazabilidad contable.`,
        variant: "destructive",
      });

      return true;
    } catch (error) {
      console.error("Error anulando comprobante:", error);
      toast({
        title: "Error al anular comprobante",
        description: "No se pudo anular el comprobante correctamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const resumen = useMemo(() => {
    const autorizados = comprobantes.filter((comprobante) => comprobante.estado === "autorizado");
    const totalIngresos = autorizados
      .filter((comprobante) => comprobante.tipo === "ingreso")
      .reduce((sum, comprobante) => sum + comprobante.monto, 0);
    const totalEgresos = autorizados
      .filter((comprobante) => comprobante.tipo === "egreso")
      .reduce((sum, comprobante) => sum + comprobante.monto, 0);

    return {
      totalIngresos,
      totalEgresos,
      saldoNeto: totalIngresos - totalEgresos,
    };
  }, [comprobantes]);

  return {
    comprobantes,
    loading,
    resumen,
    createComprobante,
    autorizarComprobante,
    anularComprobante,
    refetch: fetchComprobantes,
  };
};
