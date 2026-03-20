import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useSupabaseEmpleados, EmpleadoSupabase } from "@/hooks/useSupabaseEmpleados";
import { 
  Users, 
  Plus, 
  Edit, 
  Calculator, 
  DollarSign, 
  Calendar,
  FileText,
  Download
} from "lucide-react";
import * as XLSX from '@e965/xlsx';

interface Empleado {
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
  estado: 'activo' | 'inactivo';
  tipoContrato: 'indefinido' | 'temporal' | 'consultoria';
}

interface ConceptoNomina {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'ingreso' | 'descuento' | 'aporte_patronal';
  formula: string;
  porcentaje?: number;
  montoFijo?: number;
  activo: boolean;
}

interface PlanillaNomina {
  id: string;
  periodo: string; // YYYY-MM
  fechaGeneracion: string;
  fechaPago: string;
  estado: 'borrador' | 'aprobada' | 'pagada';
  totalIngresos: number;
  totalDescuentos: number;
  totalAportesPatronales: number;
  totalNeto: number;
  empleados: DetalleNomina[];
}

interface FacturaRCIVA {
  id: string;
  empleadoId: string;
  periodo: string; // YYYY-MM
  numeroFactura: string;
  nitProveedor: string;
  razonSocial: string;
  fecha: string;
  importeTotal: number;
  codigoControl: string;
}

interface DetalleNomina {
  empleadoId: string;
  empleado: Empleado;
  salarioBase: number;
  ingresos: { [conceptoId: string]: number };
  descuentos: { [conceptoId: string]: number };
  aportesPatronales: { [conceptoId: string]: number };
  totalIngresos: number;
  totalDescuentos: number;
  totalAportesPatronales: number;
  salarioNeto: number;
  rciva?: { baseImponible: number; impuesto: number; creditoFiscal: number; saldoPagar: number };
}

// Bono de Antigüedad según DS 21060 - Tabla oficial sobre 3 SMN (Bs 2,500 × 3 = Bs 7,500 para 2026)
const TABLA_BONO_ANTIGUEDAD = [
  { desde: 2, hasta: 4, porcentaje: 5 },
  { desde: 5, hasta: 7, porcentaje: 11 },
  { desde: 8, hasta: 10, porcentaje: 18 },
  { desde: 11, hasta: 14, porcentaje: 26 },
  { desde: 15, hasta: 19, porcentaje: 34 },
  { desde: 20, hasta: 24, porcentaje: 42 },
  { desde: 25, hasta: 99, porcentaje: 50 },
];

const SMN_2026 = 2500; // Salario Mínimo Nacional estimado 2026
const MINIMO_NO_IMPONIBLE_RCIVA = SMN_2026 * 4; // 4 SMN = Bs 10,000

const calcularBonoAntiguedad = (fechaIngreso: string): number => {
  const ingreso = new Date(fechaIngreso);
  const hoy = new Date();
  const anios = Math.floor((hoy.getTime() - ingreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const tramo = TABLA_BONO_ANTIGUEDAD.find(t => anios >= t.desde && anios <= t.hasta);
  if (!tramo) return 0;
  // Se calcula sobre 3 SMN, no sobre el salario base
  return (SMN_2026 * 3) * (tramo.porcentaje / 100);
};

// RC-IVA: 13% sobre (Total Ganado - 2 SMN - Aportes Laborales) si Total Ganado > 4 SMN
// El empleado puede compensar con facturas de compras personales (Crédito Fiscal)
const calcularRCIVA = (totalGanado: number, aportesLaborales: number, creditoFiscalFacturas: number = 0): { baseImponible: number; impuesto: number; creditoFiscal: number; saldoPagar: number } => {
  if (totalGanado <= MINIMO_NO_IMPONIBLE_RCIVA) {
    return { baseImponible: 0, impuesto: 0, creditoFiscal: 0, saldoPagar: 0 };
  }
  // Base imponible = Total Ganado - 2 SMN - Aportes laborales
  const baseImponible = Math.max(0, totalGanado - (SMN_2026 * 2) - aportesLaborales);
  const impuesto = Number((baseImponible * 0.13).toFixed(2));
  // El 13% de 2 SMN se compensa automáticamente (mínimo no imponible)
  const creditoFiscal13Porciento = Number((creditoFiscalFacturas * 0.13).toFixed(2));
  const saldoPagar = Math.max(0, Number((impuesto - creditoFiscal13Porciento).toFixed(2)));
  return { baseImponible, impuesto, creditoFiscal: creditoFiscal13Porciento, saldoPagar };
};

const conceptosBasicos: ConceptoNomina[] = [
  {
    id: 'haber_basico',
    codigo: 'HB',
    nombre: 'Haber Básico',
    tipo: 'ingreso',
    formula: 'salarioBase',
    activo: true
  },
  {
    id: 'bono_antiguedad',
    codigo: 'BA',
    nombre: 'Bono de Antigüedad (DS 21060)',
    tipo: 'ingreso',
    formula: 'bonoAntiguedad', // Calculado por tabla, no por porcentaje fijo
    activo: true
  },
  // ── DESCUENTOS LABORALES (total 12.71%) ──
  {
    id: 'afp_jubilacion',
    codigo: 'AFP-JUB',
    nombre: 'AFP Aporte Vejez (10%)',
    tipo: 'descuento',
    formula: 'totalGanado * 0.10',
    porcentaje: 10,
    activo: true
  },
  {
    id: 'afp_riesgo_comun',
    codigo: 'AFP-RC',
    nombre: 'AFP Riesgo Común (1.71%)',
    tipo: 'descuento',
    formula: 'totalGanado * 0.0171',
    porcentaje: 1.71,
    activo: true
  },
  {
    id: 'afp_comision',
    codigo: 'AFP-COM',
    nombre: 'AFP Comisión (0.5%)',
    tipo: 'descuento',
    formula: 'totalGanado * 0.005',
    porcentaje: 0.5,
    activo: true
  },
  {
    id: 'solidario',
    codigo: 'SOL',
    nombre: 'Aporte Solidario (0.5%)',
    tipo: 'descuento',
    formula: 'totalGanado * 0.005',
    porcentaje: 0.5,
    activo: true
  },
  // ── APORTES PATRONALES ──
  {
    id: 'caja_salud',
    codigo: 'CNS',
    nombre: 'Caja Nacional de Salud (10%)',
    tipo: 'aporte_patronal',
    formula: 'totalGanado * 0.10',
    porcentaje: 10,
    activo: true
  },
  {
    id: 'riesgo_profesional',
    codigo: 'RP-PAT',
    nombre: 'Riesgo Profesional (1.71%)',
    tipo: 'aporte_patronal',
    formula: 'totalGanado * 0.0171',
    porcentaje: 1.71,
    activo: true
  },
  {
    id: 'vivienda',
    codigo: 'VIV',
    nombre: 'Pro Vivienda (2%)',
    tipo: 'aporte_patronal',
    formula: 'totalGanado * 0.02',
    porcentaje: 2,
    activo: true
  },
  {
    id: 'infocal',
    codigo: 'INF',
    nombre: 'INFOCAL (1%)',
    tipo: 'aporte_patronal',
    formula: 'totalGanado * 0.01',
    porcentaje: 1,
    activo: true
  },
  {
    id: 'solidario_patronal',
    codigo: 'SOL-PAT',
    nombre: 'Aporte Solidario Patronal (3%)',
    tipo: 'aporte_patronal',
    formula: 'totalGanado * 0.03',
    porcentaje: 3,
    activo: true
  }
];

const NominaModule = () => {
  const { empleados: empleadosSupabase, loading: loadingEmpleados, crearEmpleado, actualizarEmpleado } = useSupabaseEmpleados();
  const [conceptos, setConceptos] = useState<ConceptoNomina[]>(conceptosBasicos);
  const [planillas, setPlanillas] = useState<PlanillaNomina[]>([]);
  const [showEmpleadoForm, setShowEmpleadoForm] = useState(false);
  const [showPlanillaForm, setShowPlanillaForm] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [selectedPlanilla, setSelectedPlanilla] = useState<PlanillaNomina | null>(null);
  const [facturasRCIVA, setFacturasRCIVA] = useState<FacturaRCIVA[]>([]);
  const [showFacturaForm, setShowFacturaForm] = useState(false);
  const [facturaEmpleadoId, setFacturaEmpleadoId] = useState<string>('');
  const [facturaPeriodo, setFacturaPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();

  // Mapear empleados de Supabase al formato interno de Nómina
  const empleados: Empleado[] = empleadosSupabase.map(emp => ({
    id: emp.id,
    nombre: emp.nombres,
    apellido: emp.apellidos,
    ci: emp.ci,
    cargo: emp.cargo,
    departamento: emp.departamento,
    fechaIngreso: emp.fecha_ingreso,
    salarioBase: emp.salario_base,
    telefono: emp.telefono || '',
    email: emp.email || '',
    cuentaBancaria: '',
    estado: (emp.estado === 'activo' || emp.estado === 'inactivo') ? emp.estado : 'activo',
    tipoContrato: 'indefinido'
  }));

  useEffect(() => {
    const planillasGuardadas = localStorage.getItem('planillasNomina');
    if (planillasGuardadas) {
      setPlanillas(JSON.parse(planillasGuardadas));
    }

    const facturasGuardadas = localStorage.getItem('facturasRCIVA');
    if (facturasGuardadas) {
      setFacturasRCIVA(JSON.parse(facturasGuardadas));
    }
  }, []);

  const guardarEmpleado = async (empleado: Empleado) => {
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
          numero_empleado: `EMP-${Date.now().toString().slice(-4)}`,
          nombres: empleado.nombre,
          apellidos: empleado.apellido,
          ci: empleado.ci,
          cargo: empleado.cargo,
          departamento: empleado.departamento,
          fecha_ingreso: empleado.fechaIngreso,
          fecha_nacimiento: '1990-01-01',
          salario_base: empleado.salarioBase,
          telefono: empleado.telefono || null,
          email: empleado.email || null,
          estado: empleado.estado,
          genero: null,
          estado_civil: null,
          beneficios: null,
        });
      }
    } catch (error) {
      console.error('Error guardando empleado:', error);
    }
    setShowEmpleadoForm(false);
    setEditingEmpleado(null);
  };

  const calcularPlanilla = (periodo: string): PlanillaNomina => {
    const empleadosActivos = empleados.filter(e => e.estado === 'activo');
    const detalles: DetalleNomina[] = [];
    
    let totalIngresos = 0;
    let totalDescuentos = 0;
    let totalAportesPatronales = 0;
    let totalNeto = 0;

    empleadosActivos.forEach(empleado => {
      const detalle: DetalleNomina = {
        empleadoId: empleado.id,
        empleado,
        salarioBase: empleado.salarioBase,
        ingresos: {},
        descuentos: {},
        aportesPatronales: {},
        totalIngresos: 0,
        totalDescuentos: 0,
        totalAportesPatronales: 0,
        salarioNeto: 0
      };

      // Calcular Total Ganado (ingresos) primero
      const conceptosIngresos = conceptos.filter(c => c.tipo === 'ingreso' && c.activo);
      conceptosIngresos.forEach(concepto => {
        let monto: number;
        if (concepto.id === 'bono_antiguedad') {
          monto = calcularBonoAntiguedad(empleado.fechaIngreso);
        } else {
          monto = calcularConcepto(concepto, empleado.salarioBase, 0);
        }
        detalle.ingresos[concepto.id] = monto;
        detalle.totalIngresos += monto;
      });

      const totalGanado = detalle.totalIngresos;

      // Descuentos laborales se calculan sobre Total Ganado
      const conceptosDescuentos = conceptos.filter(c => c.tipo === 'descuento' && c.activo);
      conceptosDescuentos.forEach(concepto => {
        const monto = calcularConcepto(concepto, empleado.salarioBase, totalGanado);
        detalle.descuentos[concepto.id] = monto;
        detalle.totalDescuentos += monto;
      });

      // Aportes patronales sobre Total Ganado
      const conceptosAportes = conceptos.filter(c => c.tipo === 'aporte_patronal' && c.activo);
      conceptosAportes.forEach(concepto => {
        const monto = calcularConcepto(concepto, empleado.salarioBase, totalGanado);
        detalle.aportesPatronales[concepto.id] = monto;
        detalle.totalAportesPatronales += monto;
      });

      // RC-IVA: 13% sobre ingresos > 4 SMN (Ley 843, Art. 19)
      const facturasEmpleado = facturasRCIVA.filter(f => f.empleadoId === empleado.id && f.periodo === periodo);
      const creditoFiscalFacturas = facturasEmpleado.reduce((sum, f) => sum + f.importeTotal, 0);
      const rciva = calcularRCIVA(totalGanado, detalle.totalDescuentos, creditoFiscalFacturas);
      detalle.rciva = rciva;
      if (rciva.saldoPagar > 0) {
        detalle.descuentos['rc_iva'] = rciva.saldoPagar;
        detalle.totalDescuentos += rciva.saldoPagar;
      }

      detalle.salarioNeto = detalle.totalIngresos - detalle.totalDescuentos;
      
      totalIngresos += detalle.totalIngresos;
      totalDescuentos += detalle.totalDescuentos;
      totalAportesPatronales += detalle.totalAportesPatronales;
      totalNeto += detalle.salarioNeto;

      detalles.push(detalle);
    });

    return {
      id: Date.now().toString(),
      periodo,
      fechaGeneracion: new Date().toISOString().slice(0, 10),
      fechaPago: '',
      estado: 'borrador',
      totalIngresos,
      totalDescuentos,
      totalAportesPatronales,
      totalNeto,
      empleados: detalles
    };
  };

  const calcularConcepto = (concepto: ConceptoNomina, salarioBase: number, totalGanado: number): number => {
    try {
      if (concepto.montoFijo) {
        return concepto.montoFijo;
      }
      
      // Si la fórmula usa totalGanado (descuentos y aportes se calculan sobre total ganado)
      if (concepto.formula.includes('totalGanado') && concepto.porcentaje) {
        return Number((totalGanado * (concepto.porcentaje / 100)).toFixed(2));
      }
      
      if (concepto.porcentaje) {
        return Number((salarioBase * (concepto.porcentaje / 100)).toFixed(2));
      }
      
      if (concepto.formula.includes('salarioBase')) {
        const formula = concepto.formula.replace(/salarioBase/g, salarioBase.toString());
        return eval(formula);
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculando concepto:', error);
      return 0;
    }
  };

  const generarPlanilla = (periodo: string) => {
    const planilla = calcularPlanilla(periodo);
    const nuevasPlanillas = [...planillas, planilla];
    setPlanillas(nuevasPlanillas);
    localStorage.setItem('planillasNomina', JSON.stringify(nuevasPlanillas));
    
    toast({
      title: "Planilla generada",
      description: `Planilla para ${periodo} generada exitosamente`,
    });
    
    setSelectedPlanilla(planilla);
    setShowPlanillaForm(false);
  };

  const aprobarPlanilla = (planillaId: string) => {
    const planillasActualizadas = planillas.map(p => 
      p.id === planillaId ? { ...p, estado: 'aprobada' as const } : p
    );
    setPlanillas(planillasActualizadas);
    localStorage.setItem('planillasNomina', JSON.stringify(planillasActualizadas));
    
    toast({
      title: "Planilla aprobada",
      description: "La planilla ha sido aprobada y está lista para pago",
    });
  };

  const pagarPlanilla = (planillaId: string) => {
    const planilla = planillas.find(p => p.id === planillaId);
    if (!planilla) return;

    // Separar RC-IVA del total de descuentos para el asiento contable
    const totalRCIVA = planilla.empleados.reduce((sum, d) => sum + (d.descuentos['rc_iva'] || 0), 0);
    const totalRetencionesAFP = planilla.totalDescuentos - totalRCIVA;

    // Generar asiento contable integrado según normativa boliviana
    const cuentasAsiento = [
      {
        codigo: "6111",
        nombre: "Sueldos y Salarios",
        debe: planilla.totalIngresos,
        haber: 0
      },
      {
        codigo: "6112", 
        nombre: "Cargas Sociales Patronales",
        debe: planilla.totalAportesPatronales,
        haber: 0
      },
      {
        codigo: "2151",
        nombre: "Sueldos por Pagar",
        debe: 0,
        haber: planilla.totalNeto
      },
      {
        codigo: "2152",
        nombre: "Retenciones Laborales por Pagar (AFP 12.71%)",
        debe: 0,
        haber: totalRetencionesAFP
      },
      {
        codigo: "2153",
        nombre: "Aportes Patronales por Pagar (CNS, RP, Vivienda, INFOCAL, Solidario)",
        debe: 0,
        haber: planilla.totalAportesPatronales
      }
    ];

    // Agregar RC-IVA si aplica
    if (totalRCIVA > 0) {
      cuentasAsiento.push({
        codigo: "2154",
        nombre: "RC-IVA Retenido por Pagar",
        debe: 0,
        haber: totalRCIVA
      });
    }

    const asiento = {
      id: Date.now().toString(),
      numero: `NOM-${planilla.periodo}`,
      fecha: new Date().toISOString().slice(0, 10),
      concepto: `Registro de planilla de sueldos y cargas sociales ${planilla.periodo}`,
      referencia: `Planilla-${planilla.id}`,
      debe: planilla.totalIngresos + planilla.totalAportesPatronales,
      haber: planilla.totalIngresos + planilla.totalAportesPatronales,
      estado: 'registrado' as const,
      cuentas: cuentasAsiento
    };

    const success = guardarAsiento(asiento);

    const planillasActualizadas = planillas.map(p => 
      p.id === planillaId ? { 
        ...p, 
        estado: 'pagada' as const,
        fechaPago: new Date().toISOString().slice(0, 10)
      } : p
    );
    setPlanillas(planillasActualizadas);
    localStorage.setItem('planillasNomina', JSON.stringify(planillasActualizadas));
    
    toast({
      title: "Planilla pagada",
      description: "La planilla ha sido pagada y se generó el asiento contable",
    });
  };

  const exportarPlanilla = (planilla: PlanillaNomina) => {
    const datosExport = planilla.empleados.map(detalle => ({
      'CI': detalle.empleado.ci,
      'Nombre Completo': `${detalle.empleado.nombre} ${detalle.empleado.apellido}`,
      'Cargo': detalle.empleado.cargo,
      'Salario Base': detalle.salarioBase,
      'Total Ingresos': detalle.totalIngresos,
      'Total Descuentos': detalle.totalDescuentos,
      'Salario Neto': detalle.salarioNeto,
      'Cuenta Bancaria': detalle.empleado.cuentaBancaria
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Planilla");
    XLSX.writeFile(workbook, `planilla_${planilla.periodo}.xlsx`);
    
    toast({
      title: "Planilla exportada",
      description: "La planilla ha sido exportada a Excel",
    });
  };

  // Exportar Formulario 110 RC-IVA (Agentes de Retención) formato SIAT
  const exportarFormulario110 = () => {
    const empleadosActivos2 = empleados.filter(e => e.estado === 'activo');
    const datos = [
      ['FORMULARIO 110 - RC-IVA AGENTES DE RETENCIÓN'],
      [`Período: ${facturaPeriodo}`],
      [`Fecha de generación: ${new Date().toLocaleDateString('es-BO')}`],
      [''],
      ['Nº', 'CI', 'Nombre Completo', 'Total Ganado (Bs)', 'Mínimo No Imponible (2 SMN)', 'Aportes Laborales (Bs)', 
       'Base Imponible (Bs)', 'Impuesto RC-IVA 13%', 'Crédito Fiscal Facturas (Bs)', 'Saldo a Favor Fisco (Bs)', 
       'Saldo a Favor Dependiente (Bs)', 'Importe Retenido (Bs)']
    ];

    let totalRetenido = 0;
    empleadosActivos2.forEach((emp, idx) => {
      const totalGanado = emp.salarioBase + calcularBonoAntiguedad(emp.fechaIngreso);
      const aportesLab = Number((totalGanado * 0.1271).toFixed(2));
      const facturasEmp = facturasRCIVA.filter(f => f.empleadoId === emp.id && f.periodo === facturaPeriodo);
      const creditoFacturas = facturasEmp.reduce((s, f) => s + f.importeTotal, 0);
      const rc = calcularRCIVA(totalGanado, aportesLab, creditoFacturas);
      totalRetenido += rc.saldoPagar;

      datos.push([
        (idx + 1).toString(),
        emp.ci,
        `${emp.apellido} ${emp.nombre}`,
        totalGanado.toFixed(2),
        (SMN_2026 * 2).toFixed(2),
        aportesLab.toFixed(2),
        rc.baseImponible.toFixed(2),
        rc.impuesto.toFixed(2),
        rc.creditoFiscal.toFixed(2),
        rc.saldoPagar > 0 ? rc.saldoPagar.toFixed(2) : '0.00',
        rc.saldoPagar <= 0 ? Math.abs(rc.saldoPagar).toFixed(2) : '0.00',
        rc.saldoPagar > 0 ? rc.saldoPagar.toFixed(2) : '0.00'
      ]);
    });

    datos.push(['']);
    datos.push(['', '', 'TOTAL RETENIDO', '', '', '', '', '', '', '', '', totalRetenido.toFixed(2)]);

    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'F-110 RC-IVA');
    XLSX.writeFile(wb, `Formulario_110_RCIVA_${facturaPeriodo}.xlsx`);

    toast({
      title: "Formulario 110 exportado",
      description: `RC-IVA período ${facturaPeriodo} — Total retenido: Bs ${totalRetenido.toFixed(2)}`,
    });
  };

  const empleadosActivos = empleados.filter(e => e.estado === 'activo').length;
  const totalNominaActual = planillas.length > 0 ? planillas[planillas.length - 1].totalNeto : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Gestión de Nómina</h2>
            <p className="text-muted-foreground">
              Administración de empleados y planillas de sueldos
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEmpleadoForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Empleado
          </Button>
          <Button onClick={() => setShowPlanillaForm(true)}>
            <Calculator className="w-4 h-4 mr-2" />
            Generar Planilla
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{empleadosActivos}</div>
            <p className="text-xs text-muted-foreground">Total empleados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planillas Generadas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planillas.length}</div>
            <p className="text-xs text-muted-foreground">Este año</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nómina Actual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {totalNominaActual.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Último período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planillas Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planillas.filter(p => p.estado === 'borrador').length}</div>
            <p className="text-xs text-muted-foreground">Por aprobar</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="empleados" className="w-full">
        <TabsList>
          <TabsTrigger value="empleados">Empleados</TabsTrigger>
          <TabsTrigger value="planillas">Planillas</TabsTrigger>
          <TabsTrigger value="conceptos">Conceptos</TabsTrigger>
          <TabsTrigger value="rciva">RC-IVA (F-110)</TabsTrigger>
        </TabsList>

        <TabsContent value="empleados">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Empleados</CardTitle>
              <CardDescription>Gestión de información de empleados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>CI</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Salario Base</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleados.map(empleado => (
                    <TableRow key={empleado.id}>
                      <TableCell>{empleado.nombre} {empleado.apellido}</TableCell>
                      <TableCell>{empleado.ci}</TableCell>
                      <TableCell>{empleado.cargo}</TableCell>
                      <TableCell>{empleado.departamento}</TableCell>
                      <TableCell className="text-right">Bs. {empleado.salarioBase.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={empleado.estado === 'activo' ? 'default' : 'secondary'}>
                          {empleado.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingEmpleado(empleado);
                            setShowEmpleadoForm(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planillas">
          <Card>
            <CardHeader>
              <CardTitle>Planillas Generadas</CardTitle>
              <CardDescription>Historial de planillas de sueldos</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Fecha Generación</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead className="text-right">Total Ingresos</TableHead>
                    <TableHead className="text-right">Total Descuentos</TableHead>
                    <TableHead className="text-right">Total Neto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planillas.map(planilla => (
                    <TableRow key={planilla.id}>
                      <TableCell>{planilla.periodo}</TableCell>
                      <TableCell>{new Date(planilla.fechaGeneracion).toLocaleDateString('es-BO')}</TableCell>
                      <TableCell>{planilla.fechaPago ? new Date(planilla.fechaPago).toLocaleDateString('es-BO') : '-'}</TableCell>
                      <TableCell className="text-right">Bs. {planilla.totalIngresos.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Bs. {planilla.totalDescuentos.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Bs. {planilla.totalNeto.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          planilla.estado === 'pagada' ? 'default' :
                          planilla.estado === 'aprobada' ? 'secondary' : 'outline'
                        }>
                          {planilla.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportarPlanilla(planilla)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {planilla.estado === 'borrador' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => aprobarPlanilla(planilla.id)}
                            >
                              Aprobar
                            </Button>
                          )}
                          {planilla.estado === 'aprobada' && (
                            <Button
                              size="sm"
                              onClick={() => pagarPlanilla(planilla.id)}
                            >
                              Pagar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conceptos">
          <Card>
            <CardHeader>
              <CardTitle>Conceptos de Nómina</CardTitle>
              <CardDescription>Ingresos, descuentos y aportes patronales</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Porcentaje</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conceptos.map(concepto => (
                    <TableRow key={concepto.id}>
                      <TableCell>{concepto.codigo}</TableCell>
                      <TableCell>{concepto.nombre}</TableCell>
                      <TableCell>
                        <Badge variant={
                          concepto.tipo === 'ingreso' ? 'default' :
                          concepto.tipo === 'descuento' ? 'destructive' : 'secondary'
                        }>
                          {concepto.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {concepto.porcentaje ? `${concepto.porcentaje}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={concepto.activo ? 'default' : 'secondary'}>
                          {concepto.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rciva">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>RC-IVA — Formulario 110</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowFacturaForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Factura
                  </Button>
                  <Button size="sm" onClick={exportarFormulario110}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar F-110
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Gestión de facturas de compras personales de empleados para compensar RC-IVA (Ley 843, Art. 31). 
                Mínimo no imponible: 4 SMN = Bs {MINIMO_NO_IMPONIBLE_RCIVA.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4 items-end">
                <div>
                  <Label>Período</Label>
                  <Input type="month" value={facturaPeriodo} onChange={e => setFacturaPeriodo(e.target.value)} className="w-48" />
                </div>
              </div>

              {/* Resumen RC-IVA por empleado */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Total Ganado</TableHead>
                    <TableHead className="text-right">Base Imponible</TableHead>
                    <TableHead className="text-right">RC-IVA 13%</TableHead>
                    <TableHead className="text-right">Crédito Fiscal</TableHead>
                    <TableHead className="text-right">Saldo a Retener</TableHead>
                    <TableHead className="text-right">Facturas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleados.filter(e => e.estado === 'activo').map(empleado => {
                    const totalGanado = empleado.salarioBase + calcularBonoAntiguedad(empleado.fechaIngreso);
                    const aportesLab = totalGanado * 0.1271;
                    const facturasEmp = facturasRCIVA.filter(f => f.empleadoId === empleado.id && f.periodo === facturaPeriodo);
                    const creditoFacturas = facturasEmp.reduce((s, f) => s + f.importeTotal, 0);
                    const rc = calcularRCIVA(totalGanado, aportesLab, creditoFacturas);
                    
                    return (
                      <TableRow key={empleado.id}>
                        <TableCell>{empleado.nombre} {empleado.apellido}</TableCell>
                        <TableCell className="text-right">Bs {totalGanado.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Bs {rc.baseImponible.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Bs {rc.impuesto.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Bs {rc.creditoFiscal.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold">
                          {rc.saldoPagar > 0 ? (
                            <span className="text-destructive">Bs {rc.saldoPagar.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">Bs 0.00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{facturasEmp.length}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Lista de facturas del período */}
              {facturasRCIVA.filter(f => f.periodo === facturaPeriodo).length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Facturas registradas — {facturaPeriodo}</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Nº Factura</TableHead>
                        <TableHead>NIT Proveedor</TableHead>
                        <TableHead>Razón Social</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturasRCIVA.filter(f => f.periodo === facturaPeriodo).map(factura => {
                        const emp = empleados.find(e => e.id === factura.empleadoId);
                        return (
                          <TableRow key={factura.id}>
                            <TableCell>{emp ? `${emp.nombre} ${emp.apellido}` : 'N/A'}</TableCell>
                            <TableCell>{factura.numeroFactura}</TableCell>
                            <TableCell>{factura.nitProveedor}</TableCell>
                            <TableCell>{factura.razonSocial}</TableCell>
                            <TableCell>{factura.fecha}</TableCell>
                            <TableCell className="text-right">Bs {factura.importeTotal.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Formularios */}
      <EmpleadoForm
        open={showEmpleadoForm}
        onOpenChange={setShowEmpleadoForm}
        empleado={editingEmpleado}
        onSave={guardarEmpleado}
      />

      <PlanillaForm
        open={showPlanillaForm}
        onOpenChange={setShowPlanillaForm}
        onGenerar={generarPlanilla}
      />

      {/* Formulario de factura RC-IVA */}
      <Dialog open={showFacturaForm} onOpenChange={setShowFacturaForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Factura RC-IVA</DialogTitle>
            <DialogDescription>
              Factura de compra personal del empleado para compensar RC-IVA
            </DialogDescription>
          </DialogHeader>
          <FacturaRCIVAForm
            empleados={empleados.filter(e => e.estado === 'activo')}
            periodo={facturaPeriodo}
            onSave={(factura) => {
              const nuevas = [...facturasRCIVA, factura];
              setFacturasRCIVA(nuevas);
              localStorage.setItem('facturasRCIVA', JSON.stringify(nuevas));
              setShowFacturaForm(false);
              toast({ title: "Factura registrada", description: `Factura ${factura.numeroFactura} registrada para RC-IVA` });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente para formulario de empleado
const EmpleadoForm = ({ open, onOpenChange, empleado, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleado: Empleado | null;
  onSave: (empleado: Empleado) => void;
}) => {
  const [formData, setFormData] = useState<Empleado>({
    id: '',
    nombre: '',
    apellido: '',
    ci: '',
    cargo: '',
    departamento: '',
    fechaIngreso: new Date().toISOString().slice(0, 10),
    salarioBase: 0,
    telefono: '',
    email: '',
    cuentaBancaria: '',
    estado: 'activo',
    tipoContrato: 'indefinido'
  });

  useEffect(() => {
    if (empleado) {
      setFormData(empleado);
    } else {
      setFormData({
        id: '',
        nombre: '',
        apellido: '',
        ci: '',
        cargo: '',
        departamento: '',
        fechaIngreso: new Date().toISOString().slice(0, 10),
        salarioBase: 0,
        telefono: '',
        email: '',
        cuentaBancaria: '',
        estado: 'activo',
        tipoContrato: 'indefinido'
      });
    }
  }, [empleado]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{empleado ? 'Editar Empleado' : 'Nuevo Empleado'}</DialogTitle>
          <DialogDescription>
            Complete la información del empleado
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="apellido">Apellido</Label>
              <Input
                id="apellido"
                value={formData.apellido}
                onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ci">Cédula de Identidad</Label>
              <Input
                id="ci"
                value={formData.ci}
                onChange={(e) => setFormData(prev => ({ ...prev, ci: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                value={formData.departamento}
                onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="fechaIngreso">Fecha de Ingreso</Label>
              <Input
                id="fechaIngreso"
                type="date"
                value={formData.fechaIngreso}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaIngreso: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salarioBase">Salario Base</Label>
              <Input
                id="salarioBase"
                type="number"
                step="0.01"
                value={formData.salarioBase}
                onChange={(e) => setFormData(prev => ({ ...prev, salarioBase: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
              <Select value={formData.tipoContrato} onValueChange={(value: any) => setFormData(prev => ({ ...prev, tipoContrato: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                  <SelectItem value="temporal">Temporal</SelectItem>
                  <SelectItem value="consultoria">Consultoría</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cuentaBancaria">Cuenta Bancaria</Label>
            <Input
              id="cuentaBancaria"
              value={formData.cuentaBancaria}
              onChange={(e) => setFormData(prev => ({ ...prev, cuentaBancaria: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {empleado ? 'Actualizar' : 'Guardar'} Empleado
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Componente para formulario de planilla
const PlanillaForm = ({ open, onOpenChange, onGenerar }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerar: (periodo: string) => void;
}) => {
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerar(periodo);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar Planilla</DialogTitle>
          <DialogDescription>
            Seleccione el período para generar la planilla de sueldos
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="periodo">Período</Label>
            <Input
              id="periodo"
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Generar Planilla
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Componente para registrar facturas RC-IVA
const FacturaRCIVAForm = ({ empleados, periodo, onSave }: {
  empleados: Empleado[];
  periodo: string;
  onSave: (factura: FacturaRCIVA) => void;
}) => {
  const [formData, setFormData] = useState({
    empleadoId: '',
    numeroFactura: '',
    nitProveedor: '',
    razonSocial: '',
    fecha: new Date().toISOString().slice(0, 10),
    importeTotal: 0,
    codigoControl: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: Date.now().toString(),
      periodo,
      ...formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Empleado</Label>
        <Select value={formData.empleadoId} onValueChange={v => setFormData(p => ({ ...p, empleadoId: v }))}>
          <SelectTrigger><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger>
          <SelectContent>
            {empleados.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.nombre} {e.apellido}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nº Factura</Label>
          <Input value={formData.numeroFactura} onChange={e => setFormData(p => ({ ...p, numeroFactura: e.target.value }))} required />
        </div>
        <div>
          <Label>NIT Proveedor</Label>
          <Input value={formData.nitProveedor} onChange={e => setFormData(p => ({ ...p, nitProveedor: e.target.value }))} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Razón Social</Label>
          <Input value={formData.razonSocial} onChange={e => setFormData(p => ({ ...p, razonSocial: e.target.value }))} required />
        </div>
        <div>
          <Label>Fecha</Label>
          <Input type="date" value={formData.fecha} onChange={e => setFormData(p => ({ ...p, fecha: e.target.value }))} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Importe Total (Bs)</Label>
          <Input type="number" step="0.01" value={formData.importeTotal} onChange={e => setFormData(p => ({ ...p, importeTotal: parseFloat(e.target.value) || 0 }))} required />
        </div>
        <div>
          <Label>Código de Control</Label>
          <Input value={formData.codigoControl} onChange={e => setFormData(p => ({ ...p, codigoControl: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!formData.empleadoId}>Registrar Factura</Button>
      </div>
    </form>
  );
};

export default NominaModule;