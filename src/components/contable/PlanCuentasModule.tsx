import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, FolderTree } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { inicializarPlanCuentas } from "@/utils/planCuentasInicial";
import { useSupabasePlanCuentas } from "@/hooks/useSupabasePlanCuentas";

interface Cuenta {
  codigo: string;
  nombre: string;
  tipo: 'activo' | 'pasivo' | 'patrimonio' | 'ingresos' | 'gastos';
  nivel: number;
  padre?: string;
  naturaleza: 'deudora' | 'acreedora';
  saldo: number;
  activa: boolean;
}

const PlanCuentasModule = () => {
  const [showNewCuenta, setShowNewCuenta] = useState(false);
  const [showEditCuenta, setShowEditCuenta] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [savingNewCuenta, setSavingNewCuenta] = useState(false);
  const [savingEditCuenta, setSavingEditCuenta] = useState(false);
  const [newCuenta, setNewCuenta] = useState({
    codigo: "",
    nombre: "",
    tipo: "activo" as const,
    nivel: 1,
    padre: "",
    naturaleza: "deudora" as const
  });
  const { toast } = useToast();
  const {
    planCuentas: cuentas,
    loading,
    createCuenta,
    updateCuenta,
    deleteCuenta,
    initializePlanCuentasBasico,
    refetch
  } = useSupabasePlanCuentas();

  // Inicializar plan de cuentas básico si no hay cuentas
  const inicializarPlanBasico = async () => {
    try {
      await initializePlanCuentasBasico();
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo inicializar el plan de cuentas",
        variant: "destructive"
      });
    }
  };

  const guardarCuenta = async () => {
    if (!newCuenta.codigo || !newCuenta.nombre) {
      toast({
        title: "Error",
        description: "Debe completar el código y nombre de la cuenta",
        variant: "destructive"
      });
      return;
    }

    try {
      setSavingNewCuenta(true);
      const cuentaData: any = {
        codigo: newCuenta.codigo,
        nombre: newCuenta.nombre,
        tipo: newCuenta.tipo,
        naturaleza: newCuenta.naturaleza,
        nivel: newCuenta.nivel || 1,
        cuenta_padre: newCuenta.padre || null,
        saldo: 0,
        activa: true
      };
      
      await createCuenta(cuentaData);
      
      toast({
        title: "Cuenta creada",
        description: `Cuenta ${newCuenta.codigo} - ${newCuenta.nombre}`,
      });
      
      setShowNewCuenta(false);
      setNewCuenta({
        codigo: "",
        nombre: "",
        tipo: "activo" as const,
        nivel: 1,
        padre: "",
        naturaleza: "deudora" as const
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la cuenta",
        variant: "destructive"
      });
    } finally {
      setSavingNewCuenta(false);
    }
  };

  const editarCuenta = async () => {
    if (!editingCuenta) return;
    
    try {
      setSavingEditCuenta(true);
      const cuentaData: any = {
        codigo: editingCuenta.codigo,
        nombre: editingCuenta.nombre,
        tipo: editingCuenta.tipo,
        naturaleza: editingCuenta.naturaleza,
        nivel: editingCuenta.nivel || 1,
        cuenta_padre: editingCuenta.cuenta_padre || null,
        activa: editingCuenta.activa
      };
      
      await updateCuenta(editingCuenta.id!, cuentaData);
      
      toast({
        title: "Cuenta actualizada",
        description: `Cuenta ${editingCuenta.codigo} actualizada`,
      });
      
      setShowEditCuenta(false);
      setEditingCuenta(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la cuenta",
        variant: "destructive"
      });
    } finally {
      setSavingEditCuenta(false);
    }
  };

  const eliminarCuenta = async (codigo: string) => {
    const cuenta = cuentas.find(c => c.codigo === codigo);
    if (!cuenta) return;

    if (confirm(`¿Está seguro de eliminar la cuenta ${codigo} - ${cuenta.nombre}?`)) {
      try {
        await deleteCuenta(cuenta.id!);
        
        toast({
          title: "Cuenta eliminada",
          description: `Cuenta ${codigo} eliminada exitosamente`,
        });
        
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar la cuenta",
          variant: "destructive"
        });
      }
    }
  };

  const cuentasAgrupadas = cuentas.reduce((acc, cuenta) => {
    if (!acc[cuenta.tipo]) {
      acc[cuenta.tipo] = [];
    }
    acc[cuenta.tipo].push(cuenta);
    return acc;
  }, {} as Record<string, any[]>);

  const cuentasFiltradas = cuentas.filter(cuenta => {
    const matchesSearch = cuenta.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cuenta.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterTipo === "todos" || cuenta.tipo === filterTipo;
    return matchesSearch && matchesFilter;
  });

  const tiposCuenta = ["activo", "pasivo", "patrimonio", "ingresos", "gastos"];

  if (loading) {
    return <div className="flex items-center justify-center p-8">Cargando plan de cuentas...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderTree className="w-6 h-6 text-primary" />
          <div>
           <h2 className="text-xl font-bold">Plan de Cuentas</h2>
           <p className="text-sm text-muted-foreground">
             Catálogo de cuentas contables
           </p>
          </div>
        </div>
        <Dialog open={showNewCuenta} onOpenChange={setShowNewCuenta}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent className="dialog-animated">
            <DialogHeader>
              <DialogTitle>Nueva Cuenta Contable</DialogTitle>
              <DialogDescription>
                Crear una nueva cuenta en el plan de cuentas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={newCuenta.codigo}
                    onChange={(e) => setNewCuenta(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="1111"
                    disabled={savingNewCuenta}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nivel">Nivel</Label>
                  <Input
                    id="nivel"
                    type="number"
                    value={newCuenta.nivel}
                    onChange={(e) => setNewCuenta(prev => ({ ...prev, nivel: parseInt(e.target.value) || 1 }))}
                    disabled={savingNewCuenta}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Cuenta</Label>
                <Input
                  id="nombre"
                  value={newCuenta.nombre}
                  onChange={(e) => setNewCuenta(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Caja General"
                  disabled={savingNewCuenta}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cuenta</Label>
                  <Select 
                    value={newCuenta.tipo} 
                    onValueChange={(value: any) => setNewCuenta(prev => ({ ...prev, tipo: value }))}
                    disabled={savingNewCuenta}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="pasivo">Pasivo</SelectItem>
                      <SelectItem value="patrimonio">Patrimonio</SelectItem>
                      <SelectItem value="ingresos">Ingresos</SelectItem>
                      <SelectItem value="gastos">Gastos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Naturaleza</Label>
                  <Select 
                    value={newCuenta.naturaleza} 
                    onValueChange={(value: any) => setNewCuenta(prev => ({ ...prev, naturaleza: value }))}
                    disabled={savingNewCuenta}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deudora">Deudora</SelectItem>
                      <SelectItem value="acreedora">Acreedora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="padre">Cuenta Padre (opcional)</Label>
                <Input
                  id="padre"
                  value={newCuenta.padre}
                  onChange={(e) => setNewCuenta(prev => ({ ...prev, padre: e.target.value }))}
                  placeholder="1100"
                  disabled={savingNewCuenta}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewCuenta(false)} disabled={savingNewCuenta}>
                  Cancelar
                </Button>
                <Button onClick={() => void guardarCuenta()} disabled={savingNewCuenta}>
                  {savingNewCuenta ? "Guardando..." : "Crear Cuenta"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="pasivo">Pasivos</SelectItem>
            <SelectItem value="patrimonio">Patrimonio</SelectItem>
            <SelectItem value="ingresos">Ingresos</SelectItem>
            <SelectItem value="gastos">Gastos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Cuentas */}
      {cuentas.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Plan de Cuentas Vacío</CardTitle>
            <CardDescription>
              No hay cuentas configuradas. Puede inicializar un plan de cuentas básico boliviano.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                El plan de cuentas básico incluye las cuentas principales según la normativa boliviana:
                Activos, Pasivos, Patrimonio, Ingresos y Gastos.
              </p>
              <Button onClick={inicializarPlanBasico} className="min-w-[200px]">
                <FolderTree className="w-4 h-4 mr-2" />
                Inicializar Plan de Cuentas Básico
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Cuentas Contables</CardTitle>
            <CardDescription>
              {cuentasFiltradas.length} cuentas encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tiposCuenta.map(tipo => {
                const cuentasTipo = cuentasFiltradas.filter(c => c.tipo === tipo);
                if (cuentasTipo.length === 0) return null;

                return (
                  <div key={tipo} className="space-y-2">
                    <h3 className="font-semibold text-lg capitalize flex items-center gap-2">
                      {tipo}
                      <Badge variant="outline">{cuentasTipo.length}</Badge>
                    </h3>
                    <div className="border rounded-lg divide-y">
                      {cuentasTipo.map(cuenta => (
                        <div key={cuenta.id} className="p-4 table-row-interactive group">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-semibold text-lg">
                                  {cuenta.codigo}
                                </span>
                                <span className="font-medium">{cuenta.nombre}</span>
                                <Badge variant="outline" className="text-xs">
                                  Nivel {cuenta.nivel}
                                </Badge>
                                <Badge 
                                  variant={cuenta.naturaleza === 'deudora' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {cuenta.naturaleza}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Saldo: Bs. {cuenta.saldo?.toFixed(2) || '0.00'}</span>
                                {cuenta.cuenta_padre && (
                                  <Badge variant="secondary" className="text-xs">
                                    Padre: {cuenta.cuenta_padre}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCuenta(cuenta);
                                setShowEditCuenta(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => eliminarCuenta(cuenta.codigo)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para editar cuenta */}
      <Dialog open={showEditCuenta} onOpenChange={setShowEditCuenta}>
        <DialogContent className="dialog-animated">
          <DialogHeader>
            <DialogTitle>Editar Cuenta</DialogTitle>
            <DialogDescription>
              Modificar información de la cuenta contable
            </DialogDescription>
          </DialogHeader>
          {editingCuenta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-codigo">Código</Label>
                  <Input
                    id="edit-codigo"
                    value={editingCuenta.codigo}
                    onChange={(e) => setEditingCuenta((prev: any) => ({ ...prev, codigo: e.target.value }))}
                    disabled={savingEditCuenta}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-nivel">Nivel</Label>
                  <Input
                    id="edit-nivel"
                    type="number"
                    value={editingCuenta.nivel}
                    onChange={(e) => setEditingCuenta((prev: any) => ({ ...prev, nivel: parseInt(e.target.value) || 1 }))}
                    disabled={savingEditCuenta}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre</Label>
                <Input
                  id="edit-nombre"
                  value={editingCuenta.nombre}
                  onChange={(e) => setEditingCuenta((prev: any) => ({ ...prev, nombre: e.target.value }))}
                  disabled={savingEditCuenta}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={editingCuenta.tipo} 
                    onValueChange={(value) => setEditingCuenta((prev: any) => ({ ...prev, tipo: value }))}
                    disabled={savingEditCuenta}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="pasivo">Pasivo</SelectItem>
                      <SelectItem value="patrimonio">Patrimonio</SelectItem>
                      <SelectItem value="ingresos">Ingresos</SelectItem>
                      <SelectItem value="gastos">Gastos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Naturaleza</Label>
                  <Select 
                    value={editingCuenta.naturaleza} 
                    onValueChange={(value) => setEditingCuenta((prev: any) => ({ ...prev, naturaleza: value }))}
                    disabled={savingEditCuenta}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deudora">Deudora</SelectItem>
                      <SelectItem value="acreedora">Acreedora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditCuenta(false)} disabled={savingEditCuenta}>
                  Cancelar
                </Button>
                <Button onClick={() => void editarCuenta()} disabled={savingEditCuenta}>
                  {savingEditCuenta ? "Guardando..." : "Actualizar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanCuentasModule;
