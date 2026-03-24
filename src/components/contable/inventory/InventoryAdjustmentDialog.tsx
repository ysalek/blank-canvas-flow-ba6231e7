import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Producto } from "../products/ProductsData";
import { MovimientoInventario } from "./InventoryData";

interface InventoryAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productos: Producto[];
  onSaveMovement: (movement: MovimientoInventario) => Promise<void> | void;
}

const InventoryAdjustmentDialog = ({ 
  open, 
  onOpenChange, 
  productos, 
  onSaveMovement 
}: InventoryAdjustmentDialogProps) => {
  const [selectedProducto, setSelectedProducto] = useState<string>("");
  const [tipoAjuste, setTipoAjuste] = useState<"entrada" | "salida">("entrada");
  const [cantidad, setCantidad] = useState<number>(0);
  const [motivo, setMotivo] = useState("");
  const [documento, setDocumento] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    const producto = productos.find(p => p.id === selectedProducto);
    if (!producto) {
      toast({
        title: "Error",
        description: "Debe seleccionar un producto",
        variant: "destructive"
      });
      return;
    }

    if (cantidad <= 0) {
      toast({
        title: "Error", 
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    if (!motivo.trim()) {
      toast({
        title: "Error",
        description: "Debe especificar el motivo del ajuste",
        variant: "destructive"
      });
      return;
    }

    // Verificar que no genere stock negativo
    if (tipoAjuste === "salida" && producto.stockActual < cantidad) {
      toast({
        title: "Error - Stock Insuficiente",
        description: `No se puede realizar salida de ${cantidad} unidades. Stock disponible: ${producto.stockActual}`,
        variant: "destructive"
      });
      return;
    }

    const stockNuevo = tipoAjuste === "entrada" 
      ? producto.stockActual + cantidad
      : producto.stockActual - cantidad;

    const movimiento: MovimientoInventario = {
      id: Date.now().toString(),
      fecha: new Date().toISOString().slice(0, 10),
      tipo: tipoAjuste,
      productoId: selectedProducto,
      producto: producto.nombre,
      cantidad,
      costoUnitario: producto.costoUnitario,
      costoPromedioPonderado: producto.costoUnitario,
      motivo: `Ajuste de Inventario - ${motivo}`,
      documento: documento || `AJU-${Date.now().toString().slice(-6)}`,
      usuario: "Sistema",
      stockAnterior: producto.stockActual,
      stockNuevo,
      valorMovimiento: cantidad * producto.costoUnitario
    };

    try {
      setSaving(true);
      await Promise.resolve(onSaveMovement(movimiento));
    
    // Reset form
    setSelectedProducto("");
    setTipoAjuste("entrada");
    setCantidad(0);
    setMotivo("");
    setDocumento("");
    
    toast({
      title: "Ajuste Registrado",
      description: `Se registró el ajuste de inventario para ${producto.nombre}`,
    });

      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuste de Inventario</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Producto</Label>
            <Select value={selectedProducto} onValueChange={setSelectedProducto} disabled={saving}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {productos.map(producto => (
                  <SelectItem key={producto.id} value={producto.id}>
                    {producto.nombre} (Stock: {producto.stockActual})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Ajuste</Label>
            <Select value={tipoAjuste} onValueChange={(value: "entrada" | "salida") => setTipoAjuste(value)} disabled={saving}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada (Agregar Stock)</SelectItem>
                <SelectItem value="salida">Salida (Reducir Stock)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={cantidad}
              onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={saving}
              placeholder="Ej: Inventario físico, productos dañados, etc."
            />
          </div>

          <div className="space-y-2">
            <Label>Documento de Referencia (Opcional)</Label>
            <Input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              disabled={saving}
              placeholder="Número de documento"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={saving}>
              {saving ? "Guardando..." : "Registrar Ajuste"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryAdjustmentDialog;
