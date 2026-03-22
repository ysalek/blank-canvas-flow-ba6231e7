import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = 'Restablecer contrasena | ContaBolivia SaaS';
  }, []);

  const passwordStrength = (value: string) => {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return score;
  };

  const strength = passwordStrength(password);
  const strengthLabel = ['Muy debil', 'Debil', 'Aceptable', 'Fuerte', 'Muy fuerte'][strength];
  const strengthColor = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success'][strength];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Error', description: 'La contrasena debe tener al menos 6 caracteres', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Error', description: 'Las contrasenas no coinciden', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast({ title: 'Contrasena actualizada', description: 'Ya puedes volver a iniciar sesion con tu nueva clave.' });
      setTimeout(() => navigate('/'), 2500);
    } catch (err: unknown) {
      toast({ title: 'Error', description: getErrorMessage(err) || 'No se pudo actualizar la contrasena', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Recuperacion segura"
      title="Restablece tu acceso sin perder el ritmo de operacion."
      subtitle="Crea una nueva clave y vuelve a tu entorno contable con una experiencia clara, segura y profesional."
    >
      <div className="space-y-6 p-3 md:p-5">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Nueva contrasena</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Define una clave robusta para seguir operando con seguridad en tu entorno financiero.
          </p>
        </div>

        {done ? (
          <div className="empty-state-panel space-y-4">
            <CheckCircle className="mx-auto h-16 w-16 text-success" />
            <div>
              <h3 className="text-xl font-bold text-foreground">Contrasena actualizada</h3>
              <p className="mt-2 text-sm text-muted-foreground">Te redirigiremos al inicio de sesion en unos segundos.</p>
            </div>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link to="/">
                Volver ahora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="font-semibold">Nueva contrasena</Label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa una nueva clave"
                  required
                  className="executive-input h-12 pl-11 pr-11"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/35 p-3">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className={`h-1.5 flex-1 rounded-full transition-colors ${index < strength ? strengthColor : 'bg-muted'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Nivel de seguridad: {strengthLabel}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="font-semibold">Confirmar contrasena</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite la nueva clave"
                required
                className="executive-input h-12"
              />
              {confirm && password !== confirm && (
                <p className="text-xs font-medium text-destructive">Las contrasenas no coinciden todavia.</p>
              )}
            </div>

            <div className="grid gap-3 pt-2">
              <Button type="submit" className="btn-gradient h-12 rounded-2xl text-sm font-semibold text-white" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Actualizando acceso...</> : 'Actualizar contrasena'}
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-2xl border-border/80 bg-white/70">
                <Link to="/">
                  Volver al inicio
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  );
};

export default ResetPassword;
