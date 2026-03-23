import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Presupuesto } from '../types';

export type PresupuestoFormData = Omit<Presupuesto, 'id' | 'totalEjecutado'>;

interface PresupuestoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCrearPresupuesto: (data: PresupuestoFormData) => Promise<void>;
}

export const PresupuestoDialog: React.FC<PresupuestoDialogProps> = ({
  open,
  onOpenChange,
  onCrearPresupuesto
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    periodo: '',
    fechaInicio: '',
    fechaFin: '',
    responsable: '',
    totalPresupuestado: 0,
    estado: 'borrador' as const
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const crearPresupuesto = async () => {
    if (!formData.nombre || !formData.periodo || !formData.fechaInicio || !formData.fechaFin) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      await onCrearPresupuesto(formData);

      toast({
        title: "Presupuesto creado",
        description: "El nuevo presupuesto ha sido creado exitosamente",
      });

      setFormData({
        nombre: '',
        descripcion: '',
        periodo: '',
        fechaInicio: '',
        fechaFin: '',
        responsable: '',
        totalPresupuestado: 0,
        estado: 'borrador'
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creando presupuesto:', error);
      toast({
        title: "No se pudo crear el presupuesto",
        description: "Revise los datos e intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Presupuesto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Presupuesto</DialogTitle>
          <DialogDescription>
            Configure los parámetros para el nuevo presupuesto empresarial
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del Presupuesto</Label>
            <Input 
              id="nombre" 
              placeholder="Ej. Presupuesto Anual 2024" 
              value={formData.nombre}
              onChange={(e) => handleInputChange('nombre', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="periodo">Período</Label>
            <Select value={formData.periodo} onValueChange={(value) => handleInputChange('periodo', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anual">Anual</SelectItem>
                <SelectItem value="semestral">Semestral</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fecha-inicio">Fecha de Inicio</Label>
            <Input 
              id="fecha-inicio" 
              type="date" 
              value={formData.fechaInicio}
              onChange={(e) => handleInputChange('fechaInicio', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fecha-fin">Fecha de Fin</Label>
            <Input 
              id="fecha-fin" 
              type="date" 
              value={formData.fechaFin}
              onChange={(e) => handleInputChange('fechaFin', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="responsable">Responsable</Label>
            <Input 
              id="responsable" 
              placeholder="Nombre del responsable" 
              value={formData.responsable}
              onChange={(e) => handleInputChange('responsable', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="monto-total">Monto Total Presupuestado</Label>
            <Input 
              id="monto-total" 
              type="number" 
              placeholder="0.00" 
              value={formData.totalPresupuestado}
              onChange={(e) => handleInputChange('totalPresupuestado', parseFloat(e.target.value) || 0)}
            />
          </div>
          
          <div className="col-span-2 space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea 
              id="descripcion" 
              placeholder="Descripción del presupuesto" 
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={crearPresupuesto} disabled={saving}>
            {saving ? 'Guardando...' : 'Crear Presupuesto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
