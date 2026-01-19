
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Calendar, Edit, Trash2, Plus, Eye, Download, Filter, RefreshCw, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { useAsientos } from '@/hooks/useAsientos';
import { useContabilidadIntegration } from '@/hooks/useContabilidadIntegration';
import { AsientoContable } from './diary/DiaryData';
import { useToast } from '@/hooks/use-toast';
import { EnhancedHeader, MetricGrid, EnhancedMetricCard, Section } from './dashboard/EnhancedLayout';

const LibroDiario = () => {
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().slice(0, 10));
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [asientoEditando, setAsientoEditando] = useState<AsientoContable | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [asientoDetalle, setAsientoDetalle] = useState<AsientoContable | null>(null);
  const { getAsientos, guardarAsiento, actualizarEstadoAsiento, refetch, loading } = useAsientos();
  const { getBalanceSheetData } = useContabilidadIntegration();
  const { toast } = useToast();

  const [asientos, setAsientos] = useState<AsientoContable[]>([]);

  useEffect(() => {
    cargarAsientos();
  }, []);

  useEffect(() => {
    const asientosData = getAsientos();
    setAsientos(asientosData);
  }, [getAsientos]);

  const cargarAsientos = () => {
    refetch();
  };

  const filtrarAsientos = () => {
    return asientos.filter(asiento => {
      const fechaAsiento = new Date(asiento.fecha);
      const fechaInicioObj = new Date(fechaInicio);
      const fechaFinObj = new Date(fechaFin);
      
      const cumpleFecha = fechaAsiento >= fechaInicioObj && fechaAsiento <= fechaFinObj;
      const cumpleEstado = filtroEstado === 'todos' || asiento.estado === filtroEstado;
      
      return cumpleFecha && cumpleEstado;
    });
  };

  const verDetalle = (asiento: AsientoContable) => {
    setAsientoDetalle(asiento);
    setShowDetailDialog(true);
  };

  const exportarDiario = () => {
    const asientosFiltrados = filtrarAsientos();
    let contenido = `LIBRO DIARIO\nPeríodo: ${fechaInicio} al ${fechaFin}\n\n`;
    
    asientosFiltrados.forEach(asiento => {
      contenido += `Fecha: ${asiento.fecha} | Asiento: ${asiento.numero} | Estado: ${asiento.estado}\n`;
      contenido += `Concepto: ${asiento.concepto}\n`;
      contenido += `Referencia: ${asiento.referencia}\n`;
      contenido += `CUENTAS:\n`;
      asiento.cuentas.forEach(cuenta => {
        contenido += `  ${cuenta.codigo} - ${cuenta.nombre}: Debe ${cuenta.debe.toFixed(2)} | Haber ${cuenta.haber.toFixed(2)}\n`;
      });
      contenido += `TOTALES: Debe ${asiento.debe.toFixed(2)} | Haber ${asiento.haber.toFixed(2)}\n`;
      contenido += `${'='.repeat(80)}\n\n`;
    });

    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `libro_diario_${fechaInicio}_${fechaFin}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const editarAsiento = (asiento: AsientoContable) => {
    setAsientoEditando({ ...asiento });
    setShowEditDialog(true);
  };

  const eliminarAsiento = async (asientoId: string) => {
    if (confirm('¿Está seguro de anular este asiento? Esta acción cambiará su estado a "anulado".')) {
      // En contabilidad, los asientos no se eliminan, se anulan
      const resultado = await actualizarEstadoAsiento(asientoId, 'anulado');
      if (resultado) {
        setAsientos(prev => prev.map(a => 
          a.id === asientoId ? { ...a, estado: 'anulado' as const } : a
        ));
        toast({
          title: "Asiento anulado",
          description: "El asiento contable ha sido anulado exitosamente",
          variant: "destructive"
        });
      }
    }
  };

  const cambiarEstadoAsiento = async (asientoId: string, nuevoEstado: 'borrador' | 'registrado' | 'anulado') => {
    const resultado = await actualizarEstadoAsiento(asientoId, nuevoEstado);
    if (resultado) {
      setAsientos(prev => prev.map(a => 
        a.id === asientoId ? { ...a, estado: nuevoEstado } : a
      ));
      toast({
        title: "Estado actualizado",
        description: `El asiento ha sido ${nuevoEstado === 'anulado' ? 'anulado' : nuevoEstado}`,
      });
    }
  };

  const guardarEdicion = async () => {
    if (!asientoEditando) return;

    // Para edición completa, usar guardarAsiento
    const resultado = await guardarAsiento(asientoEditando);
    if (resultado) {
      refetch();
      toast({
        title: "Asiento actualizado",
        description: "Los cambios han sido guardados exitosamente",
      });
    }
    
    setShowEditDialog(false);
    setAsientoEditando(null);
  };

  const asientosFiltrados = filtrarAsientos();
  const totalDebe = asientosFiltrados.reduce((sum, asiento) => sum + asiento.debe, 0);
  const totalHaber = asientosFiltrados.reduce((sum, asiento) => sum + asiento.haber, 0);
  const balanceData = getBalanceSheetData();
  const asientosRegistrados = asientosFiltrados.filter(a => a.estado === 'registrado');
  const asientosBorrador = asientosFiltrados.filter(a => a.estado === 'borrador');
  const asientosAnulados = asientosFiltrados.filter(a => a.estado === 'anulado');

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'registrado': return 'bg-green-100 text-green-800';
      case 'anulado': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header mejorado */}
      <EnhancedHeader
        title="Libro Diario Integrado"
        subtitle={`Registro cronológico de transacciones • ${asientosFiltrados.length} asientos • Balance: ${balanceData.ecuacionCuadrada ? 'Cuadrado' : 'Descuadrado'}`}
        badge={{
          text: `${asientosRegistrados.length} Registrados`,
          variant: "default"
        }}
        actions={
          <div className="flex gap-2">
            <Button onClick={exportarDiario} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={cargarAsientos} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        }
      />

      {/* KPIs del Diario */}
      <Section title="Métricas del Libro Diario" subtitle="Análisis de asientos contables del período">
        <MetricGrid columns={4}>
          <EnhancedMetricCard
            title="Asientos Registrados"
            value={asientosRegistrados.length}
            subtitle="Definitivos"
            icon={CheckCircle2}
            variant="success"
            trend="up"
            trendValue="Procesados"
          />
          <EnhancedMetricCard
            title="Total Debe"
            value={`Bs. ${totalDebe.toLocaleString()}`}
            subtitle="Suma de débitos"
            icon={BookOpen}
            variant="default"
            trend="neutral"
            trendValue="Balanceado"
          />
          <EnhancedMetricCard
            title="Total Haber"
            value={`Bs. ${totalHaber.toLocaleString()}`}
            subtitle="Suma de créditos"
            icon={BookOpen}
            variant="default"
            trend="neutral"
            trendValue="Balanceado"
          />
          <EnhancedMetricCard
            title="Estado del Balance"
            value={balanceData.ecuacionCuadrada ? "Cuadrado" : "Descuadrado"}
            subtitle={`A: ${balanceData.activos.total.toFixed(0)} | P+E: ${balanceData.totalPasivoPatrimonio.toFixed(0)}`}
            icon={balanceData.ecuacionCuadrada ? CheckCircle2 : AlertCircle}
            variant={balanceData.ecuacionCuadrada ? "success" : "destructive"}
            trend={balanceData.ecuacionCuadrada ? "up" : "down"}
            trendValue={balanceData.ecuacionCuadrada ? "Integrado" : "Revisar"}
          />
        </MetricGrid>
      </Section>

      {/* Card principal mejorado */}
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BookOpen className="w-6 h-6" />
                Registro de Asientos Contables
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Control completo de transacciones con capacidad de edición avanzada
              </CardDescription>
            </div>
            {(asientosBorrador.length > 0 || asientosAnulados.length > 0) && (
              <div className="flex gap-2">
                {asientosBorrador.length > 0 && (
                  <Badge variant="secondary">
                    {asientosBorrador.length} borradores
                  </Badge>
                )}
                {asientosAnulados.length > 0 && (
                  <Badge variant="destructive">
                    {asientosAnulados.length} anulados
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros mejorados */}
          <div className="glass-effect p-4 rounded-lg mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <Label htmlFor="fecha-inicio">Desde:</Label>
                <Input
                  id="fecha-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="fecha-fin">Hasta:</Label>
                <Input
                  id="fecha-fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <Label>Estado:</Label>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="registrado">Registrado</SelectItem>
                    <SelectItem value="anulado">Anulado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Resumen mejorado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-l-4 border-l-success">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-success">
                  Bs. {totalDebe.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Debe</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-destructive">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-destructive">
                  Bs. {totalHaber.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Haber</div>
              </CardContent>
            </Card>
            <Card className={`border-l-4 ${Math.abs(totalDebe - totalHaber) < 0.01 ? 'border-l-success bg-success/5' : 'border-l-destructive bg-destructive/5'}`}>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${Math.abs(totalDebe - totalHaber) < 0.01 ? 'text-success' : 'text-destructive'}`}>
                  Bs. {Math.abs(totalDebe - totalHaber).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {Math.abs(totalDebe - totalHaber) < 0.01 ? 'Balanceado ✓' : 'Diferencia ⚠️'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>N° Asiento</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Debe (Bs.)</TableHead>
                <TableHead className="text-right">Haber (Bs.)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asientosFiltrados.map((asiento) => (
                <TableRow key={asiento.id}>
                  <TableCell>{new Date(asiento.fecha).toLocaleDateString('es-BO')}</TableCell>
                  <TableCell className="font-mono">{asiento.numero}</TableCell>
                  <TableCell>{asiento.concepto}</TableCell>
                  <TableCell>{asiento.referencia}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {asiento.debe.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    {asiento.haber.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getEstadoColor(asiento.estado)}>
                      {asiento.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verDetalle(asiento)}
                        className="mr-1"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editarAsiento(asiento)}
                        disabled={asiento.estado === 'anulado'}
                        className="mr-1"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      {asiento.estado === 'borrador' && (
                        <Button
                          size="sm"
                          onClick={() => cambiarEstadoAsiento(asiento.id, 'registrado')}
                        >
                          Registrar
                        </Button>
                      )}
                      
                      {asiento.estado === 'registrado' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cambiarEstadoAsiento(asiento.id, 'anulado')}
                        >
                          Anular
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => eliminarAsiento(asiento.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de detalle */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Asiento Contable</DialogTitle>
            <DialogDescription>
              Información completa del asiento y sus cuentas afectadas
            </DialogDescription>
          </DialogHeader>
          
          {asientoDetalle && (
            <div className="space-y-6">
              {/* Información general */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Número</Label>
                  <p className="font-mono text-lg">{asientoDetalle.numero}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fecha</Label>
                  <p>{new Date(asientoDetalle.fecha).toLocaleDateString('es-BO')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                  <Badge className={getEstadoColor(asientoDetalle.estado)}>
                    {asientoDetalle.estado}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Concepto</Label>
                <p className="mt-1">{asientoDetalle.concepto}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Referencia</Label>
                <p className="mt-1">{asientoDetalle.referencia}</p>
              </div>

              {/* Detalle de cuentas */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-3 block">Cuentas Afectadas</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre de la Cuenta</TableHead>
                      <TableHead className="text-right">Debe (Bs.)</TableHead>
                      <TableHead className="text-right">Haber (Bs.)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asientoDetalle.cuentas.map((cuenta, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{cuenta.codigo}</TableCell>
                        <TableCell>{cuenta.nombre}</TableCell>
                        <TableCell className="text-right font-semibold text-success">
                          {cuenta.debe > 0 ? cuenta.debe.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-destructive">
                          {cuenta.haber > 0 ? cuenta.haber.toFixed(2) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2} className="text-right">TOTALES:</TableCell>
                      <TableCell className="text-right text-success">
                        {asientoDetalle.debe.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {asientoDetalle.haber.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Validación */}
              <div className={`p-4 rounded-lg ${Math.abs(asientoDetalle.debe - asientoDetalle.haber) < 0.01 ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                <div className="flex items-center gap-2">
                  {Math.abs(asientoDetalle.debe - asientoDetalle.haber) < 0.01 ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  <span className={`font-medium ${Math.abs(asientoDetalle.debe - asientoDetalle.haber) < 0.01 ? 'text-success' : 'text-destructive'}`}>
                    {Math.abs(asientoDetalle.debe - asientoDetalle.haber) < 0.01 
                      ? 'Asiento balanceado correctamente' 
                      : `Asiento desbalanceado - Diferencia: ${Math.abs(asientoDetalle.debe - asientoDetalle.haber).toFixed(2)} Bs.`
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de edición */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Asiento Contable</DialogTitle>
            <DialogDescription>
              Modifique los datos del asiento contable
            </DialogDescription>
          </DialogHeader>
          
          {asientoEditando && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={asientoEditando.fecha}
                    onChange={(e) => setAsientoEditando({
                      ...asientoEditando,
                      fecha: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input
                    value={asientoEditando.numero}
                    onChange={(e) => setAsientoEditando({
                      ...asientoEditando,
                      numero: e.target.value
                    })}
                  />
                </div>
              </div>
              
              <div>
                <Label>Concepto</Label>
                <Input
                  value={asientoEditando.concepto}
                  onChange={(e) => setAsientoEditando({
                    ...asientoEditando,
                    concepto: e.target.value
                  })}
                />
              </div>
              
              <div>
                <Label>Referencia</Label>
                <Input
                  value={asientoEditando.referencia}
                  onChange={(e) => setAsientoEditando({
                    ...asientoEditando,
                    referencia: e.target.value
                  })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Debe (Bs.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={asientoEditando.debe}
                    onChange={(e) => setAsientoEditando({
                      ...asientoEditando,
                      debe: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                <div>
                  <Label>Haber (Bs.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={asientoEditando.haber}
                    onChange={(e) => setAsientoEditando({
                      ...asientoEditando,
                      haber: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={guardarEdicion}>
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LibroDiario;
