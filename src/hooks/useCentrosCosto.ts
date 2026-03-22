import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CentroCostoOperativo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  responsable: string;
  presupuesto: number;
  presupuestoEjecutado: number;
  estado: "activo" | "inactivo";
  departamento: string;
  cuentasContables: string[];
  createdAt: string;
}

interface CentroCostoRow {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo: string | null;
  responsable?: string | null;
  presupuesto?: number | null;
  presupuesto_ejecutado?: number | null;
  estado?: "activo" | "inactivo" | null;
  departamento?: string | null;
  cuentas_contables?: unknown;
  created_at: string;
}

const TABLE_NAME = "centros_costo" as never;

const normalizeAccounts = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapCentro = (row: CentroCostoRow): CentroCostoOperativo => ({
  id: row.id,
  codigo: row.codigo,
  nombre: row.nombre,
  descripcion: row.descripcion || "",
  tipo: row.tipo || "operacional",
  responsable: row.responsable || "",
  presupuesto: Number(row.presupuesto || 0),
  presupuestoEjecutado: Number(row.presupuesto_ejecutado || 0),
  estado: row.estado || "activo",
  departamento: row.departamento || "",
  cuentasContables: normalizeAccounts(row.cuentas_contables),
  createdAt: row.created_at,
});

const defaultCentros: Omit<CentroCostoOperativo, "id" | "createdAt" | "presupuestoEjecutado">[] = [
  {
    codigo: "ADM001",
    nombre: "Administracion General",
    descripcion: "Gastos administrativos generales de la empresa",
    tipo: "administracion",
    responsable: "Gerencia General",
    presupuesto: 50000,
    estado: "activo",
    departamento: "Administracion",
    cuentasContables: ["5211", "5231", "5191"],
  },
  {
    codigo: "FIN001",
    nombre: "Gastos Financieros",
    descripcion: "Intereses y comisiones financieras",
    tipo: "financiero",
    responsable: "Contabilidad",
    presupuesto: 15000,
    estado: "activo",
    departamento: "Finanzas",
    cuentasContables: ["5291", "5261"],
  },
  {
    codigo: "VEN001",
    nombre: "Ventas y Comercial",
    descripcion: "Publicidad, comisiones y desarrollo comercial",
    tipo: "ventas",
    responsable: "Jefatura Comercial",
    presupuesto: 20000,
    estado: "activo",
    departamento: "Ventas",
    cuentasContables: ["5221", "5191"],
  },
  {
    codigo: "OPE001",
    nombre: "Operacion",
    descripcion: "Costos operativos y de produccion",
    tipo: "operacional",
    responsable: "Operaciones",
    presupuesto: 35000,
    estado: "activo",
    departamento: "Operaciones",
    cuentasContables: ["5111", "5251"],
  },
];

export const useCentrosCosto = () => {
  const { toast } = useToast();
  const [centrosCosto, setCentrosCosto] = useState<CentroCostoOperativo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCentros = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCentrosCosto([]);
        return;
      }

      const selectWithExtensions =
        "id, codigo, nombre, descripcion, tipo, responsable, presupuesto, presupuesto_ejecutado, estado, departamento, cuentas_contables, created_at";
      const baseSelect = "id, codigo, nombre, descripcion, tipo, created_at";

      let result = await supabase
        .from(TABLE_NAME)
        .select(selectWithExtensions)
        .eq("user_id", user.id)
        .order("codigo");

      if (result.error && JSON.stringify(result.error).toLowerCase().includes("responsable")) {
        result = await supabase
          .from(TABLE_NAME)
          .select(baseSelect)
          .eq("user_id", user.id)
          .order("codigo");
      }

      if (result.error) throw result.error;

      const rows = ((result.data as unknown as CentroCostoRow[]) || []).map(mapCentro);

      if (!rows.length) {
        const payload = defaultCentros.map((centro) => ({
          user_id: user.id,
          codigo: centro.codigo,
          nombre: centro.nombre,
          descripcion: centro.descripcion,
          tipo: centro.tipo,
          responsable: centro.responsable,
          presupuesto: centro.presupuesto,
          presupuesto_ejecutado: 0,
          estado: centro.estado,
          departamento: centro.departamento,
          cuentas_contables: centro.cuentasContables,
        }));

        let insertResult = await supabase.from(TABLE_NAME).insert(payload).select(selectWithExtensions);
        if (insertResult.error && JSON.stringify(insertResult.error).toLowerCase().includes("responsable")) {
          insertResult = await supabase
            .from(TABLE_NAME)
            .insert(
              payload.map((item) => ({
                user_id: item.user_id,
                codigo: item.codigo,
                nombre: item.nombre,
                descripcion: item.descripcion,
                tipo: item.tipo,
              })),
            )
            .select(baseSelect);
        }
        if (insertResult.error) throw insertResult.error;
        setCentrosCosto(((insertResult.data as unknown as CentroCostoRow[]) || []).map(mapCentro));
        return;
      }

      setCentrosCosto(rows);
    } catch (error) {
      console.error("Error cargando centros de costo:", error);
      toast({
        title: "No se pudieron cargar los centros de costo",
        description: "Revisa la conexion con la base de datos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveCentro = useCallback(
    async (centro: Omit<CentroCostoOperativo, "id" | "createdAt" | "presupuestoEjecutado"> & { id?: string }) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado");

        const payload = {
          codigo: centro.codigo,
          nombre: centro.nombre,
          descripcion: centro.descripcion,
          tipo: centro.tipo,
          responsable: centro.responsable || null,
          presupuesto: centro.presupuesto,
          departamento: centro.departamento || null,
          cuentas_contables: centro.cuentasContables,
          estado: centro.estado,
        };

        const selectWithExtensions =
          "id, codigo, nombre, descripcion, tipo, responsable, presupuesto, presupuesto_ejecutado, estado, departamento, cuentas_contables, created_at";
        const baseSelect = "id, codigo, nombre, descripcion, tipo, created_at";

        let result = centro.id
          ? await supabase.from(TABLE_NAME).update(payload).eq("id", centro.id).select(selectWithExtensions).single()
          : await supabase.from(TABLE_NAME).insert({ ...payload, user_id: user.id }).select(selectWithExtensions).single();

        if (result.error && JSON.stringify(result.error).toLowerCase().includes("responsable")) {
          const fallbackPayload = {
            codigo: centro.codigo,
            nombre: centro.nombre,
            descripcion: centro.descripcion,
            tipo: centro.tipo,
          };

          result = centro.id
            ? await supabase.from(TABLE_NAME).update(fallbackPayload).eq("id", centro.id).select(baseSelect).single()
            : await supabase.from(TABLE_NAME).insert({ ...fallbackPayload, user_id: user.id }).select(baseSelect).single();
        }

        if (result.error) throw result.error;

        const mapped = mapCentro(result.data as unknown as CentroCostoRow);
        setCentrosCosto((prev) => {
          const exists = prev.some((item) => item.id === mapped.id);
          return exists ? prev.map((item) => (item.id === mapped.id ? mapped : item)) : [...prev, mapped];
        });

        toast({
          title: centro.id ? "Centro actualizado" : "Centro creado",
          description: `${mapped.codigo} quedo persistido correctamente.`,
        });

        return mapped;
      } catch (error) {
        console.error("Error guardando centro de costo:", error);
        toast({
          title: "No se pudo guardar el centro de costo",
          description: "La operacion fallo en la base de datos.",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast],
  );

  const deleteCentro = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);
        if (error) throw error;
        setCentrosCosto((prev) => prev.filter((item) => item.id !== id));
        toast({ title: "Centro eliminado", description: "El centro de costo fue dado de baja." });
        return true;
      } catch (error) {
        console.error("Error eliminando centro de costo:", error);
        toast({
          title: "No se pudo eliminar el centro de costo",
          description: "Revisa si el centro tiene dependencia operativa.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast],
  );

  useEffect(() => {
    void fetchCentros();
  }, [fetchCentros]);

  return {
    centrosCosto,
    loading,
    saveCentro,
    deleteCentro,
    refetch: fetchCentros,
  };
};
