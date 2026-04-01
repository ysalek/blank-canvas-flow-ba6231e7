import React, { useEffect, useState } from 'react';
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
import { Target, TrendingUp } from 'lucide-react';
import { PresupuestoFormData } from './components/PresupuestoDialog';

const PresupuestosEmpresariales = () => {
  const [showDialog, setShowDialog] = useState(false);
  const {
    presupuestos,
    itemsPresupuesto,
    loading,
    crearPresupuesto,
    actualizarPresupuesto,
    eliminarPresupuesto,
    obtenerMetricas
  } = usePresupuestos();

  const metricas = obtenerMetricas();
  const presupuestoPrincipal = presupuestos[0];
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();

  useEffect(() => {
    const presupuestosExcedidos = itemsPresupuesto.filter((item) =>
      item.ejecutado > item.presupuestado * 1.1
    );

    if (presupuestosExcedidos.length > 0) {
      toast({
        title: "Alerta presupuestal",
        description: `${presupuestosExcedidos.length} conceptos exceden el presupuesto`,
        variant: "destructive"
      });
    }
  }, [itemsPresupuesto, toast]);

  const integrarConContabilidad = async (presupuestoId: string) => {
    const presupuesto = presupuestos.find((item) => item.id === presupuestoId);
    if (!presupuesto) return;

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
      toast({
        title: "No se pudo integrar el presupuesto",
        description: "El asiento contable no se guardo correctamente.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Integracion contable completada",
      description: `Presupuesto ${presupuesto.nombre} integrado con la contabilidad`,
    });
  };

  const handleCrearPresupuesto = async (data: PresupuestoFormData) => {
    const nuevoPresupuesto = await crearPresupuesto({
      ...data,
      totalEjecutado: 0,
    });

    if (data.estado === 'aprobado') {
      await integrarConContabilidad(nuevoPresupuesto.id);
    }
  };

  const handleIntegrarPrincipal = async () => {
    if (!presupuestoPrincipal) {
      toast({
        title: "No hay presupuestos para integrar",
        description: "Cree o cargue un presupuesto antes de enviarlo a contabilidad.",
        variant: "destructive"
      });
      return;
    }

    await integrarConContabilidad(presupuestoPrincipal.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Presupuestos Empresariales</h2>
            <p className="text-muted-foreground">
              Gestion integrada con contabilidad y control automatico de ejecucion
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void handleIntegrarPrincipal()}
            disabled={!presupuestoPrincipal || loading}
          >
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

      {loading && (
        <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-3 text-sm text-muted-foreground">
          Cargando presupuestos y ejecucion desde la base principal...
        </div>
      )}

      <Tabs defaultValue="lista-presupuestos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista-presupuestos">Lista de Presupuestos</TabsTrigger>
          <TabsTrigger value="ejecucion-presupuestal">Ejecucion Presupuestal</TabsTrigger>
          <TabsTrigger value="variaciones">Analisis de Variaciones</TabsTrigger>
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
          <ReportesPresupuesto
            presupuestos={presupuestos}
            itemsPresupuesto={itemsPresupuesto}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PresupuestosEmpresariales;
