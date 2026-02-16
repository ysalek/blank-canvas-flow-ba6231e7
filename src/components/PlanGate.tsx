import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { usePlan, PLAN_PRICES } from '@/hooks/usePlan';

interface PlanGateProps {
  moduleId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

const PlanGate = ({ moduleId, children, fallback }: PlanGateProps) => {
  const { hasAccess, upgradeToPro } = usePlan();

  if (hasAccess(moduleId)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full text-center border-primary/20">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            Función Profesional
          </h3>
          <p className="text-muted-foreground text-sm">
            Este módulo está disponible en el Plan Pro. Actualiza para desbloquear 
            todas las herramientas avanzadas de contabilidad.
          </p>
          <div className="pt-2">
            <Button onClick={upgradeToPro} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Actualizar a Pro — {PLAN_PRICES.pro.label}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sin compromiso • Cancela cuando quieras
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanGate;
