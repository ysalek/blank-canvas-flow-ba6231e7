import React, { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    <div className={cn("hero-panel rounded-[2rem] p-6 md:p-8", className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="feature-chip">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Operacion ejecutiva
            </span>
            {badge && (
              <Badge variant={badge.variant || 'secondary'} className="rounded-full px-3 py-1 text-xs font-semibold">
                {badge.text}
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
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
      {React.Children.map(children, (child, index) => (
        <div className={`animate-slide-up stagger-${Math.min(index + 1, 6)}`} key={index}>
          {child}
        </div>
      ))}
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
    default: 'border-border/80',
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
    <Card className={cn("card-kpi group cursor-default rounded-3xl", variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            {title}
          </CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground/80">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="rounded-2xl border border-primary/10 bg-primary/10 p-2.5 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {value}
          </div>
          {trendValue && trend && (
            <div className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", trendStyles[trend])}>
              <TrendingUp className={cn("h-3.5 w-3.5", {
                'rotate-180': trend === 'down',
                'rotate-90': trend === 'neutral'
              })} />
              {trendValue}
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
  actions?: ReactNode;
}

export const Section = ({ title, subtitle, children, className, actions }: SectionProps) => {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="section-heading">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
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
    <Card className={cn("card-gradient rounded-[1.75rem]", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
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

interface EmptyStatePanelProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyStatePanel = ({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStatePanelProps) => {
  return (
    <div className={cn("empty-state-panel", className)}>
      {Icon && <Icon className="empty-state-icon mx-auto mb-4 h-14 w-14 text-muted-foreground" />}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
