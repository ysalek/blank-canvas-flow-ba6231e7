import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Edit, Shield, UserPlus, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface UsuarioProduccion {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'user';
  empresa: string;
  permisos: string[];
  plan: string;
  subscribed: boolean;
  createdAt: string;
  updatedAt: string;
}

const ROLES_DISPONIBLES = [
  { value: 'admin', label: 'Administrador', permisos: ['*'] },
  { value: 'user', label: 'Usuario', permisos: ['dashboard'] },
] as const;

const UserProductionManager = () => {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioProduccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UsuarioProduccion | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
    rol: 'user' as 'admin' | 'user',
    permisos: 'dashboard',
  });

  const resumen = useMemo(() => ({
    total: usuarios.length,
    admins: usuarios.filter((usuario) => usuario.rol === 'admin').length,
    pro: usuarios.filter((usuario) => usuario.plan === 'pro' || usuario.plan === 'enterprise').length,
  }), [usuarios]);

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('subscribers').select('user_id, subscribed, subscription_tier, email'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (subsRes.error) throw subsRes.error;

      const roles = new Map((rolesRes.data || []).map((item) => [item.user_id, item.role]));
      const subs = new Map((subsRes.data || []).map((item) => [item.user_id, item]));

      const usuariosMapeados = (profilesRes.data || []).map((profile) => {
        const role = (roles.get(profile.id) || 'user') as 'admin' | 'user';
        const sub = subs.get(profile.id);
        return {
          id: profile.id,
          nombre: profile.display_name || 'Sin nombre',
          email: sub?.email || '',
          rol: role,
          empresa: profile.empresa || 'Sin empresa',
          permisos: Array.isArray(profile.permisos) ? profile.permisos : [],
          plan: sub?.subscription_tier || 'basic',
          subscribed: Boolean(sub?.subscribed),
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        };
      });

      setUsuarios(usuariosMapeados);
    } catch (error) {
      console.error('Error cargando usuarios productivos:', error);
      toast({
        title: "Error al cargar usuarios",
        description: "No se pudo conectar la mesa de usuarios con la base principal.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void cargarUsuarios();
  }, [cargarUsuarios]);

  const abrirEdicion = (usuario: UsuarioProduccion) => {
    setEditingUser(usuario);
    setEditForm({
      nombre: usuario.nombre,
      rol: usuario.rol,
      permisos: usuario.permisos.join(', ') || 'dashboard',
    });
  };

  const guardarEdicion = async () => {
    if (!editingUser) return;

    try {
      const permisos = editForm.permisos
        .split(',')
        .map((permiso) => permiso.trim())
        .filter(Boolean);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: editForm.nombre.trim(),
          permisos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      const { data: existingRole, error: existingRoleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', editingUser.id)
        .maybeSingle();

      if (existingRoleError) throw existingRoleError;

      if (existingRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: editForm.rol })
          .eq('user_id', editingUser.id);

        if (roleError) throw roleError;
      } else {
        const { error: roleInsertError } = await supabase
          .from('user_roles')
          .insert({ user_id: editingUser.id, role: editForm.rol });

        if (roleInsertError) throw roleInsertError;
      }

      toast({
        title: "Usuario actualizado",
        description: `La configuracion de ${editForm.nombre.trim() || 'este usuario'} quedo guardada.`,
      });

      setEditingUser(null);
      await cargarUsuarios();
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      toast({
        title: "No se pudo actualizar el usuario",
        description: "Revise permisos o integridad del registro e intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  if (!hasPermission('*')) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No tienes permisos para gestionar usuarios del sistema.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
          <p className="text-slate-600">Mesa real de usuarios basada en perfiles, roles y suscripciones persistidas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void cargarUsuarios()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" disabled>
            <UserPlus className="mr-2 h-4 w-4" />
            Alta por Signup
          </Button>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          El alta de credenciales ya no se simula en navegador. Los nuevos usuarios deben registrarse por flujo real de autenticacion; aqui solo se administra su configuracion operativa.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Usuarios reales</p><p className="text-2xl font-bold">{resumen.total}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Administradores</p><p className="text-2xl font-bold text-primary">{resumen.admins}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Planes Pro/Enterprise</p><p className="text-2xl font-bold text-emerald-600">{resumen.pro}</p></CardContent></Card>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Cargando usuarios desde la base principal...
            </CardContent>
          </Card>
        ) : usuarios.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No hay perfiles registrados todavia en la base principal.
            </CardContent>
          </Card>
        ) : (
          usuarios.map((usuario) => (
            <Card key={usuario.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{usuario.nombre}</CardTitle>
                      <CardDescription>{usuario.email || usuario.id}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={usuario.rol === 'admin' ? 'default' : 'secondary'}>
                      {usuario.rol === 'admin' ? 'Administrador' : 'Usuario'}
                    </Badge>
                    <Badge variant="outline">
                      {usuario.plan}
                    </Badge>
                    {usuario.subscribed && <Badge className="bg-emerald-600">Suscrito</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Empresa: {usuario.empresa}</p>
                    <p>Creado: {new Date(usuario.createdAt).toLocaleDateString()}</p>
                    <p>Actualizado: {new Date(usuario.updatedAt).toLocaleDateString()}</p>
                    <p>Permisos: {usuario.permisos.length > 0 ? usuario.permisos.join(', ') : 'Sin permisos operativos definidos'}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => abrirEdicion(usuario)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar configuración
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {editingUser && (
        <Dialog open={Boolean(editingUser)} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>
                Ajusta nombre visible, rol y permisos operativos del usuario.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre visible</Label>
                <Input
                  id="edit-nombre"
                  value={editForm.nombre}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, nombre: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={editForm.rol} onValueChange={(value: 'admin' | 'user') => setEditForm((prev) => ({ ...prev, rol: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES_DISPONIBLES.map((rol) => (
                      <SelectItem key={rol.value} value={rol.value}>
                        {rol.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-permisos">Permisos operativos</Label>
                <Input
                  id="edit-permisos"
                  value={editForm.permisos}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, permisos: event.target.value }))}
                  placeholder="dashboard, facturacion, inventario"
                />
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                El correo, la contraseña y el alta de acceso no se editan aqui porque dependen del flujo real de autenticacion.
              </div>

              <Button onClick={() => void guardarEdicion()} className="w-full">
                <Shield className="mr-2 h-4 w-4" />
                Guardar configuración
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UserProductionManager;
