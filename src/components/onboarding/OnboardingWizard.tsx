
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, CheckCircle, ArrowRight, ArrowLeft, Sparkles, Database } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState(user?.empresa || '');
  const [nit, setNit] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [loadDemoData, setLoadDemoData] = useState(false);
  const [saving, setSaving] = useState(false);

  const steps = [
    { title: 'Bienvenido', icon: Sparkles },
    { title: 'Tu empresa', icon: Building2 },
    { title: 'Datos iniciales', icon: Database },
    { title: '¡Listo!', icon: CheckCircle },
  ];

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Update profile with company info
      if (user?.id) {
        await supabase.from('profiles').update({
          empresa: companyName,
          telefono,
        }).eq('id', user.id);
      }

      if (loadDemoData) {
        // Import and run demo data initialization
        const { inicializarDatosDemo } = await import('@/utils/inicializarDatosDemo');
        if (user?.id) await inicializarDatosDemo(user.id);
      }

      localStorage.setItem('onboarding_complete', 'true');
      toast({ title: '¡Configuración completa!', description: 'Su sistema está listo para usar.' });
      onComplete();
    } catch (err) {
      console.error('Error en onboarding:', err);
      toast({ title: 'Error', description: 'Hubo un problema guardando la configuración', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 transition-colors ${i < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="card-glass backdrop-blur-xl border-border/50 shadow-xl animate-fade-in-up">
          {step === 0 && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">¡Bienvenido a ContaBolivia!</CardTitle>
                <CardDescription>Configuremos su sistema contable en menos de 2 minutos.</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button onClick={() => setStep(1)} className="btn-gradient text-white">
                  Comenzar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </>
          )}

          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Datos de su empresa</CardTitle>
                <CardDescription>Esta información aparecerá en sus facturas y reportes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de la empresa</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Mi Empresa S.R.L." />
                </div>
                <div className="space-y-2">
                  <Label>NIT</Label>
                  <Input value={nit} onChange={(e) => setNit(e.target.value)} placeholder="1234567890" />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Av. Principal #123, La Paz" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+591 7XXXXXXX" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4 mr-2" />Atrás</Button>
                  <Button onClick={() => setStep(2)} className="flex-1">Siguiente <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Datos iniciales</CardTitle>
                <CardDescription>¿Desea cargar datos de ejemplo para explorar el sistema?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setLoadDemoData(false)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${!loadDemoData ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <h4 className="font-semibold">Empezar en blanco</h4>
                    <p className="text-sm text-muted-foreground">Sistema limpio, sin datos de ejemplo.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoadDemoData(true)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${loadDemoData ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <h4 className="font-semibold">Cargar datos demo</h4>
                    <p className="text-sm text-muted-foreground">Incluye productos, clientes, y transacciones de ejemplo.</p>
                  </button>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" />Atrás</Button>
                  <Button onClick={() => setStep(3)} className="flex-1">Siguiente <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-success flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">¡Todo listo!</CardTitle>
                <CardDescription>Su sistema contable está configurado y listo para usar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Empresa:</span><span className="font-medium">{companyName || 'Sin definir'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">NIT:</span><span className="font-medium">{nit || 'Sin definir'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Datos demo:</span><span className="font-medium">{loadDemoData ? 'Sí' : 'No'}</span></div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-2" />Atrás</Button>
                  <Button onClick={handleFinish} className="flex-1 btn-gradient text-white" disabled={saving}>
                    {saving ? 'Configurando...' : 'Finalizar y entrar'}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OnboardingWizard;
