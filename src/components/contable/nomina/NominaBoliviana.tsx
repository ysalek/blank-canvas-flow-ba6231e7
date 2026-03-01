import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Calculator, 
  FileText, 
  Download, 
  Plus, 
  Edit, 
  Trash2,
  Eye,
  UserCheck,
  Banknote
} from 'lucide-react';

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  ci: string;
  cargo: string;
  salarioBasico: number;
  bonosAdicionales: number;
  descuentos: number;
  fechaIngreso: string;
  gestoraPensiones: 'GESTORA_PUBLICA';
  porcentajeComisionGestora: number;
  cuentaBanco: string;
  estado: 'activo' | 'inactivo';
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
  solidario: number;
  riesgoProfesional: number;
  provivienda: number;
  impuestoRcIva: number;
  totalDescuentos: number;
  liquidoPagable: number;
  fechaGeneracion: string;
}

const NominaBoliviana = () => {
  const { toast } = useToast();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [planillas, setPlanillas] = useState<PlanillaSueldo[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Empleado | null>(null);
  const [modalEmpleado, setModalEmpleado] = useState(false);
  const [modalPlanilla, setModalPlanilla] = useState(false);
  const [mesGeneracion, setMesGeneracion] = useState(new Date().getMonth() + 1);
  const [anioGeneracion, setAnioGeneracion] = useState(new Date().getFullYear());

  // Porcentajes según normativa boliviana 2026
  const SMN_2026 = 2500; // Salario Mínimo Nacional 2026
  const PORCENTAJES_BOLIVIA = {
    aporteLaboral: 12.21, // Para la gestora de pensiones
    aportePatronal: 14.42, // Aporte patronal
    solidario: 0.5, // Aporte solidario
    riesgoProfesional: 1.71, // Riesgo profesional
    provivienda: 2, // Pro vivienda
    rcIva: 13, // RC-IVA (sobre el monto excedente)
    minimoNoImponible: SMN_2026 * 4 // 4 SMN = Bs 10,000 - Mínimo no imponible para RC-IVA
  };

  // Gestora de pensiones vigente en Bolivia (2026)
  const GESTORAS_PENSIONES = [
    { 
      id: 'GESTORA_PUBLICA', 
      nombre: 'Gestora Pública de la Seguridad Social de Largo Plazo', 
      comision: 0.5,
      descripcion: 'Única gestora oficial vigente en Bolivia'
    }
  ];

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = () => {
    const empleadosGuardados = localStorage.getItem('empleados_nomina');
    const planillasGuardadas = localStorage.getItem('planillas_sueldo');
    
    if (empleadosGuardados) {
      setEmpleados(JSON.parse(empleadosGuardados));
    }
    if (planillasGuardadas) {
      setPlanillas(JSON.parse(planillasGuardadas));
    }
  };

  const guardarEmpleado = (empleado: Empleado) => {
    const nuevosEmpleados = empleadoSeleccionado 
      ? empleados.map(e => e.id === empleado.id ? empleado : e)
      : [...empleados, { ...empleado, id: Date.now().toString() }];
    
    setEmpleados(nuevosEmpleados);
    localStorage.setItem('empleados_nomina', JSON.stringify(nuevosEmpleados));
    setModalEmpleado(false);
    setEmpleadoSeleccionado(null);
    
    toast({
      title: "Empleado guardado",
      description: "Los datos del empleado se han guardado correctamente."
    });
  };

  const calcularPlanillaSueldo = (empleado: Empleado): PlanillaSueldo => {
    const totalGanado = empleado.salarioBasico + empleado.bonosAdicionales;
    
    // Cálculos según normativa boliviana
    const aporteGestora = totalGanado * (PORCENTAJES_BOLIVIA.aporteLaboral / 100);
    const aporteLaboral = totalGanado * (PORCENTAJES_BOLIVIA.aportePatronal / 100);
    const solidario = totalGanado * (PORCENTAJES_BOLIVIA.solidario / 100);
    const riesgoProfesional = totalGanado * (PORCENTAJES_BOLIVIA.riesgoProfesional / 100);
    const provivienda = totalGanado * (PORCENTAJES_BOLIVIA.provivienda / 100);
    
    // RC-IVA según normativa 2026: base = totalGanado - (2 SMN) - aportes laborales
    let impuestoRcIva = 0;
    if (totalGanado > PORCENTAJES_BOLIVIA.minimoNoImponible) {
      const dosSmn = SMN_2026 * 2;
      const baseImponible = totalGanado - dosSmn - aporteGestora - solidario;
      if (baseImponible > 0) {
        impuestoRcIva = baseImponible * (PORCENTAJES_BOLIVIA.rcIva / 100);
      }
    }
    
    const totalDescuentos = aporteGestora + solidario + riesgoProfesional + 
                           provivienda + impuestoRcIva + empleado.descuentos;
    
    const liquidoPagable = totalGanado - totalDescuentos;

    return {
      id: Date.now().toString(),
      empleadoId: empleado.id,
      mes: mesGeneracion,
      anio: anioGeneracion,
      salarioBasico: empleado.salarioBasico,
      bonosAdicionales: empleado.bonosAdicionales,
      totalGanado,
      aporteGestora,
      aporteLaboral,
      solidario,
      riesgoProfesional,
      provivienda,
      impuestoRcIva,
      totalDescuentos,
      liquidoPagable,
      fechaGeneracion: new Date().toISOString().split('T')[0]
    };
  };

  const generarPlanillas = () => {
    const nuevasPlanillas = empleados
      .filter(emp => emp.estado === 'activo')
      .map(empleado => calcularPlanillaSueldo(empleado));
    
    const planillasActualizadas = [...planillas, ...nuevasPlanillas];
    setPlanillas(planillasActualizadas);
    localStorage.setItem('planillas_sueldo', JSON.stringify(planillasActualizadas));
    
    toast({
      title: "Planillas generadas",
      description: `Se generaron ${nuevasPlanillas.length} planillas de sueldo.`
    });
  };

  const FormularioEmpleado = ({ empleado, onSave, onCancel }: {
    empleado?: Empleado;
    onSave: (empleado: Empleado) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState<Empleado>(empleado || {
      id: '',
      nombre: '',
      apellido: '',
      ci: '',
      cargo: '',
      salarioBasico: 0,
      bonosAdicionales: 0,
      descuentos: 0,
      fechaIngreso: new Date().toISOString().split('T')[0],
      gestoraPensiones: 'GESTORA_PUBLICA',
      porcentajeComisionGestora: 0.5,
      cuentaBanco: '',
      estado: 'activo'
    });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              placeholder="Nombre del empleado"
            />
          </div>
          <div>
            <Label htmlFor="apellido">Apellido</Label>
            <Input
              id="apellido"
              value={formData.apellido}
              onChange={(e) => setFormData({...formData, apellido: e.target.value})}
              placeholder="Apellido del empleado"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ci">Cédula de Identidad</Label>
            <Input
              id="ci"
              value={formData.ci}
              onChange={(e) => setFormData({...formData, ci: e.target.value})}
              placeholder="C.I. del empleado"
            />
          </div>
          <div>
            <Label htmlFor="cargo">Cargo</Label>
            <Input
              id="cargo"
              value={formData.cargo}
              onChange={(e) => setFormData({...formData, cargo: e.target.value})}
              placeholder="Cargo del empleado"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="salarioBasico">Salario Básico (Bs.)</Label>
            <Input
              id="salarioBasico"
              type="number"
              value={formData.salarioBasico}
              onChange={(e) => setFormData({...formData, salarioBasico: parseFloat(e.target.value) || 0})}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="bonosAdicionales">Bonos Adicionales (Bs.)</Label>
            <Input
              id="bonosAdicionales"
              type="number"
              value={formData.bonosAdicionales}
              onChange={(e) => setFormData({...formData, bonosAdicionales: parseFloat(e.target.value) || 0})}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gestoraPensiones">Gestora de Pensiones</Label>
            <Select value={formData.gestoraPensiones} onValueChange={(value: any) => setFormData({...formData, gestoraPensiones: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar gestora" />
              </SelectTrigger>
              <SelectContent>
                {GESTORAS_PENSIONES.map(gestora => (
                  <SelectItem key={gestora.id} value={gestora.id}>
                    <div>
                      <div className="font-medium">{gestora.nombre}</div>
                      <div className="text-xs text-muted-foreground">{gestora.descripcion}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cuentaBanco">Cuenta Bancaria</Label>
            <Input
              id="cuentaBanco"
              value={formData.cuentaBanco}
              onChange={(e) => setFormData({...formData, cuentaBanco: e.target.value})}
              placeholder="Número de cuenta"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={() => onSave(formData)} className="flex-1">
            <UserCheck className="w-4 h-4 mr-2" />
            Guardar Empleado
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Nómina - Normativa Boliviana</h2>
          <p className="text-muted-foreground">Gestión de sueldos según normativa boliviana 2026 - Gestora Pública de Seguridad Social</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={modalEmpleado} onOpenChange={setModalEmpleado}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Empleado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {empleadoSeleccionado ? 'Editar Empleado' : 'Nuevo Empleado'}
                </DialogTitle>
              </DialogHeader>
              <FormularioEmpleado
                empleado={empleadoSeleccionado || undefined}
                onSave={guardarEmpleado}
                onCancel={() => {
                  setModalEmpleado(false);
                  setEmpleadoSeleccionado(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="empleados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="empleados">Empleados</TabsTrigger>
          <TabsTrigger value="planillas">Planillas de Sueldo</TabsTrigger>
          <TabsTrigger value="calculos">Cálculos y Porcentajes</TabsTrigger>
        </TabsList>

        <TabsContent value="empleados">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Lista de Empleados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>C.I.</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Salario Básico</TableHead>
                    <TableHead>Gestora</TableHead>
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
                      <TableCell>Bs. {empleado.salarioBasico.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {GESTORAS_PENSIONES.find(g => g.id === empleado.gestoraPensiones)?.nombre || 'Gestora Pública'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={empleado.estado === 'activo' ? 'default' : 'secondary'}>
                          {empleado.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEmpleadoSeleccionado(empleado);
                              setModalEmpleado(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Planillas de Sueldo
                </div>
                <div className="flex items-center gap-2">
                  <Select value={mesGeneracion.toString()} onValueChange={(value) => setMesGeneracion(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 12}, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2024, i).toLocaleDateString('es-BO', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={anioGeneracion}
                    onChange={(e) => setAnioGeneracion(parseInt(e.target.value))}
                    className="w-20"
                  />
                  <Button onClick={generarPlanillas}>
                    <Banknote className="w-4 h-4 mr-2" />
                    Generar Planillas
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Mes/Año</TableHead>
                    <TableHead>Total Ganado</TableHead>
                    <TableHead>Desc. Gestora</TableHead>
                    <TableHead>RC-IVA</TableHead>
                    <TableHead>Total Desc.</TableHead>
                    <TableHead>Líquido Pagable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planillas.map((planilla) => {
                    const empleado = empleados.find(e => e.id === planilla.empleadoId);
                    return (
                      <TableRow key={planilla.id}>
                        <TableCell>
                          {empleado ? `${empleado.nombre} ${empleado.apellido}` : 'Empleado no encontrado'}
                        </TableCell>
                        <TableCell>
                          {new Date(planilla.anio, planilla.mes - 1).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })}
                        </TableCell>
                        <TableCell>Bs. {planilla.totalGanado.toLocaleString()}</TableCell>
                        <TableCell>Bs. {planilla.aporteGestora.toLocaleString()}</TableCell>
                        <TableCell>Bs. {planilla.impuestoRcIva.toLocaleString()}</TableCell>
                        <TableCell>Bs. {planilla.totalDescuentos.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          Bs. {planilla.liquidoPagable.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculos">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Porcentajes Laborales - Bolivia 2024</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Aporte Laboral (Gestora):</span>
                  <span className="font-medium">{PORCENTAJES_BOLIVIA.aporteLaboral}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Aporte Patronal:</span>
                  <span className="font-medium">{PORCENTAJES_BOLIVIA.aportePatronal}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Aporte Solidario:</span>
                  <span className="font-medium">{PORCENTAJES_BOLIVIA.solidario}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Riesgo Profesional:</span>
                  <span className="font-medium">{PORCENTAJES_BOLIVIA.riesgoProfesional}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Pro Vivienda:</span>
                  <span className="font-medium">{PORCENTAJES_BOLIVIA.provivienda}%</span>
                </div>
                <div className="flex justify-between">
                  <span>RC-IVA:</span>
                  <span className="font-medium">{PORCENTAJES_BOLIVIA.rcIva}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Mínimo No Imponible RC-IVA:</span>
                  <span className="font-medium">Bs. {PORCENTAJES_BOLIVIA.minimoNoImponible.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gestoras de Pensiones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {GESTORAS_PENSIONES.map(gestora => (
                  <div key={gestora.id} className="flex justify-between">
                    <span>{gestora.nombre}:</span>
                    <span className="font-medium">{gestora.comision}% comisión</span>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-muted rounded">
                  <p className="text-sm text-muted-foreground">
                    <strong>Nota:</strong> Todas las gestoras aplican el mismo porcentaje de aporte laboral (12.21%) 
                    según la normativa boliviana vigente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NominaBoliviana;