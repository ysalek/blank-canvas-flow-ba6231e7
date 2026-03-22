import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, Calendar, DollarSign, Users, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseEmpleados, EmpleadoSupabase } from "@/hooks/useSupabaseEmpleados";
import { 
  cargosPorDepartamento, 
  validarCI,
  validarEmail
} from "./EmpleadosData";
import { EnhancedHeader, EnhancedMetricCard, MetricGrid } from "../dashboard/EnhancedLayout";

const EmpleadosModule: React.FC = () => {
  const { empleados, loading, crearEmpleado, actualizarEmpleado, eliminarEmpleado, generarNumeroEmpleado } = useSupabaseEmpleados();
  const [empleadoForm, setEmpleadoForm] = useState<Partial<EmpleadoSupabase>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('lista');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!empleadoForm.nombres || !empleadoForm.apellidos || !empleadoForm.ci || !empleadoForm.cargo) {
      toast({
        title: "Error",
        description: "Complete los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    // Validar CI
    if (!validarCI(empleadoForm.ci)) {
      toast({
        title: "Error",
        description: "La cédula de identidad debe tener 7 u 8 dígitos",
        variant: "destructive"
      });
      return;
    }

    // Validar email si se proporciona
    if (empleadoForm.email && !validarEmail(empleadoForm.email)) {
      toast({
        title: "Error",
        description: "El formato del email no es válido",
        variant: "destructive"
      });
      return;
    }

    // Verificar CI duplicado
    const ciExiste = empleados.some(emp => emp.ci === empleadoForm.ci && emp.id !== editingId);
    if (ciExiste) {
      toast({
        title: "Error",
        description: "Ya existe un empleado con esta cédula de identidad",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingId) {
        // Actualizar empleado
        await actualizarEmpleado(editingId, empleadoForm);
      } else {
        // Crear nuevo empleado
        const numeroEmpleado = generarNumeroEmpleado();
        const newEmpleadoData = {
          numero_empleado: numeroEmpleado,
          ci: empleadoForm.ci,
          nombres: empleadoForm.nombres,
          apellidos: empleadoForm.apellidos,
          fecha_nacimiento: empleadoForm.fecha_nacimiento || '',
          genero: empleadoForm.genero || null,
          estado_civil: empleadoForm.estado_civil || null,
          telefono: empleadoForm.telefono || null,
          email: empleadoForm.email || null,
          direccion: empleadoForm.direccion || null,
          cargo: empleadoForm.cargo,
          departamento: empleadoForm.departamento || '',
          fecha_ingreso: empleadoForm.fecha_ingreso || new Date().toISOString().split('T')[0],
          salario_base: empleadoForm.salario_base || 0,
          estado: empleadoForm.estado || 'activo',
          beneficios: empleadoForm.beneficios || []
        };
        
        await crearEmpleado(newEmpleadoData);
      }

      setEmpleadoForm({});
      setEditingId(null);
      setIsDialogOpen(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEdit = (empleado: EmpleadoSupabase) => {
    setEmpleadoForm(empleado);
    setEditingId(empleado.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const empleado = empleados.find(emp => emp.id === id);
    if (empleado && window.confirm(`¿Está seguro de eliminar a ${empleado.nombres} ${empleado.apellidos}?`)) {
      try {
        await eliminarEmpleado(id);
      } catch (error) {
        // Error handling is done in the hook
      }
    }
  };

  const filteredEmpleados = empleados.filter(empleado =>
    empleado.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empleado.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empleado.numero_empleado.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empleado.ci.includes(searchTerm) ||
    empleado.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empleado.departamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEstadoBadge = (estado: string | null) => {
    switch (estado) {
      case 'activo':
        return <Badge className="bg-success text-success-foreground">Activo</Badge>;
      case 'inactivo':
        return <Badge variant="secondary">Inactivo</Badge>;
      case 'vacaciones':
        return <Badge className="bg-warning text-warning-foreground">Vacaciones</Badge>;
      case 'licencia':
        return <Badge variant="outline">Licencia</Badge>;
      default:
        return <Badge variant="outline">{estado || 'Sin estado'}</Badge>;
    }
  };

  const estadisticas = {
    total: empleados.length,
    activos: empleados.filter(emp => emp.estado === 'activo').length,
    inactivos: empleados.filter(emp => emp.estado === 'inactivo').length,
    enVacaciones: empleados.filter(emp => emp.estado === 'vacaciones').length,
    totalNomina: empleados.reduce((sum, emp) => sum + emp.salario_base, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando empleados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Gestion de empleados"
        subtitle="Controla estructura laboral, estados del personal y base para procesos de nomina desde una vista mas ejecutiva."
        badge={{
          text: `${estadisticas.activos} activos`,
          variant: "secondary"
        }}
      />

      <MetricGrid columns={4}>
        <EnhancedMetricCard title="Total empleados" value={estadisticas.total} subtitle="Base total" icon={Users} />
        <EnhancedMetricCard title="Activos" value={estadisticas.activos} subtitle="Equipo operativo" icon={UserPlus} variant="success" />
        <EnhancedMetricCard title="Vacaciones" value={estadisticas.enVacaciones} subtitle="Seguimiento de ausencias" icon={Calendar} variant="warning" />
        <EnhancedMetricCard title="Nomina total" value={`Bs ${estadisticas.totalNomina.toLocaleString()}`} subtitle="Costo salarial visible" icon={DollarSign} />
      </MetricGrid>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Empleados
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Administre la información del personal de la empresa
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Total Empleados</span>
              </div>
              <p className="text-2xl font-bold text-primary">{estadisticas.total}</p>
            </div>
            <div className="bg-success/10 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Activos</span>
              </div>
              <p className="text-2xl font-bold text-success">{estadisticas.activos}</p>
            </div>
            <div className="bg-warning/10 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">En Vacaciones</span>
              </div>
              <p className="text-2xl font-bold text-warning">{estadisticas.enVacaciones}</p>
            </div>
            <div className="bg-secondary/10 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Nómina Total</span>
              </div>
              <p className="text-2xl font-bold">Bs. {estadisticas.totalNomina.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lista">Lista de Empleados</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar empleados..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEmpleadoForm({});
                      setEditingId(null);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Empleado
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingId ? 'Editar Empleado' : 'Nuevo Empleado'}
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground">
                        Complete la información del empleado
                      </p>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ci">Cédula de Identidad *</Label>
                          <Input
                            id="ci"
                            value={empleadoForm.ci || ''}
                            onChange={(e) => setEmpleadoForm({...empleadoForm, ci: e.target.value})}
                            placeholder="12345678"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nombres">Nombres *</Label>
                          <Input
                            id="nombres"
                            value={empleadoForm.nombres || ''}
                            onChange={(e) => setEmpleadoForm({...empleadoForm, nombres: e.target.value})}
                            placeholder="Juan Carlos"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apellidos">Apellidos *</Label>
                          <Input
                            id="apellidos"
                            value={empleadoForm.apellidos || ''}
                            onChange={(e) => setEmpleadoForm({...empleadoForm, apellidos: e.target.value})}
                            placeholder="Mamani Quispe"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                          <Input
                            id="fecha_nacimiento"
                            type="date"
                            value={empleadoForm.fecha_nacimiento || ''}
                            onChange={(e) => setEmpleadoForm({...empleadoForm, fecha_nacimiento: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefono">Teléfono</Label>
                          <Input
                            id="telefono"
                            value={empleadoForm.telefono || ''}
                            onChange={(e) => setEmpleadoForm({...empleadoForm, telefono: e.target.value})}
                            placeholder="76543210"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={empleadoForm.email || ''}
                            onChange={(e) => setEmpleadoForm({...empleadoForm, email: e.target.value})}
                            placeholder="empleado@empresa.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input
                          id="direccion"
                          value={empleadoForm.direccion || ''}
                          onChange={(e) => setEmpleadoForm({...empleadoForm, direccion: e.target.value})}
                          placeholder="Av. 6 de Agosto #123, La Paz"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cargo">Cargo *</Label>
                          <Select
                            value={empleadoForm.cargo || ''}
                            onValueChange={(value) => setEmpleadoForm({...empleadoForm, cargo: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar cargo" />
                            </SelectTrigger>
                            <SelectContent>
                              {empleadoForm.departamento && cargosPorDepartamento[empleadoForm.departamento] ? 
                                cargosPorDepartamento[empleadoForm.departamento].map(cargo => (
                                  <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                                )) :
                                [...new Set(Object.values(cargosPorDepartamento).flat())].map(cargo => (
                                  <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="departamento">Departamento</Label>
                          <Select
                            value={empleadoForm.departamento || ''}
                            onValueChange={(value) => {
                              const newForm = { ...empleadoForm, departamento: value };
                              if (empleadoForm.cargo && !cargosPorDepartamento[value]?.includes(empleadoForm.cargo)) {
                                newForm.cargo = '';
                              }
                              setEmpleadoForm(newForm);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar departamento" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(cargosPorDepartamento).map(dept => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fecha_ingreso">Fecha de Ingreso</Label>
                          <Input
                            id="fecha_ingreso"
                            type="date"
                            value={empleadoForm.fecha_ingreso || ''}
                            onChange={(e) => setEmpleadoForm({...empleadoForm, fecha_ingreso: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="salario_base">Salario Base (Bs.)</Label>
                          <Input
                            id="salario_base"
                            type="number"
                            step="0.01"
                            value={empleadoForm.salario_base || ''}
                            onChange={(e) => setEmpleadoForm({...empleadoForm, salario_base: parseFloat(e.target.value) || 0})}
                            placeholder="4500.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="estado">Estado</Label>
                          <Select
                            value={empleadoForm.estado || 'activo'}
                            onValueChange={(value) => setEmpleadoForm({...empleadoForm, estado: value as 'activo' | 'inactivo' | 'vacaciones' | 'licencia'})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="activo">Activo</SelectItem>
                              <SelectItem value="inactivo">Inactivo</SelectItem>
                              <SelectItem value="vacaciones">Vacaciones</SelectItem>
                              <SelectItem value="licencia">Licencia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit">
                          {editingId ? 'Actualizar' : 'Registrar'} Empleado
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Empleado</TableHead>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>CI</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Salario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmpleados.map((empleado) => (
                      <TableRow key={empleado.id}>
                        <TableCell className="font-medium">{empleado.numero_empleado}</TableCell>
                        <TableCell>{empleado.nombres} {empleado.apellidos}</TableCell>
                        <TableCell>{empleado.ci}</TableCell>
                        <TableCell>{empleado.cargo}</TableCell>
                        <TableCell>{empleado.departamento}</TableCell>
                        <TableCell>Bs. {empleado.salario_base.toLocaleString()}</TableCell>
                        <TableCell>{getEstadoBadge(empleado.estado)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(empleado)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(empleado.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reportes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Departamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    empleados.reduce((acc, emp) => {
                      acc[emp.departamento] = (acc[emp.departamento] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([dept, count]) => (
                    <div key={dept} className="flex justify-between items-center">
                      <span>{dept}</span>
                      <Badge variant="outline">{count} empleado{count !== 1 ? 's' : ''}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análisis Salarial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Salario Promedio:</span>
                    <span className="font-semibold">
                      Bs. {estadisticas.total > 0 ? Math.round(estadisticas.totalNomina / estadisticas.total).toLocaleString() : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salario Máximo:</span>
                    <span className="font-semibold">
                      Bs. {empleados.length > 0 ? Math.max(...empleados.map(e => e.salario_base)).toLocaleString() : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salario Mínimo:</span>
                    <span className="font-semibold">
                      Bs. {empleados.length > 0 ? Math.min(...empleados.map(e => e.salario_base)).toLocaleString() : '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmpleadosModule;
