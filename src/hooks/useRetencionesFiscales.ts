import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TipoRetencionFiscal = "rc_iva" | "it" | "rc_iva_it" | "rc_iva_servicios" | "it_alquileres" | "profesionales";
export type EstadoRetencionFiscal = "emitida" | "presentada" | "anulada";

export interface RetencionFiscal {
  id: string;
  numeroRetencion: string;
  fechaRetencion: string;
  nitRetenido: string;
  razonSocialRetenido: string;
  numeroFactura: string;
  fechaFactura: string;
  montoFactura: number;
  tipoRetencion: TipoRetencionFiscal;
  porcentajeRetencion: number;
  montoRetencion: number;
  codigoRetencion: string;
  estado: EstadoRetencionFiscal;
  observaciones: string;
  asientoId?: string | null;
  createdAt?: string;
}

interface RetencionFiscalRow {
  id: string;
  numero_retencion: string;
  fecha_retencion: string;
  nit_retenido: string;
  razon_social_retenido: string;
  numero_factura: string;
  fecha_factura: string;
  monto_factura: number;
  tipo_retencion: TipoRetencionFiscal;
  porcentaje_retencion: number;
  monto_retencion: number;
  codigo_retencion: string;
  estado: EstadoRetencionFiscal;
  observaciones: string | null;
  asiento_id: string | null;
  created_at: string;
}

const TABLE_NAME = "retenciones_fiscales" as never;

const mapRow = (row: RetencionFiscalRow): RetencionFiscal => ({
  id: row.id,
  numeroRetencion: row.numero_retencion,
  fechaRetencion: row.fecha_retencion,
  nitRetenido: row.nit_retenido,
  razonSocialRetenido: row.razon_social_retenido,
  numeroFactura: row.numero_factura,
  fechaFactura: row.fecha_factura,
  montoFactura: Number(row.monto_factura || 0),
  tipoRetencion: row.tipo_retencion,
  porcentajeRetencion: Number(row.porcentaje_retencion || 0),
  montoRetencion: Number(row.monto_retencion || 0),
  codigoRetencion: row.codigo_retencion,
  estado: row.estado,
  observaciones: row.observaciones || "",
  asientoId: row.asiento_id,
  createdAt: row.created_at,
});

export const useRetencionesFiscales = () => {
  const { toast } = useToast();
  const [retenciones, setRetenciones] = useState<RetencionFiscal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRetenciones = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRetenciones([]);
        return;
      }

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("id, numero_retencion, fecha_retencion, nit_retenido, razon_social_retenido, numero_factura, fecha_factura, monto_factura, tipo_retencion, porcentaje_retencion, monto_retencion, codigo_retencion, estado, observaciones, asiento_id, created_at")
        .eq("user_id", user.id)
        .order("fecha_retencion", { ascending: false });

      if (error) throw error;

      setRetenciones(((data as unknown as RetencionFiscalRow[]) || []).map(mapRow));
    } catch (error) {
      console.error("Error cargando retenciones fiscales:", error);
      setRetenciones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRetencion = useCallback(
    async (retencion: Omit<RetencionFiscal, "id" | "createdAt">) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Usuario no autenticado");

        const payload = {
          user_id: user.id,
          numero_retencion: retencion.numeroRetencion,
          fecha_retencion: retencion.fechaRetencion,
          nit_retenido: retencion.nitRetenido,
          razon_social_retenido: retencion.razonSocialRetenido,
          numero_factura: retencion.numeroFactura,
          fecha_factura: retencion.fechaFactura,
          monto_factura: retencion.montoFactura,
          tipo_retencion: retencion.tipoRetencion,
          porcentaje_retencion: retencion.porcentajeRetencion,
          monto_retencion: retencion.montoRetencion,
          codigo_retencion: retencion.codigoRetencion,
          estado: retencion.estado,
          observaciones: retencion.observaciones || null,
          asiento_id: retencion.asientoId || null,
        };

        const { data, error } = await supabase
          .from(TABLE_NAME)
          .insert(payload)
          .select("id, numero_retencion, fecha_retencion, nit_retenido, razon_social_retenido, numero_factura, fecha_factura, monto_factura, tipo_retencion, porcentaje_retencion, monto_retencion, codigo_retencion, estado, observaciones, asiento_id, created_at")
          .single();

        if (error) throw error;

        const created = mapRow(data as unknown as RetencionFiscalRow);
        setRetenciones((prev) => [created, ...prev]);

        toast({
          title: "Retencion registrada",
          description: `${created.numeroRetencion} quedo persistida en el sistema.`,
        });

        return created;
      } catch (error) {
        console.error("Error creando retencion fiscal:", error);
        toast({
          title: "No se pudo registrar la retencion",
          description: "La operacion fallo al persistirse en la base de datos.",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast],
  );

  const updateRetencionEstado = useCallback(
    async (id: string, estado: EstadoRetencionFiscal) => {
      try {
        const { error } = await supabase.from(TABLE_NAME).update({ estado }).eq("id", id);
        if (error) throw error;

        setRetenciones((prev) => prev.map((item) => (item.id === id ? { ...item, estado } : item)));
        toast({
          title: "Estado actualizado",
          description: `La retencion fue marcada como ${estado}.`,
        });
        return true;
      } catch (error) {
        console.error("Error actualizando retencion:", error);
        toast({
          title: "No se pudo actualizar la retencion",
          description: "Revisa la conexion con la base de datos.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast],
  );

  useEffect(() => {
    void fetchRetenciones();
  }, [fetchRetenciones]);

  return {
    retenciones,
    loading,
    createRetencion,
    updateRetencionEstado,
    refetch: fetchRetenciones,
  };
};
