
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, DollarSign, Eye } from "lucide-react";
import ComprobanteForm from "./ComprobanteForm";
import ComprobantePreview from "./ComprobantePreview";

interface CuentaContable {
  codigo: string;
  nombre: string;
  debe: number;
  haber: number;
}

interface Comprobante {
  id: string;
  tipo: 'ingreso' | 'egreso' | 'traspaso';
  numero: string;
  fecha: string;
  concepto: string;
  beneficiario: string;
  monto: number;
  metodoPago: string;
  referencia: string;
  observaciones: string;
  estado: 'borrador' | 'autorizado' | 'anulado';
  creadoPor: string;
  fechaCreacion: string;
  cuentas: CuentaContable[];
}

const ComprobantesModule = () => {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [showComprobanteDialog, setShowComprobanteDialog] = useState<{
    open: boolean;
    tipo: 'ingreso' | 'egreso' | 'traspaso' | null;
  }>({ open: false, tipo: null });
  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();

  const cargarComprobantes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('comprobantes_integrados')
        .select('*, items_comprobantes_integrados(*)')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });

      if (error) throw error;

      const mapped: Comprobante[] = (data || []).map((c: any) => ({
        id: c.id,
        tipo: c.tipo_comprobante as 'ingreso' | 'egreso' | 'traspaso',
        numero: c.numero_comprobante,
        fecha: c.fecha,
        concepto: c.razon_social,
        beneficiario: c.nit,
        monto: c.total,
        metodoPago: '',
        referencia: c.codigo_control || '',
        observaciones: c.estado_sin || '',
        estado: c.estado as 'borrador' | 'autorizado' | 'anulado',
        creadoPor: 'Sistema',
        fechaCreacion: c.created_at,
        cuentas: (c.items_comprobantes_integrados || []).map((item: any) => ({
          codigo: item.codigo,
          nombre: item.descripcion,
          debe: item.subtotal > 0 ? item.subtotal : 0,
          haber: item.subtotal < 0 ? Math.abs(item.subtotal) : 0
        }))
      }));

      setComprobantes(mapped);
    } catch (error) {
      console.error('Error cargando comprobantes:', error);
      // Fallback localStorage
      const local = localStorage.getItem('comprobantes');
      if (local) setComprobantes(JSON.parse(local));
    }
  }, []);

  useEffect(() => {
    cargarComprobantes();
  }, [cargarComprobantes]);

  const guardarComprobanteEnDB = async (nuevoComprobante: Comprobante) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Fallback localStorage
        const nuevos = [nuevoComprobante, ...comprobantes];
        setComprobantes(nuevos);
        localStorage.setItem('comprobantes', JSON.stringify(nuevos));
        return;
      }

      const { data, error } = await supabase
        .from('comprobantes_integrados')
        .insert({
          numero_comprobante: nuevoComprobante.numero,
          tipo_comprobante: nuevoComprobante.tipo,
          fecha: nuevoComprobante.fecha,
          razon_social: nuevoComprobante.concepto,
          nit: nuevoComprobante.beneficiario,
          subtotal: nuevoComprobante.monto,
          iva: nuevoComprobante.monto * 0.13,
          total: nuevoComprobante.monto,
          estado: nuevoComprobante.estado,
          codigo_control: nuevoComprobante.referencia || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Insertar items/cuentas
      if (nuevoComprobante.cuentas.length > 0 && data) {
        const items = nuevoComprobante.cuentas.map(cuenta => ({
          comprobante_id: data.id,
          codigo: cuenta.codigo,
          descripcion: cuenta.nombre,
          cantidad: 1,
          precio_unitario: cuenta.debe || cuenta.haber,
          subtotal: cuenta.debe || cuenta.haber
        }));

        await supabase.from('items_comprobantes_integrados').insert(items);
      }

      const comprobanteConId = { ...nuevoComprobante, id: data?.id || nuevoComprobante.id };
      setComprobantes(prev => [comprobanteConId, ...prev]);
    } catch (error) {
      console.error('Error guardando comprobante:', error);
      const nuevos = [nuevoComprobante, ...comprobantes];
      setComprobantes(nuevos);
      localStorage.setItem('comprobantes', JSON.stringify(nuevos));
    }
  };

  const guardarComprobante = async (datos: any) => {
    const nuevoComprobante: Comprobante = {
      ...datos,
      id: Date.now().toString(),
      fechaCreacion: new Date().toISOString(),
      creadoPor: 'Usuario Sistema',
      monto: datos.tipo === 'traspaso' ? 
        datos.cuentas.reduce((sum: number, cuenta: CuentaContable) => sum + cuenta.debe, 0) : 
        datos.monto
    };

    // Generar número automático
    const contadorTipo = comprobantes.filter(c => c.tipo === datos.tipo).length + 1;
    const prefijo = datos.tipo === 'ingreso' ? 'ING' : datos.tipo === 'egreso' ? 'EGR' : 'TRA';
    nuevoComprobante.numero = `${prefijo}-${contadorTipo.toString().padStart(4, '0')}`;

    // Generar asiento contable si está autorizado
    if (datos.estado === 'autorizado') {
      generarAsientoContable(nuevoComprobante);
    }

    await guardarComprobanteEnDB(nuevoComprobante);

    toast({
      title: "Comprobante creado",
      description: `${datos.tipo.charAt(0).toUpperCase() + datos.tipo.slice(1)} N° ${nuevoComprobante.numero} creado exitosamente`,
    });

    setShowComprobanteDialog({ open: false, tipo: null });
  };

  const generarAsientoContable = (comprobante: Comprobante) => {
    const asiento = {
      id: Date.now().toString(),
      numero: `COMP-${comprobante.numero}`,
      fecha: comprobante.fecha,
      concepto: `${comprobante.tipo.charAt(0).toUpperCase() + comprobante.tipo.slice(1)} - ${comprobante.concepto}`,
      referencia: comprobante.numero,
      debe: comprobante.monto,
      haber: comprobante.monto,
      estado: 'registrado' as const,
      cuentas: comprobante.cuentas
    };

    guardarAsiento(asiento);
  };

  const autorizarComprobante = async (id: string) => {
    try {
      await supabase.from('comprobantes_integrados').update({ estado: 'autorizado' }).eq('id', id);
    } catch (e) { console.error(e); }

    const comprobantesActualizados = comprobantes.map(c => {
      if (c.id === id) {
        const comprobanteAutorizado = { ...c, estado: 'autorizado' as const };
        generarAsientoContable(comprobanteAutorizado);
        return comprobanteAutorizado;
      }
      return c;
    });

    setComprobantes(comprobantesActualizados);

    toast({
      title: "Comprobante autorizado",
      description: "El comprobante ha sido autorizado y el asiento contable generado",
    });
  };

  const anularComprobante = async (id: string) => {
    try {
      await supabase.from('comprobantes_integrados').update({ estado: 'anulado' }).eq('id', id);
    } catch (e) { console.error(e); }

    setComprobantes(prev => prev.map(c => 
      c.id === id ? { ...c, estado: 'anulado' as const } : c
    ));

    toast({
      title: "Comprobante anulado",
      description: "El comprobante ha sido anulado",
      variant: "destructive"
    });
  };

  const comprobantesFiltrados = comprobantes.filter(c => {
    const cumpleTipo = filtroTipo === 'todos' || c.tipo === filtroTipo;
    const cumpleEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
    return cumpleTipo && cumpleEstado;
  });

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'ingreso': return ArrowUpCircle;
      case 'egreso': return ArrowDownCircle;
      case 'traspaso': return ArrowRightLeft;
      default: return FileText;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'autorizado': return 'bg-green-100 text-green-800';
      case 'anulado': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const totalIngresos = comprobantes.filter(c => c.tipo === 'ingreso' && c.estado === 'autorizado').reduce((sum, c) => sum + c.monto, 0);
  const totalEgresos = comprobantes.filter(c => c.tipo === 'egreso' && c.estado === 'autorizado').reduce((sum, c) => sum + c.monto, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Comprobantes Contables</h2>
            <p className="text-slate-600">
              Gestión de comprobantes de ingreso, egreso y traspasos con plan de cuentas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowComprobanteDialog({ open: true, tipo: 'ingreso' })}
            className="bg-green-600 hover:bg-green-700"
          >
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Ingreso
          </Button>
          <Button
            onClick={() => setShowComprobanteDialog({ open: true, tipo: 'egreso' })}
            className="bg-red-600 hover:bg-red-700"
          >
            <ArrowDownCircle className="w-4 h-4 mr-2" />
            Egreso
          </Button>
          <Button
            onClick={() => setShowComprobanteDialog({ open: true, tipo: 'traspaso' })}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Traspaso
          </Button>
        </div>
      </div>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Bs. {totalIngresos.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Comprobantes autorizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Bs. {totalEgresos.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Comprobantes autorizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Bs. {(totalIngresos - totalEgresos).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Diferencia ingresos - egresos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="ingreso">Ingresos</SelectItem>
            <SelectItem value="egreso">Egresos</SelectItem>
            <SelectItem value="traspaso">Traspasos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="autorizado">Autorizado</SelectItem>
            <SelectItem value="anulado">Anulado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Comprobantes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Comprobantes</CardTitle>
          <CardDescription>
            Historial de todos los comprobantes generados con detalle contable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Beneficiario</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comprobantesFiltrados.map(comprobante => {
                const IconComponent = getTipoIcon(comprobante.tipo);
                return (
                  <TableRow key={comprobante.id}>
                    <TableCell className="font-medium">{comprobante.numero}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        {comprobante.tipo.charAt(0).toUpperCase() + comprobante.tipo.slice(1)}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(comprobante.fecha).toLocaleDateString('es-BO')}</TableCell>
                    <TableCell>{comprobante.concepto}</TableCell>
                    <TableCell>{comprobante.beneficiario}</TableCell>
                    <TableCell className="text-right font-semibold">
                      Bs. {comprobante.monto.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getEstadoColor(comprobante.estado)}>
                        {comprobante.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {comprobante.estado === 'borrador' && (
                          <Button
                            size="sm"
                            onClick={() => autorizarComprobante(comprobante.id)}
                          >
                            Autorizar
                          </Button>
                        )}
                        {comprobante.estado === 'autorizado' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => anularComprobante(comprobante.id)}
                          >
                            Anular
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedComprobante(comprobante)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para crear comprobante */}
      <Dialog 
        open={showComprobanteDialog.open} 
        onOpenChange={(open) => !open && setShowComprobanteDialog({ open: false, tipo: null })}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Nuevo Comprobante de {showComprobanteDialog.tipo?.charAt(0).toUpperCase() + showComprobanteDialog.tipo?.slice(1)}
            </DialogTitle>
            <DialogDescription>
              {showComprobanteDialog.tipo === 'traspaso' ? 
                'Configure las cuentas contables manualmente para el asiento' :
                'Se generará automáticamente el asiento contable según el plan de cuentas'
              }
            </DialogDescription>
          </DialogHeader>
          {showComprobanteDialog.tipo && (
            <ComprobanteForm
              tipo={showComprobanteDialog.tipo}
              onSave={guardarComprobante}
              onCancel={() => setShowComprobanteDialog({ open: false, tipo: null })}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para previsualizar comprobante */}
      <Dialog 
        open={!!selectedComprobante} 
        onOpenChange={(open) => !open && setSelectedComprobante(null)}
      >
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
          {selectedComprobante && (
            <ComprobantePreview
              comprobante={selectedComprobante}
              onClose={() => setSelectedComprobante(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComprobantesModule;
