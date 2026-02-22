import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon, Sparkles, TrendingUp } from 'lucide-react';

interface EnhancedLayoutProps {
  children?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  actions?: ReactNode;
  className?: string;
}

export const EnhancedHeader = ({ 
  title, 
  subtitle, 
  badge, 
  actions,
  className 
}: EnhancedLayoutProps) => {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-foreground truncate">
            {title}
          </h1>
          {badge && (
            <Badge variant={badge.variant || 'secondary'} className="text-xs px-2 py-0.5 shrink-0">
              {badge.text}
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

interface MetricGridProps {
  children: ReactNode;
  columns?: number;
  className?: string;
}

export const MetricGrid = ({ children, columns = 4, className }: MetricGridProps) => {
  const gridCols = {
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  };

  return (
    <div className={cn("grid gap-6", gridCols[columns as keyof typeof gridCols] || gridCols[4], className)}>
      {children}
    </div>
  );
};

interface EnhancedCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
  children?: ReactNode;
}

export const EnhancedMetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  variant = 'default',
  className,
  children 
}: EnhancedCardProps) => {
  const variantStyles = {
    default: 'border-border',
    success: 'border-success/20 bg-success/5',
    warning: 'border-warning/20 bg-warning/5',
    destructive: 'border-destructive/20 bg-destructive/5'
  };

  const trendStyles = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground'
  };

  return (
    <Card className={cn("card-kpi", variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-3xl font-bold tracking-tight">
            {value}
          </div>
          {(subtitle || trendValue) && (
            <div className="flex items-center justify-between text-sm">
              {subtitle && (
                <span className="text-muted-foreground">{subtitle}</span>
              )}
              {trendValue && trend && (
                <div className={cn("flex items-center gap-1", trendStyles[trend])}>
                  <TrendingUp className={cn("h-3 w-3", {
                    'rotate-180': trend === 'down',
                    'rotate-90': trend === 'neutral'
                  })} />
                  {trendValue}
                </div>
              )}
            </div>
          )}
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export const Section = ({ title, subtitle, children, className }: SectionProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
};

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const ChartContainer = ({ 
  title, 
  subtitle, 
  children, 
  actions,
  className 
}: ChartContainerProps) => {
  return (
    <Card className={cn("card-gradient", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};