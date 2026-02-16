import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SubscriptionsManager = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });
    setSubscribers(data || []);
    setLoading(false);
  };

  const proCount = subscribers.filter(s => s.subscribed && s.subscription_tier === 'pro').length;
  const totalRevenue = proCount * 29;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Suscripciones</h2>
          <p className="text-sm text-muted-foreground">Control de planes y pagos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Suscriptores</p>
                <p className="text-2xl font-bold">{subscribers.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plan Pro Activos</p>
                <p className="text-2xl font-bold">{proCount}</p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Mensuales</p>
                <p className="text-2xl font-bold">${totalRevenue}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalle de Suscripciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {subscribers.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{sub.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Stripe: {sub.stripe_customer_id || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sub.subscription_tier === 'pro' ? 'default' : 'outline'}>
                      {sub.subscription_tier || 'basic'}
                    </Badge>
                    <Badge variant={sub.subscribed ? 'default' : 'secondary'}>
                      {sub.subscribed ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {sub.subscription_end && (
                      <span className="text-xs text-muted-foreground">
                        Vence: {new Date(sub.subscription_end).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {subscribers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No hay suscriptores aún</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionsManager;
