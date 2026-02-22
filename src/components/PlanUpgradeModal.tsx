
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Sparkles, Zap, Crown, Smartphone, QrCode, ArrowLeft, Copy, CheckCircle } from 'lucide-react';
import { usePlan, PLAN_PRICES } from '@/hooks/usePlan';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface PlanUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { name: 'Transacciones mensuales', basic: '100', pro: 'Ilimitadas', enterprise: 'Ilimitadas' },
  { name: 'Usuarios', basic: '1', pro: 'Hasta 5', enterprise: 'Hasta 50' },
  { name: 'Empresas', basic: '1', pro: '1', enterprise: 'Hasta 10' },
  { name: 'Contabilidad básica', basic: true, pro: true, enterprise: true },
  { name: 'Facturación', basic: true, pro: true, enterprise: true },
  { name: 'Punto de Venta', basic: false, pro: true, enterprise: true },
  { name: 'Compras y Proveedores', basic: false, pro: true, enterprise: true },
  { name: 'Balance General', basic: false, pro: true, enterprise: true },
  { name: 'Estado de Resultados', basic: false, pro: true, enterprise: true },
  { name: 'Nómina y RRHH', basic: false, pro: true, enterprise: true },
  { name: 'Notas Crédito/Débito', basic: false, pro: true, enterprise: true },
  { name: 'Libro Compras/Ventas SIN', basic: false, pro: true, enterprise: true },
  { name: 'Conciliación Bancaria', basic: false, pro: true, enterprise: true },
  { name: 'Presupuestos', basic: false, pro: true, enterprise: true },
  { name: 'Exportación TXT para SIAT', basic: false, pro: true, enterprise: true },
  { name: 'Auditoría Avanzada', basic: false, pro: false, enterprise: true },
  { name: 'Análisis con IA', basic: false, pro: false, enterprise: true },
  { name: 'Análisis Rentabilidad', basic: false, pro: false, enterprise: true },
  { name: 'Multi-empresa', basic: false, pro: false, enterprise: true },
  { name: 'API SIAT en Línea', basic: false, pro: false, enterprise: true },
  { name: 'Soporte prioritario', basic: false, pro: false, enterprise: true },
  { name: 'Backup automático', basic: false, pro: true, enterprise: true },
];

const TIGO_MONEY_NUMBER = '78912345';
const BANK_ACCOUNT = {
  banco: 'Banco Mercantil Santa Cruz',
  titular: 'ContaBolivia SRL',
  nroCuenta: '4010-123456-001',
  moneda: 'Bolivianos (BOB)',
};

type Step = 'plans' | 'payment';
type PaymentMethod = 'tigo_money' | 'qr_banco';

const renderCell = (value: boolean | string) => {
  if (typeof value === 'boolean') {
    return value 
      ? <Check className="w-4 h-4 text-success mx-auto" /> 
      : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
  }
  return <span className="text-sm font-medium">{value}</span>;
};

const PlanUpgradeModal = ({ open, onOpenChange }: PlanUpgradeModalProps) => {
  const { currentPlan } = usePlan();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('plans');
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>('pro');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [payerName, setPayerName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const resetState = () => {
    setStep('plans');
    setPaymentMethod(null);
    setTransactionRef('');
    setPayerName('');
    setNotes('');
    setSubmitting(false);
    setSubmitted(false);
    setCopied(null);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const handleSelectPlan = (plan: 'pro' | 'enterprise') => {
    setSelectedPlan(plan);
    setStep('payment');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copiado', description: `${label} copiado al portapapeles` });
  };

  const handleSubmitPayment = async () => {
    if (!transactionRef.trim() || !payerName.trim() || !paymentMethod) {
      toast({ title: 'Datos incompletos', description: 'Complete el número de transacción y nombre del titular', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Save payment request in a generic way using the existing subscribers table
      // We'll store a payment_request as a note on the subscriber record
      const { data: existingSub } = await supabase
        .from('subscribers')
        .select('id')
        .eq('email', user?.email || '')
        .single();

      if (existingSub) {
        await supabase
          .from('subscribers')
          .update({
            updated_at: new Date().toISOString(),
            // Store payment info in stripe_customer_id field temporarily as a JSON string
            stripe_customer_id: JSON.stringify({
              type: 'payment_request',
              method: paymentMethod,
              plan: selectedPlan,
              ref: transactionRef,
              payer: payerName,
              notes: notes,
              date: new Date().toISOString(),
              status: 'pending'
            })
          })
          .eq('id', existingSub.id);
      }

      setSubmitted(true);
      toast({ 
        title: '¡Solicitud enviada!', 
        description: 'Su pago será verificado por el administrador. Recibirá confirmación pronto.' 
      });
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast({ title: 'Error', description: 'No se pudo enviar la solicitud. Intente nuevamente.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const planPrice = PLAN_PRICES[selectedPlan];

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold">¡Solicitud recibida!</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              Su comprobante de pago ha sido enviado. El administrador verificará el pago y activará su plan 
              <Badge className="ml-1">{selectedPlan === 'pro' ? 'Profesional' : 'Enterprise'}</Badge> en las próximas horas.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1 w-full">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método:</span>
                <span className="font-medium">{paymentMethod === 'tigo_money' ? 'Tigo Money' : 'QR Bancario'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Referencia:</span>
                <span className="font-mono font-medium">{transactionRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto:</span>
                <span className="font-bold">Bs {planPrice.monthlyBs}</span>
              </div>
            </div>
            <Button onClick={() => handleOpenChange(false)} className="w-full">
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === 'plans' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Planes ContaBolivia
              </DialogTitle>
              <DialogDescription>El sistema contable más completo de Bolivia. Elija el plan ideal para su empresa.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-4 gap-0 border rounded-xl overflow-hidden mt-4">
              {/* Header */}
              <div className="p-4 bg-muted/30 border-b font-medium text-sm">Característica</div>
              <div className="p-4 bg-muted/30 border-b border-l text-center">
                <div className="font-bold">Gratuito</div>
                <div className="text-lg font-bold text-foreground">Bs 0</div>
                <div className="text-xs text-muted-foreground">Para siempre</div>
              </div>
              <div className="p-4 bg-primary/5 border-b border-l text-center relative">
                <Badge className="absolute -top-0 right-2 bg-primary text-primary-foreground text-[10px]">Popular</Badge>
                <div className="font-bold text-primary">Profesional</div>
                <div className="text-lg font-bold text-primary">Bs {PLAN_PRICES.pro.monthlyBs}/mes</div>
                <div className="text-xs text-muted-foreground">${PLAN_PRICES.pro.monthly} USD</div>
              </div>
              <div className="p-4 bg-amber-500/5 border-b border-l text-center relative">
                <Badge className="absolute -top-0 right-2 bg-amber-600 text-white text-[10px]">
                  <Crown className="w-3 h-3 mr-0.5" /> Premium
                </Badge>
                <div className="font-bold text-amber-700">Enterprise</div>
                <div className="text-lg font-bold text-amber-700">Bs {PLAN_PRICES.enterprise.monthlyBs}/mes</div>
                <div className="text-xs text-muted-foreground">${PLAN_PRICES.enterprise.monthly} USD</div>
              </div>

              {/* Features */}
              {features.map((f, i) => (
                <div key={i} className="contents">
                  <div className={`p-2.5 text-sm border-b ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>{f.name}</div>
                  <div className={`p-2.5 text-center border-b border-l ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>
                    {renderCell(f.basic)}
                  </div>
                  <div className={`p-2.5 text-center border-b border-l ${i % 2 === 0 ? 'bg-primary/5' : 'bg-primary/[0.02]'}`}>
                    {renderCell(f.pro)}
                  </div>
                  <div className={`p-2.5 text-center border-b border-l ${i % 2 === 0 ? 'bg-amber-500/5' : 'bg-amber-500/[0.02]'}`}>
                    {renderCell(f.enterprise)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
                Mantener plan actual
              </Button>
              {currentPlan === 'basic' && (
                <Button onClick={() => handleSelectPlan('pro')} className="flex-1 btn-gradient text-white gap-2">
                  <Zap className="w-4 h-4" />
                  Pro — Bs {PLAN_PRICES.pro.monthlyBs}/mes
                </Button>
              )}
              {currentPlan !== 'enterprise' && (
                <Button 
                  onClick={() => handleSelectPlan('enterprise')} 
                  className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Crown className="w-4 h-4" />
                  Enterprise — Bs {PLAN_PRICES.enterprise.monthlyBs}/mes
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => { setStep('plans'); setPaymentMethod(null); }}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <DialogTitle className="text-xl">
                    Pagar Plan {selectedPlan === 'pro' ? 'Profesional' : 'Enterprise'}
                  </DialogTitle>
                  <DialogDescription>
                    Monto: <span className="font-bold text-foreground">Bs {planPrice.monthlyBs}/mes</span> — Elija su método de pago
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Payment Method Selection */}
            {!paymentMethod ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Card 
                  className="cursor-pointer hover:border-primary hover:shadow-md transition-all group"
                  onClick={() => setPaymentMethod('tigo_money')}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[hsl(210,80%,50%)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Smartphone className="w-7 h-7 text-[hsl(210,80%,50%)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Tigo Money</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pago inmediato desde su celular Tigo
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">Transferencia móvil</Badge>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:border-primary hover:shadow-md transition-all group"
                  onClick={() => setPaymentMethod('qr_banco')}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <QrCode className="w-7 h-7 text-success" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">QR Simple</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Escanee con su app bancaria
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">Cualquier banco</Badge>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-5 mt-4">
                {/* Payment Instructions */}
                <Card className="border-primary/20 bg-primary/[0.02]">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {paymentMethod === 'tigo_money' ? (
                        <Smartphone className="w-5 h-5 text-[hsl(210,80%,50%)]" />
                      ) : (
                        <QrCode className="w-5 h-5 text-success" />
                      )}
                      <h3 className="font-bold">
                        {paymentMethod === 'tigo_money' ? 'Instrucciones Tigo Money' : 'Instrucciones QR Bancario'}
                      </h3>
                    </div>

                    {paymentMethod === 'tigo_money' ? (
                      <div className="space-y-3 text-sm">
                        <div className="bg-card rounded-lg p-3 border space-y-2">
                          <p className="font-medium">Enviar a este número:</p>
                          <div className="flex items-center gap-2">
                            <code className="text-lg font-bold font-mono text-primary">{TIGO_MONEY_NUMBER}</code>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(TIGO_MONEY_NUMBER, 'Número')}
                            >
                              {copied === 'Número' ? <CheckCircle className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                          <p className="text-muted-foreground">Titular: <span className="font-medium text-foreground">ContaBolivia SRL</span></p>
                        </div>
                        <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside">
                          <li>Marque <span className="font-mono font-medium text-foreground">*555#</span> desde su celular Tigo</li>
                          <li>Seleccione "Enviar dinero"</li>
                          <li>Ingrese el número: <span className="font-medium text-foreground">{TIGO_MONEY_NUMBER}</span></li>
                          <li>Monto: <span className="font-bold text-foreground">Bs {planPrice.monthlyBs}</span></li>
                          <li>Confirme con su PIN de Tigo Money</li>
                          <li>Anote el <span className="font-medium text-foreground">número de transacción</span> que recibe por SMS</li>
                        </ol>
                      </div>
                    ) : (
                      <div className="space-y-3 text-sm">
                        <div className="bg-card rounded-lg p-3 border space-y-2">
                          <p className="font-medium">Datos de la cuenta:</p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Banco:</span>
                              <span className="font-medium">{BANK_ACCOUNT.banco}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Cuenta:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-medium">{BANK_ACCOUNT.nroCuenta}</span>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(BANK_ACCOUNT.nroCuenta, 'Cuenta')}
                                >
                                  {copied === 'Cuenta' ? <CheckCircle className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                                </Button>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Titular:</span>
                              <span className="font-medium">{BANK_ACCOUNT.titular}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Moneda:</span>
                              <span className="font-medium">{BANK_ACCOUNT.moneda}</span>
                            </div>
                          </div>
                        </div>
                        <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside">
                          <li>Abra la app de su banco (BNB, Mercantil, Unión, Fassil, etc.)</li>
                          <li>Seleccione <span className="font-medium text-foreground">"Pagar con QR"</span> o <span className="font-medium text-foreground">"Transferencia"</span></li>
                          <li>Ingrese los datos de la cuenta o escanee el QR en sucursal</li>
                          <li>Monto: <span className="font-bold text-foreground">Bs {planPrice.monthlyBs}</span></li>
                          <li>En la glosa escriba: <span className="font-mono text-foreground">Plan {selectedPlan} - {user?.email}</span></li>
                          <li>Anote el <span className="font-medium text-foreground">número de comprobante</span></li>
                        </ol>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Confirmation Form */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Confirmar pago realizado</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="payerName" className="text-xs">Nombre del titular *</Label>
                      <Input 
                        id="payerName"
                        placeholder="Nombre completo"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="transactionRef" className="text-xs">
                        {paymentMethod === 'tigo_money' ? 'N° transacción SMS *' : 'N° comprobante *'}
                      </Label>
                      <Input 
                        id="transactionRef"
                        placeholder={paymentMethod === 'tigo_money' ? 'Ej: TM123456789' : 'Ej: BNB-00123456'}
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs">Notas adicionales (opcional)</Label>
                    <Textarea 
                      id="notes"
                      placeholder="Información adicional sobre el pago..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setPaymentMethod(null)} className="flex-1">
                    Cambiar método
                  </Button>
                  <Button 
                    onClick={handleSubmitPayment} 
                    disabled={submitting || !transactionRef.trim() || !payerName.trim()}
                    className="flex-1 gap-2"
                  >
                    {submitting ? (
                      <>Enviando...</>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Enviar comprobante
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlanUpgradeModal;
