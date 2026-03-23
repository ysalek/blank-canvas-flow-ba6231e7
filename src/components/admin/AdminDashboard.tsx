import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Building2,
  CreditCard,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EnhancedHeader, EnhancedMetricCard, MetricGrid } from '../contable/dashboard/EnhancedLayout';

interface AdminStats {
  totalUsers: number;
  totalCompanies: number;
  proSubscribers: number;
  monthlyRevenue: number;
  freeUsers: number;
  conversionRate: number;
}

interface SubscriberRecord {
  id: string;
  email: string | null;
  created_at: string;
  subscription_tier: string | null;
  subscribed: boolean | null;
  subscription_end: string | null;
}

interface ProfileRecord {
  id: string;
  display_name: string | null;
  empresa: string | null;
  created_at: string;
}

interface GrowthPoint {
  month: string;
  usuarios: number;
  pro: number;
}

interface AlertItem {
  id: string;
  type: 'warning' | 'info' | 'error';
  message: string;
  timestamp: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalCompanies: 0,
    proSubscribers: 0,
    monthlyRevenue: 0,
    freeUsers: 0,
    conversionRate: 0,
  });
  const [recentSubscribers, setRecentSubscribers] = useState<SubscriberRecord[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<GrowthPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profilesRes, subscribersRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, empresa, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('subscribers').select('*').order('created_at', { ascending: false }),
      ]);

      const profiles = (profilesRes.data ?? []) as ProfileRecord[];
      const subscribers = (subscribersRes.data ?? []) as SubscriberRecord[];
      const companies = new Set(profiles.map((profile) => profile.empresa).filter(Boolean));
      const proCount = subscribers.filter(
        (subscriber) => subscriber.subscribed && subscriber.subscription_tier === 'pro'
      ).length;
      const freeCount = profiles.length - proCount;
      const conversionRate =
        profiles.length > 0 ? Math.round((proCount / profiles.length) * 100) : 0;

      setStats({
        totalUsers: profiles.length,
        totalCompanies: companies.size,
        proSubscribers: proCount,
        monthlyRevenue: proCount * 29,
        freeUsers: freeCount,
        conversionRate,
      });

      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const growthMap: Record<string, { total: number; pro: number }> = {};
      const now = new Date();

      for (let i = 5; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        growthMap[key] = { total: 0, pro: 0 };
      }

      profiles.forEach((profile) => {
        const key = profile.created_at.slice(0, 7);
        if (growthMap[key]) {
          growthMap[key].total += 1;
        }
      });

      subscribers
        .filter((subscriber) => subscriber.subscribed && subscriber.subscription_tier === 'pro')
        .forEach((subscriber) => {
          const key = subscriber.created_at.slice(0, 7);
          if (growthMap[key]) {
            growthMap[key].pro += 1;
          }
        });

      setUserGrowthData(
        Object.entries(growthMap).map(([key, value]) => ({
          month: monthNames[Number.parseInt(key.split('-')[1], 10) - 1],
          usuarios: value.total,
          pro: value.pro,
        }))
      );

      setRecentSubscribers(subscribers.slice(0, 5));

      const newAlerts: AlertItem[] = [];
      const expiringSoon = subscribers.filter((subscriber) => {
        if (!subscriber.subscription_end) return false;
        const end = new Date(subscriber.subscription_end);
        const diff = end.getTime() - Date.now();
        return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
      });

      if (expiringSoon.length > 0) {
        newAlerts.push({
          id: 'expiring',
          type: 'warning',
          message: `${expiringSoon.length} suscripcion(es) vencen en los proximos 7 dias.`,
          timestamp: new Date().toISOString(),
        });
      }

      if (freeCount > proCount * 3) {
        newAlerts.push({
          id: 'conversion',
          type: 'info',
          message: `Tasa de conversion baja (${conversionRate}%). Conviene revisar activacion comercial y monetizacion.`,
          timestamp: new Date().toISOString(),
        });
      }

      if (profiles.length === 0) {
        newAlerts.push({
          id: 'no-users',
          type: 'info',
          message: 'No hay usuarios registrados aun. El sistema esta listo para nuevos ingresos.',
          timestamp: new Date().toISOString(),
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    { title: 'Total usuarios', value: stats.totalUsers, icon: Users, subtitle: `${stats.freeUsers} en plan libre`, variant: 'success' as const },
    { title: 'Empresas', value: stats.totalCompanies, icon: Building2, subtitle: 'Organizaciones activas', variant: 'secondary' as const },
    { title: 'Suscriptores Pro', value: stats.proSubscribers, icon: CreditCard, subtitle: `${stats.conversionRate}% de conversion`, variant: stats.conversionRate > 10 ? 'success' as const : 'warning' as const },
    { title: 'Ingreso mensual', value: `$${stats.monthlyRevenue}`, icon: TrendingUp, subtitle: `$${stats.monthlyRevenue * 12} ARR estimado`, variant: 'success' as const },
  ];

  if (loading) {
    return (
      <div className="page-shell space-y-4 pb-12">
        <div className="h-24 rounded-[2rem] bg-muted animate-pulse" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-3xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Panel de administracion"
        subtitle="Monitorea crecimiento, conversion comercial, ingresos y alertas clave del entorno SaaS desde una vista ejecutiva."
        badge={{
          text: stats.proSubscribers > 0 ? 'Operacion con ingresos' : 'Operacion en despliegue',
          variant: stats.proSubscribers > 0 ? 'secondary' : 'warning',
        }}
        actions={
          <Button variant="outline" size="sm" onClick={loadAll} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      <MetricGrid columns={4}>
        {kpis.map((kpi) => (
          <EnhancedMetricCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.subtitle}
            icon={kpi.icon}
            variant={kpi.variant}
          />
        ))}
      </MetricGrid>

      <div className="hero-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Vista global
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">
              Combina adquisicion, conversion, ingresos y alertas en una sola superficie ejecutiva
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Este frente resume salud comercial, crecimiento y riesgos operativos para que la
              administracion tome decisiones rapidas sin salir del panel principal.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Enfoque sugerido
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Conversion</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Usa la tasa de conversion para medir si el crecimiento necesita mejor monetizacion.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Renovaciones</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Revisa alertas y ultimas suscripciones para anticipar soporte y renovaciones.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Crecimiento de usuarios</CardTitle>
            <CardDescription>Ultimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="usuarios" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Usuarios" />
                <Bar dataKey="pro" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} name="Pro" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribucion de planes</CardTitle>
            <CardDescription>Usuarios por tipo de suscripcion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Plan gratuito</span>
                  <span className="font-medium">{stats.freeUsers} usuarios</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-muted-foreground/40 transition-all"
                    style={{ width: `${stats.totalUsers > 0 ? (stats.freeUsers / stats.totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Plan Pro</span>
                  <span className="font-medium">{stats.proSubscribers} usuarios</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${stats.totalUsers > 0 ? (stats.proSubscribers / stats.totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasa de conversion</span>
                  <span className="font-bold text-primary">{stats.conversionRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ARR estimado</span>
                  <span className="font-bold">${stats.monthlyRevenue * 12}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas del sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    alert.type === 'error'
                      ? 'border-destructive/30 bg-destructive/5'
                      : alert.type === 'warning'
                        ? 'border-yellow-500/30 bg-yellow-500/5'
                        : 'border-primary/30 bg-primary/5'
                  }`}
                >
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                      alert.type === 'error'
                        ? 'text-destructive'
                        : alert.type === 'warning'
                          ? 'text-yellow-600'
                          : 'text-primary'
                    }`}
                  />
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))}

              {alerts.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-sm text-primary">Todo en orden. Sin alertas pendientes.</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ultimas suscripciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSubscribers.map((subscriber) => (
                <div key={subscriber.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{subscriber.email || 'Sin correo'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(subscriber.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={subscriber.subscription_tier === 'pro' ? 'default' : 'outline'}>
                      {subscriber.subscription_tier || 'basic'}
                    </Badge>
                    <Badge variant={subscriber.subscribed ? 'default' : 'secondary'} className="text-xs">
                      {subscriber.subscribed ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              ))}

              {recentSubscribers.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No hay suscripciones registradas aun.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
