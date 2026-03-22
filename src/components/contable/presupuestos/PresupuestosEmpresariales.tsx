import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PresupuestoDialog } from './components/PresupuestoDialog';
import { PresupuestoMetrics } from './components/PresupuestoMetrics';
import { PresupuestosList } from './components/PresupuestosList';
import { EjecucionPresupuestal } from './components/EjecucionPresupuestal';
import { AnalisisVariaciones } from './components/AnalisisVariaciones';
import { ReportesPresupuesto } from './components/ReportesPresupuesto';
import { usePresupuestos } from './hooks/usePresupuestos';
import { useContabilidadIntegration } from '@/hooks/useContabilidadIntegration';
import { useToast } from '@/hooks/use-toast';
import { Target, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';

const PresupuestosEmpresariales = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { 
    presupuestos, 
    itemsPresupuesto, 
    crearPresupuesto,
    actualizarPresupuesto,
    eliminarPresupuesto,
    obtenerMetricas 
  } = usePresupuestos();

  const metricas = obtenerMetricas();

  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();

  // Integración automática con contabilidad
  useEffect(() => {
    verificarEjecucionPresupuestal();
  }, [itemsPresupuesto]);

  const verificarEjecucionPresupuestal = () => {
    const presupuestosExcedidos = itemsPresupuesto.filter(item => 
      item.ejecutado > item.presupuestado * 1.1 // 10% de tolerancia
    );

    if (presupuestosExcedidos.length > 0) {
      toast({
        title: "Alerta presupuestal",
        description: `${presupuestosExcedidos.length} conceptos exceden el presupuesto`,
        variant: "destructive"
      });
    }
  };

  const integrarConContabilidad = async (presupuestoId: string) => {
    const presupuesto = presupuestos.find(p => p.id === presupuestoId);
    if (!presupuesto) return;

    // Generar asiento de compromiso presupuestal
    const asiento = {
      id: Date.now().toString(),
      numero: `PRES-${presupuesto.periodo}`,
      fecha: new Date().toISOString().slice(0, 10),
      concepto: `Compromiso presupuestal ${presupuesto.nombre}`,
      referencia: `Presupuesto-${presupuesto.id}`,
      debe: presupuesto.totalPresupuestado,
      haber: presupuesto.totalPresupuestado,
      estado: 'registrado' as const,
      cuentas: [
        {
          codigo: "9111",
          nombre: "Presupuesto Autorizado",
          debe: presupuesto.totalPresupuestado,
          haber: 0
        },
        {
          codigo: "9211",
          nombre: "Disponibilidad Presupuestal",
          debe: 0,
          haber: presupuesto.totalPresupuestado
        }
      ]
    };

    const asientoGuardado = await guardarAsiento(asiento);
    if (!asientoGuardado) {
      return;
    }
    
    toast({
      title: "Integración contable completada",
      description: `Presupuesto ${presupuesto.nombre} integrado con la contabilidad`,
    });
  };

  const handleCrearPresupuesto = async (data: any) => {
    const nuevoPresupuesto = crearPresupuesto(data);
    
    // Auto-integrar con contabilidad si está aprobado
    if (data.estado === 'aprobado') {
      await integrarConContabilidad(nuevoPresupuesto.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Presupuestos Empresariales</h2>
            <p className="text-muted-foreground">
              Gestión integrada con contabilidad y control automático de ejecución
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => integrarConContabilidad(presupuestos[0]?.id)}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Integrar con Contabilidad
          </Button>
          <PresupuestoDialog 
            open={showDialog} 
            onOpenChange={setShowDialog}
            onCrearPresupuesto={handleCrearPresupuesto}
          />
        </div>
      </div>

      <PresupuestoMetrics metricas={metricas} />

      <Tabs defaultValue="lista-presupuestos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista-presupuestos">Lista de Presupuestos</TabsTrigger>
          <TabsTrigger value="ejecucion-presupuestal">Ejecución Presupuestal</TabsTrigger>
          <TabsTrigger value="variaciones">Análisis de Variaciones</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="lista-presupuestos">
          <PresupuestosList 
            presupuestos={presupuestos}
            onActualizarPresupuesto={actualizarPresupuesto}
            onEliminarPresupuesto={eliminarPresupuesto}
          />
        </TabsContent>

        <TabsContent value="ejecucion-presupuestal">
          <EjecucionPresupuestal itemsPresupuesto={itemsPresupuesto} />
        </TabsContent>

        <TabsContent value="variaciones">
          <AnalisisVariaciones itemsPresupuesto={itemsPresupuesto} />
        </TabsContent>

        <TabsContent value="reportes">
          <ReportesPresupuesto />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PresupuestosEmpresariales;
