
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Smartphone, QrCode, CheckCircle, XCircle, Clock, RefreshCw, Eye, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PLAN_PRICES } from '@/hooks/usePlan';

interface PaymentRequest {
  subscriberId: string;
  email: string;
  method: 'tigo_money' | 'qr_banco';
  plan: 'pro' | 'enterprise';
  ref: string;
  payer: string;
  notes: string;
  date: string;
  status: string;
}

const PaymentRequestsManager = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('subscribers')
        .select('id, email, stripe_customer_id, subscription_tier, subscribed')
        .not('stripe_customer_id', 'is', null)
        .order('updated_at', { ascending: false });

      const parsed: PaymentRequest[] = [];
      for (const sub of data || []) {
        try {
          if (sub.stripe_customer_id?.startsWith('{')) {
            const info = JSON.parse(sub.stripe_customer_id);
            if (info.type === 'payment_request') {
              parsed.push({
                subscriberId: sub.id,
                email: sub.email || '',
                method: info.method,
                plan: info.plan,
                ref: info.ref,
                payer: info.payer,
                notes: info.notes || '',
                date: info.date,
                status: info.status || 'pending',
              });
            }
          }
        } catch {
          // Not a payment request JSON, skip
        }
      }
      setRequests(parsed);
    } catch (error) {
      console.error('Error loading payment requests:', error);
    }
    setLoading(false);
  };

  const handleApprove = async (req: PaymentRequest) => {
    try {
      const newTier = req.plan;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await supabase
        .from('subscribers')
        .update({
          subscription_tier: newTier,
          subscribed: true,
          subscription_end: endDate.toISOString(),
          stripe_customer_id: JSON.stringify({
            ...JSON.parse((await supabase.from('subscribers').select('stripe_customer_id').eq('id', req.subscriberId).single()).data?.stripe_customer_id || '{}'),
            status: 'approved',
            approved_at: new Date().toISOString(),
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.subscriberId);

      toast({ title: 'Pago aprobado', description: `Se activó el plan ${newTier} para ${req.email}` });
      setDetailOpen(false);
      loadRequests();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast({ title: 'Error', description: 'No se pudo aprobar el pago', variant: 'destructive' });
    }
  };

  const handleReject = async (req: PaymentRequest) => {
    try {
      await supabase
        .from('subscribers')
        .update({
          stripe_customer_id: JSON.stringify({
            ...JSON.parse((await supabase.from('subscribers').select('stripe_customer_id').eq('id', req.subscriberId).single()).data?.stripe_customer_id || '{}'),
            status: 'rejected',
            rejected_at: new Date().toISOString(),
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.subscriberId);

      toast({ title: 'Pago rechazado', description: `Se rechazó el pago de ${req.email}` });
      setDetailOpen(false);
      loadRequests();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo rechazar el pago', variant: 'destructive' });
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <DollarSign className="w-6 h-6 text-success" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Pagos Bolivia</h2>
            <p className="text-sm text-muted-foreground">Verificación de pagos Tigo Money y QR Bancario</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadRequests} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <div className="p-2 rounded-full bg-warning/10"><Clock className="w-5 h-5 text-warning" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Aprobados</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
              <div className="p-2 rounded-full bg-success/10"><CheckCircle className="w-5 h-5 text-success" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Solicitudes</p>
                <p className="text-2xl font-bold">{requests.length}</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10"><DollarSign className="w-5 h-5 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Solicitudes de Pago</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(req.date).toLocaleDateString('es-BO')}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{req.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs gap-1">
                        {req.method === 'tigo_money' ? (
                          <><Smartphone className="w-3 h-3" /> Tigo Money</>
                        ) : (
                          <><QrCode className="w-3 h-3" /> QR Banco</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={req.plan === 'enterprise' ? 'default' : 'secondary'} className="text-xs">
                        {req.plan === 'pro' ? 'Pro' : 'Enterprise'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{req.ref}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {req.status === 'approved' ? 'Aprobado' : req.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => { setSelectedRequest(req); setDetailOpen(true); }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay solicitudes de pago
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedRequest && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Detalle de Pago</DialogTitle>
              <DialogDescription>Verifique la información y apruebe o rechace el pago</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{selectedRequest.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Método:</span>
                  <span className="font-medium flex items-center gap-1">
                    {selectedRequest.method === 'tigo_money' ? (
                      <><Smartphone className="w-3.5 h-3.5" /> Tigo Money</>
                    ) : (
                      <><QrCode className="w-3.5 h-3.5" /> QR Bancario</>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan solicitado:</span>
                  <Badge>{selectedRequest.plan === 'pro' ? 'Profesional' : 'Enterprise'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="font-bold text-success">Bs {PLAN_PRICES[selectedRequest.plan].monthlyBs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">N° Referencia:</span>
                  <span className="font-mono font-bold">{selectedRequest.ref}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Titular:</span>
                  <span className="font-medium">{selectedRequest.payer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha:</span>
                  <span>{new Date(selectedRequest.date).toLocaleString('es-BO')}</span>
                </div>
                {selectedRequest.notes && (
                  <div>
                    <span className="text-muted-foreground">Notas:</span>
                    <p className="mt-1 text-foreground">{selectedRequest.notes}</p>
                  </div>
                )}
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3">
                  <Button 
                    variant="destructive" 
                    onClick={() => handleReject(selectedRequest)}
                    className="flex-1 gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Rechazar
                  </Button>
                  <Button 
                    onClick={() => handleApprove(selectedRequest)}
                    className="flex-1 gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Aprobar y Activar
                  </Button>
                </div>
              )}

              {selectedRequest.status !== 'pending' && (
                <div className="text-center py-2">
                  <Badge 
                    variant={selectedRequest.status === 'approved' ? 'default' : 'destructive'}
                    className="text-sm px-4 py-1"
                  >
                    {selectedRequest.status === 'approved' ? '✅ Pago Aprobado' : '❌ Pago Rechazado'}
                  </Badge>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PaymentRequestsManager;
