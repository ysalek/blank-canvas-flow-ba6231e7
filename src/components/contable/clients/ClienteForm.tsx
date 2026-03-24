
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Cliente } from "../billing/BillingData";

interface ClienteFormProps {
  cliente?: Cliente | null;
  onSave: (cliente: Cliente) => Promise<void>;
  onCancel: () => void;
}

const ClienteForm = ({ cliente, onSave, onCancel }: ClienteFormProps) => {
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

  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre,
        nit: cliente.nit,
        email: cliente.email,
        telefono: cliente.telefono,
        direccion: cliente.direccion
      });
    }
  }, [cliente]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es requerido";
    if (!formData.nit.trim()) newErrors.nit = "El NIT es requerido";
    if (!formData.email.trim()) newErrors.email = "El email es requerido";
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El email no es válido";
    }
    if (!formData.telefono.trim()) newErrors.telefono = "El teléfono es requerido";
    if (!formData.direccion.trim()) newErrors.direccion = "La dirección es requerida";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Error en la validación",
        description: "Por favor corrija los errores en el formulario.",
        variant: "destructive"
      });
      return;
    }

    const nuevoCliente: Cliente = {
      id: cliente?.id || Date.now().toString(),
      nombre: formData.nombre.trim(),
      nit: formData.nit.trim(),
      email: formData.email.trim(),
      telefono: formData.telefono.trim(),
      direccion: formData.direccion.trim(),
      activo: cliente?.activo ?? true,
      fechaCreacion: cliente?.fechaCreacion || new Date().toISOString().slice(0, 10)
    };

    setSaving(true);
    try {
      await onSave(nuevoCliente);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {cliente ? "Editar Cliente" : "Nuevo Cliente"}
            </CardTitle>
            <CardDescription>
              {cliente ? "Modifica la información del cliente" : "Registra un nuevo cliente en el sistema"}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre / Razón Social *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => handleInputChange("nombre", e.target.value)}
              placeholder="Nombre completo o razón social"
              className={errors.nombre ? "border-red-500" : ""}
            />
            {errors.nombre && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.nombre}
              </p>
            )}
          </div>

          {/* NIT */}
          <div className="space-y-2">
            <Label htmlFor="nit">NIT *</Label>
            <Input
              id="nit"
              value={formData.nit}
              onChange={(e) => handleInputChange("nit", e.target.value)}
              placeholder="Número de identificación tributaria"
              className={errors.nit ? "border-red-500" : ""}
            />
            {errors.nit && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.nit}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="correo@ejemplo.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono *</Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => handleInputChange("telefono", e.target.value)}
              placeholder="Número de teléfono"
              className={errors.telefono ? "border-red-500" : ""}
            />
            {errors.telefono && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.telefono}
              </p>
            )}
          </div>
        </div>

        {/* Dirección */}
        <div className="space-y-2">
          <Label htmlFor="direccion">Dirección *</Label>
          <Textarea
            id="direccion"
            value={formData.direccion}
            onChange={(e) => handleInputChange("direccion", e.target.value)}
            placeholder="Dirección completa del cliente"
            className={errors.direccion ? "border-red-500" : ""}
          />
          {errors.direccion && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.direccion}
            </p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : `${cliente ? "Actualizar" : "Guardar"} Cliente`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClienteForm;
