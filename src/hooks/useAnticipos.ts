import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AnticipoRow = Database["public"]["Tables"]["anticipos"]["Row"];
type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
type ProveedorRow = Database["public"]["Tables"]["proveedores"]["Row"];

export interface AnticipoContable {
  id: string;
  tipo: "cliente" | "proveedor";
  entidadId: string;
  entidadNombre: string;
  monto: number;
  saldoPendiente: number;
  fecha: string;
  concepto: string;
  estado: "activo" | "aplicado" | "anulado";
  fechaCreacion: string;
}

interface CrearAnticipoInput {
  tipo: "cliente" | "proveedor";
  entidadId: string;
  monto: number;
  concepto: string;
  fecha?: string;
}

const mapEstado = (estado: string | null): AnticipoContable["estado"] => {
  if (estado === "aplicado" || estado === "anulado") return estado;
  return "activo";
};

export const useAnticipos = () => {
  const [anticipos, setAnticipos] = useState<AnticipoContable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnticipos = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAnticipos([]);
        return;
      }

      const { data, error } = await supabase
        .from("anticipos")
        .select("id, tipo, cliente_id, proveedor_id, monto, saldo_pendiente, fecha, motivo, estado, created_at")
        .eq("user_id", user.id)
        .order("fecha", { ascending: false });

      if (error) throw error;

      const anticiposRows = (data || []) as AnticipoRow[];
      const clienteIds = [...new Set(anticiposRows.map((anticipo) => anticipo.cliente_id).filter(Boolean))] as string[];
      const proveedorIds = [...new Set(anticiposRows.map((anticipo) => anticipo.proveedor_id).filter(Boolean))] as string[];

      const [clientesResult, proveedoresResult] = await Promise.all([
        clienteIds.length > 0
          ? supabase.from("clientes").select("id, nombre").in("id", clienteIds)
          : Promise.resolve({ data: [] as Pick<ClienteRow, "id" | "nombre">[], error: null }),
        proveedorIds.length > 0
          ? supabase.from("proveedores").select("id, nombre").in("id", proveedorIds)
          : Promise.resolve({ data: [] as Pick<ProveedorRow, "id" | "nombre">[], error: null }),
      ]);

      if (clientesResult.error) throw clientesResult.error;
      if (proveedoresResult.error) throw proveedoresResult.error;

      const clientesMap = Object.fromEntries((clientesResult.data || []).map((cliente) => [cliente.id, cliente.nombre]));
      const proveedoresMap = Object.fromEntries((proveedoresResult.data || []).map((proveedor) => [proveedor.id, proveedor.nombre]));

      setAnticipos(
        anticiposRows.map((anticipo) => {
          const esCliente = anticipo.tipo.includes("cliente");
          const entidadId = esCliente ? anticipo.cliente_id || "" : anticipo.proveedor_id || "";
          const entidadNombre = esCliente
            ? clientesMap[anticipo.cliente_id || ""] || "Cliente sin nombre"
            : proveedoresMap[anticipo.proveedor_id || ""] || "Proveedor sin nombre";

          return {
            id: anticipo.id,
            tipo: esCliente ? "cliente" : "proveedor",
            entidadId,
            entidadNombre,
            monto: Number(anticipo.monto || 0),
            saldoPendiente: Number(anticipo.saldo_pendiente || 0),
            fecha: anticipo.fecha,
            concepto: anticipo.motivo,
            estado: mapEstado(anticipo.estado),
            fechaCreacion: anticipo.created_at,
          };
        })
      );
    } catch (error) {
      console.error("Error cargando anticipos:", error);
      setAnticipos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnticipos();
  }, [fetchAnticipos]);

  const crearAnticipo = useCallback(
    async ({ tipo, entidadId, monto, concepto, fecha }: CrearAnticipoInput): Promise<AnticipoContable | null> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return null;
        }

        const payload: Database["public"]["Tables"]["anticipos"]["Insert"] = {
          user_id: user.id,
          tipo: tipo === "cliente" ? "anticipo_cliente" : "anticipo_proveedor",
          fecha: fecha || new Date().toISOString().slice(0, 10),
          monto,
          saldo_pendiente: monto,
          monto_descontado: 0,
          motivo: concepto,
          estado: "activo",
          cliente_id: tipo === "cliente" ? entidadId : null,
          proveedor_id: tipo === "proveedor" ? entidadId : null,
          empleado_id: null,
        };

        const { data, error } = await supabase
          .from("anticipos")
          .insert(payload)
          .select("id, tipo, cliente_id, proveedor_id, monto, saldo_pendiente, fecha, motivo, estado, created_at")
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        await fetchAnticipos();

        const esCliente = data.tipo.includes("cliente");
        return {
          id: data.id,
          tipo: esCliente ? "cliente" : "proveedor",
          entidadId: esCliente ? data.cliente_id || "" : data.proveedor_id || "",
          entidadNombre: "",
          monto: Number(data.monto || 0),
          saldoPendiente: Number(data.saldo_pendiente || 0),
          fecha: data.fecha,
          concepto: data.motivo,
          estado: mapEstado(data.estado),
          fechaCreacion: data.created_at,
        };
      } catch (error) {
        console.error("Error creando anticipo:", error);
        return null;
      }
    },
    [fetchAnticipos]
  );

  return {
    anticipos,
    loading,
    crearAnticipo,
    refetch: fetchAnticipos,
  };
};
