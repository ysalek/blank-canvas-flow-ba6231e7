import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';
import { Check, Loader2, Eye, EyeOff, Building2, Mail, Phone, KeyRound, User, CreditCard, ArrowRight, Sparkles } from 'lucide-react';
import { PLAN_PRICES } from '@/hooks/usePlan';
import AuthShell from '@/components/auth/AuthShell';

const plans = [
  {
    id: 'basic' as const,
    name: 'Gratuito',
    price: '$0/mes',
    description: 'Para negocios que necesitan ordenar su operacion y empezar rapido.',
    features: ['100 transacciones/mes', '1 usuario', 'Contabilidad basica', 'Facturacion', 'Reportes esenciales'],
  },
  {
    id: 'pro' as const,
    name: 'Profesional',
    price: `$${PLAN_PRICES.pro.monthly}/mes`,
    description: 'Para equipos que quieren una operacion integral, premium y escalable.',
    features: ['Transacciones ilimitadas', 'Hasta 50 usuarios', 'Todos los modulos', 'Nomina y RRHH', 'Analisis avanzado', 'Soporte prioritario'],
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

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await register({ nombre, email, telefono, empresa, nitOrCI, password });
      if (result.success) {
        localStorage.setItem('user_plan', selectedPlan);
        navigate('/');
      } else {
        setError(result.message || 'No fue posible crear la cuenta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Alta comercial"
      title="Crea un entorno contable serio desde el primer minuto."
      subtitle="Activa tu empresa, define tu plan y entra a una experiencia clara para facturacion, inventario, tesoreria y control gerencial."
    >
      <div className="space-y-6 p-3 md:p-5">
        <div className="space-y-2">
          <span className="feature-chip">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Onboarding comercial guiado
          </span>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Abrir nueva cuenta</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Elige la modalidad que mejor encaja con tu operacion y registra tu empresa con una interfaz premium y simple.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-[1.75rem] border p-5 text-left transition-all duration-300 ${
                selectedPlan === plan.id
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-border/80 bg-white/70 hover:border-primary/35 hover:bg-white'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute right-5 top-5 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                  Popular
                </Badge>
              )}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <p className="mt-1 text-2xl font-bold text-primary">{plan.price}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                    selectedPlan === plan.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent'
                  }`}>
                    <Check className="h-4 w-4" />
                  </div>
                </div>
                <ul className="space-y-2 pt-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="nombre" className="font-semibold">Nombre completo</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="executive-input h-12 pl-11" placeholder="Juan Perez" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-semibold">Correo</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="executive-input h-12 pl-11" placeholder="gerencia@empresa.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono" className="font-semibold">Telefono</Label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="executive-input h-12 pl-11" placeholder="+591 70000000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="empresa" className="font-semibold">Empresa</Label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required className="executive-input h-12 pl-11" placeholder="Mi Empresa S.R.L." />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nit" className="font-semibold">NIT o CI</Label>
            <div className="relative">
              <CreditCard className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="nit" value={nitOrCI} onChange={(e) => setNitOrCI(e.target.value)} required className="executive-input h-12 pl-11" placeholder="1234567890" />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="password" className="font-semibold">Contrasena</Label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="executive-input h-12 pl-11 pr-11"
                placeholder="Minimo 6 caracteres"
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
                <p className="text-xs text-muted-foreground">Seguridad de la clave: {strengthLabel}</p>
              </div>
            )}
          </div>

          {error && <div className="text-sm font-medium text-destructive md:col-span-2">{error}</div>}

          <div className="md:col-span-2 grid gap-3 pt-2">
            <Button type="submit" className="btn-gradient h-12 rounded-2xl text-sm font-semibold text-white" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando entorno...</> : 'Crear cuenta'}
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-2xl border-border/80 bg-white/70">
              <Link to="/">
                Ya tengo cuenta
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </form>
      </div>
    </AuthShell>
  );
};

export default Signup;
