import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { EmpleadoSupabase, useSupabaseEmpleados } from "@/hooks/useSupabaseEmpleados";
import {
  DetallePlanillaNomina,
  FacturaRCIVANomina,
  PlanillaNominaAuditada,
  useNominaAuditable,
} from "@/hooks/useNominaAuditable";
import {
  Calculator,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Plus,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import * as XLSX from "@e965/xlsx";

type EstadoEmpleadoNomina = "activo" | "inactivo";
type TipoContrato = "indefinido" | "temporal" | "consultoria";

interface EmpleadoNomina {
  id: string;
  nombre: string;
  apellido: string;
  ci: string;
  cargo: string;
  departamento: string;
  fechaIngreso: string;
  salarioBase: number;
  telefono: string;
  email: string;
  cuentaBancaria: string;
  estado: EstadoEmpleadoNomina;
  tipoContrato: TipoContrato;
}

interface ConceptoNomina {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "ingreso" | "descuento" | "aporte_patronal";
  formula: string;
  porcentaje?: number;
  montoFijo?: number;
  activo: boolean;
}

interface RCIVAResultado {
  baseImponible: number;
  impuesto: number;
  creditoFiscal: number;
  saldoPagar: number;
}

const TABLA_BONO_ANTIGUEDAD = [
  { desde: 2, hasta: 4, porcentaje: 5 },
  { desde: 5, hasta: 7, porcentaje: 11 },
  { desde: 8, hasta: 10, porcentaje: 18 },
  { desde: 11, hasta: 14, porcentaje: 26 },
  { desde: 15, hasta: 19, porcentaje: 34 },
  { desde: 20, hasta: 24, porcentaje: 42 },
  { desde: 25, hasta: 99, porcentaje: 50 },
];

const SMN_2026 = 2500;
const MINIMO_NO_IMPONIBLE_RCIVA = SMN_2026 * 4;

const conceptosBasicos: ConceptoNomina[] = [
  { id: "haber_basico", codigo: "HB", nombre: "Haber Basico", tipo: "ingreso", formula: "salarioBase", activo: true },
  { id: "bono_antiguedad", codigo: "BA", nombre: "Bono de Antiguedad", tipo: "ingreso", formula: "bonoAntiguedad", activo: true },
  { id: "afp_jubilacion", codigo: "AFP-JUB", nombre: "AFP Aporte Vejez (10%)", tipo: "descuento", formula: "totalGanado * 0.10", porcentaje: 10, activo: true },
  { id: "afp_riesgo_comun", codigo: "AFP-RC", nombre: "AFP Riesgo Comun (1.71%)", tipo: "descuento", formula: "totalGanado * 0.0171", porcentaje: 1.71, activo: true },
  { id: "afp_comision", codigo: "AFP-COM", nombre: "AFP Comision (0.5%)", tipo: "descuento", formula: "totalGanado * 0.005", porcentaje: 0.5, activo: true },
  { id: "solidario", codigo: "SOL", nombre: "Aporte Solidario (0.5%)", tipo: "descuento", formula: "totalGanado * 0.005", porcentaje: 0.5, activo: true },
  { id: "caja_salud", codigo: "CNS", nombre: "Caja Nacional de Salud (10%)", tipo: "aporte_patronal", formula: "totalGanado * 0.10", porcentaje: 10, activo: true },
  { id: "riesgo_profesional", codigo: "RP-PAT", nombre: "Riesgo Profesional (1.71%)", tipo: "aporte_patronal", formula: "totalGanado * 0.0171", porcentaje: 1.71, activo: true },
  { id: "vivienda", codigo: "VIV", nombre: "Pro Vivienda (2%)", tipo: "aporte_patronal", formula: "totalGanado * 0.02", porcentaje: 2, activo: true },
  { id: "infocal", codigo: "INF", nombre: "INFOCAL (1%)", tipo: "aporte_patronal", formula: "totalGanado * 0.01", porcentaje: 1, activo: true },
  { id: "solidario_patronal", codigo: "SOL-PAT", nombre: "Aporte Solidario Patronal (3%)", tipo: "aporte_patronal", formula: "totalGanado * 0.03", porcentaje: 3, activo: true },
];

const round = (value: number) => Number(value.toFixed(2));

const currency = (value: number) =>
  new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const calcularBonoAntiguedad = (fechaIngreso: string) => {
  const ingreso = new Date(fechaIngreso);
  const hoy = new Date();
  const anios = Math.floor((hoy.getTime() - ingreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const tramo = TABLA_BONO_ANTIGUEDAD.find((item) => anios >= item.desde && anios <= item.hasta);
  return tramo ? round(SMN_2026 * 3 * (tramo.porcentaje / 100)) : 0;
};

const calcularRCIVA = (totalGanado: number, aportesLaborales: number, creditoFiscalFacturas = 0): RCIVAResultado => {
  if (totalGanado <= MINIMO_NO_IMPONIBLE_RCIVA) {
    return { baseImponible: 0, impuesto: 0, creditoFiscal: 0, saldoPagar: 0 };
  }

  const baseImponible = Math.max(0, totalGanado - SMN_2026 * 2 - aportesLaborales);
  const impuesto = round(baseImponible * 0.13);
  const creditoFiscal = round(creditoFiscalFacturas * 0.13);
  const saldoPagar = Math.max(0, round(impuesto - creditoFiscal));

  return { baseImponible: round(baseImponible), impuesto, creditoFiscal, saldoPagar };
};

const calcularConcepto = (concepto: ConceptoNomina, salarioBase: number, totalGanado: number) => {
  if (concepto.montoFijo !== undefined) return round(concepto.montoFijo);
  if (concepto.id === "haber_basico") return round(salarioBase);
  if (concepto.id === "bono_antiguedad") return 0;
  if (concepto.porcentaje) {
    const base = concepto.formula.includes("totalGanado") ? totalGanado : salarioBase;
    return round(base * (concepto.porcentaje / 100));
  }
  return 0;
};

const toEmpleadoNomina = (empleado: EmpleadoSupabase): EmpleadoNomina => ({
  id: empleado.id,
  nombre: empleado.nombres,
  apellido: empleado.apellidos,
  ci: empleado.ci,
  cargo: empleado.cargo,
  departamento: empleado.departamento,
  fechaIngreso: empleado.fecha_ingreso,
  salarioBase: Number(empleado.salario_base || 0),
  telefono: empleado.telefono || "",
  email: empleado.email || "",
  cuentaBancaria: "",
  estado: empleado.estado === "inactivo" ? "inactivo" : "activo",
  tipoContrato: "indefinido",
});

const buildPlanilla = (
  periodo: string,
  empleados: EmpleadoNomina[],
  conceptos: ConceptoNomina[],
  facturasRCIVA: FacturaRCIVANomina[],
): Omit<PlanillaNominaAuditada, "id" | "createdAt"> => {
  const detalles: DetallePlanillaNomina[] = [];
  let totalIngresos = 0;
  let totalDescuentos = 0;
  let totalAportesPatronales = 0;
  let totalNeto = 0;
  let totalRCIVA = 0;

  empleados.filter((empleado) => empleado.estado === "activo").forEach((empleado) => {
    const detalle: DetallePlanillaNomina = {
      empleadoId: empleado.id,
      empleado: {
        id: empleado.id,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        ci: empleado.ci,
        cargo: empleado.cargo,
        departamento: empleado.departamento,
        fechaIngreso: empleado.fechaIngreso,
      },
      salarioBase: empleado.salarioBase,
      ingresos: {},
      descuentos: {},
      aportesPatronales: {},
      totalIngresos: 0,
      totalDescuentos: 0,
      totalAportesPatronales: 0,
      salarioNeto: 0,
    };

    conceptos.filter((item) => item.tipo === "ingreso" && item.activo).forEach((concepto) => {
      const monto = concepto.id === "bono_antiguedad"
        ? calcularBonoAntiguedad(empleado.fechaIngreso)
        : calcularConcepto(concepto, empleado.salarioBase, 0);
      detalle.ingresos[concepto.id] = monto;
      detalle.totalIngresos += monto;
    });

    const totalGanado = round(detalle.totalIngresos);

    conceptos.filter((item) => item.tipo === "descuento" && item.activo).forEach((concepto) => {
      const monto = calcularConcepto(concepto, empleado.salarioBase, totalGanado);
      detalle.descuentos[concepto.id] = monto;
      detalle.totalDescuentos += monto;
    });

    conceptos.filter((item) => item.tipo === "aporte_patronal" && item.activo).forEach((concepto) => {
      const monto = calcularConcepto(concepto, empleado.salarioBase, totalGanado);
      detalle.aportesPatronales[concepto.id] = monto;
      detalle.totalAportesPatronales += monto;
    });

    const facturasEmpleado = facturasRCIVA.filter((factura) => factura.empleadoId === empleado.id && factura.periodo === periodo);
    const creditoFiscalFacturas = facturasEmpleado.reduce((sum, factura) => sum + factura.importeTotal, 0);
    const rciva = calcularRCIVA(totalGanado, detalle.totalDescuentos, creditoFiscalFacturas);
    detalle.rciva = rciva;

    if (rciva.saldoPagar > 0) {
      detalle.descuentos.rc_iva = rciva.saldoPagar;
      detalle.totalDescuentos += rciva.saldoPagar;
    }

    detalle.totalIngresos = round(detalle.totalIngresos);
    detalle.totalDescuentos = round(detalle.totalDescuentos);
    detalle.totalAportesPatronales = round(detalle.totalAportesPatronales);
    detalle.salarioNeto = round(detalle.totalIngresos - detalle.totalDescuentos);

    totalIngresos += detalle.totalIngresos;
    totalDescuentos += detalle.totalDescuentos;
    totalAportesPatronales += detalle.totalAportesPatronales;
    totalNeto += detalle.salarioNeto;
    totalRCIVA += rciva.saldoPagar;
    detalles.push(detalle);
  });

  return {
    periodo,
    fechaGeneracion: new Date().toISOString().slice(0, 10),
    fechaPago: "",
    estado: "borrador",
    totalIngresos: round(totalIngresos),
    totalDescuentos: round(totalDescuentos),
    totalAportesPatronales: round(totalAportesPatronales),
    totalNeto: round(totalNeto),
    totalRCIVA: round(totalRCIVA),
    observaciones: "Planilla generada desde nomina ejecutiva con calculo auditable.",
    empleados: detalles,
  };
};

const buildAsientoNomina = (planilla: PlanillaNominaAuditada) => {
  const totalRCIVA = planilla.empleados.reduce((sum, detalle) => sum + (detalle.descuentos.rc_iva || 0), 0);
  const totalRetencionesAFP = round(planilla.totalDescuentos - totalRCIVA);
  const totalDebe = round(planilla.totalIngresos + planilla.totalAportesPatronales);

  const cuentas = [
    { codigo: "6111", nombre: "Sueldos y Salarios", debe: planilla.totalIngresos, haber: 0 },
    { codigo: "6112", nombre: "Cargas Sociales Patronales", debe: planilla.totalAportesPatronales, haber: 0 },
    { codigo: "2151", nombre: "Sueldos por Pagar", debe: 0, haber: planilla.totalNeto },
    { codigo: "2152", nombre: "Retenciones Laborales por Pagar", debe: 0, haber: totalRetencionesAFP },
    { codigo: "2153", nombre: "Aportes Patronales por Pagar", debe: 0, haber: planilla.totalAportesPatronales },
  ];

  if (totalRCIVA > 0) {
    cuentas.push({ codigo: "2154", nombre: "RC-IVA Retenido por Pagar", debe: 0, haber: round(totalRCIVA) });
  }

  return {
    id: `${planilla.id}-asiento`,
    numero: `NOM-${planilla.periodo}`,
    fecha: new Date().toISOString().slice(0, 10),
    concepto: `Registro de planilla de sueldos y cargas sociales ${planilla.periodo}`,
    referencia: `Planilla-${planilla.id}`,
    debe: totalDebe,
    haber: totalDebe,
    estado: "registrado" as const,
    cuentas,
  };
};

const NominaModule = () => {
  const getTabFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("tab") || "planillas";
  };

  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();
  const { empleados: empleadosSupabase, loading: loadingEmpleados, crearEmpleado, actualizarEmpleado, generarNumeroEmpleado } = useSupabaseEmpleados();
  const { planillas, facturasRCIVA, loading: loadingNomina, createFacturaRCIVA, createPlanilla, updatePlanillaEstado } = useNominaAuditable();

  const [conceptos] = useState(conceptosBasicos);
  const [showEmpleadoForm, setShowEmpleadoForm] = useState(false);
  const [showPlanillaForm, setShowPlanillaForm] = useState(false);
  const [showFacturaForm, setShowFacturaForm] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<EmpleadoNomina | null>(null);
  const [selectedPlanillaId, setSelectedPlanillaId] = useState("");
  const [facturaPeriodo, setFacturaPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState(getTabFromUrl);

  const empleados = useMemo(() => empleadosSupabase.map(toEmpleadoNomina), [empleadosSupabase]);
  const selectedPlanilla = useMemo(() => planillas.find((item) => item.id === selectedPlanillaId) || planillas[0] || null, [planillas, selectedPlanillaId]);

  useEffect(() => {
    if (!selectedPlanillaId && planillas[0]) setSelectedPlanillaId(planillas[0].id);
  }, [planillas, selectedPlanillaId]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const periodo = urlParams.get("periodo");
    if (!periodo) return;
    const planilla = planillas.find((item) => item.periodo === periodo);
    if (planilla) {
      setSelectedPlanillaId(planilla.id);
    }
  }, [planillas]);

  useEffect(() => {
    const handlePopState = () => setActiveTab(getTabFromUrl());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const loading = loadingEmpleados || loadingNomina;
  const empleadosActivos = empleados.filter((empleado) => empleado.estado === "activo");
  const planillasPagadas = planillas.filter((planilla) => planilla.estado === "pagada");
  const planillasPendientes = planillas.filter((planilla) => planilla.estado !== "pagada");
  const totalNominaActual = planillas[0]?.totalNeto || 0;
  const totalRCIVAPeriodo = facturasRCIVA.filter((factura) => factura.periodo === facturaPeriodo).reduce((sum, factura) => sum + factura.importeTotal, 0);

  const resumenRCIVA = empleadosActivos.map((empleado) => {
    const totalGanado = round(empleado.salarioBase + calcularBonoAntiguedad(empleado.fechaIngreso));
    const aportesLaborales = round(totalGanado * 0.1271);
    const facturasEmpleado = facturasRCIVA.filter((factura) => factura.empleadoId === empleado.id && factura.periodo === facturaPeriodo);
    const creditoFacturas = facturasEmpleado.reduce((sum, factura) => sum + factura.importeTotal, 0);
    const rciva = calcularRCIVA(totalGanado, aportesLaborales, creditoFacturas);
    return { empleado, totalGanado, facturas: facturasEmpleado, rciva };
  });

  const guardarEmpleado = async (empleado: EmpleadoNomina) => {
    try {
      if (editingEmpleado) {
        await actualizarEmpleado(empleado.id, {
          nombres: empleado.nombre,
          apellidos: empleado.apellido,
          ci: empleado.ci,
          cargo: empleado.cargo,
          departamento: empleado.departamento,
          fecha_ingreso: empleado.fechaIngreso,
          salario_base: empleado.salarioBase,
          telefono: empleado.telefono || null,
          email: empleado.email || null,
          estado: empleado.estado,
        });
      } else {
        await crearEmpleado({
          numero_empleado: generarNumeroEmpleado(),
          nombres: empleado.nombre,
          apellidos: empleado.apellido,
          ci: empleado.ci,
          cargo: empleado.cargo,
          departamento: empleado.departamento,
          fecha_ingreso: empleado.fechaIngreso,
          fecha_nacimiento: "1990-01-01",
          salario_base: empleado.salarioBase,
          telefono: empleado.telefono || null,
          email: empleado.email || null,
          estado: empleado.estado,
          genero: null,
          estado_civil: null,
          beneficios: null,
        });
      }

      setShowEmpleadoForm(false);
      setEditingEmpleado(null);
      return true;
    } catch (error) {
      console.error("Error guardando empleado:", error);
      return false;
    }
  };

  const generarPlanilla = async (periodo: string) => {
    if (planillas.some((planilla) => planilla.periodo === periodo)) {
      toast({
        title: "Periodo ya generado",
        description: `La planilla ${periodo} ya existe en el sistema.`,
        variant: "destructive",
      });
      return false;
    }

    if (empleadosActivos.length === 0) {
      toast({
        title: "Sin empleados activos",
        description: "Debes tener empleados activos para generar una planilla.",
        variant: "destructive",
      });
      return false;
    }

    const planilla = buildPlanilla(periodo, empleados, conceptos, facturasRCIVA);
    const created = await createPlanilla(planilla);
    if (!created) return false;

    setSelectedPlanillaId(created.id);
    setShowPlanillaForm(false);
    return true;
  };

  const aprobarPlanilla = async (planilla: PlanillaNominaAuditada) => {
    const success = await updatePlanillaEstado(planilla.id, {
      estado: "aprobada",
      observaciones: "Planilla aprobada para desembolso y registro contable.",
      totalRCIVA: planilla.totalRCIVA,
    });

    if (success) {
      toast({
        title: "Planilla aprobada",
        description: `La planilla ${planilla.periodo} ya esta lista para pago.`,
      });
    }
  };

  const pagarPlanilla = async (planilla: PlanillaNominaAuditada) => {
    const asiento = buildAsientoNomina(planilla);
    const persisted = await guardarAsiento(asiento);
    if (!persisted) return;

    const success = await updatePlanillaEstado(planilla.id, {
      estado: "pagada",
      fechaPago: new Date().toISOString().slice(0, 10),
      observaciones: "Planilla pagada y registrada contablemente.",
      totalRCIVA: planilla.totalRCIVA,
    });

    if (success) {
      toast({
        title: "Planilla pagada",
        description: `La planilla ${planilla.periodo} quedo registrada y pagada.`,
      });
    }
  };

  const registrarFactura = async (factura: Omit<FacturaRCIVANomina, "id" | "createdAt">) => {
    const created = await createFacturaRCIVA(factura);
    if (!created) return false;
    setShowFacturaForm(false);
    return true;
  };

  const exportarPlanilla = (planilla: PlanillaNominaAuditada) => {
    const exportData = planilla.empleados.map((detalle) => ({
      CI: detalle.empleado.ci,
      "Nombre Completo": `${detalle.empleado.nombre} ${detalle.empleado.apellido}`.trim(),
      Cargo: detalle.empleado.cargo,
      "Salario Base": detalle.salarioBase,
      "Total Ingresos": detalle.totalIngresos,
      "Total Descuentos": detalle.totalDescuentos,
      "Aportes Patronales": detalle.totalAportesPatronales,
      "Salario Neto": detalle.salarioNeto,
      "RC-IVA Retenido": detalle.descuentos.rc_iva || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Planilla");
    XLSX.writeFile(workbook, `planilla_${planilla.periodo}.xlsx`);
  };

  const exportarFormulario110 = () => {
    const rows: (string | number)[][] = [
      ["FORMULARIO 110 - RC-IVA AGENTE DE RETENCION"],
      [`Periodo: ${facturaPeriodo}`],
      [`Fecha de generacion: ${new Date().toLocaleDateString("es-BO")}`],
      [""],
      [
        "N",
        "CI",
        "Nombre Completo",
        "Total Ganado",
        "Minimo No Imponible (2 SMN)",
        "Aportes Laborales",
        "Base Imponible",
        "Impuesto RC-IVA 13%",
        "Credito Fiscal",
        "Saldo a Retener",
        "Facturas",
      ],
    ];

    let totalRetenido = 0;
    resumenRCIVA.forEach((item, index) => {
      totalRetenido += item.rciva.saldoPagar;
      rows.push([
        index + 1,
        item.empleado.ci,
        `${item.empleado.apellido} ${item.empleado.nombre}`.trim(),
        item.totalGanado.toFixed(2),
        (SMN_2026 * 2).toFixed(2),
        (item.totalGanado * 0.1271).toFixed(2),
        item.rciva.baseImponible.toFixed(2),
        item.rciva.impuesto.toFixed(2),
        item.rciva.creditoFiscal.toFixed(2),
        item.rciva.saldoPagar.toFixed(2),
        item.facturas.length,
      ]);
    });

    rows.push([""]);
    rows.push(["", "", "TOTAL RETENIDO", "", "", "", "", "", "", totalRetenido.toFixed(2), ""]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "F110 RCIVA");
    XLSX.writeFile(workbook, `Formulario_110_RCIVA_${facturaPeriodo}.xlsx`);
  };

  const handleTabChange = (tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "nomina");
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_38%),linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#eff6ff_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="bg-slate-900 text-white hover:bg-slate-900">Nomina boliviana auditable</Badge>
            <div className="space-y-1">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Mesa ejecutiva de sueldos, RC-IVA y cargas sociales</h2>
              <p className="max-w-3xl text-sm text-slate-600">
                Este modulo ya trabaja con empleados, planillas y facturas RC-IVA persistidas en Supabase. Las planillas se calculan sin
                formulas dinamicas inseguras y el pago genera el asiento contable correspondiente.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-white/80" onClick={() => setShowEmpleadoForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo empleado
            </Button>
            <Button variant="outline" className="bg-white/80" onClick={() => setShowFacturaForm(true)}>
              <Receipt className="mr-2 h-4 w-4" />
              Factura RC-IVA
            </Button>
            <Button onClick={() => setShowPlanillaForm(true)}>
              <Calculator className="mr-2 h-4 w-4" />
              Generar planilla
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} title="Empleados activos" value={empleadosActivos.length.toString()} detail="Base laboral conectada" tone="sky" />
        <MetricCard icon={Wallet} title="Nomina actual" value={`Bs ${currency(totalNominaActual)}`} detail="Ultimo periodo calculado" tone="emerald" />
        <MetricCard icon={ShieldCheck} title="Planillas pagadas" value={planillasPagadas.length.toString()} detail="Historial con asiento" tone="amber" />
        <MetricCard icon={Receipt} title="Facturas RC-IVA" value={facturasRCIVA.filter((item) => item.periodo === facturaPeriodo).length.toString()} detail={`Credito fiscal Bs ${currency(totalRCIVAPeriodo)}`} tone="slate" />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap gap-2 rounded-2xl bg-slate-100 p-2">
          <TabsTrigger value="planillas" className="rounded-xl">Planillas</TabsTrigger>
          <TabsTrigger value="empleados" className="rounded-xl">Empleados</TabsTrigger>
          <TabsTrigger value="conceptos" className="rounded-xl">Conceptos</TabsTrigger>
          <TabsTrigger value="rciva" className="rounded-xl">RC-IVA</TabsTrigger>
        </TabsList>
        <TabsContent value="planillas" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="border-b bg-slate-50/70">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-slate-700" />
                  Periodos de nomina
                </CardTitle>
                <CardDescription>Cada planilla queda persistida por periodo, con estado y detalle de empleados.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[540px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Generacion</TableHead>
                        <TableHead className="text-right">Neto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planillas.map((planilla) => (
                        <TableRow key={planilla.id} className={selectedPlanilla?.id === planilla.id ? "bg-sky-50/60" : ""} onClick={() => setSelectedPlanillaId(planilla.id)}>
                          <TableCell className="font-medium">{planilla.periodo}</TableCell>
                          <TableCell>{new Date(planilla.fechaGeneracion).toLocaleDateString("es-BO")}</TableCell>
                          <TableCell className="text-right">Bs {currency(planilla.totalNeto)}</TableCell>
                          <TableCell><EstadoBadge estado={planilla.estado} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); exportarPlanilla(planilla); }}>
                                <Download className="h-4 w-4" />
                              </Button>
                              {planilla.estado === "borrador" && (
                                <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); void aprobarPlanilla(planilla); }}>
                                  Aprobar
                                </Button>
                              )}
                              {planilla.estado === "aprobada" && (
                                <Button size="sm" onClick={(event) => { event.stopPropagation(); void pagarPlanilla(planilla); }}>
                                  Pagar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!loading && planillas.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                            Todavia no hay planillas persistidas.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="border-b bg-slate-50/70">
                <CardTitle>Panel de control</CardTitle>
                <CardDescription>Estado operativo del frente laboral y tributario.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Listo para conciliacion</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-950">{planillasPagadas.length}</p>
                  <p className="text-sm text-emerald-800">Planillas ya pagadas con huella contable.</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-amber-700">Pendientes operativos</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-950">{planillasPendientes.length}</p>
                  <p className="text-sm text-amber-800">Planillas que aun requieren aprobacion o pago.</p>
                </div>
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-sky-700">RC-IVA del periodo</p>
                  <p className="mt-2 text-2xl font-semibold text-sky-950">Bs {currency(totalRCIVAPeriodo)}</p>
                  <p className="text-sm text-sky-800">Credito fiscal cargado para el periodo {facturaPeriodo}.</p>
                </div>
                <Separator />
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Normativa aplicada: SMN 2026 Bs {currency(SMN_2026)}, minimo no imponible RC-IVA 4 SMN.</p>
                  <p>Los descuentos y aportes salen de reglas fijas del sistema, sin uso de eval.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {selectedPlanilla && (
            <Card className="border-slate-200">
              <CardHeader className="border-b bg-white">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-xl">Detalle auditable de la planilla {selectedPlanilla.periodo}</CardTitle>
                    <CardDescription>
                      Generada el {new Date(selectedPlanilla.fechaGeneracion).toLocaleDateString("es-BO")} con {selectedPlanilla.empleados.length} empleados.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                    <Badge variant="outline">Ingresos Bs {currency(selectedPlanilla.totalIngresos)}</Badge>
                    <Badge variant="outline">Descuentos Bs {currency(selectedPlanilla.totalDescuentos)}</Badge>
                    <Badge variant="outline">Aportes Bs {currency(selectedPlanilla.totalAportesPatronales)}</Badge>
                    <Badge variant="outline">RC-IVA Bs {currency(selectedPlanilla.totalRCIVA)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[380px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                        <TableHead className="text-right">Descuentos</TableHead>
                        <TableHead className="text-right">Aportes</TableHead>
                        <TableHead className="text-right">Neto</TableHead>
                        <TableHead className="text-right">RC-IVA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPlanilla.empleados.map((detalle) => (
                        <TableRow key={detalle.id || detalle.empleadoId}>
                          <TableCell>
                            <div className="font-medium">{detalle.empleado.nombre} {detalle.empleado.apellido}</div>
                            <div className="text-xs text-slate-500">{detalle.empleado.ci}</div>
                          </TableCell>
                          <TableCell>{detalle.empleado.cargo}</TableCell>
                          <TableCell className="text-right">Bs {currency(detalle.totalIngresos)}</TableCell>
                          <TableCell className="text-right">Bs {currency(detalle.totalDescuentos)}</TableCell>
                          <TableCell className="text-right">Bs {currency(detalle.totalAportesPatronales)}</TableCell>
                          <TableCell className="text-right font-medium">Bs {currency(detalle.salarioNeto)}</TableCell>
                          <TableCell className="text-right">Bs {currency(detalle.descuentos.rc_iva || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="empleados">
          <Card className="border-slate-200">
            <CardHeader className="border-b bg-slate-50/70">
              <CardTitle>Base laboral conectada</CardTitle>
              <CardDescription>La nomina toma empleados desde la tabla persistida del sistema.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>CI</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Salario Base</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleados.map((empleado) => (
                    <TableRow key={empleado.id}>
                      <TableCell className="font-medium">{empleado.nombre} {empleado.apellido}</TableCell>
                      <TableCell>{empleado.ci}</TableCell>
                      <TableCell>{empleado.departamento}</TableCell>
                      <TableCell>{empleado.cargo}</TableCell>
                      <TableCell className="text-right">Bs {currency(empleado.salarioBase)}</TableCell>
                      <TableCell><Badge variant={empleado.estado === "activo" ? "default" : "secondary"}>{empleado.estado}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => { setEditingEmpleado(empleado); setShowEmpleadoForm(true); }}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="conceptos">
          <Card className="border-slate-200">
            <CardHeader className="border-b bg-slate-50/70">
              <CardTitle>Motor de calculo boliviano</CardTitle>
              <CardDescription>Conceptos base de la nomina cargados con formulas controladas y auditables.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead className="text-right">Porcentaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conceptos.map((concepto) => (
                    <TableRow key={concepto.id}>
                      <TableCell className="font-medium">{concepto.codigo}</TableCell>
                      <TableCell>{concepto.nombre}</TableCell>
                      <TableCell>
                        <Badge variant={concepto.tipo === "ingreso" ? "default" : concepto.tipo === "descuento" ? "destructive" : "secondary"}>
                          {concepto.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{concepto.formula}</TableCell>
                      <TableCell className="text-right">{concepto.porcentaje ? `${concepto.porcentaje}%` : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rciva" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="border-b bg-slate-50/70">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>RC-IVA y Formulario 110</CardTitle>
                  <CardDescription>
                    Facturas personales del dependiente persistidas por periodo. Minimo no imponible: 4 SMN = Bs {currency(MINIMO_NO_IMPONIBLE_RCIVA)}.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label>Periodo</Label>
                    <Input type="month" value={facturaPeriodo} onChange={(event) => setFacturaPeriodo(event.target.value)} className="w-48 bg-white" />
                  </div>
                  <Button variant="outline" onClick={() => setShowFacturaForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar factura
                  </Button>
                  <Button onClick={exportarFormulario110}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar F-110
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-sky-200 bg-sky-50">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-700">Facturas del periodo</p>
                    <p className="mt-2 text-2xl font-semibold text-sky-950">{facturasRCIVA.filter((item) => item.periodo === facturaPeriodo).length}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Credito fiscal base</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-950">Bs {currency(totalRCIVAPeriodo)}</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Retencion estimada</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-950">
                      Bs {currency(resumenRCIVA.reduce((sum, item) => sum + item.rciva.saldoPagar, 0))}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Total Ganado</TableHead>
                    <TableHead className="text-right">Base Imponible</TableHead>
                    <TableHead className="text-right">RC-IVA 13%</TableHead>
                    <TableHead className="text-right">Credito Fiscal</TableHead>
                    <TableHead className="text-right">Saldo a Retener</TableHead>
                    <TableHead className="text-right">Facturas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumenRCIVA.map((item) => (
                    <TableRow key={item.empleado.id}>
                      <TableCell className="font-medium">{item.empleado.nombre} {item.empleado.apellido}</TableCell>
                      <TableCell className="text-right">Bs {currency(item.totalGanado)}</TableCell>
                      <TableCell className="text-right">Bs {currency(item.rciva.baseImponible)}</TableCell>
                      <TableCell className="text-right">Bs {currency(item.rciva.impuesto)}</TableCell>
                      <TableCell className="text-right">Bs {currency(item.rciva.creditoFiscal)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.rciva.saldoPagar > 0 ? <span className="text-rose-600">Bs {currency(item.rciva.saldoPagar)}</span> : <span className="text-slate-500">Bs 0.00</span>}
                      </TableCell>
                      <TableCell className="text-right">{item.facturas.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="rounded-2xl border border-slate-200">
                <div className="border-b px-4 py-3">
                  <h4 className="font-semibold text-slate-900">Facturas registradas del periodo {facturaPeriodo}</h4>
                </div>
                <div className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Factura</TableHead>
                        <TableHead>NIT</TableHead>
                        <TableHead>Razon Social</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturasRCIVA.filter((factura) => factura.periodo === facturaPeriodo).map((factura) => {
                        const empleado = empleados.find((item) => item.id === factura.empleadoId);
                        return (
                          <TableRow key={factura.id}>
                            <TableCell>{empleado ? `${empleado.nombre} ${empleado.apellido}` : "N/D"}</TableCell>
                            <TableCell>{factura.numeroFactura}</TableCell>
                            <TableCell>{factura.nitProveedor}</TableCell>
                            <TableCell>{factura.razonSocial}</TableCell>
                            <TableCell>{new Date(factura.fecha).toLocaleDateString("es-BO")}</TableCell>
                            <TableCell className="text-right">Bs {currency(factura.importeTotal)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {facturasRCIVA.filter((factura) => factura.periodo === facturaPeriodo).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                            Aun no hay facturas RC-IVA cargadas para este periodo.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EmpleadoForm
        open={showEmpleadoForm}
        empleado={editingEmpleado}
        onOpenChange={(open) => {
          setShowEmpleadoForm(open);
          if (!open) setEditingEmpleado(null);
        }}
        onSave={guardarEmpleado}
      />

      <PlanillaForm open={showPlanillaForm} onOpenChange={setShowPlanillaForm} onGenerar={generarPlanilla} />

      <Dialog open={showFacturaForm} onOpenChange={setShowFacturaForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Registrar factura RC-IVA</DialogTitle>
            <DialogDescription>El comprobante queda persistido y alimenta la retencion del periodo.</DialogDescription>
          </DialogHeader>
          <FacturaRCIVAForm empleados={empleadosActivos} periodo={facturaPeriodo} onSave={registrarFactura} />
        </DialogContent>
      </Dialog>

      {loading && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-slate-500">
            <CalendarDays className="h-4 w-4" />
            Cargando informacion persistida de nomina...
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const MetricCard = ({
  icon: Icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: typeof Users;
  title: string;
  value: string;
  detail: string;
  tone: "sky" | "emerald" | "amber" | "slate";
}) => {
  const toneClasses = {
    sky: "border-sky-200 bg-sky-50 text-sky-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    slate: "border-slate-200 bg-slate-50 text-slate-950",
  };

  return (
    <Card className={toneClasses[tone]}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-600">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-sm text-slate-600">{detail}</p>
          </div>
          <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EstadoBadge = ({ estado }: { estado: PlanillaNominaAuditada["estado"] }) => {
  if (estado === "pagada") return <Badge className="bg-emerald-600 hover:bg-emerald-600">pagada</Badge>;
  if (estado === "aprobada") return <Badge variant="secondary">aprobada</Badge>;
  return <Badge variant="outline">borrador</Badge>;
};

const EmpleadoForm = ({
  open,
  onOpenChange,
  empleado,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleado: EmpleadoNomina | null;
  onSave: (empleado: EmpleadoNomina) => Promise<boolean>;
}) => {
  const [formData, setFormData] = useState<EmpleadoNomina>({
    id: "",
    nombre: "",
    apellido: "",
    ci: "",
    cargo: "",
    departamento: "",
    fechaIngreso: new Date().toISOString().slice(0, 10),
    salarioBase: 0,
    telefono: "",
    email: "",
    cuentaBancaria: "",
    estado: "activo",
    tipoContrato: "indefinido",
  });
 
  useEffect(() => {
    if (empleado) {
      setFormData(empleado);
      return;
    }

    setFormData({
      id: "",
      nombre: "",
      apellido: "",
      ci: "",
      cargo: "",
      departamento: "",
      fechaIngreso: new Date().toISOString().slice(0, 10),
      salarioBase: 0,
      telefono: "",
      email: "",
      cuentaBancaria: "",
      estado: "activo",
      tipoContrato: "indefinido",
    });
  }, [empleado]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await onSave(formData);
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{empleado ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
          <DialogDescription>Actualiza la ficha laboral que alimenta la nomina.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre"><Input value={formData.nombre} onChange={(event) => setFormData((prev) => ({ ...prev, nombre: event.target.value }))} required /></Field>
            <Field label="Apellido"><Input value={formData.apellido} onChange={(event) => setFormData((prev) => ({ ...prev, apellido: event.target.value }))} required /></Field>
            <Field label="CI"><Input value={formData.ci} onChange={(event) => setFormData((prev) => ({ ...prev, ci: event.target.value }))} required /></Field>
            <Field label="Cargo"><Input value={formData.cargo} onChange={(event) => setFormData((prev) => ({ ...prev, cargo: event.target.value }))} required /></Field>
            <Field label="Departamento"><Input value={formData.departamento} onChange={(event) => setFormData((prev) => ({ ...prev, departamento: event.target.value }))} required /></Field>
            <Field label="Fecha de ingreso"><Input type="date" value={formData.fechaIngreso} onChange={(event) => setFormData((prev) => ({ ...prev, fechaIngreso: event.target.value }))} required /></Field>
            <Field label="Salario base"><Input type="number" step="0.01" value={formData.salarioBase} onChange={(event) => setFormData((prev) => ({ ...prev, salarioBase: Number(event.target.value) || 0 }))} required /></Field>
            <Field label="Tipo de contrato">
              <Select value={formData.tipoContrato} onValueChange={(value) => setFormData((prev) => ({ ...prev, tipoContrato: value as TipoContrato }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                  <SelectItem value="temporal">Temporal</SelectItem>
                  <SelectItem value="consultoria">Consultoria</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Telefono"><Input value={formData.telefono} onChange={(event) => setFormData((prev) => ({ ...prev, telefono: event.target.value }))} /></Field>
            <Field label="Email"><Input type="email" value={formData.email} onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))} /></Field>
            <Field label="Cuenta bancaria"><Input value={formData.cuentaBancaria} onChange={(event) => setFormData((prev) => ({ ...prev, cuentaBancaria: event.target.value }))} /></Field>
            <Field label="Estado">
              <Select value={formData.estado} onValueChange={(value) => setFormData((prev) => ({ ...prev, estado: value as EstadoEmpleadoNomina }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{empleado ? "Actualizar" : "Guardar"} empleado</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const PlanillaForm = ({
  open,
  onOpenChange,
  onGenerar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerar: (periodo: string) => Promise<boolean>;
}) => {
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await onGenerar(periodo);
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar planilla auditable</DialogTitle>
          <DialogDescription>Se calculara sobre empleados activos y facturas RC-IVA del periodo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Periodo">
            <Input type="month" value={periodo} onChange={(event) => setPeriodo(event.target.value)} required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Generar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const FacturaRCIVAForm = ({
  empleados,
  periodo,
  onSave,
}: {
  empleados: EmpleadoNomina[];
  periodo: string;
  onSave: (factura: Omit<FacturaRCIVANomina, "id" | "createdAt">) => Promise<boolean>;
}) => {
  const [formData, setFormData] = useState<Omit<FacturaRCIVANomina, "id" | "createdAt">>({
    empleadoId: "",
    periodo,
    numeroFactura: "",
    nitProveedor: "",
    razonSocial: "",
    fecha: new Date().toISOString().slice(0, 10),
    importeTotal: 0,
    codigoControl: "",
  });

  useEffect(() => {
    setFormData((prev) => ({ ...prev, periodo }));
  }, [periodo]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Empleado">
        <Select value={formData.empleadoId} onValueChange={(value) => setFormData((prev) => ({ ...prev, empleadoId: value }))}>
          <SelectTrigger><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger>
          <SelectContent>
            {empleados.map((empleado) => (
              <SelectItem key={empleado.id} value={empleado.id}>
                {empleado.nombre} {empleado.apellido}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Numero de factura"><Input value={formData.numeroFactura} onChange={(event) => setFormData((prev) => ({ ...prev, numeroFactura: event.target.value }))} required /></Field>
        <Field label="NIT proveedor"><Input value={formData.nitProveedor} onChange={(event) => setFormData((prev) => ({ ...prev, nitProveedor: event.target.value }))} required /></Field>
        <Field label="Razon social"><Input value={formData.razonSocial} onChange={(event) => setFormData((prev) => ({ ...prev, razonSocial: event.target.value }))} required /></Field>
        <Field label="Fecha"><Input type="date" value={formData.fecha} onChange={(event) => setFormData((prev) => ({ ...prev, fecha: event.target.value }))} required /></Field>
        <Field label="Importe total"><Input type="number" step="0.01" value={formData.importeTotal} onChange={(event) => setFormData((prev) => ({ ...prev, importeTotal: Number(event.target.value) || 0 }))} required /></Field>
        <Field label="Codigo de control"><Input value={formData.codigoControl} onChange={(event) => setFormData((prev) => ({ ...prev, codigoControl: event.target.value }))} required /></Field>
      </div>
      <Field label="Periodo"><Input value={formData.periodo} disabled /></Field>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">La factura se utilizara para compensar credito fiscal RC-IVA del dependiente en el periodo seleccionado.</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit">Registrar factura</Button>
      </div>
    </form>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);

export default NominaModule;
