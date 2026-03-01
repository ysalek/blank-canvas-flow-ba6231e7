import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Search, Shield, UserCheck, Eye, RefreshCw, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserRow {
  id: string;
  display_name: string | null;
  empresa: string | null;
  telefono: string | null;
  created_at: string;
  updated_at: string;
  permisos: string[];
  role?: string;
  subscribed?: boolean;
  subscription_tier?: string | null;
  email?: string;
}

const UsersManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

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
    const user = users.find(u => u.id === userId);
    try {
      // Check if subscriber row exists
      const { data: existing } = await supabase
        .from('subscribers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      let error;
      if (existing) {
        ({ error } = await supabase
          .from('subscribers')
          .update({
            subscription_tier: newTier,
            subscribed: newTier !== 'basic',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId));
      } else {
        ({ error } = await supabase
          .from('subscribers')
          .insert({
            user_id: userId,
            subscription_tier: newTier,
            subscribed: newTier !== 'basic',
            email: user?.email || '',
            updated_at: new Date().toISOString(),
          }));
      }

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Plan actualizado', description: `Plan de ${user?.display_name || 'usuario'} cambiado a ${newTier}` });
        loadUsers();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Error desconocido', variant: 'destructive' });
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.empresa || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesPlan = filterPlan === 'all' || (u.subscription_tier || 'basic') === filterPlan;
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesPlan && matchesRole;
  });

  const planCounts = {
    all: users.length,
    basic: users.filter(u => (u.subscription_tier || 'basic') === 'basic').length,
    pro: users.filter(u => u.subscription_tier === 'pro').length,
    enterprise: users.filter(u => u.subscription_tier === 'enterprise').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
            <p className="text-sm text-muted-foreground">{users.length} usuarios registrados</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilterPlan('all')}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Todos</p>
            <p className="text-2xl font-bold">{planCounts.all}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilterPlan('basic')}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Plan Basic</p>
            <p className="text-2xl font-bold">{planCounts.basic}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilterPlan('pro')}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Plan Pro</p>
            <p className="text-2xl font-bold">{planCounts.pro}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilterPlan('enterprise')}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Plan Enterprise</p>
            <p className="text-2xl font-bold">{planCounts.enterprise}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nombre, empresa o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-36">
            <Filter className="w-3 h-3 mr-2" />
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los planes</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-36">
            <Shield className="w-3 h-3 mr-2" />
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">Usuario</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Cambiar Plan</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {user.role === 'admin' ? (
                            <Shield className="w-4 h-4 text-primary" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.display_name || 'Sin nombre'}</p>
                          <p className="text-xs text-muted-foreground">{user.email || user.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.empresa || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {user.role === 'admin' ? 'Admin' : 'Usuario'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.subscription_tier === 'enterprise' ? 'default' : user.subscription_tier === 'pro' ? 'default' : 'outline'} className={`text-xs ${user.subscription_tier === 'enterprise' ? 'bg-amber-600' : ''}`}>
                        {user.subscription_tier === 'enterprise' ? 'Enterprise' : user.subscription_tier === 'pro' ? 'Pro' : 'Basic'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.subscription_tier || 'basic'}
                        onValueChange={(val) => changePlan(user.id, val)}
                      >
                        <SelectTrigger className="w-24 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                        className="h-7 w-7 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron usuarios con los filtros actuales
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-right">
        Mostrando {filteredUsers.length} de {users.length} usuarios
      </p>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Usuario</DialogTitle>
            <DialogDescription>Información completa del usuario</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {selectedUser.role === 'admin' ? (
                    <Shield className="w-6 h-6 text-primary" />
                  ) : (
                    <UserCheck className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedUser.display_name || 'Sin nombre'}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Empresa</p>
                  <p className="font-medium">{selectedUser.empresa || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{selectedUser.telefono || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rol</p>
                  <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                    {selectedUser.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <Badge variant={selectedUser.subscription_tier === 'enterprise' ? 'default' : selectedUser.subscription_tier === 'pro' ? 'default' : 'outline'} className={selectedUser.subscription_tier === 'enterprise' ? 'bg-amber-600' : ''}>
                    {selectedUser.subscription_tier === 'enterprise' ? 'Enterprise' : selectedUser.subscription_tier === 'pro' ? 'Profesional' : 'Gratuito'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Registrado</p>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última actualización</p>
                  <p className="font-medium">{new Date(selectedUser.updated_at).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">ID</p>
                  <p className="font-mono text-xs break-all">{selectedUser.id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Permisos</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(selectedUser.permisos || []).map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                    {(!selectedUser.permisos || selectedUser.permisos.length === 0) && (
                      <span className="text-xs text-muted-foreground">Sin permisos asignados</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Cambiar Plan</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedUser.subscription_tier === 'basic' || !selectedUser.subscription_tier ? 'default' : 'outline'}
                    onClick={() => { changePlan(selectedUser.id, 'basic'); setSelectedUser(null); }}
                  >
                    Basic
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedUser.subscription_tier === 'pro' ? 'default' : 'outline'}
                    onClick={() => { changePlan(selectedUser.id, 'pro'); setSelectedUser(null); }}
                  >
                    Pro
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedUser.subscription_tier === 'enterprise' ? 'default' : 'outline'}
                    className={selectedUser.subscription_tier === 'enterprise' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                    onClick={() => { changePlan(selectedUser.id, 'enterprise'); setSelectedUser(null); }}
                  >
                    Enterprise
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
