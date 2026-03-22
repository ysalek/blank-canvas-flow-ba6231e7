import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type EstadoPlanilla = "borrador" | "aprobada" | "pagada";

export interface RCIVACalculado {
  baseImponible: number;
  impuesto: number;
  creditoFiscal: number;
  saldoPagar: number;
}

export interface FacturaRCIVANomina {
  id: string;
  empleadoId: string;
  periodo: string;
  numeroFactura: string;
  nitProveedor: string;
  razonSocial: string;
  fecha: string;
  importeTotal: number;
  codigoControl: string;
  createdAt?: string;
}

export interface DetallePlanillaNomina {
  id?: string;
  empleadoId: string;
  empleado: {
    id: string;
    nombre: string;
    apellido: string;
    ci: string;
    cargo: string;
    departamento: string;
    fechaIngreso: string;
  };
  salarioBase: number;
  ingresos: Record<string, number>;
  descuentos: Record<string, number>;
  aportesPatronales: Record<string, number>;
  totalIngresos: number;
  totalDescuentos: number;
  totalAportesPatronales: number;
  salarioNeto: number;
  rciva?: RCIVACalculado;
}

export interface PlanillaNominaAuditada {
  id: string;
  periodo: string;
  fechaGeneracion: string;
  fechaPago: string;
  estado: EstadoPlanilla;
  totalIngresos: number;
  totalDescuentos: number;
  totalAportesPatronales: number;
  totalNeto: number;
  totalRCIVA: number;
  observaciones: string;
  asientoId?: string | null;
  empleados: DetallePlanillaNomina[];
  createdAt?: string;
}

interface PlanillaRow {
  id: string;
  periodo: string;
  fecha_generacion: string;
  fecha_pago: string | null;
  estado: EstadoPlanilla;
  total_ingresos: number;
  total_descuentos: number;
  total_aportes_patronales: number;
  total_neto: number;
  total_rciva: number;
  observaciones: string | null;
  asiento_id: string | null;
  created_at: string;
}

interface PlanillaDetalleRow {
  id: string;
  planilla_id: string;
  empleado_id: string | null;
  nombre_empleado: string;
  ci_empleado: string;
  cargo: string;
  departamento: string;
  fecha_ingreso: string;
  salario_base: number;
  ingresos: Record<string, number> | null;
  descuentos: Record<string, number> | null;
  aportes_patronales: Record<string, number> | null;
  total_ingresos: number;
  total_descuentos: number;
  total_aportes_patronales: number;
  salario_neto: number;
  rciva: RCIVACalculado | null;
}

interface FacturaRow {
  id: string;
  empleado_id: string;
  periodo: string;
  numero_factura: string;
  nit_proveedor: string;
  razon_social: string;
  fecha: string;
  importe_total: number;
  codigo_control: string;
  created_at: string;
}

const PLANILLAS_TABLE = "nomina_planillas" as never;
const DETALLES_TABLE = "nomina_planilla_detalles" as never;
const FACTURAS_TABLE = "nomina_facturas_rciva" as never;

const round = (value: number) => Number(value.toFixed(2));

const mapFactura = (row: FacturaRow): FacturaRCIVANomina => ({
  id: row.id,
  empleadoId: row.empleado_id,
  periodo: row.periodo,
  numeroFactura: row.numero_factura,
  nitProveedor: row.nit_proveedor,
  razonSocial: row.razon_social,
  fecha: row.fecha,
  importeTotal: Number(row.importe_total || 0),
  codigoControl: row.codigo_control,
  createdAt: row.created_at,
});

const mapPlanilla = (row: PlanillaRow, detalles: PlanillaDetalleRow[]): PlanillaNominaAuditada => ({
  id: row.id,
  periodo: row.periodo,
  fechaGeneracion: row.fecha_generacion,
  fechaPago: row.fecha_pago || "",
  estado: row.estado,
  totalIngresos: Number(row.total_ingresos || 0),
  totalDescuentos: Number(row.total_descuentos || 0),
  totalAportesPatronales: Number(row.total_aportes_patronales || 0),
  totalNeto: Number(row.total_neto || 0),
  totalRCIVA: Number(row.total_rciva || 0),
  observaciones: row.observaciones || "",
  asientoId: row.asiento_id,
  createdAt: row.created_at,
  empleados: detalles.map((detalle) => ({
    id: detalle.id,
    empleadoId: detalle.empleado_id || "",
    empleado: {
      id: detalle.empleado_id || "",
      nombre: detalle.nombre_empleado.split(" ").slice(0, -1).join(" ") || detalle.nombre_empleado,
      apellido: detalle.nombre_empleado.split(" ").slice(-1).join(" "),
      ci: detalle.ci_empleado,
      cargo: detalle.cargo,
      departamento: detalle.departamento,
      fechaIngreso: detalle.fecha_ingreso,
    },
    salarioBase: Number(detalle.salario_base || 0),
    ingresos: detalle.ingresos || {},
    descuentos: detalle.descuentos || {},
    aportesPatronales: detalle.aportes_patronales || {},
    totalIngresos: Number(detalle.total_ingresos || 0),
    totalDescuentos: Number(detalle.total_descuentos || 0),
    totalAportesPatronales: Number(detalle.total_aportes_patronales || 0),
    salarioNeto: Number(detalle.salario_neto || 0),
    rciva: detalle.rciva || undefined,
  })),
});

export const useNominaAuditable = () => {
  const { toast } = useToast();
  const [planillas, setPlanillas] = useState<PlanillaNominaAuditada[]>([]);
  const [facturasRCIVA, setFacturasRCIVA] = useState<FacturaRCIVANomina[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNomina = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setPlanillas([]);
        setFacturasRCIVA([]);
        return;
      }

      const [planillasResult, facturasResult] = await Promise.all([
        supabase
          .from(PLANILLAS_TABLE)
          .select("id, periodo, fecha_generacion, fecha_pago, estado, total_ingresos, total_descuentos, total_aportes_patronales, total_neto, total_rciva, observaciones, asiento_id, created_at")
          .eq("user_id", user.id)
          .order("periodo", { ascending: false }),
        supabase
          .from(FACTURAS_TABLE)
          .select("id, empleado_id, periodo, numero_factura, nit_proveedor, razon_social, fecha, importe_total, codigo_control, created_at")
          .eq("user_id", user.id)
          .order("fecha", { ascending: false }),
      ]);

      if (planillasResult.error) throw planillasResult.error;
      if (facturasResult.error) throw facturasResult.error;

      const planillasRows = (planillasResult.data as unknown as PlanillaRow[]) || [];
      const facturasRows = (facturasResult.data as unknown as FacturaRow[]) || [];

      let detallesRows: PlanillaDetalleRow[] = [];
      if (planillasRows.length > 0) {
        const { data, error } = await supabase
          .from(DETALLES_TABLE)
          .select("id, planilla_id, empleado_id, nombre_empleado, ci_empleado, cargo, departamento, fecha_ingreso, salario_base, ingresos, descuentos, aportes_patronales, total_ingresos, total_descuentos, total_aportes_patronales, salario_neto, rciva")
          .in("planilla_id", planillasRows.map((item) => item.id));

        if (error) throw error;
        detallesRows = (data as unknown as PlanillaDetalleRow[]) || [];
      }

      const detallesByPlanilla = detallesRows.reduce<Record<string, PlanillaDetalleRow[]>>((acc, detalle) => {
        if (!acc[detalle.planilla_id]) {
          acc[detalle.planilla_id] = [];
        }
        acc[detalle.planilla_id].push(detalle);
        return acc;
      }, {});

      setPlanillas(planillasRows.map((row) => mapPlanilla(row, detallesByPlanilla[row.id] || [])));
      setFacturasRCIVA(facturasRows.map(mapFactura));
    } catch (error) {
      console.error("Error cargando nomina auditable:", error);
      setPlanillas([]);
      setFacturasRCIVA([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createFacturaRCIVA = useCallback(
    async (factura: Omit<FacturaRCIVANomina, "id" | "createdAt">) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Usuario no autenticado");

        const payload = {
          user_id: user.id,
          empleado_id: factura.empleadoId,
          periodo: factura.periodo,
          numero_factura: factura.numeroFactura,
          nit_proveedor: factura.nitProveedor,
          razon_social: factura.razonSocial,
          fecha: factura.fecha,
          importe_total: round(factura.importeTotal),
          codigo_control: factura.codigoControl,
        };

        const { data, error } = await supabase
          .from(FACTURAS_TABLE)
          .insert(payload)
          .select("id, empleado_id, periodo, numero_factura, nit_proveedor, razon_social, fecha, importe_total, codigo_control, created_at")
          .single();

        if (error) throw error;

        const created = mapFactura(data as unknown as FacturaRow);
        setFacturasRCIVA((prev) => [created, ...prev]);

        toast({
          title: "Factura RC-IVA registrada",
          description: `${created.numeroFactura} quedo persistida para el periodo ${created.periodo}.`,
        });

        return created;
      } catch (error) {
        console.error("Error creando factura RC-IVA:", error);
        toast({
          title: "No se pudo registrar la factura",
          description: "Verifica la migracion de nomina y la conexion con la base de datos.",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast],
  );

  const createPlanilla = useCallback(
    async (planilla: Omit<PlanillaNominaAuditada, "id" | "createdAt">) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Usuario no autenticado");

        const payload = {
          user_id: user.id,
          periodo: planilla.periodo,
          fecha_generacion: planilla.fechaGeneracion,
          fecha_pago: planilla.fechaPago || null,
          estado: planilla.estado,
          total_ingresos: round(planilla.totalIngresos),
          total_descuentos: round(planilla.totalDescuentos),
          total_aportes_patronales: round(planilla.totalAportesPatronales),
          total_neto: round(planilla.totalNeto),
          total_rciva: round(planilla.totalRCIVA),
          observaciones: planilla.observaciones || null,
          asiento_id: planilla.asientoId || null,
        };

        const { data, error } = await supabase
          .from(PLANILLAS_TABLE)
          .insert(payload)
          .select("id, periodo, fecha_generacion, fecha_pago, estado, total_ingresos, total_descuentos, total_aportes_patronales, total_neto, total_rciva, observaciones, asiento_id, created_at")
          .single();

        if (error) throw error;

        const planillaId = (data as unknown as PlanillaRow).id;
        const detallesPayload = planilla.empleados.map((detalle) => ({
          planilla_id: planillaId,
          empleado_id: detalle.empleadoId || null,
          nombre_empleado: `${detalle.empleado.nombre} ${detalle.empleado.apellido}`.trim(),
          ci_empleado: detalle.empleado.ci,
          cargo: detalle.empleado.cargo,
          departamento: detalle.empleado.departamento,
          fecha_ingreso: detalle.empleado.fechaIngreso,
          salario_base: round(detalle.salarioBase),
          ingresos: detalle.ingresos,
          descuentos: detalle.descuentos,
          aportes_patronales: detalle.aportesPatronales,
          total_ingresos: round(detalle.totalIngresos),
          total_descuentos: round(detalle.totalDescuentos),
          total_aportes_patronales: round(detalle.totalAportesPatronales),
          salario_neto: round(detalle.salarioNeto),
          rciva: detalle.rciva || null,
        }));

        const { data: detallesData, error: detallesError } = await supabase
          .from(DETALLES_TABLE)
          .insert(detallesPayload)
          .select("id, planilla_id, empleado_id, nombre_empleado, ci_empleado, cargo, departamento, fecha_ingreso, salario_base, ingresos, descuentos, aportes_patronales, total_ingresos, total_descuentos, total_aportes_patronales, salario_neto, rciva");

        if (detallesError) {
          await supabase.from(PLANILLAS_TABLE).delete().eq("id", planillaId);
          throw detallesError;
        }

        const created = mapPlanilla(
          data as unknown as PlanillaRow,
          (detallesData as unknown as PlanillaDetalleRow[]) || [],
        );

        setPlanillas((prev) => [created, ...prev]);
        toast({
          title: "Planilla persistida",
          description: `La planilla ${created.periodo} quedo guardada en Supabase.`,
        });

        return created;
      } catch (error) {
        console.error("Error creando planilla:", error);
        toast({
          title: "No se pudo generar la planilla",
          description: "La planilla no pudo persistirse en la base de datos.",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast],
  );

  const updatePlanillaEstado = useCallback(
    async (
      id: string,
      updates: {
        estado: EstadoPlanilla;
        fechaPago?: string;
        observaciones?: string;
        totalRCIVA?: number;
        asientoId?: string | null;
      },
    ) => {
      try {
        const payload = {
          estado: updates.estado,
          fecha_pago: updates.fechaPago || null,
          observaciones: updates.observaciones ?? null,
          total_rciva: updates.totalRCIVA !== undefined ? round(updates.totalRCIVA) : undefined,
          asiento_id: updates.asientoId ?? null,
        };

        const { error } = await supabase.from(PLANILLAS_TABLE).update(payload).eq("id", id);
        if (error) throw error;

        setPlanillas((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  estado: updates.estado,
                  fechaPago: updates.fechaPago || "",
                  observaciones: updates.observaciones ?? item.observaciones,
                  totalRCIVA: updates.totalRCIVA !== undefined ? round(updates.totalRCIVA) : item.totalRCIVA,
                  asientoId: updates.asientoId ?? item.asientoId,
                }
              : item,
          ),
        );

        return true;
      } catch (error) {
        console.error("Error actualizando planilla:", error);
        toast({
          title: "No se pudo actualizar la planilla",
          description: "Revisa la conexion con la base de datos.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast],
  );

  useEffect(() => {
    void fetchNomina();
  }, [fetchNomina]);

  return {
    planillas,
    facturasRCIVA,
    loading,
    createFacturaRCIVA,
    createPlanilla,
    updatePlanillaEstado,
    refetch: fetchNomina,
  };
};
