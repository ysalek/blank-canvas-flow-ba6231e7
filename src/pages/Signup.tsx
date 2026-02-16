
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Eye, EyeOff, Building2, Mail, Phone, KeyRound, User, CreditCard } from 'lucide-react';
import { PLAN_PRICES } from '@/hooks/usePlan';

const plans = [
  {
    id: 'basic' as const,
    name: 'Gratuito',
    price: '$0/mes',
    features: ['100 transacciones/mes', '1 usuario', 'Contabilidad básica', 'Facturación', 'Reportes básicos'],
  },
  {
    id: 'pro' as const,
    name: 'Profesional',
    price: `$${PLAN_PRICES.pro.monthly}/mes`,
    features: ['Transacciones ilimitadas', 'Hasta 50 usuarios', 'Todos los módulos', 'Nómina y RRHH', 'Análisis avanzado', 'Soporte prioritario'],
    popular: true,
  },
];

const Signup = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro'>('basic');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [nitOrCI, setNitOrCI] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Crear cuenta | ContaBolivia SaaS';
  }, []);

  const passwordStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = passwordStrength(password);
  const strengthLabel = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'][strength];
  const strengthColor = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success'][strength];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await register({ nombre, email, telefono, empresa, nitOrCI, password });
      if (res.success) {
        // Store selected plan
        localStorage.setItem('user_plan', selectedPlan);
        navigate('/');
      } else {
        setError(res.message || 'No fue posible crear la cuenta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-gradient-primary">Crear cuenta</h1>
          <p className="text-muted-foreground">Seleccione su plan y complete el registro</p>
        </div>

        {/* Plan Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative text-left p-5 rounded-xl border-2 transition-all duration-300 ${
                selectedPlan === plan.id
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-border hover:border-primary/30 bg-card'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-xs">Popular</Badge>
              )}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-xl font-bold text-primary">{plan.price}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedPlan === plan.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                }`}>
                  {selectedPlan === plan.id && <Check className="w-4 h-4 text-primary-foreground" />}
                </div>
              </div>
              <ul className="space-y-1.5">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* Registration Form */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Datos de registro</CardTitle>
            <CardDescription>
              Plan seleccionado: <span className="font-semibold text-primary">{selectedPlan === 'pro' ? 'Profesional' : 'Gratuito'}</span>
              {selectedPlan === 'pro' && ' — El pago se configurará después del registro'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="pl-10" placeholder="Juan Pérez" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" placeholder="juan@empresa.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="pl-10" placeholder="+591 7XXXXXXX" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required className="pl-10" placeholder="Mi Empresa S.R.L." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nit">NIT o CI</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="nit" value={nitOrCI} onChange={(e) => setNitOrCI(e.target.value)} required className="pl-10" placeholder="1234567890" />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? strengthColor : 'bg-muted'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Seguridad: {strengthLabel}</p>
                  </div>
                )}
              </div>
              {error && <div className="md:col-span-2 text-sm text-destructive">{error}</div>}
              <div className="md:col-span-2">
                <Button type="submit" className="w-full btn-gradient text-white h-11" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando cuenta...</> : 'Crear cuenta'}
                </Button>
              </div>
              <div className="md:col-span-2 text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta? <a href="/" className="text-primary font-medium hover:underline">Iniciar sesión</a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Signup;
