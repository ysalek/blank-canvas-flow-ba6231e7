import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { CreditCard, AlertTriangle, CheckCircle, Calendar, DollarSign, Users, Building } from "lucide-react";

interface CuentaPorCobrar {
  id: string;
  clienteId: string;
  clienteNombre: string;
  facturaNumero: string;
  fecha: string;
  fechaVencimiento: string;
  montoOriginal: number;
  montoPagado: number;
  montoSaldo: number;
  estado: 'pendiente' | 'vencida' | 'pagada' | 'parcial';
  diasVencidos: number;
}

interface CuentaPorPagar {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  facturaNumero: string;
  fecha: string;
  fechaVencimiento: string;
  montoOriginal: number;
  montoPagado: number;
  montoSaldo: number;
  estado: 'pendiente' | 'vencida' | 'pagada' | 'parcial';
  diasVencidos: number;
}

interface PagoRegistro {
  id: string;
  tipo: 'cobro' | 'pago';
  cuentaId: string;
  fecha: string;
  monto: number;
  metodoPago: 'efectivo' | 'cheque' | 'transferencia' | 'tarjeta';
  referencia: string;
  observaciones: string;
}

const CuentasPorCobrarPagar = () => {
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState<CuentaPorCobrar[]>([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState<CuentaPorPagar[]>([]);
  const [pagos, setPagos] = useState<PagoRegistro[]>([]);
  const [showPagoDialog, setShowPagoDialog] = useState<{ open: boolean; tipo: 'cobro' | 'pago'; cuenta: any } | null>(null);
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = () => {
    // Cargar facturas para generar cuentas por cobrar
    const facturas = JSON.parse(localStorage.getItem('facturas') || '[]');
    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    
    const cxc: CuentaPorCobrar[] = facturas
      .filter((f: any) => f.estado === 'enviada')
      .map((f: any) => {
        const cliente = clientes.find((c: any) => c.id === f.cliente.id);
        const fechaVenc = new Date(f.fechaVencimiento);
        const hoy = new Date();
        const diasVencidos = Math.floor((hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: f.id,
          clienteId: f.cliente.id,
          clienteNombre: cliente?.nombre || f.cliente.nombre,
          facturaNumero: f.numero,
          fecha: f.fecha,
          fechaVencimiento: f.fechaVencimiento,
          montoOriginal: f.total,
          montoPagado: 0,
          montoSaldo: f.total,
          estado: diasVencidos > 0 ? 'vencida' : 'pendiente',
          diasVencidos: Math.max(0, diasVencidos)
        } as CuentaPorCobrar;
      });

    setCuentasPorCobrar(cxc);

    // Cargar compras para generar cuentas por pagar
    const compras = JSON.parse(localStorage.getItem('compras') || '[]');
    const proveedores = JSON.parse(localStorage.getItem('proveedores') || '[]');
    
    const cxp: CuentaPorPagar[] = compras
      .filter((c: any) => c.estado === 'pendiente')
      .map((c: any) => {
        const proveedor = proveedores.find((p: any) => p.id === c.proveedorId);
        const fechaVenc = new Date(c.fechaVencimiento || c.fecha);
        fechaVenc.setDate(fechaVenc.getDate() + 30); // 30 días de plazo por defecto
        const hoy = new Date();
        const diasVencidos = Math.floor((hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: c.id,
          proveedorId: c.proveedorId,
          proveedorNombre: proveedor?.nombre || 'Proveedor Desconocido',
          facturaNumero: c.numero,
          fecha: c.fecha,
          fechaVencimiento: fechaVenc.toISOString().slice(0, 10),
          montoOriginal: c.total,
          montoPagado: 0,
          montoSaldo: c.total,
          estado: diasVencidos > 0 ? 'vencida' : 'pendiente',
          diasVencidos: Math.max(0, diasVencidos)
        } as CuentaPorPagar;
      });

    setCuentasPorPagar(cxp);

    // Cargar pagos registrados
    const pagosGuardados = localStorage.getItem('pagosRegistrados');
    if (pagosGuardados) {
      setPagos(JSON.parse(pagosGuardados));
    }
  };

  const registrarPago = (pago: Omit<PagoRegistro, 'id'>) => {
    const nuevoPago: PagoRegistro = {
      ...pago,
      id: Date.now().toString()
    };

    // Actualizar la cuenta correspondiente y persistir cambios
    if (pago.tipo === 'cobro') {
      // Actualizar el estado de la factura en localStorage
      const facturas = JSON.parse(localStorage.getItem('facturas') || '[]');
      const facturaIndex = facturas.findIndex((f: any) => f.id === pago.cuentaId);
      
      if (facturaIndex !== -1) {
        const cuenta = cuentasPorCobrar.find(c => c.id === pago.cuentaId);
        if (cuenta) {
          const nuevoMontoPagado = cuenta.montoPagado + pago.monto;
          const nuevoSaldo = cuenta.montoOriginal - nuevoMontoPagado;
          
          // Si el saldo es cero o menos, marcar factura como pagada
          if (nuevoSaldo <= 0) {
            facturas[facturaIndex].estado = 'pagada';
          }
          
          // Guardar facturas actualizadas
          localStorage.setItem('facturas', JSON.stringify(facturas));
        }
      }

      setCuentasPorCobrar(prev => prev.map(c => {
        if (c.id === pago.cuentaId) {
          const nuevoMontoPagado = c.montoPagado + pago.monto;
          const nuevoSaldo = c.montoOriginal - nuevoMontoPagado;
          return {
            ...c,
            montoPagado: nuevoMontoPagado,
            montoSaldo: nuevoSaldo,
            estado: nuevoSaldo <= 0 ? 'pagada' : 'parcial'
          };
        }
        return c;
      }));
    } else {
      // Actualizar el estado de la compra en localStorage
      const compras = JSON.parse(localStorage.getItem('compras') || '[]');
      const compraIndex = compras.findIndex((c: any) => c.id === pago.cuentaId);
      
      if (compraIndex !== -1) {
        const cuenta = cuentasPorPagar.find(c => c.id === pago.cuentaId);
        if (cuenta) {
          const nuevoMontoPagado = cuenta.montoPagado + pago.monto;
          const nuevoSaldo = cuenta.montoOriginal - nuevoMontoPagado;
          
          // Si el saldo es cero o menos, marcar compra como pagada
          if (nuevoSaldo <= 0) {
            compras[compraIndex].estado = 'pagada';
          }
          
          // Guardar compras actualizadas
          localStorage.setItem('compras', JSON.stringify(compras));
        }
      }

      setCuentasPorPagar(prev => prev.map(c => {
        if (c.id === pago.cuentaId) {
          const nuevoMontoPagado = c.montoPagado + pago.monto;
          const nuevoSaldo = c.montoOriginal - nuevoMontoPagado;
          return {
            ...c,
            montoPagado: nuevoMontoPagado,
            montoSaldo: nuevoSaldo,
            estado: nuevoSaldo <= 0 ? 'pagada' : 'parcial'
          };
        }
        return c;
      }));
    }

    // Generar asiento contable
    const asiento = {
      id: Date.now().toString(),
      numero: `${pago.tipo === 'cobro' ? 'COB' : 'PAG'}-${Date.now().toString().slice(-6)}`,
      fecha: pago.fecha,
      concepto: `${pago.tipo === 'cobro' ? 'Cobro' : 'Pago'} - ${pago.referencia}`,
      referencia: pago.referencia,
      debe: pago.tipo === 'cobro' ? pago.monto : 0,
      haber: pago.tipo === 'pago' ? pago.monto : 0,
      estado: 'registrado' as const,
      cuentas: pago.tipo === 'cobro' ? [
        {
          codigo: "1111",
          nombre: "Caja y Bancos",
          debe: pago.monto,
          haber: 0
        },
        {
          codigo: "1131",
          nombre: "Cuentas por Cobrar",
          debe: 0,
          haber: pago.monto
        }
      ] : [
        {
          codigo: "2111",
          nombre: "Cuentas por Pagar",
          debe: pago.monto,
          haber: 0
        },
        {
          codigo: "1111",
          nombre: "Caja y Bancos",
          debe: 0,
          haber: pago.monto
        }
      ]
    };

    guardarAsiento(asiento);

    const nuevosPagos = [nuevoPago, ...pagos];
    setPagos(nuevosPagos);
    localStorage.setItem('pagosRegistrados', JSON.stringify(nuevosPagos));

    toast({
      title: `${pago.tipo === 'cobro' ? 'Cobro' : 'Pago'} registrado`,
      description: `Se registró el ${pago.tipo} por Bs. ${pago.monto.toFixed(2)} y se actualizó el estado`,
    });

    setShowPagoDialog(null);
    
    // Recargar datos para reflejar cambios
    setTimeout(() => cargarDatos(), 100);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pagada': return 'bg-green-100 text-green-800';
      case 'vencida': return 'bg-red-100 text-red-800';
      case 'parcial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const totalPorCobrar = cuentasPorCobrar.reduce((sum, c) => sum + c.montoSaldo, 0);
  const totalPorPagar = cuentasPorPagar.reduce((sum, c) => sum + c.montoSaldo, 0);
  const vencidasCobrar = cuentasPorCobrar.filter(c => c.estado === 'vencida').length;
  const vencidasPagar = cuentasPorPagar.filter(c => c.estado === 'vencida').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Cuentas por Cobrar y Pagar</h2>
            <p className="text-muted-foreground">
              Gestión de cartera y obligaciones financieras
            </p>
          </div>
        </div>
      </div>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total por Cobrar</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Bs. {totalPorCobrar.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {cuentasPorCobrar.length} facturas pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total por Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Bs. {totalPorPagar.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {cuentasPorPagar.length} compras pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas Cobrar</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{vencidasCobrar}</div>
            <p className="text-xs text-muted-foreground">
              Requieren seguimiento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas Pagar</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{vencidasPagar}</div>
            <p className="text-xs text-muted-foreground">
              Requieren pago urgente
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cobrar" className="w-full">
        <TabsList>
          <TabsTrigger value="cobrar">
            <Users className="w-4 h-4 mr-2" />
            Cuentas por Cobrar ({cuentasPorCobrar.length})
          </TabsTrigger>
          <TabsTrigger value="pagar">
            <Building className="w-4 h-4 mr-2" />
            Cuentas por Pagar ({cuentasPorPagar.length})
          </TabsTrigger>
          <TabsTrigger value="pagos">
            <CheckCircle className="w-4 h-4 mr-2" />
            Historial de Pagos ({pagos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cobrar">
          <Card>
            <CardHeader>
              <CardTitle>Facturas por Cobrar</CardTitle>
              <CardDescription>
                Seguimiento de cuentas por cobrar de clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto Original</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Días Vencido</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuentasPorCobrar.map(cuenta => (
                    <TableRow key={cuenta.id}>
                      <TableCell className="font-medium">{cuenta.facturaNumero}</TableCell>
                      <TableCell>{cuenta.clienteNombre}</TableCell>
                      <TableCell>{new Date(cuenta.fecha).toLocaleDateString('es-BO')}</TableCell>
                      <TableCell>{new Date(cuenta.fechaVencimiento).toLocaleDateString('es-BO')}</TableCell>
                      <TableCell className="text-right">Bs. {cuenta.montoOriginal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Bs. {cuenta.montoPagado.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">Bs. {cuenta.montoSaldo.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={getEstadoColor(cuenta.estado)}>
                          {cuenta.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cuenta.diasVencidos > 0 && (
                          <Badge variant="destructive">
                            {cuenta.diasVencidos} días
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {cuenta.estado !== 'pagada' && (
                          <Button
                            size="sm"
                            onClick={() => setShowPagoDialog({
                              open: true,
                              tipo: 'cobro',
                              cuenta
                            })}
                          >
                            Registrar Cobro
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagar">
          <Card>
            <CardHeader>
              <CardTitle>Compras por Pagar</CardTitle>
              <CardDescription>
                Seguimiento de obligaciones con proveedores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto Original</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Días Vencido</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuentasPorPagar.map(cuenta => (
                    <TableRow key={cuenta.id}>
                      <TableCell className="font-medium">{cuenta.facturaNumero}</TableCell>
                      <TableCell>{cuenta.proveedorNombre}</TableCell>
                      <TableCell>{new Date(cuenta.fecha).toLocaleDateString('es-BO')}</TableCell>
                      <TableCell>{new Date(cuenta.fechaVencimiento).toLocaleDateString('es-BO')}</TableCell>
                      <TableCell className="text-right">Bs. {cuenta.montoOriginal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Bs. {cuenta.montoPagado.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">Bs. {cuenta.montoSaldo.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={getEstadoColor(cuenta.estado)}>
                          {cuenta.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cuenta.diasVencidos > 0 && (
                          <Badge variant="destructive">
                            {cuenta.diasVencidos} días
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {cuenta.estado !== 'pagada' && (
                          <Button
                            size="sm"
                            onClick={() => setShowPagoDialog({
                              open: true,
                              tipo: 'pago',
                              cuenta
                            })}
                          >
                            Registrar Pago
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos y Cobros</CardTitle>
              <CardDescription>
                Registro de todos los movimientos de cartera
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map(pago => (
                    <TableRow key={pago.id}>
                      <TableCell>{new Date(pago.fecha).toLocaleDateString('es-BO')}</TableCell>
                      <TableCell>
                        <Badge variant={pago.tipo === 'cobro' ? 'default' : 'secondary'}>
                          {pago.tipo === 'cobro' ? 'Cobro' : 'Pago'}
                        </Badge>
                      </TableCell>
                      <TableCell>{pago.referencia}</TableCell>
                      <TableCell>{pago.metodoPago}</TableCell>
                      <TableCell className={`text-right font-semibold ${pago.tipo === 'cobro' ? 'text-green-600' : 'text-red-600'}`}>
                        {pago.tipo === 'cobro' ? '+' : '-'}Bs. {pago.monto.toFixed(2)}
                      </TableCell>
                      <TableCell>{pago.observaciones}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para registrar pagos */}
      {showPagoDialog && (
        <Dialog open={showPagoDialog.open} onOpenChange={(open) => !open && setShowPagoDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Registrar {showPagoDialog.tipo === 'cobro' ? 'Cobro' : 'Pago'}
              </DialogTitle>
              <DialogDescription>
                {showPagoDialog.tipo === 'cobro' ? 'Registre el cobro de la factura' : 'Registre el pago de la compra'}: {showPagoDialog.cuenta.facturaNumero}
              </DialogDescription>
            </DialogHeader>
            <PagoForm
              tipo={showPagoDialog.tipo}
              cuentaId={showPagoDialog.cuenta.id}
              montoMaximo={showPagoDialog.cuenta.montoSaldo}
              onSave={registrarPago}
              onCancel={() => setShowPagoDialog(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Componente para formulario de pago
const PagoForm = ({ tipo, cuentaId, montoMaximo, onSave, onCancel }: {
  tipo: 'cobro' | 'pago';
  cuentaId: string;
  montoMaximo: number;
  onSave: (pago: Omit<PagoRegistro, 'id'>) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    tipo,
    cuentaId,
    fecha: new Date().toISOString().slice(0, 10),
    monto: montoMaximo,
    metodoPago: 'efectivo' as const,
    referencia: '',
    observaciones: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha</Label>
          <Input
            id="fecha"
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monto">Monto (máx: Bs. {montoMaximo.toFixed(2)})</Label>
          <Input
            id="monto"
            type="number"
            step="0.01"
            max={montoMaximo}
            value={formData.monto}
            onChange={(e) => setFormData(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="metodoPago">Método de Pago</Label>
        <select
          id="metodoPago"
          value={formData.metodoPago}
          onChange={(e) => setFormData(prev => ({ ...prev, metodoPago: e.target.value as any }))}
          className="w-full px-3 py-2 border rounded-md"
          required
        >
          <option value="efectivo">Efectivo</option>
          <option value="cheque">Cheque</option>
          <option value="transferencia">Transferencia Bancaria</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="referencia">Referencia</Label>
        <Input
          id="referencia"
          value={formData.referencia}
          onChange={(e) => setFormData(prev => ({ ...prev, referencia: e.target.value }))}
          placeholder="Número de cheque, transferencia, etc."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea
          id="observaciones"
          value={formData.observaciones}
          onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
          placeholder="Observaciones adicionales"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Registrar {tipo === 'cobro' ? 'Cobro' : 'Pago'}
        </Button>
      </div>
    </form>
  );
};

export default CuentasPorCobrarPagar;
