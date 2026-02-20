import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, ArrowDownCircle, ArrowUpCircle, Download, Search, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFacturas } from '@/hooks/useFacturas';

interface NotaCreditoDebito {
  id: string;
  tipo: 'credito' | 'debito';
  numero: string;
  fecha: string;
  facturaRelacionada: string;
  clienteNombre: string;
  clienteNit: string;
  motivo: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'emitida' | 'aplicada' | 'anulada';
  items: NotaItem[];
}

interface NotaItem {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

const NotasCreditoDebitoModule = () => {
  const { toast } = useToast();
  const { facturas } = useFacturas();
  const [notas, setNotas] = useState<NotaCreditoDebito[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'credito' | 'debito'>('todos');
  const [busqueda, setBusqueda] = useState('');

  const [nuevaNota, setNuevaNota] = useState({
    tipo: 'credito' as 'credito' | 'debito',
    facturaRelacionada: '',
    motivo: '',
    items: [{ descripcion: '', cantidad: 1, precioUnitario: 0, subtotal: 0 }] as NotaItem[],
  });

  const facturaSeleccionada = facturas.find((f: any) => f.numero === nuevaNota.facturaRelacionada);

  const calcularTotales = (items: NotaItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const iva = subtotal * 0.13;
    return { subtotal, iva, total: subtotal };
  };

  const agregarItem = () => {
    setNuevaNota(prev => ({
      ...prev,
      items: [...prev.items, { descripcion: '', cantidad: 1, precioUnitario: 0, subtotal: 0 }]
    }));
  };

  const actualizarItem = (index: number, field: keyof NotaItem, value: string | number) => {
    setNuevaNota(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'cantidad' || field === 'precioUnitario') {
        items[index].subtotal = items[index].cantidad * items[index].precioUnitario;
      }
      return { ...prev, items };
    });
  };

  const emitirNota = () => {
    if (!nuevaNota.facturaRelacionada || !nuevaNota.motivo) {
      toast({ title: 'Error', description: 'Complete los campos obligatorios', variant: 'destructive' });
      return;
    }

    const totales = calcularTotales(nuevaNota.items);
    const nota: NotaCreditoDebito = {
      id: `NC-${Date.now()}`,
      tipo: nuevaNota.tipo,
      numero: `${nuevaNota.tipo === 'credito' ? 'NC' : 'ND'}-${String(notas.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString().slice(0, 10),
      facturaRelacionada: nuevaNota.facturaRelacionada,
      clienteNombre: typeof facturaSeleccionada?.cliente === 'object' ? facturaSeleccionada.cliente.nombre : (facturaSeleccionada?.cliente as string || 'N/A'),
      clienteNit: typeof facturaSeleccionada?.cliente === 'object' ? facturaSeleccionada.cliente.nit : '0',
      motivo: nuevaNota.motivo,
      ...totales,
      estado: 'emitida',
      items: nuevaNota.items.filter(i => i.descripcion),
    };

    setNotas(prev => [...prev, nota]);
    setDialogOpen(false);
    setNuevaNota({ tipo: 'credito', facturaRelacionada: '', motivo: '', items: [{ descripcion: '', cantidad: 1, precioUnitario: 0, subtotal: 0 }] });
    toast({ title: `${nuevaNota.tipo === 'credito' ? 'Nota de Crédito' : 'Nota de Débito'} emitida`, description: `Número: ${nota.numero}` });
  };

  const notasFiltradas = notas.filter(n => {
    if (filtroTipo !== 'todos' && n.tipo !== filtroTipo) return false;
    if (busqueda && !n.numero.toLowerCase().includes(busqueda.toLowerCase()) && !n.clienteNombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const totalCreditos = notas.filter(n => n.tipo === 'credito' && n.estado !== 'anulada').reduce((s, n) => s + n.total, 0);
  const totalDebitos = notas.filter(n => n.tipo === 'debito' && n.estado !== 'anulada').reduce((s, n) => s + n.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notas de Crédito y Débito</h2>
          <p className="text-muted-foreground">Gestión de notas según normativa SIN Bolivia</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nueva Nota</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Emitir Nota de Crédito/Débito</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={nuevaNota.tipo} onValueChange={(v: 'credito' | 'debito') => setNuevaNota(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credito">Nota de Crédito</SelectItem>
                      <SelectItem value="debito">Nota de Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Factura Relacionada</Label>
                  <Select value={nuevaNota.facturaRelacionada} onValueChange={v => setNuevaNota(p => ({ ...p, facturaRelacionada: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar factura" /></SelectTrigger>
                    <SelectContent>
                      {facturas.filter((f: any) => f.estado !== 'anulada').map((f: any) => (
                        <SelectItem key={f.numero} value={f.numero}>
                          {f.numero} - {f.cliente} (Bs {f.total})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Motivo</Label>
                <Textarea 
                  placeholder="Ej: Devolución de mercadería, descuento por pronto pago, error en facturación..."
                  value={nuevaNota.motivo}
                  onChange={e => setNuevaNota(p => ({ ...p, motivo: e.target.value }))}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Ítems</Label>
                  <Button variant="outline" size="sm" onClick={agregarItem}><Plus className="w-3 h-3 mr-1" /> Agregar</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-20">Cant.</TableHead>
                      <TableHead className="w-28">Precio</TableHead>
                      <TableHead className="w-28 text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nuevaNota.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input value={item.descripcion} onChange={e => actualizarItem(i, 'descripcion', e.target.value)} placeholder="Descripción" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={item.cantidad} onChange={e => actualizarItem(i, 'cantidad', Number(e.target.value))} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={item.precioUnitario} onChange={e => actualizarItem(i, 'precioUnitario', Number(e.target.value))} />
                        </TableCell>
                        <TableCell className="text-right font-medium">Bs {item.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal:</span><span>Bs {calcularTotales(nuevaNota.items).subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Crédito Fiscal (13%):</span><span>Bs {calcularTotales(nuevaNota.items).iva.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1">
                  <span>Total:</span><span>Bs {calcularTotales(nuevaNota.items).total.toFixed(2)}</span>
                </div>
              </div>

              <Button onClick={emitirNota} className="w-full gap-2">
                <FileText className="w-4 h-4" /> Emitir {nuevaNota.tipo === 'credito' ? 'Nota de Crédito' : 'Nota de Débito'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100"><ArrowDownCircle className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Notas Crédito</p>
              <p className="text-2xl font-bold">Bs {totalCreditos.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100"><ArrowUpCircle className="w-6 h-6 text-red-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Notas Débito</p>
              <p className="text-2xl font-bold">Bs {totalDebitos.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100"><FileText className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Notas Emitidas</p>
              <p className="text-2xl font-bold">{notas.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Lista */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Registro de Notas</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="pl-9 w-60" />
              </div>
              <Select value={filtroTipo} onValueChange={(v: any) => setFiltroTipo(v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {notasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No hay notas registradas</p>
              <p className="text-sm">Emita su primera nota de crédito o débito</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Factura Ref.</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notasFiltradas.map(nota => (
                  <TableRow key={nota.id}>
                    <TableCell className="font-medium">{nota.numero}</TableCell>
                    <TableCell>
                      <Badge variant={nota.tipo === 'credito' ? 'default' : 'destructive'}>
                        {nota.tipo === 'credito' ? 'Crédito' : 'Débito'}
                      </Badge>
                    </TableCell>
                    <TableCell>{nota.fecha}</TableCell>
                    <TableCell>{nota.clienteNombre}</TableCell>
                    <TableCell>{nota.facturaRelacionada}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{nota.motivo}</TableCell>
                    <TableCell className="text-right font-medium">Bs {nota.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={nota.estado === 'emitida' ? 'secondary' : nota.estado === 'aplicada' ? 'default' : 'destructive'}>
                        {nota.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotasCreditoDebitoModule;
