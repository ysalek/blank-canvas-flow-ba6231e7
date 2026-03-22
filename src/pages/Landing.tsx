import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Building2, ShieldCheck, ReceiptText, BarChart3, Star, ArrowRight, Users, Zap, Globe, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const Landing = () => {
  useEffect(() => {
    document.title = 'ContabilidadPro | Sistema contable en la nube';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Sistema contable completo en la nube para empresas bolivianas');
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { 
      link = document.createElement('link'); 
      link.rel = 'canonical'; 
      document.head.appendChild(link); 
    }
    link.href = window.location.href;
  }, []);

  const features = [
    { icon: ShieldCheck, title: 'Seguridad Avanzada', description: 'Protección de datos con autenticación segura, encriptación y respaldos automáticos.', gradient: 'from-primary to-primary-dark' },
    { icon: ReceiptText, title: 'Facturación Completa', description: 'Facturación electrónica con cumplimiento normativo boliviano SIN y generación de CUF.', gradient: 'from-success to-success-light' },
    { icon: BarChart3, title: 'Reportes Inteligentes', description: 'Estados financieros, libro mayor y reportes tributarios automáticos.', gradient: 'from-warning to-warning-light' },
    { icon: Users, title: 'Multi-usuario', description: 'Gestión de roles y permisos para equipos de trabajo colaborativo.', gradient: 'from-primary-light to-primary' },
    { icon: Zap, title: 'Automatización', description: 'Asientos contables automáticos, cálculo de IVA y cierre de períodos.', gradient: 'from-destructive to-warning' },
    { icon: Globe, title: '100% en la Nube', description: 'Accede desde cualquier dispositivo, sin instalaciones ni actualizaciones manuales.', gradient: 'from-success-light to-success' },
  ];

  const plans = [
    {
      name: 'Basic',
      price: 'Gratis',
      period: 'Para siempre',
      description: 'Ideal para emprendedores y pequeños negocios',
      features: [
        { text: '100 transacciones/mes', included: true },
        { text: '5 usuarios', included: true },
        { text: 'Facturación básica', included: true },
        { text: 'Plan de cuentas', included: true },
        { text: 'Libro diario y mayor', included: true },
        { text: 'Nómina y RRHH', included: false },
        { text: 'Análisis financiero IA', included: false },
        { text: 'Activos fijos', included: false },
      ],
      cta: 'Empezar Gratis',
      featured: false,
    },
    {
      name: 'Professional',
      price: '$29',
      period: '/mes',
      description: 'Para empresas en crecimiento que necesitan todo',
      features: [
        { text: 'Transacciones ilimitadas', included: true },
        { text: 'Usuarios ilimitados', included: true },
        { text: 'Facturación electrónica', included: true },
        { text: 'Todos los módulos', included: true },
        { text: 'Reportes avanzados', included: true },
        { text: 'Nómina y RRHH', included: true },
        { text: 'Análisis financiero IA', included: true },
        { text: 'Soporte prioritario', included: true },
      ],
      cta: 'Comenzar Prueba',
      featured: true,
    },
  ];

  const testimonials = [
    { name: 'María Rodríguez', role: 'Contadora, MR Servicios', text: 'ContabilidadPro simplificó completamente mi trabajo. Los reportes automáticos me ahorran horas cada semana.', avatar: 'MR' },
    { name: 'Carlos Mendoza', role: 'Gerente, Importadora Mendoza', text: 'La gestión de inventario y facturación en un solo lugar es exactamente lo que necesitábamos.', avatar: 'CM' },
    { name: 'Ana Torres', role: 'CEO, Torres & Asociados', text: 'El cumplimiento normativo boliviano integrado nos da tranquilidad total con el SIN.', avatar: 'AT' },
  ];

  return (
    <main className="executive-shell bg-background min-h-screen">
      {/* Header */}
      <header className="shell-topbar sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gradient-primary">ContabilidadPro</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#caracteristicas" className="hover:text-foreground transition-smooth">Características</a>
          <a href="#precios" className="hover:text-foreground transition-smooth">Precios</a>
          <a href="#testimonios" className="hover:text-foreground transition-smooth">Testimonios</a>
        </nav>
        <div className="flex gap-2">
          <Link to="/"><Button size="sm" variant="ghost" className="font-medium">Acceder</Button></Link>
          <Link to="/signup"><Button size="sm" className="btn-gradient text-white font-medium">Crear cuenta</Button></Link>
        </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Nuevo: Facturación Electrónica SIN
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight">
                <span className="text-gradient-primary">Sistema Contable</span>
                <br />
                <span className="text-foreground">Completo y Profesional</span>
              </h1>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Gestiona tu contabilidad de manera profesional con nuestro sistema integral: facturación, inventarios, reportes financieros y cumplimiento normativo boliviano.
            </p>
            <div className="flex gap-4">
              <Link to="/signup">
                <Button size="lg" className="btn-gradient text-white font-semibold h-12 px-8 text-base">
                  Empezar Gratis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/">
                <Button size="lg" variant="outline" className="font-semibold h-12 px-8 text-base">
                  Ver Demo
                </Button>
              </Link>
            </div>
            <ul className="space-y-3 pt-2">
              {['IVA automático y asientos contables', 'Kardex, compras, ventas y punto de venta', 'Reportes financieros profesionales'].map((text) => (
                <li key={text} className="flex items-center gap-3 text-foreground">
                  <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  </div>
                  <span className="text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats Card */}
          <div className="relative animate-scale-in animate-float" style={{ animationDelay: '0.2s' }}>
            <div className="absolute -inset-4 bg-gradient-hero opacity-10 rounded-3xl blur-2xl"></div>
            <Card className="hero-panel relative overflow-hidden rounded-[2rem]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>
              <CardContent className="p-10">
                <div className="grid grid-cols-3 gap-8 text-center">
                  <div className="space-y-2">
                    <div className="text-4xl font-extrabold text-gradient-primary">Gratis</div>
                    <div className="text-sm text-muted-foreground">Sin costos ocultos</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-4xl font-extrabold text-gradient-success">24/7</div>
                    <div className="text-sm text-muted-foreground">Siempre disponible</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-4xl font-extrabold text-gradient-warning">100%</div>
                    <div className="text-sm text-muted-foreground">En la nube</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="caracteristicas" className="container mx-auto px-4 py-24 border-t border-border/40">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">Funcionalidades Principales</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Todo lo que necesitas para gestionar la contabilidad de tu empresa en un solo lugar
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <Card key={i} className="card-modern group animate-fade-in-up rounded-[1.75rem]" style={{ animationDelay: `${i * 0.08}s` }}>
              <CardContent className="p-7 space-y-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="container mx-auto px-4 py-24 border-t border-border/40">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">Planes y Precios</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Elige el plan que mejor se adapte a las necesidades de tu empresa
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <Card key={i} className={`card-modern relative overflow-hidden animate-fade-in-up rounded-[1.9rem] ${plan.featured ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-border/50'}`} style={{ animationDelay: `${i * 0.15}s` }}>
              {plan.featured && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>
              )}
              <CardContent className="p-8">
                {plan.featured && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
                    <Star className="w-3 h-3" />
                    Más popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <Link to="/signup">
                  <Button className={`w-full h-11 font-semibold ${plan.featured ? 'btn-gradient text-white' : ''}`} variant={plan.featured ? 'default' : 'outline'}>
                    {plan.cta}
                  </Button>
                </Link>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm">
                      {f.included ? (
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={f.included ? 'text-foreground' : 'text-muted-foreground/60'}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonios" className="container mx-auto px-4 py-24 border-t border-border/40">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">Lo que dicen nuestros clientes</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Empresas bolivianas confían en ContabilidadPro para su gestión contable
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <Card key={i} className="card-modern animate-fade-in-up rounded-[1.75rem]" style={{ animationDelay: `${i * 0.1}s` }}>
              <CardContent className="p-7">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24 border-t border-border/40">
        <div className="hero-panel mx-auto max-w-4xl rounded-[2rem] px-6 py-12 text-center space-y-8 animate-fade-in-up md:px-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Comienza <span className="text-gradient-primary">Gratis</span> Hoy
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Accede a todas las funcionalidades del sistema sin costo inicial. No requiere tarjeta de crédito.
          </p>
          <Link to="/signup">
            <Button size="lg" className="btn-gradient text-white font-semibold text-lg h-14 px-10">
              Crear mi cuenta gratis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-sm">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight">ContabilidadPro</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Sistema contable profesional en la nube para empresas bolivianas. Cumplimiento normativo, facturación electrónica y más.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Producto</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#caracteristicas" className="hover:text-foreground transition-smooth">Características</a></li>
                <li><a href="#precios" className="hover:text-foreground transition-smooth">Precios</a></li>
                <li><Link to="/" className="hover:text-foreground transition-smooth">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Cuenta</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/" className="hover:text-foreground transition-smooth">Iniciar Sesión</Link></li>
                <li><Link to="/signup" className="hover:text-foreground transition-smooth">Crear Cuenta</Link></li>
                <li><a href="#" className="hover:text-foreground transition-smooth">Soporte</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} ContabilidadPro. Todos los derechos reservados.</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-smooth">Términos</a>
              <a href="#" className="hover:text-foreground transition-smooth">Privacidad</a>
              <a href="#" className="hover:text-foreground transition-smooth">Contacto</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Landing;
