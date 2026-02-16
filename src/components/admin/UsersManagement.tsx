import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Shield, UserCheck, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserRow {
  id: string;
  display_name: string | null;
  empresa: string | null;
  telefono: string | null;
  created_at: string;
  role?: string;
  subscribed?: boolean;
  subscription_tier?: string | null;
  email?: string;
}

const UsersManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('subscribers').select('user_id, subscribed, subscription_tier, email'),
      ]);

      const roles = rolesRes.data || [];
      const subs = subsRes.data || [];
      const profiles = (profilesRes.data || []).map(p => {
        const userRole = roles.find(r => r.user_id === p.id);
        const userSub = subs.find(s => s.user_id === p.id);
        return {
          ...p,
          role: userRole?.role || 'user',
          subscribed: userSub?.subscribed || false,
          subscription_tier: userSub?.subscription_tier || 'basic',
          email: userSub?.email || '',
        };
      });
      setUsers(profiles);
    } catch (e) {
      console.error('Error loading users:', e);
    } finally {
      setLoading(false);
    }
  };

  const changePlan = async (userId: string, newTier: string) => {
    const { error } = await supabase
      .from('subscribers')
      .upsert({
        user_id: userId,
        subscription_tier: newTier,
        subscribed: newTier === 'pro',
        email: users.find(u => u.id === userId)?.email || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Plan actualizado', description: `Plan cambiado a ${newTier}` });
      loadUsers();
    }
  };

  const filteredUsers = users.filter(u =>
    (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.empresa || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
            <p className="text-sm text-muted-foreground">{users.length} usuarios registrados</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, empresa o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map(user => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {user.role === 'admin' ? (
                        <Shield className="w-5 h-5 text-primary" />
                      ) : (
                        <UserCheck className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{user.display_name || 'Sin nombre'}</p>
                      <p className="text-xs text-muted-foreground">{user.email || user.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{user.empresa || 'Sin empresa'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'Usuario'}
                    </Badge>
                    <Badge variant={user.subscription_tier === 'pro' ? 'default' : 'outline'}>
                      {user.subscription_tier === 'pro' ? 'Pro' : 'Basic'}
                    </Badge>
                    <Select
                      value={user.subscription_tier || 'basic'}
                      onValueChange={(val) => changePlan(user.id, val)}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No se encontraron usuarios</p>
          )}
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
