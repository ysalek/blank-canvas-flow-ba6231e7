import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building2, CreditCard, TrendingUp, Shield, AlertTriangle, ArrowUpRight, Activity, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface AdminStats {
  totalUsers: number;
  totalCompanies: number;
  proSubscribers: number;
  monthlyRevenue: number;
  freeUsers: number;
  conversionRate: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'error';
  message: string;
  timestamp: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0, totalCompanies: 0, proSubscribers: 0,
    monthlyRevenue: 0, freeUsers: 0, conversionRate: 0,
  });
  const [recentSubscribers, setRecentSubscribers] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profilesRes, subscribersRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('id, display_name, empresa, created_at').order('created_at', { ascending: false }),
        supabase.from('subscribers').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      const profiles = profilesRes.data || [];
      const subscribers = subscribersRes.data || [];
      const empresas = new Set(profiles.map(p => p.empresa).filter(Boolean));
      const proCount = subscribers.filter(s => s.subscribed && s.subscription_tier === 'pro').length;
      const freeCount = profiles.length - proCount;

      setStats({
        totalUsers: profiles.length,
        totalCompanies: empresas.size,
        proSubscribers: proCount,
        monthlyRevenue: proCount * 29,
        freeUsers: freeCount,
        conversionRate: profiles.length > 0 ? Math.round((proCount / profiles.length) * 100) : 0,
      });

      // User growth by month (last 6 months)
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const growthMap: Record<string, { total: number; pro: number }> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        growthMap[key] = { total: 0, pro: 0 };
      }
      profiles.forEach(p => {
        const key = p.created_at.slice(0, 7);
        if (growthMap[key]) growthMap[key].total++;
      });
      subscribers.filter(s => s.subscribed && s.subscription_tier === 'pro').forEach(s => {
        const key = s.created_at.slice(0, 7);
        if (growthMap[key]) growthMap[key].pro++;
      });
      setUserGrowthData(
        Object.entries(growthMap).map(([k, v]) => ({
          month: monthNames[parseInt(k.split('-')[1]) - 1],
          usuarios: v.total,
          pro: v.pro,
        }))
      );

      // Recent subscribers
      setRecentSubscribers(subscribers.slice(0, 5));

      // Generate alerts
      const newAlerts: Alert[] = [];
      const expiringSoon = subscribers.filter(s => {
        if (!s.subscription_end) return false;
        const end = new Date(s.subscription_end);
        const diff = end.getTime() - Date.now();
        return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
      });
      if (expiringSoon.length > 0) {
        newAlerts.push({
          id: 'expiring',
          type: 'warning',
          message: `${expiringSoon.length} suscripción(es) vencen en los próximos 7 días`,
          timestamp: new Date().toISOString(),
        });
      }
      if (freeCount > proCount * 3) {
        newAlerts.push({
          id: 'conversion',
          type: 'info',
          message: `Tasa de conversión baja (${stats.conversionRate}%). Considere campañas de marketing.`,
          timestamp: new Date().toISOString(),
        });
      }
      if (profiles.length === 0) {
        newAlerts.push({
          id: 'no-users',
          type: 'info',
          message: 'No hay usuarios registrados aún. El sistema está listo para recibir registros.',
          timestamp: new Date().toISOString(),
        });
      }
      setAlerts(newAlerts);
    } catch (e) {
      console.error('Error loading admin stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    { title: 'Total Usuarios', value: stats.totalUsers, icon: Users, change: '+100%', positive: true },
    { title: 'Empresas Registradas', value: stats.totalCompanies, icon: Building2, change: `${stats.totalCompanies}`, positive: true },
    { title: 'Suscriptores Pro', value: stats.proSubscribers, icon: CreditCard, change: `${stats.conversionRate}% conv.`, positive: stats.conversionRate > 10 },
    { title: 'Ingresos Mensuales', value: `$${stats.monthlyRevenue}`, icon: TrendingUp, change: `$${stats.monthlyRevenue * 12}/año`, positive: true },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded animate-pulse" />)}
        </div>
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Panel de Administración</h2>
            <p className="text-sm text-muted-foreground">Vista global — ContaBolivia SaaS</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight className={`w-3 h-3 ${kpi.positive ? 'text-primary' : 'text-destructive'}`} />
                    <span className={`text-xs ${kpi.positive ? 'text-primary' : 'text-destructive'}`}>
                      {kpi.change}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <kpi.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Crecimiento de Usuarios</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
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
            <CardTitle className="text-lg">Distribución de Planes</CardTitle>
            <CardDescription>Usuarios por plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Plan Gratuito</span>
                  <span className="font-medium">{stats.freeUsers} usuarios</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-muted-foreground/40 rounded-full transition-all"
                    style={{ width: `${stats.totalUsers > 0 ? (stats.freeUsers / stats.totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Plan Pro ($29/mes)</span>
                  <span className="font-medium">{stats.proSubscribers} usuarios</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${stats.totalUsers > 0 ? (stats.proSubscribers / stats.totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasa de Conversión</span>
                  <span className="font-bold text-primary">{stats.conversionRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ARR Estimado</span>
                  <span className="font-bold">${stats.monthlyRevenue * 12}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Recent Subs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Alertas del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  alert.type === 'error' ? 'border-destructive/30 bg-destructive/5' :
                  alert.type === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' :
                  'border-primary/30 bg-primary/5'
                }`}>
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    alert.type === 'error' ? 'text-destructive' :
                    alert.type === 'warning' ? 'text-yellow-600' :
                    'text-primary'
                  }`} />
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Shield className="w-4 h-4 text-primary" />
                  <p className="text-sm text-primary">Todo en orden. Sin alertas pendientes.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas Suscripciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSubscribers.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{sub.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sub.subscription_tier === 'pro' ? 'default' : 'outline'}>
                      {sub.subscription_tier || 'basic'}
                    </Badge>
                    <Badge variant={sub.subscribed ? 'default' : 'secondary'} className="text-xs">
                      {sub.subscribed ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              ))}
              {recentSubscribers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No hay suscripciones aún</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
