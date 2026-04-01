import React, { useMemo, useState } from 'react';
import * as XLSX from '@e965/xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, LineChart, Presentation, Settings2, ShieldAlert } from 'lucide-react';
import { Presupuesto, PresupuestoItem } from '../types';

type ReporteTipo =
  | 'ejecucion'
  | 'variaciones'
  | 'proyeccion'
  | 'comparativo'
  | 'dashboard';

interface ReportesPresupuestoProps {
  presupuestos: Presupuesto[];
  itemsPresupuesto: PresupuestoItem[];
}

interface ReporteConfig {
  id: ReporteTipo;
  titulo: string;
  descripcion: string;
  icono: typeof FileSpreadsheet;
}

const REPORTES: ReporteConfig[] = [
  {
    id: 'ejecucion',
    titulo: 'Ejecucion Presupuestal',
    descripcion: 'Detalle por concepto con presupuestado, ejecutado, variacion y porcentaje de ejecucion.',
    icono: FileSpreadsheet,
  },
  {
    id: 'variaciones',
    titulo: 'Analisis de Variaciones',
    descripcion: 'Clasifica desviaciones favorables y desfavorables para seguimiento gerencial.',
    icono: ShieldAlert,
  },
  {
    id: 'proyeccion',
    titulo: 'Proyeccion de Gastos',
    descripcion: 'Estima el cierre del periodo proyectando la ejecucion actual sobre el presupuesto cargado.',
    icono: LineChart,
  },
  {
    id: 'comparativo',
    titulo: 'Comparativo de Periodos',
    descripcion: 'Resume presupuestos registrados por periodo, responsable y estado operativo.',
    icono: Presentation,
  },
  {
    id: 'dashboard',
    titulo: 'Dashboard Ejecutivo',
    descripcion: 'Entrega un resumen compacto con KPIs para gerencia y control financiero.',
    icono: Settings2,
  },
];

const formatCurrency = (value: number) => `Bs ${value.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ReportesPresupuesto: React.FC<ReportesPresupuestoProps> = ({ presupuestos, itemsPresupuesto }) => {
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteTipo>('ejecucion');
  const [exportando, setExportando] = useState<ReporteTipo | null>(null);

  const resumen = useMemo(() => {
    const totalPresupuestado = presupuestos.reduce((sum, item) => sum + Number(item.totalPresupuestado || 0), 0);
    const totalEjecutado = presupuestos.reduce((sum, item) => sum + Number(item.totalEjecutado || 0), 0);
    const variacionTotal = totalEjecutado - totalPresupuestado;
    const itemsCriticos = itemsPresupuesto.filter((item) => item.porcentajeEjecucion > 100).length;
    const margenCobertura = totalPresupuestado > 0 ? ((totalPresupuestado - totalEjecutado) / totalPresupuestado) * 100 : 0;

    return {
      totalPresupuestado,
      totalEjecutado,
      variacionTotal,
      itemsCriticos,
      margenCobertura,
    };
  }, [itemsPresupuesto, presupuestos]);

  const detalleReporte = useMemo(() => {
    switch (reporteSeleccionado) {
      case 'ejecucion':
        return itemsPresupuesto.map((item) => ({
          Concepto: item.concepto,
          Categoria: item.categoria,
          Presupuestado: Number(item.presupuestado || 0),
          Ejecutado: Number(item.ejecutado || 0),
          Variacion: Number(item.variacion || 0),
          PorcentajeEjecucion: Number(item.porcentajeEjecucion || 0),
        }));
      case 'variaciones':
        return itemsPresupuesto
          .filter((item) => Number(item.variacion || 0) !== 0)
          .sort((a, b) => Math.abs(Number(b.variacion || 0)) - Math.abs(Number(a.variacion || 0)))
          .map((item) => ({
            Concepto: item.concepto,
            Categoria: item.categoria,
            Tipo: item.variacion > 0 ? 'Desfavorable' : 'Favorable',
            Variacion: Number(item.variacion || 0),
            PorcentajeEjecucion: Number(item.porcentajeEjecucion || 0),
          }));
      case 'proyeccion':
        return itemsPresupuesto.map((item) => {
          const ejecutado = Number(item.ejecutado || 0);
          const presupuestado = Number(item.presupuestado || 0);
          const proyeccion = ejecutado > 0 ? ejecutado * 1.1 : presupuestado;
          return {
            Concepto: item.concepto,
            Categoria: item.categoria,
            Presupuestado: presupuestado,
            EjecutadoActual: ejecutado,
            ProyeccionCierre: Number(proyeccion.toFixed(2)),
            Riesgo: proyeccion > presupuestado ? 'Alto' : 'Controlado',
          };
        });
      case 'comparativo':
        return presupuestos.map((item) => ({
          Periodo: item.periodo,
          Presupuesto: item.nombre,
          Responsable: item.responsable || 'Sin asignar',
          Estado: item.estado,
          TotalPresupuestado: Number(item.totalPresupuestado || 0),
          TotalEjecutado: Number(item.totalEjecutado || 0),
          Variacion: Number((item.totalEjecutado || 0) - (item.totalPresupuestado || 0)),
        }));
      case 'dashboard':
      default:
        return [
          {
            Indicador: 'Total presupuestado',
            Valor: Number(resumen.totalPresupuestado.toFixed(2)),
          },
          {
            Indicador: 'Total ejecutado',
            Valor: Number(resumen.totalEjecutado.toFixed(2)),
          },
          {
            Indicador: 'Variacion total',
            Valor: Number(resumen.variacionTotal.toFixed(2)),
          },
          {
            Indicador: 'Items criticos',
            Valor: resumen.itemsCriticos,
          },
          {
            Indicador: 'Margen de cobertura (%)',
            Valor: Number(resumen.margenCobertura.toFixed(2)),
          },
        ];
    }
  }, [itemsPresupuesto, presupuestos, reporteSeleccionado, resumen]);

  const reporteActivo = REPORTES.find((item) => item.id === reporteSeleccionado) ?? REPORTES[0];

  const exportarReporte = async (tipo: ReporteTipo) => {
    try {
      setExportando(tipo);
      const detalle = tipo === reporteSeleccionado
        ? detalleReporte
        : (() => {
            switch (tipo) {
              case 'ejecucion':
                return itemsPresupuesto.map((item) => ({
                  Concepto: item.concepto,
                  Categoria: item.categoria,
                  Presupuestado: Number(item.presupuestado || 0),
                  Ejecutado: Number(item.ejecutado || 0),
                  Variacion: Number(item.variacion || 0),
                  PorcentajeEjecucion: Number(item.porcentajeEjecucion || 0),
                }));
              case 'variaciones':
                return itemsPresupuesto
                  .filter((item) => Number(item.variacion || 0) !== 0)
                  .map((item) => ({
                    Concepto: item.concepto,
                    Categoria: item.categoria,
                    Tipo: item.variacion > 0 ? 'Desfavorable' : 'Favorable',
                    Variacion: Number(item.variacion || 0),
                    PorcentajeEjecucion: Number(item.porcentajeEjecucion || 0),
                  }));
              case 'proyeccion':
                return itemsPresupuesto.map((item) => {
                  const ejecutado = Number(item.ejecutado || 0);
                  const presupuestado = Number(item.presupuestado || 0);
                  const proyeccion = ejecutado > 0 ? ejecutado * 1.1 : presupuestado;
                  return {
                    Concepto: item.concepto,
                    Categoria: item.categoria,
                    Presupuestado: presupuestado,
                    EjecutadoActual: ejecutado,
                    ProyeccionCierre: Number(proyeccion.toFixed(2)),
                    Riesgo: proyeccion > presupuestado ? 'Alto' : 'Controlado',
                  };
                });
              case 'comparativo':
                return presupuestos.map((item) => ({
                  Periodo: item.periodo,
                  Presupuesto: item.nombre,
                  Responsable: item.responsable || 'Sin asignar',
                  Estado: item.estado,
                  TotalPresupuestado: Number(item.totalPresupuestado || 0),
                  TotalEjecutado: Number(item.totalEjecutado || 0),
                  Variacion: Number((item.totalEjecutado || 0) - (item.totalPresupuestado || 0)),
                }));
              case 'dashboard':
              default:
                return [
                  { Indicador: 'Total presupuestado', Valor: Number(resumen.totalPresupuestado.toFixed(2)) },
                  { Indicador: 'Total ejecutado', Valor: Number(resumen.totalEjecutado.toFixed(2)) },
                  { Indicador: 'Variacion total', Valor: Number(resumen.variacionTotal.toFixed(2)) },
                  { Indicador: 'Items criticos', Valor: resumen.itemsCriticos },
                  { Indicador: 'Margen de cobertura (%)', Valor: Number(resumen.margenCobertura.toFixed(2)) },
                ];
            }
          })();

      const resumenSheet = XLSX.utils.json_to_sheet([
        {
          Reporte: REPORTES.find((item) => item.id === tipo)?.titulo || tipo,
          Presupuestos: presupuestos.length,
          Items: itemsPresupuesto.length,
          TotalPresupuestado: Number(resumen.totalPresupuestado.toFixed(2)),
          TotalEjecutado: Number(resumen.totalEjecutado.toFixed(2)),
          VariacionTotal: Number(resumen.variacionTotal.toFixed(2)),
          ItemsCriticos: resumen.itemsCriticos,
        },
      ]);
      const detalleSheet = XLSX.utils.json_to_sheet(detalle.length > 0 ? detalle : [{ Mensaje: 'Sin datos para exportar' }]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');
      XLSX.utils.book_append_sheet(workbook, detalleSheet, 'Detalle');
      XLSX.writeFile(workbook, `reporte_presupuestos_${tipo}.xlsx`);
    } finally {
      setExportando(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Presupuestado</div>
            <div className="mt-2 text-2xl font-semibold">{formatCurrency(resumen.totalPresupuestado)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Ejecutado</div>
            <div className="mt-2 text-2xl font-semibold">{formatCurrency(resumen.totalEjecutado)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Variacion total</div>
            <div className={`mt-2 text-2xl font-semibold ${resumen.variacionTotal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(resumen.variacionTotal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Items criticos</div>
            <div className="mt-2 text-2xl font-semibold">{resumen.itemsCriticos}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Reportes disponibles</CardTitle>
            <CardDescription>
              Selecciona un reporte para revisar su alcance y exportarlo con datos reales de la base principal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {REPORTES.map((reporte) => {
              const Icono = reporte.icono;
              const activo = reporteSeleccionado === reporte.id;
              const procesando = exportando === reporte.id;

              return (
                <div
                  key={reporte.id}
                  className={`rounded-xl border p-4 transition-colors ${activo ? 'border-primary bg-primary/5' : 'border-border/70 bg-card/40'}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Icono className="h-4 w-4 text-primary" />
                        <span className="font-medium">{reporte.titulo}</span>
                        {activo && <Badge variant="secondary">Activo</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{reporte.descripcion}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={activo ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setReporteSeleccionado(reporte.id)}
                        disabled={exportando !== null}
                      >
                        Ver resumen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void exportarReporte(reporte.id)}
                        disabled={exportando !== null}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {procesando ? 'Exportando...' : 'Exportar'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{reporteActivo.titulo}</CardTitle>
            <CardDescription>{reporteActivo.descripcion}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="text-sm text-muted-foreground">Cobertura actual</div>
              <div className="mt-2 text-2xl font-semibold">{resumen.margenCobertura.toFixed(2)}%</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Mide el margen libre entre lo presupuestado y lo ejecutado sobre el total cargado.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <span className="text-sm text-muted-foreground">Presupuestos cargados</span>
                <span className="font-medium">{presupuestos.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <span className="text-sm text-muted-foreground">Conceptos controlados</span>
                <span className="font-medium">{itemsPresupuesto.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <span className="text-sm text-muted-foreground">Desviaciones desfavorables</span>
                <span className="font-medium">{itemsPresupuesto.filter((item) => item.variacion > 0).length}</span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => void exportarReporte(reporteSeleccionado)}
              disabled={exportando !== null}
            >
              <Download className="mr-2 h-4 w-4" />
              {exportando === reporteSeleccionado ? 'Preparando archivo...' : `Exportar ${reporteActivo.titulo}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
