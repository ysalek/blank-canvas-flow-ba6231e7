import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, TrendingUp, Users, Calendar, RefreshCw, DollarSign, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SubscriptionsManager = () => {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  useEffect(() => { loadSubscribers(); }, []);

  const loadSubscribers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });
    const subs = data || [];
    setSubscribers(subs);

    // Revenue chart data (last 6 months)
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const proInMonth = subs.filter(s => s.subscribed && s.subscription_tier === 'pro' && s.created_at.startsWith(key)).length;
      chartData.push({
        month: monthNames[d.getMonth()],
        ingresos: proInMonth * 29,
        suscriptores: proInMonth,
      });
    }
    setRevenueData(chartData);
    setLoading(false);
  };

  const changePlan = async (subId: string, newTier: string) => {
    const { error } = await supabase
      .from('subscribers')
      .update({
        subscription_tier: newTier,
        subscribed: newTier === 'pro',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Plan actualizado' });
      loadSubscribers();
    }
  };

  const proCount = subscribers.filter(s => s.subscribed && s.subscription_tier === 'pro').length;
  const totalRevenue = proCount * 29;
  const activeCount = subscribers.filter(s => s.subscribed).length;

  const expiringSoon = subscribers.filter(s => {
    if (!s.subscription_end) return false;
    const end = new Date(s.subscription_end);
    const diff = end.getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Suscripciones</h2>
            <p className="text-sm text-muted-foreground">Control de planes, pagos e ingresos</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadSubscribers} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Suscriptores</p>
                <p className="text-2xl font-bold">{subscribers.length}</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Activos Pro</p>
                <p className="text-2xl font-bold">{proCount}</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10"><CreditCard className="w-5 h-5 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">MRR</p>
                <p className="text-2xl font-bold">${totalRevenue}</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10"><DollarSign className="w-5 h-5 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Por Vencer (30d)</p>
                <p className="text-2xl font-bold">{expiringSoon.length}</p>
              </div>
              <div className="p-2 rounded-full bg-destructive/10"><Calendar className="w-5 h-5 text-destructive" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tendencia de Ingresos</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(value: any) => [`$${value}`, 'Ingresos']} />
              <Area type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalle de Suscripciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Stripe ID</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Cambiar Plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-sm">{sub.email}</TableCell>
                    <TableCell>
                      <Badge variant={sub.subscription_tier === 'pro' ? 'default' : 'outline'} className="text-xs">
                        {sub.subscription_tier || 'basic'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.subscribed ? 'default' : 'secondary'} className="text-xs">
                        {sub.subscribed ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {sub.stripe_customer_id ? sub.stripe_customer_id.slice(0, 15) + '...' : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.subscription_end ? new Date(sub.subscription_end).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={sub.subscription_tier || 'basic'}
                        onValueChange={(val) => changePlan(sub.id, val)}
                      >
                        <SelectTrigger className="w-24 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {subscribers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay suscriptores registrados aún
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionsManager;
