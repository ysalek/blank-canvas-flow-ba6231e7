
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { calculateMetricAlert, getAlertColor } from "@/utils/metricsUtils";

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  trend: "up" | "down" | "neutral";
  color: string;
  percentage?: number;
  showAlert?: boolean;
}

const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
};

const MetricCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  color,
  percentage,
  showAlert = true 
}: MetricCardProps) => {
  
  const alert = percentage !== undefined ? calculateMetricAlert(percentage) : null;
  const shouldShowAlert = showAlert && alert && alert.level !== 'normal';

  return (
    <Card className={`overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 animate-fade-in ${shouldShowAlert ? getAlertColor(alert!.level) : 'border-border'}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {getTrendIcon(trend)}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground/80">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
