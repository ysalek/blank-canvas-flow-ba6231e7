import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Edit, Eye, Trash2 } from 'lucide-react';
import { Presupuesto } from '../types';
import { getEstadoColor } from '../utils/presupuestoUtils';
import { useToast } from '@/hooks/use-toast';

interface PresupuestosListProps {
  presupuestos: Presupuesto[];
  onActualizarPresupuesto: (id: string, data: Partial<Presupuesto>) => Promise<unknown>;
  onEliminarPresupuesto: (id: string) => Promise<unknown>;
}

export const PresupuestosList: React.FC<PresupuestosListProps> = ({
  presupuestos,
  onActualizarPresupuesto,
  onEliminarPresupuesto
}) => {
  const { toast } = useToast();

  const handleEliminar = async (presupuesto: Presupuesto) => {
    if (!confirm(`Esta seguro de eliminar el presupuesto "${presupuesto.nombre}"?`)) {
      return;
    }

    try {
      await onEliminarPresupuesto(presupuesto.id);
      toast({
        title: "Presupuesto eliminado",
        description: `El presupuesto "${presupuesto.nombre}" ha sido eliminado`,
      });
    } catch (error) {
      console.error('Error eliminando presupuesto:', error);
      toast({
        title: "No se pudo eliminar el presupuesto",
        description: "Intente nuevamente en unos segundos.",
        variant: "destructive"
      });
    }
  };

  const handleCambiarEstado = async (presupuesto: Presupuesto) => {
    const nuevosEstados = {
      borrador: 'aprobado',
      aprobado: 'en_ejecucion',
      en_ejecucion: 'cerrado',
      cerrado: 'borrador'
    } as const;

    const nuevoEstado = nuevosEstados[presupuesto.estado];

    try {
      await onActualizarPresupuesto(presupuesto.id, { estado: nuevoEstado });
      toast({
        title: "Estado actualizado",
        description: `El presupuesto cambio a estado: ${nuevoEstado.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error actualizando presupuesto:', error);
      toast({
        title: "No se pudo actualizar el estado",
        description: "Verifique la conexion e intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presupuestos Registrados</CardTitle>
        <CardDescription>
          Lista de todos los presupuestos empresariales
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead className="text-right">Presupuestado</TableHead>
              <TableHead className="text-right">Ejecutado</TableHead>
              <TableHead>% Ejecucion</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presupuestos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No hay presupuestos registrados
                </TableCell>
              </TableRow>
            ) : (
              presupuestos.map((presupuesto) => (
                <TableRow key={presupuesto.id}>
                  <TableCell className="font-medium">
                    {presupuesto.nombre}
                  </TableCell>
                  <TableCell>{presupuesto.periodo}</TableCell>
                  <TableCell>{presupuesto.responsable}</TableCell>
                  <TableCell className="text-right">
                    Bs. {presupuesto.totalPresupuestado.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    Bs. {presupuesto.totalEjecutado.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        {presupuesto.totalPresupuestado > 0
                          ? ((presupuesto.totalEjecutado / presupuesto.totalPresupuestado) * 100).toFixed(1)
                          : 0}%
                      </div>
                      <Progress
                        value={presupuesto.totalPresupuestado > 0
                          ? (presupuesto.totalEjecutado / presupuesto.totalPresupuestado) * 100
                          : 0}
                        className="h-2"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getEstadoColor(presupuesto.estado)}
                      onClick={() => void handleCambiarEstado(presupuesto)}
                      style={{ cursor: 'pointer' }}
                    >
                      {presupuesto.estado.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleEliminar(presupuesto)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
