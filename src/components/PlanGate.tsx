import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, Crown } from 'lucide-react';
import { usePlan, PLAN_PRICES } from '@/hooks/usePlan';

interface PlanGateProps {
  moduleId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

const PlanGate = ({ moduleId, children, fallback }: PlanGateProps) => {
  const { hasAccess, isAdmin, getRequiredPlan } = usePlan();

  if (isAdmin || hasAccess(moduleId)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  const requiredPlan = getRequiredPlan(moduleId);
  const isEnterprise = requiredPlan === 'enterprise';

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className={`max-w-md w-full text-center ${isEnterprise ? 'border-amber-500/30' : 'border-primary/20'}`}>
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${isEnterprise ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
            <Lock className={`w-8 h-8 ${isEnterprise ? 'text-amber-600' : 'text-primary'}`} />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            {isEnterprise ? 'Función Enterprise' : 'Función Profesional'}
          </h3>
          <p className="text-muted-foreground text-sm">
            {isEnterprise 
              ? 'Este módulo está disponible en el Plan Enterprise. Ideal para empresas con necesidades avanzadas.'
              : 'Este módulo está disponible en el Plan Pro. Actualiza para desbloquear herramientas avanzadas.'
            }
          </p>
          <div className="pt-2">
            <Button 
              onClick={() => window.dispatchEvent(new Event('open-upgrade-modal'))} 
              className={`gap-2 ${isEnterprise ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            >
              {isEnterprise ? <Crown className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {isEnterprise 
                ? `Enterprise — Bs ${PLAN_PRICES.enterprise.monthlyBs}/mes`
                : `Pro — Bs ${PLAN_PRICES.pro.monthlyBs}/mes`
              }
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Sin compromiso • Cancela cuando quieras</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanGate;
