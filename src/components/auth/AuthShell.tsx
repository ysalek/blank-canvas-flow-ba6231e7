import { ReactNode } from 'react';
import { ArrowRight, BarChart3, Building2, ReceiptText, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const highlights = [
  { icon: ReceiptText, title: 'Facturacion conectada', description: 'Ventas, impuestos y libros en una sola operacion.' },
  { icon: BarChart3, title: 'Control ejecutivo', description: 'KPIs, cierres y alertas con jerarquia clara.' },
  { icon: ShieldCheck, title: 'Auditable', description: 'Trazabilidad contable lista para supervision y crecimiento.' },
];

const AuthShell = ({ eyebrow, title, subtitle, children, footer, className }: AuthShellProps) => {
  return (
    <main className="auth-shell px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col gap-6 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hero-panel-dark relative overflow-hidden rounded-[2rem] p-6 md:p-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <Link to="/web" className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-lg backdrop-blur">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-[0.18em] text-white/70 uppercase">ContaBolivia</p>
                    <p className="text-sm text-white/60">ERP contable comercial para Bolivia</p>
                  </div>
                </Link>
                <Button asChild variant="ghost" className="rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/web">
                    Ver sitio
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                  <Sparkles className="h-3.5 w-3.5" />
                  {eyebrow}
                </span>
                <div className="space-y-3">
                  <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
                    {title}
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-white/70 md:text-lg">
                    {subtitle}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-3xl font-bold">13%</p>
                  <p className="mt-1 text-sm text-white/65">IVA integrado con operacion diaria</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-3xl font-bold">24/7</p>
                  <p className="mt-1 text-sm text-white/65">Acceso cloud para areas financiera y comercial</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-3xl font-bold">360</p>
                  <p className="mt-1 text-sm text-white/65">Vista unificada de tesoreria, inventario y facturacion</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <item.icon className="h-5 w-5 text-white" />
                  <h2 className="mt-4 text-sm font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/65">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={cn("auth-panel relative z-10 flex flex-col justify-center p-4 md:p-6", className)}>
          <div className="mx-auto w-full max-w-xl space-y-5">
            {children}
            {footer}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthShell;
