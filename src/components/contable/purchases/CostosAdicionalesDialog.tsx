import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CostoAdicional {
  id: string;
  concepto: string;
  monto: number;
}

interface CostosAdicionalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (costos: CostoAdicional[]) => Promise<void> | void;
  costosIniciales?: CostoAdicional[];
}

export const CostosAdicionalesDialog = ({
  open,
  onOpenChange,
  onSave,
  costosIniciales = []
}: CostosAdicionalesDialogProps) => {
  const [costos, setCostos] = useState<CostoAdicional[]>(
    costosIniciales.length > 0 ? costosIniciales : [
      { id: '1', concepto: '', monto: 0 }
    ]
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const agregarCosto = () => {
    setCostos([...costos, { 
      id: Date.now().toString(), 
      concepto: '', 
      monto: 0 
    }]);
  };

  const eliminarCosto = (id: string) => {
    if (costos.length > 1) {
      setCostos(costos.filter(c => c.id !== id));
    }
  };

  const actualizarCosto = (id: string, campo: 'concepto' | 'monto', valor: string | number) => {
    setCostos(costos.map(c => 
      c.id === id ? { ...c, [campo]: valor } : c
    ));
  };

  const handleGuardar = async () => {
    const costosValidos = costos.filter(c => c.concepto && c.monto > 0);
    
    if (costosValidos.length === 0) {
      toast({
        title: "Sin costos adicionales",
        description: "No se agregaron costos adicionales a la compra",
      });
    }

    try {
      setSaving(true);
      await Promise.resolve(onSave(costosValidos));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const totalCostosAdicionales = costos.reduce((sum, c) => sum + (c.monto || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Costos Adicionales de Compra</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Fletes, almacenaje, nacionalización, seguros, etc. Se prorratearán entre los productos.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">Conceptos de Costos</Label>
              <Button 
                type="button" 
                size="sm" 
                onClick={agregarCosto}
                variant="outline"
                disabled={saving}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>

            {costos.map((costo, index) => (
              <div key={costo.id} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Concepto</Label>
                  <Input
                    placeholder="Ej: Flete, Almacenaje, Desconsolidación"
                    value={costo.concepto}
                    onChange={(e) => actualizarCosto(costo.id, 'concepto', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="w-40">
                  <Label>Monto (Bs.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costo.monto || ''}
                    onChange={(e) => actualizarCosto(costo.id, 'monto', parseFloat(e.target.value) || 0)}
                    disabled={saving}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => eliminarCosto(costo.id)}
                  disabled={saving || costos.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Costos Adicionales:</span>
              <span className="text-xl font-bold text-primary">
                Bs. {totalCostosAdicionales.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Este monto se distribuirá proporcionalmente entre los productos según su costo base
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={saving}>
              {saving ? "Guardando..." : "Guardar y Aplicar Costos"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
