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
  Download,
  UserCheck,
  Banknote
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
  salarioBasico: number;
  bonosAdicionales: number;
  telefono: string;
  email: string;
  cuentaBancaria: string;
  estado: 'activo' | 'inactivo';
  tipoContrato: 'indefinido' | 'temporal' | 'consultoria';
  gestoraPensiones: 'GESTORA_PUBLICA';
  porcentajeComisionGestora: number;
}

interface PlanillaSueldo {
  id: string;
  empleadoId: string;
  mes: number;
  anio: number;
  salarioBasico: number;
  bonosAdicionales: number;
  totalGanado: number;
  aporteGestora: number;
  aporteLaboral: number;
  aportePatronal: number;
  impuestoTransacciones: number;
  rcIva: number;
  sueldoLiquido: number;
  estado: 'borrador' | 'procesado' | 'pagado';
  fechaCreacion: string;
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

const RecursosHumanosUnificado = () => {
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();
  
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [planillas, setPlanillas] = useState<PlanillaSueldo[]>([]);
  const [conceptos, setConceptos] = useState<ConceptoNomina[]>([]);
  const [showEmpleadoForm, setShowEmpleadoForm] = useState(false);
  const [showPlanillaForm, setShowPlanillaForm] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [mesActual, setMesActual] = useState(new Date().getMonth() + 1);
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());

  const [newEmpleado, setNewEmpleado] = useState<Partial<Empleado>>({
    nombre: '',
    apellido: '',
    ci: '',
    cargo: '',
    departamento: '',
    fechaIngreso: new Date().toISOString().slice(0, 10),
    salarioBasico: 0,
    bonosAdicionales: 0,
    telefono: '',
    email: '',
    cuentaBancaria: '',
    estado: 'activo',
    tipoContrato: 'indefinido',
    gestoraPensiones: 'GESTORA_PUBLICA',
    porcentajeComisionGestora: 0.5
  });

  useEffect(() => {
    cargarDatos();
    inicializarConceptos();
  }, []);

  const cargarDatos = () => {
    const empleadosGuardados = localStorage.getItem('empleados');
    if (empleadosGuardados) setEmpleados(JSON.parse(empleadosGuardados));

    const planillasGuardadas = localStorage.getItem('planillas');
    if (planillasGuardadas) setPlanillas(JSON.parse(planillasGuardadas));

    const conceptosGuardados = localStorage.getItem('conceptosNomina');
    if (conceptosGuardados) setConceptos(JSON.parse(conceptosGuardados));
  };

  const inicializarConceptos = () => {
    const conceptosDefault: ConceptoNomina[] = [
      {
        id: '1',
        codigo: 'SUELDO_BASE',
        nombre: 'Sueldo Básico',
        tipo: 'ingreso',
        formula: 'SALARIO_BASICO',
        activo: true
      },
      {
        id: '2',
        codigo: 'BONO_ANTIGUEDAD',
        nombre: 'Bono de Antigüedad',
        tipo: 'ingreso',
        formula: 'SALARIO_BASICO * 0.05',
        porcentaje: 5,
        activo: true
      },
      {
        id: '3',
        codigo: 'APORTE_LABORAL',
        nombre: 'Aporte Laboral (12.21%)',
        tipo: 'descuento',
        formula: 'TOTAL_GANADO * 0.1221',
        porcentaje: 12.21,
        activo: true
      },
      {
        id: '4',
        codigo: 'APORTE_PATRONAL',
        nombre: 'Aporte Patronal (14.42%)',
        tipo: 'aporte_patronal',
        formula: 'TOTAL_GANADO * 0.1442',
        porcentaje: 14.42,
        activo: true
      },
      {
        id: '5',
        codigo: 'RC_IVA',
        nombre: 'RC-IVA',
        tipo: 'descuento',
        formula: 'CALCULAR_RC_IVA(TOTAL_GANADO)',
        activo: true
      }
    ];

    const conceptosExistentes = localStorage.getItem('conceptosNomina');
    if (!conceptosExistentes) {
      localStorage.setItem('conceptosNomina', JSON.stringify(conceptosDefault));
      setConceptos(conceptosDefault);
    }
  };

  const guardarEmpleado = () => {
    if (!newEmpleado.nombre || !newEmpleado.apellido || !newEmpleado.ci) {
      toast({
        title: "Error",
        description: "Complete todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    const empleado: Empleado = {
      id: selectedEmpleado?.id || `emp-${Date.now()}`,
      ...newEmpleado as Empleado
    };

    let nuevosEmpleados;
    if (selectedEmpleado) {
      nuevosEmpleados = empleados.map(e => e.id === empleado.id ? empleado : e);
    } else {
      nuevosEmpleados = [empleado, ...empleados];
    }

    setEmpleados(nuevosEmpleados);
    localStorage.setItem('empleados', JSON.stringify(nuevosEmpleados));

    toast({
      title: selectedEmpleado ? "Empleado Actualizado" : "Empleado Registrado",
      description: `${empleado.nombre} ${empleado.apellido} ${selectedEmpleado ? 'actualizado' : 'registrado'} correctamente`,
    });

    setShowEmpleadoForm(false);
    setSelectedEmpleado(null);
    setNewEmpleado({
      nombre: '',
      apellido: '',
      ci: '',
      cargo: '',
      departamento: '',
      fechaIngreso: new Date().toISOString().slice(0, 10),
      salarioBasico: 0,
      bonosAdicionales: 0,
      telefono: '',
      email: '',
      cuentaBancaria: '',
      estado: 'activo',
      tipoContrato: 'indefinido',
      gestoraPensiones: 'GESTORA_PUBLICA',
      porcentajeComisionGestora: 0.5
    });
  };

  const calcularPlanilla = () => {
    const nuevasPlanillas = empleados
      .filter(emp => emp.estado === 'activo')
      .map(empleado => {
        const totalGanado = empleado.salarioBasico + empleado.bonosAdicionales;
        const aporteLaboral = totalGanado * 0.1221; // 12.21%
        const aportePatronal = totalGanado * 0.1442; // 14.42%
        const aporteGestora = totalGanado * (empleado.porcentajeComisionGestora / 100);
        
        // Cálculo simplificado del RC-IVA
        const rcIva = totalGanado > 13000 ? (totalGanado - 13000) * 0.13 : 0;
        const impuestoTransacciones = totalGanado * 0.003; // 0.3%
        
        const sueldoLiquido = totalGanado - aporteLaboral - aporteGestora - rcIva - impuestoTransacciones;

        return {
          id: `planilla-${empleado.id}-${mesActual}-${anioActual}`,
          empleadoId: empleado.id,
          mes: mesActual,
          anio: anioActual,
          salarioBasico: empleado.salarioBasico,
          bonosAdicionales: empleado.bonosAdicionales,
          totalGanado,
          aporteGestora,
          aporteLaboral,
          aportePatronal,
          impuestoTransacciones,
          rcIva,
          sueldoLiquido,
          estado: 'procesado' as const,
          fechaCreacion: new Date().toISOString()
        };
      });

    // Generar asiento contable consolidado
    const totalSueldos = nuevasPlanillas.reduce((sum, p) => sum + p.totalGanado, 0);
    const totalAportesLaborales = nuevasPlanillas.reduce((sum, p) => sum + p.aporteLaboral, 0);
    const totalAportesPatronales = nuevasPlanillas.reduce((sum, p) => sum + p.aportePatronal, 0);
    const totalRcIva = nuevasPlanillas.reduce((sum, p) => sum + p.rcIva, 0);

    const asientoNomina = {
      id: `nomina-${mesActual}-${anioActual}`,
      numero: `NOM-${mesActual}-${anioActual}`,
      fecha: new Date().toISOString().slice(0, 10),
      concepto: `Planilla de Sueldos ${mesActual}/${anioActual}`,
      referencia: `Nómina ${mesActual}/${anioActual}`,
      estado: 'registrado' as const,
      debe: totalSueldos + totalAportesPatronales,
      haber: totalSueldos + totalAportesPatronales,
      cuentas: [
        {
          codigo: '521',
          nombre: 'Gastos de Personal',
          debe: totalSueldos,
          haber: 0
        },
        {
          codigo: '522',
          nombre: 'Cargas Sociales',
          debe: totalAportesPatronales,
          haber: 0
        },
        {
          codigo: '2112',
          nombre: 'Sueldos por Pagar',
          debe: 0,
          haber: totalSueldos - totalAportesLaborales - totalRcIva
        },
        {
          codigo: '2113',
          nombre: 'Aportes por Pagar',
          debe: 0,
          haber: totalAportesLaborales + totalAportesPatronales
        },
        {
          codigo: '2114',
          nombre: 'RC-IVA por Pagar',
          debe: 0,
          haber: totalRcIva
        }
      ]
    };

    guardarAsiento(asientoNomina);

    const planillasActualizadas = [...planillas.filter(p => !(p.mes === mesActual && p.anio === anioActual)), ...nuevasPlanillas];
    setPlanillas(planillasActualizadas);
    localStorage.setItem('planillas', JSON.stringify(planillasActualizadas));

    toast({
      title: "Planilla Procesada",
      description: `Planilla de ${mesActual}/${anioActual} procesada para ${nuevasPlanillas.length} empleados`,
    });
  };

  const exportarPlanilla = () => {
    const planillaMes = planillas.filter(p => p.mes === mesActual && p.anio === anioActual);
    
    const datosExport = planillaMes.map(planilla => {
      const empleado = empleados.find(e => e.id === planilla.empleadoId);
      return {
        'CI': empleado?.ci,
        'Nombre Completo': `${empleado?.nombre} ${empleado?.apellido}`,
        'Cargo': empleado?.cargo,
        'Salario Básico': planilla.salarioBasico,
        'Bonos': planilla.bonosAdicionales,
        'Total Ganado': planilla.totalGanado,
        'Aporte Laboral': planilla.aporteLaboral,
        'Aporte Gestora': planilla.aporteGestora,
        'RC-IVA': planilla.rcIva,
        'Líquido Pagable': planilla.sueldoLiquido
      };
    });

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Planilla ${mesActual}-${anioActual}`);
    XLSX.writeFile(wb, `planilla_${mesActual}_${anioActual}.xlsx`);
  };

  const empleadosActivos = empleados.filter(e => e.estado === 'activo');
  const planillaMesActual = planillas.filter(p => p.mes === mesActual && p.anio === anioActual);
  const totalNomina = planillaMesActual.reduce((sum, p) => sum + p.sueldoLiquido, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Recursos Humanos y Nómina Boliviana</h2>
          <p className="text-muted-foreground">
            Gestión integral de empleados y procesamiento de nómina conforme a la legislación boliviana
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{empleadosActivos.length}</div>
            <p className="text-xs text-muted-foreground">empleados activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nómina Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {totalNomina.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{mesActual}/{anioActual}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planillas Procesadas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planillaMesActual.length}</div>
            <p className="text-xs text-muted-foreground">este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Período Actual</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mesActual}/{anioActual}</div>
            <p className="text-xs text-muted-foreground">mes/año</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="empleados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="empleados">Empleados</TabsTrigger>
          <TabsTrigger value="planilla">Planilla de Sueldos</TabsTrigger>
          <TabsTrigger value="conceptos">Conceptos de Nómina</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="empleados" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Registro de Empleados</h3>
            <Dialog open={showEmpleadoForm} onOpenChange={setShowEmpleadoForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Empleado
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}
                  </DialogTitle>
                  <DialogDescription>
                    Complete la información del empleado según la legislación laboral boliviana
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={newEmpleado.nombre}
                      onChange={(e) => setNewEmpleado({...newEmpleado, nombre: e.target.value})}
                      placeholder="Nombre del empleado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido *</Label>
                    <Input
                      value={newEmpleado.apellido}
                      onChange={(e) => setNewEmpleado({...newEmpleado, apellido: e.target.value})}
                      placeholder="Apellido del empleado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cédula de Identidad *</Label>
                    <Input
                      value={newEmpleado.ci}
                      onChange={(e) => setNewEmpleado({...newEmpleado, ci: e.target.value})}
                      placeholder="CI del empleado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input
                      value={newEmpleado.cargo}
                      onChange={(e) => setNewEmpleado({...newEmpleado, cargo: e.target.value})}
                      placeholder="Cargo que desempeña"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salario Básico (Bs.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newEmpleado.salarioBasico}
                      onChange={(e) => setNewEmpleado({...newEmpleado, salarioBasico: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Ingreso</Label>
                    <Input
                      type="date"
                      value={newEmpleado.fechaIngreso}
                      onChange={(e) => setNewEmpleado({...newEmpleado, fechaIngreso: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={guardarEmpleado}>
                    {selectedEmpleado ? 'Actualizar' : 'Registrar'} Empleado
                  </Button>
                  <Button variant="outline" onClick={() => setShowEmpleadoForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>CI</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Salario Básico</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleados.map((empleado) => (
                    <TableRow key={empleado.id}>
                      <TableCell className="font-medium">
                        {empleado.nombre} {empleado.apellido}
                      </TableCell>
                      <TableCell>{empleado.ci}</TableCell>
                      <TableCell>{empleado.cargo}</TableCell>
                      <TableCell className="text-right">Bs. {empleado.salarioBasico.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={empleado.estado === 'activo' ? 'default' : 'secondary'}>
                          {empleado.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEmpleado(empleado);
                            setNewEmpleado(empleado);
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

        <TabsContent value="planilla" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <Select value={mesActual.toString()} onValueChange={(value) => setMesActual(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 12}, (_, i) => (
                    <SelectItem key={i+1} value={(i+1).toString()}>
                      {new Date(0, i).toLocaleString('es', {month: 'long'})}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={anioActual.toString()} onValueChange={(value) => setAnioActual(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 5}, (_, i) => (
                    <SelectItem key={2020+i} value={(2020+i).toString()}>
                      {2020+i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={calcularPlanilla}>
                <Calculator className="w-4 h-4 mr-2" />
                Procesar Planilla
              </Button>
              <Button variant="outline" onClick={exportarPlanilla}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Salario Básico</TableHead>
                    <TableHead className="text-right">Total Ganado</TableHead>
                    <TableHead className="text-right">Aporte Laboral</TableHead>
                    <TableHead className="text-right">RC-IVA</TableHead>
                    <TableHead className="text-right">Líquido Pagable</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planillaMesActual.map((planilla) => {
                    const empleado = empleados.find(e => e.id === planilla.empleadoId);
                    return (
                      <TableRow key={planilla.id}>
                        <TableCell className="font-medium">
                          {empleado?.nombre} {empleado?.apellido}
                        </TableCell>
                        <TableCell className="text-right">Bs. {planilla.salarioBasico.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Bs. {planilla.totalGanado.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Bs. {planilla.aporteLaboral.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Bs. {planilla.rcIva.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">Bs. {planilla.sueldoLiquido.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={planilla.estado === 'procesado' ? 'default' : 'secondary'}>
                            {planilla.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conceptos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Conceptos de Nómina</h3>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Concepto
            </Button>
          </div>

          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fórmula</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conceptos.map((concepto) => (
                    <TableRow key={concepto.id}>
                      <TableCell className="font-medium">{concepto.codigo}</TableCell>
                      <TableCell>{concepto.nombre}</TableCell>
                      <TableCell>
                        <Badge variant={concepto.tipo === 'ingreso' ? 'default' : concepto.tipo === 'descuento' ? 'destructive' : 'secondary'}>
                          {concepto.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{concepto.formula}</TableCell>
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

        <TabsContent value="reportes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Reporte de Aportes</CardTitle>
                <CardDescription>
                  Detalle de aportes laborales y patronales por mes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Generar Reporte de Aportes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Certificado de Trabajo</CardTitle>
                <CardDescription>
                  Generar certificados laborales para empleados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Generar Certificado
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RecursosHumanosUnificado;