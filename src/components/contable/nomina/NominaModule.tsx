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
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [conceptos, setConceptos] = useState<ConceptoNomina[]>(conceptosBasicos);
  const [planillas, setPlanillas] = useState<PlanillaNomina[]>([]);
  const [showEmpleadoForm, setShowEmpleadoForm] = useState(false);
  const [showPlanillaForm, setShowPlanillaForm] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [selectedPlanilla, setSelectedPlanilla] = useState<PlanillaNomina | null>(null);
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = () => {
    const empleadosGuardados = localStorage.getItem('empleados');
    if (empleadosGuardados) {
      setEmpleados(JSON.parse(empleadosGuardados));
    }

    const conceptosGuardados = localStorage.getItem('conceptosNomina');
    if (conceptosGuardados) {
      setConceptos(JSON.parse(conceptosGuardados));
    }

    const planillasGuardadas = localStorage.getItem('planillasNomina');
    if (planillasGuardadas) {
      setPlanillas(JSON.parse(planillasGuardadas));
    }
  };

  const guardarEmpleado = (empleado: Empleado) => {
    let nuevosEmpleados;
    
    if (editingEmpleado) {
      nuevosEmpleados = empleados.map(e => e.id === empleado.id ? empleado : e);
      toast({
        title: "Empleado actualizado",
        description: `${empleado.nombre} ${empleado.apellido} ha sido actualizado`,
      });
    } else {
      nuevosEmpleados = [...empleados, { ...empleado, id: Date.now().toString() }];
      toast({
        title: "Empleado creado",
        description: `${empleado.nombre} ${empleado.apellido} ha sido registrado`,
      });
    }
    
    setEmpleados(nuevosEmpleados);
    localStorage.setItem('empleados', JSON.stringify(nuevosEmpleados));
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

    // Generar asiento contable integrado según normativa boliviana
    const asiento = {
      id: Date.now().toString(),
      numero: `NOM-${planilla.periodo}`,
      fecha: new Date().toISOString().slice(0, 10),
      concepto: `Registro de planilla de sueldos y cargas sociales ${planilla.periodo}`,
      referencia: `Planilla-${planilla.id}`,
      debe: planilla.totalIngresos + planilla.totalAportesPatronales,
      haber: planilla.totalIngresos + planilla.totalAportesPatronales,
      estado: 'registrado' as const,
      cuentas: [
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
          nombre: "Retenciones Laborales por Pagar (AFP 12.71%, Solidario 0.5%)",
          debe: 0,
          haber: planilla.totalDescuentos
        },
        {
          codigo: "2153",
          nombre: "Aportes Patronales por Pagar (CNS, RP, Vivienda, INFOCAL, Solidario)",
          debe: 0,
          haber: planilla.totalAportesPatronales
        }
      ]
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

  const empleadosActivos = empleados.filter(e => e.estado === 'activo').length;
  const totalNominaActual = planillas.length > 0 ? planillas[planillas.length - 1].totalNeto : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Gestión de Nómina</h2>
            <p className="text-slate-600">
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

export default NominaModule;