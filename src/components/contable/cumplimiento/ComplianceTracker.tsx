import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Plus, 
  FileText, 
  Calendar,
  RefreshCw
} from "lucide-react";
import { CumplimientoRecord, useCumplimientoNormativo } from "@/hooks/useCumplimientoNormativo";
import { EnhancedHeader, MetricGrid, EnhancedMetricCard, Section } from "../dashboard/EnhancedLayout";

type ComplianceStatus = CumplimientoRecord["estado"];

const ComplianceTracker = () => {
  const {
    records,
    loading,
    metrics,
    marcarComoCumplido,
    updateCumplimientoRecord,
    generateComplianceFromNormativas,
    getOverdueRecords
  } = useCumplimientoNormativo();

  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [newStatus, setNewStatus] = useState<ComplianceStatus | ''>('');
  const [syncingRecords, setSyncingRecords] = useState(false);
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);

  const overdueRecords = getOverdueRecords();
  const bloqueado = loading || syncingRecords || updatingRecordId !== null;

  const resetForm = () => {
    setSelectedRecord(null);
    setObservaciones('');
    setNewStatus('');
  };

  const handleUpdateStatus = async (recordId: string) => {
    if (!newStatus) return;

    try {
      setUpdatingRecordId(recordId);
      await updateCumplimientoRecord(recordId, {
        estado: newStatus,
        observaciones: observaciones || undefined,
        fecha_implementacion: newStatus === 'cumplido' ? new Date().toISOString().split('T')[0] : undefined
      });

      resetForm();
    } catch (error) {
      // Error already handled in hook
    } finally {
      setUpdatingRecordId(null);
    }
  };

  const handleSyncRecords = async () => {
    setSyncingRecords(true);
    try {
      await generateComplianceFromNormativas();
    } finally {
      setSyncingRecords(false);
    }
  };

  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'cumplido': return 'default';
      case 'pendiente': return 'secondary';
      case 'incumplido': return 'destructive';
      case 'implementado': return 'outline';
      default: return 'secondary';
    }
  };

  const getBadgeColor = (estado: string) => {
    switch (estado) {
      case 'cumplido': return 'text-green-700 bg-green-50 border-green-200';
      case 'pendiente': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'incumplido': return 'text-red-700 bg-red-50 border-red-200';
      case 'implementado': return 'text-blue-700 bg-blue-50 border-blue-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
        <h3 className="text-lg font-semibold mb-2">Cargando seguimiento</h3>
        <p className="text-muted-foreground">Obteniendo registros de cumplimiento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Header */}
      <EnhancedHeader
        title="Seguimiento de Cumplimiento Normativo"
        subtitle="Control integral del estado de implementación de normativas tributarias y contables"
        badge={{
          text: `${metrics.porcentajeCumplimiento}% Cumplimiento`,
          variant: metrics.porcentajeCumplimiento >= 80 ? "default" : "destructive"
        }}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => void handleSyncRecords()}
              disabled={bloqueado}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {syncingRecords ? "Sincronizando..." : "Sincronizar Normativas"}
            </Button>
          </div>
        }
      />

      {/* Alertas de registros vencidos */}
      {overdueRecords.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Atención:</strong> Tienes {overdueRecords.length} normativa(s) vencida(s) sin cumplir. 
            Revisa y actualiza su estado para evitar sanciones.
          </AlertDescription>
        </Alert>
      )}

      {/* Métricas de Cumplimiento */}
      <Section 
        title="Métricas de Cumplimiento" 
        subtitle="Resumen del estado actual del cumplimiento normativo"
      >
        <MetricGrid columns={4}>
          <EnhancedMetricCard
            title="Total Registros"
            value={metrics.total}
            subtitle="Normativas a cumplir"
            icon={FileText}
            variant="default"
          />
          <EnhancedMetricCard
            title="Cumplidos"
            value={metrics.cumplidos}
            subtitle="Implementados correctamente"
            icon={CheckCircle}
            variant="success"
            trend="up"
            trendValue={metrics.total > 0 ? `${Math.round((metrics.cumplidos / metrics.total) * 100)}%` : "0%"}
          />
          <EnhancedMetricCard
            title="Pendientes"
            value={metrics.pendientes}
            subtitle="Por implementar"
            icon={Clock}
            variant="warning"
          />
          <EnhancedMetricCard
            title="Incumplidos"
            value={metrics.incumplidos}
            subtitle="Requieren atención"
            icon={AlertTriangle}
            variant="destructive"
          />
        </MetricGrid>
      </Section>

      {/* Tabla de Registros de Cumplimiento */}
      <Section title="Registros de Cumplimiento Normativo">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Normativa RND</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha Vigencia</TableHead>
                  <TableHead>Fecha Implementación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.norma_rnd}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {record.descripcion}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(record.fecha_vigencia)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.fecha_implementacion ? 
                        formatDate(record.fecha_implementacion) : 
                        <span className="text-muted-foreground">Sin implementar</span>
                      }
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getBadgeColor(record.estado)}
                      >
                        {record.estado.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs text-sm text-muted-foreground">
                        {record.observaciones || 'Sin observaciones'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog
                        open={selectedRecord === record.id}
                        onOpenChange={(open) => {
                          if (!open && updatingRecordId === record.id) {
                            return;
                          }

                          if (open) {
                            setSelectedRecord(record.id);
                            setObservaciones(record.observaciones || '');
                            setNewStatus(record.estado);
                            return;
                          }

                          resetForm();
                        }}
                      >
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedRecord(record.id);
                            setObservaciones(record.observaciones || '');
                            setNewStatus(record.estado);
                          }}
                          disabled={bloqueado}
                        >
                          {updatingRecordId === record.id ? "Actualizando..." : "Actualizar"}
                        </Button>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Actualizar Estado de Cumplimiento</DialogTitle>
                            <DialogDescription>
                              {record.norma_rnd}: {record.descripcion}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="estado">Nuevo Estado</Label>
                              <Select
                                value={newStatus}
                                onValueChange={(value) => setNewStatus(value as ComplianceStatus)}
                                disabled={updatingRecordId === record.id}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendiente">Pendiente</SelectItem>
                                  <SelectItem value="implementado">Implementado</SelectItem>
                                  <SelectItem value="cumplido">Cumplido</SelectItem>
                                  <SelectItem value="incumplido">Incumplido</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="observaciones">Observaciones</Label>
                              <Textarea
                                id="observaciones"
                                placeholder="Detalles del cumplimiento o motivo del incumplimiento..."
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                rows={3}
                                disabled={updatingRecordId === record.id}
                              />
                            </div>
                            
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                onClick={resetForm}
                                disabled={updatingRecordId === record.id}
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={() => void handleUpdateStatus(record.id)}
                                disabled={!newStatus || updatingRecordId === record.id}
                              >
                                {updatingRecordId === record.id ? "Guardando..." : "Actualizar"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {records.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Sin registros</h3>
                <p className="text-sm mb-4">
                  No hay registros de cumplimiento. Sincroniza las normativas para generar registros automáticamente.
                </p>
                <Button onClick={() => void handleSyncRecords()} disabled={bloqueado}>
                  <Plus className="w-4 h-4 mr-2" />
                  {syncingRecords ? "Generando..." : "Generar Registros"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
};

export default ComplianceTracker;
