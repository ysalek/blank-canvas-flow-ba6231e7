import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Proveedor } from "./PurchasesData";

interface ProveedorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (proveedor: Proveedor) => Promise<void>;
}

const ProveedorForm = ({ open, onOpenChange, onSave }: ProveedorFormProps) => {
  const [formData, setFormData] = useState({
    nombre: "",
    nit: "",
    email: "",
    telefono: "",
    direccion: ""
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es requerido";
    if (!formData.nit.trim()) newErrors.nit = "El NIT es requerido";
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El email no tiene un formato válido";
    }
    if (!formData.telefono.trim()) newErrors.telefono = "El teléfono es requerido";
    if (!formData.direccion.trim()) newErrors.direccion = "La dirección es requerida";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Error en el formulario",
        description: "Por favor, corrija los errores marcados.",
        variant: "destructive"
      });
      return;
    }

    const nuevoProveedor: Proveedor = {
      id: Date.now().toString(),
      nombre: formData.nombre.trim(),
      nit: formData.nit.trim(),
      email: formData.email.trim(),
      telefono: formData.telefono.trim(),
      direccion: formData.direccion.trim(),
      activo: true,
      fechaCreacion: new Date().toISOString().slice(0, 10)
    };

    setSaving(true);
    try {
      await onSave(nuevoProveedor);
      setFormData({
        nombre: "",
        nit: "",
        email: "",
        telefono: "",
        direccion: ""
      });
      setErrors({});
      onOpenChange(false);

      toast({
        title: "Proveedor agregado",
        description: "El proveedor ha sido registrado exitosamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      nombre: "",
      nit: "",
      email: "",
      telefono: "",
      direccion: ""
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Proveedor</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Nombre del proveedor"
              className={errors.nombre ? "border-red-500" : ""}
            />
            {errors.nombre && <p className="text-sm text-red-500 mt-1">{errors.nombre}</p>}
          </div>

          <div>
            <Label htmlFor="nit">NIT *</Label>
            <Input
              id="nit"
              value={formData.nit}
              onChange={(e) => setFormData(prev => ({ ...prev, nit: e.target.value }))}
              placeholder="Número de NIT"
              className={errors.nit ? "border-red-500" : ""}
            />
            {errors.nit && <p className="text-sm text-red-500 mt-1">{errors.nit}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="telefono">Teléfono *</Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
              placeholder="77777777"
              className={errors.telefono ? "border-red-500" : ""}
            />
            {errors.telefono && <p className="text-sm text-red-500 mt-1">{errors.telefono}</p>}
          </div>

          <div>
            <Label htmlFor="direccion">Dirección *</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
              placeholder="Dirección del proveedor"
              className={errors.direccion ? "border-red-500" : ""}
            />
            {errors.direccion && <p className="text-sm text-red-500 mt-1">{errors.direccion}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Proveedor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProveedorForm;
