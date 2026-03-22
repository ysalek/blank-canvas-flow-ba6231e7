import { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, Mail, KeyRound, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from './AuthProvider';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AuthShell from './AuthShell';

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('El correo es obligatorio');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Formato de correo invalido');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError('La contrasena es obligatoria');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('Minimo 6 caracteres');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const emailOk = validateEmail(email);
    const passOk = validatePassword(password);
    if (!emailOk || !passOk) return;

    setIsLoading(true);
    setError('');
    try {
      const success = await login(email, password);
      if (!success) setError('No pudimos validar tus credenciales. Revisa el correo y la contrasena.');
    } catch {
      setError('Hubo un problema al iniciar sesion. Intenta nuevamente en unos segundos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      toast({ title: 'Error', description: 'Ingresa un correo valido para enviarte la recuperacion.', variant: 'destructive' });
      return;
    }
    setResetLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (resetError) throw resetError;
      toast({ title: 'Correo enviado', description: 'Revisa tu bandeja de entrada para continuar con la recuperacion.' });
      setForgotOpen(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: getErrorMessage(err) || 'No se pudo enviar el correo de recuperacion.', variant: 'destructive' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <AuthShell
        eyebrow="Acceso seguro"
        title="Ingresa a un sistema contable que se siente listo para venderse."
        subtitle="Controla facturacion, inventario, tesoreria y reportes en una sola experiencia clara, premium y hecha para operacion real."
      >
        <div className="space-y-6 p-3 md:p-5">
          <div className="space-y-2">
            <span className="feature-chip">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Sesion protegida y persistente
            </span>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Bienvenido de nuevo</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Accede a tu operacion con una interfaz comercial y ejecutiva, pensada para contabilidad boliviana moderna.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Correo electronico</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  placeholder="finanzas@empresa.com"
                  required
                  disabled={isLoading}
                  className={`executive-input h-12 pl-11 ${emailError ? 'border-destructive focus-visible:ring-destructive/40' : ''}`}
                />
              </div>
              {emailError && <p className="text-xs font-medium text-destructive">{emailError}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold">Contrasena</Label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setForgotOpen(true);
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Recuperar acceso
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  onBlur={() => validatePassword(password)}
                  placeholder="Ingresa tu contrasena"
                  required
                  disabled={isLoading}
                  className={`executive-input h-12 pl-11 pr-11 ${passwordError ? 'border-destructive focus-visible:ring-destructive/40' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && <p className="text-xs font-medium text-destructive">{passwordError}</p>}
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-2xl border-destructive/30">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 pt-2">
              <Button type="submit" className="btn-gradient h-12 rounded-2xl text-sm font-semibold text-white" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando al entorno...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar sesion
                  </>
                )}
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-2xl border-border/80 bg-white/70">
                <Link to="/web">
                  Explorar el producto
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </form>

          <div className="rounded-3xl border border-border/70 bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Todavia no tienes cuenta?</p>
                <p className="text-xs text-muted-foreground">Activa tu espacio y empieza con un onboarding orientado a operacion real.</p>
              </div>
              <Button asChild variant="secondary" className="rounded-2xl">
                <Link to="/signup">Crear cuenta</Link>
              </Button>
            </div>
          </div>
        </div>
      </AuthShell>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar contrasena</DialogTitle>
            <DialogDescription>
              Ingresa el correo asociado a tu cuenta y te enviaremos un enlace seguro para restablecer el acceso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Correo electronico</Label>
              <Input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="tu@empresa.com" className="executive-input" />
            </div>
            <Button onClick={handleForgotPassword} className="btn-gradient w-full rounded-2xl text-white" disabled={resetLoading}>
              {resetLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : 'Enviar enlace de recuperacion'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LoginForm;
