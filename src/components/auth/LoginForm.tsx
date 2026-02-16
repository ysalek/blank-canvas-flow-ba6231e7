
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, Building2, Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { useAuth } from './AuthProvider';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

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

  const validateEmail = (v: string) => {
    if (!v) { setEmailError('El correo es obligatorio'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setEmailError('Formato de correo inválido'); return false; }
    setEmailError('');
    return true;
  };

  const validatePassword = (v: string) => {
    if (!v) { setPasswordError('La contraseña es obligatoria'); return false; }
    if (v.length < 6) { setPasswordError('Mínimo 6 caracteres'); return false; }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailOk = validateEmail(email);
    const passOk = validatePassword(password);
    if (!emailOk || !passOk) return;

    setIsLoading(true);
    setError('');
    try {
      const success = await login(email, password);
      if (!success) setError('Email o contraseña incorrectos');
    } catch {
      setError('Error al iniciar sesión. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      toast({ title: 'Error', description: 'Ingrese un correo válido', variant: 'destructive' });
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Correo enviado', description: 'Revise su bandeja de entrada para restablecer su contraseña.' });
      setForgotOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo enviar el correo', variant: 'destructive' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-primary opacity-10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-success opacity-10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3 animate-fade-in-up">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 rounded-2xl blur-xl"></div>
              <div className="relative w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                <Building2 className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary">Sistema Contable</h1>
          <p className="text-muted-foreground">Gestión contable profesional para Bolivia</p>
        </div>

        {/* Login Form */}
        <Card className="card-glass animate-scale-in backdrop-blur-xl border-border/50 shadow-xl" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
            <CardDescription>Ingrese sus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value); }}
                    onBlur={() => validateEmail(email)}
                    placeholder="admin@empresa.com"
                    required
                    disabled={isLoading}
                    className={`pl-10 transition-smooth focus:shadow-md ${emailError ? 'border-destructive focus-visible:ring-destructive/40' : ''}`}
                  />
                </div>
                {emailError && <p className="text-xs text-destructive animate-fade-in-up">{emailError}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
                  <button type="button" onClick={() => { setResetEmail(email); setForgotOpen(true); }} className="text-xs text-primary hover:underline">
                    ¿Olvidó su contraseña?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (passwordError) validatePassword(e.target.value); }}
                    onBlur={() => validatePassword(password)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className={`pl-10 pr-10 transition-smooth focus:shadow-md ${passwordError ? 'border-destructive focus-visible:ring-destructive/40' : ''}`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && <p className="text-xs text-destructive animate-fade-in-up">{passwordError}</p>}
              </div>

              {error && (
                <Alert variant="destructive" className="animate-scale-in">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full btn-gradient text-white font-medium h-11" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Iniciando sesión...</>
                ) : (
                  <><LogIn className="w-4 h-4 mr-2" />Iniciar Sesión</>
                )}
              </Button>
            </form>
            <div className="pt-4 text-sm text-center space-y-2">
              <div className="text-muted-foreground">
                ¿No tienes cuenta? <Link to="/signup" className="text-primary font-medium hover:underline transition-smooth">Crear cuenta</Link>
              </div>
              <div className="text-muted-foreground">
                <Link to="/web" className="text-primary font-medium hover:underline transition-smooth">Conoce el sistema</Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Info */}
        <div className="grid grid-cols-1 gap-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Card className="card-glass backdrop-blur-xl border-border/50 transition-smooth hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-lg">📊</span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">Contabilidad Integral</div>
                  <div className="text-xs text-muted-foreground">Plan de cuentas actualizado 2025</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-glass backdrop-blur-xl border-border/50 transition-smooth hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-success rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-lg">🧾</span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">Facturación Electrónica</div>
                  <div className="text-xs text-muted-foreground">Compatible con SIN Bolivia</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-glass backdrop-blur-xl border-border/50 transition-smooth hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-warning rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-lg">📈</span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">Reportes Inteligentes</div>
                  <div className="text-xs text-muted-foreground">Estados financieros automáticos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>Ingrese su correo y le enviaremos un enlace para restablecer su contraseña.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Correo electrónico</Label>
              <Input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="su@correo.com" />
            </div>
            <Button onClick={handleForgotPassword} className="w-full" disabled={resetLoading}>
              {resetLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : 'Enviar enlace de recuperación'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginForm;
