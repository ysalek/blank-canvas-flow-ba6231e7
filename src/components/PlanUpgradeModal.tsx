
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Sparkles, Zap, Crown } from 'lucide-react';
import { usePlan, PLAN_PRICES } from '@/hooks/usePlan';
import { toast } from '@/hooks/use-toast';

interface PlanUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { name: 'Transacciones mensuales', basic: '100', pro: 'Ilimitadas', enterprise: 'Ilimitadas' },
  { name: 'Usuarios', basic: '1', pro: 'Hasta 5', enterprise: 'Hasta 50' },
  { name: 'Empresas', basic: '1', pro: '1', enterprise: 'Hasta 10' },
  { name: 'Contabilidad básica', basic: true, pro: true, enterprise: true },
  { name: 'Facturación', basic: true, pro: true, enterprise: true },
  { name: 'Punto de Venta', basic: false, pro: true, enterprise: true },
  { name: 'Compras y Proveedores', basic: false, pro: true, enterprise: true },
  { name: 'Balance General', basic: false, pro: true, enterprise: true },
  { name: 'Estado de Resultados', basic: false, pro: true, enterprise: true },
  { name: 'Nómina y RRHH', basic: false, pro: true, enterprise: true },
  { name: 'Notas Crédito/Débito', basic: false, pro: true, enterprise: true },
  { name: 'Libro Compras/Ventas SIN', basic: false, pro: true, enterprise: true },
  { name: 'Conciliación Bancaria', basic: false, pro: true, enterprise: true },
  { name: 'Presupuestos', basic: false, pro: true, enterprise: true },
  { name: 'Exportación TXT para SIAT', basic: false, pro: true, enterprise: true },
  { name: 'Auditoría Avanzada', basic: false, pro: false, enterprise: true },
  { name: 'Análisis con IA', basic: false, pro: false, enterprise: true },
  { name: 'Análisis Rentabilidad', basic: false, pro: false, enterprise: true },
  { name: 'Multi-empresa', basic: false, pro: false, enterprise: true },
  { name: 'API SIAT en Línea', basic: false, pro: false, enterprise: true },
  { name: 'Soporte prioritario', basic: false, pro: false, enterprise: true },
  { name: 'Backup automático', basic: false, pro: true, enterprise: true },
];

const renderCell = (value: boolean | string) => {
  if (typeof value === 'boolean') {
    return value 
      ? <Check className="w-4 h-4 text-success mx-auto" /> 
      : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
  }
  return <span className="text-sm font-medium">{value}</span>;
};

const PlanUpgradeModal = ({ open, onOpenChange }: PlanUpgradeModalProps) => {
  const { upgradeToPro, upgradeToEnterprise, currentPlan } = usePlan();

  const handleUpgrade = (plan: 'pro' | 'enterprise') => {
    if (plan === 'pro') upgradeToPro();
    else upgradeToEnterprise();
    toast({ 
      title: '¡Plan actualizado!', 
      description: `Ahora tiene acceso al Plan ${plan === 'pro' ? 'Profesional' : 'Enterprise'}.` 
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Planes ContaBolivia
          </DialogTitle>
          <DialogDescription>El sistema contable más completo de Bolivia. Elija el plan ideal para su empresa.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-0 border rounded-xl overflow-hidden mt-4">
          {/* Header */}
          <div className="p-4 bg-muted/30 border-b font-medium text-sm">Característica</div>
          <div className="p-4 bg-muted/30 border-b border-l text-center">
            <div className="font-bold">Gratuito</div>
            <div className="text-lg font-bold text-foreground">Bs 0</div>
            <div className="text-xs text-muted-foreground">Para siempre</div>
          </div>
          <div className="p-4 bg-primary/5 border-b border-l text-center relative">
            <Badge className="absolute -top-0 right-2 bg-primary text-primary-foreground text-[10px]">Popular</Badge>
            <div className="font-bold text-primary">Profesional</div>
            <div className="text-lg font-bold text-primary">Bs {PLAN_PRICES.pro.monthlyBs}/mes</div>
            <div className="text-xs text-muted-foreground">${PLAN_PRICES.pro.monthly} USD</div>
          </div>
          <div className="p-4 bg-amber-500/5 border-b border-l text-center relative">
            <Badge className="absolute -top-0 right-2 bg-amber-600 text-white text-[10px]">
              <Crown className="w-3 h-3 mr-0.5" /> Premium
            </Badge>
            <div className="font-bold text-amber-700">Enterprise</div>
            <div className="text-lg font-bold text-amber-700">Bs {PLAN_PRICES.enterprise.monthlyBs}/mes</div>
            <div className="text-xs text-muted-foreground">${PLAN_PRICES.enterprise.monthly} USD</div>
          </div>

          {/* Features */}
          {features.map((f, i) => (
            <div key={i} className="contents">
              <div className={`p-2.5 text-sm border-b ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>{f.name}</div>
              <div className={`p-2.5 text-center border-b border-l ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>
                {renderCell(f.basic)}
              </div>
              <div className={`p-2.5 text-center border-b border-l ${i % 2 === 0 ? 'bg-primary/5' : 'bg-primary/[0.02]'}`}>
                {renderCell(f.pro)}
              </div>
              <div className={`p-2.5 text-center border-b border-l ${i % 2 === 0 ? 'bg-amber-500/5' : 'bg-amber-500/[0.02]'}`}>
                {renderCell(f.enterprise)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Mantener plan actual
          </Button>
          {currentPlan === 'basic' && (
            <Button onClick={() => handleUpgrade('pro')} className="flex-1 btn-gradient text-white gap-2">
              <Zap className="w-4 h-4" />
              Pro — Bs {PLAN_PRICES.pro.monthlyBs}/mes
            </Button>
          )}
          {currentPlan !== 'enterprise' && (
            <Button 
              onClick={() => handleUpgrade('enterprise')} 
              className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Crown className="w-4 h-4" />
              Enterprise — Bs {PLAN_PRICES.enterprise.monthlyBs}/mes
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanUpgradeModal;
