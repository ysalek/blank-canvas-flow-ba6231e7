import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, CreditCard, Activity, TrendingUp, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalUsers: number;
  totalCompanies: number;
  proSubscribers: number;
  activeUsers: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalCompanies: 0, proSubscribers: 0, activeUsers: 0 });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [profilesRes, subscribersRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('id, display_name, empresa, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('subscribers').select('*'),
        supabase.from('user_roles').select('*'),
      ]);

      const profiles = profilesRes.data || [];
      const subscribers = subscribersRes.data || [];
      const empresas = new Set(profiles.map(p => p.empresa).filter(Boolean));

      setStats({
        totalUsers: profiles.length,
        totalCompanies: empresas.size,
        proSubscribers: subscribers.filter(s => s.subscribed && s.subscription_tier === 'pro').length,
        activeUsers: profiles.length,
      });

      setRecentUsers(profiles.slice(0, 5));
    } catch (e) {
      console.error('Error loading admin stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    { title: 'Total Usuarios', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { title: 'Empresas', value: stats.totalCompanies, icon: Building2, color: 'text-green-500' },
    { title: 'Suscriptores Pro', value: stats.proSubscribers, icon: CreditCard, color: 'text-purple-500' },
    { title: 'Ingresos Est. ($/mes)', value: `$${stats.proSubscribers * 29}`, icon: TrendingUp, color: 'text-amber-500' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Panel de Administración</h2>
          <p className="text-sm text-muted-foreground">Vista global del sistema ContaBolivia SaaS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <kpi.icon className={`w-8 h-8 ${kpi.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuarios Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{user.display_name || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">{user.empresa || 'Sin empresa'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No hay usuarios registrados</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
