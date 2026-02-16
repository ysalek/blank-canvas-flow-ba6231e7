
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Sparkles, Zap } from 'lucide-react';
import { usePlan, PLAN_PRICES } from '@/hooks/usePlan';
import { toast } from '@/hooks/use-toast';

interface PlanUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { name: 'Transacciones mensuales', basic: '100', pro: 'Ilimitadas' },
  { name: 'Usuarios', basic: '1', pro: 'Hasta 50' },
  { name: 'Contabilidad básica', basic: true, pro: true },
  { name: 'Facturación', basic: true, pro: true },
  { name: 'Punto de Venta', basic: false, pro: true },
  { name: 'Compras y Proveedores', basic: false, pro: true },
  { name: 'Balance General', basic: false, pro: true },
  { name: 'Estado de Resultados', basic: false, pro: true },
  { name: 'Nómina y RRHH', basic: false, pro: true },
  { name: 'Análisis Financiero', basic: false, pro: true },
  { name: 'Análisis con IA', basic: false, pro: true },
  { name: 'Presupuestos', basic: false, pro: true },
  { name: 'Centros de Costo', basic: false, pro: true },
  { name: 'Auditoría Avanzada', basic: false, pro: true },
  { name: 'Backup automático', basic: false, pro: true },
  { name: 'Soporte prioritario', basic: false, pro: true },
];

const PlanUpgradeModal = ({ open, onOpenChange }: PlanUpgradeModalProps) => {
  const { upgradeToPro, currentPlan } = usePlan();

  const handleUpgrade = () => {
    // TODO: Integrate with Stripe for real payments
    upgradeToPro();
    toast({ title: '¡Plan actualizado!', description: 'Ahora tiene acceso a todas las funciones profesionales.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Actualizar Plan
          </DialogTitle>
          <DialogDescription>Compare los planes y elija el mejor para su negocio.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-0 border rounded-xl overflow-hidden mt-4">
          {/* Header */}
          <div className="p-4 bg-muted/30 border-b font-medium text-sm">Característica</div>
          <div className="p-4 bg-muted/30 border-b border-l text-center">
            <div className="font-bold">Gratuito</div>
            <div className="text-lg font-bold text-foreground">$0</div>
          </div>
          <div className="p-4 bg-primary/5 border-b border-l text-center relative">
            <Badge className="absolute -top-0 right-2 bg-primary text-primary-foreground text-[10px]">Recomendado</Badge>
            <div className="font-bold text-primary">Profesional</div>
            <div className="text-lg font-bold text-primary">${PLAN_PRICES.pro.monthly}/mes</div>
          </div>

          {/* Features */}
          {features.map((f, i) => (
            <div key={i} className="contents">
              <div className={`p-3 text-sm border-b ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>{f.name}</div>
              <div className={`p-3 text-center border-b border-l ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>
                {typeof f.basic === 'boolean' ? (
                  f.basic ? <Check className="w-4 h-4 text-success mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                ) : (
                  <span className="text-sm">{f.basic}</span>
                )}
              </div>
              <div className={`p-3 text-center border-b border-l ${i % 2 === 0 ? 'bg-primary/5' : 'bg-primary/[0.02]'}`}>
                {typeof f.pro === 'boolean' ? (
                  f.pro ? <Check className="w-4 h-4 text-success mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                ) : (
                  <span className="text-sm font-medium text-primary">{f.pro}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Mantener plan actual
          </Button>
          {currentPlan === 'basic' && (
            <Button onClick={handleUpgrade} className="flex-1 btn-gradient text-white gap-2">
              <Zap className="w-4 h-4" />
              Actualizar a Pro — ${PLAN_PRICES.pro.monthly}/mes
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanUpgradeModal;
