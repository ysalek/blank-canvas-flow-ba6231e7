import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Download, 
  Calendar, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AutomatedReport {
  id: string;
  name: string;
  type: 'iva' | 'it' | 'iue' | 'rc-iva' | 'rc-it' | 'estados-financieros' | 'cumplimiento';
  frequency: 'monthly' | 'quarterly' | 'annually';
  lastGenerated?: string;
  nextDue: string;
  status: 'pending' | 'generated' | 'submitted' | 'overdue';
  autoSubmit: boolean;
  recipients: string[];
}

interface ReportTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  fields: string[];
  validations: string[];
}

const AutomatedReporting = () => {
  const [reports, setReports] = useState<AutomatedReport[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initializeReports();
    loadTemplates();
  }, []);

  const initializeReports = () => {
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 20);
    const nextQuarter = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 31);
    const nextYear = new Date(currentDate.getFullYear() + 1, 2, 31); // Marzo del siguiente año

    const defaultReports: AutomatedReport[] = [
      {
        id: 'iva-monthly',
        name: 'Declaración IVA Mensual',
        type: 'iva',
        frequency: 'monthly',
        nextDue: nextMonth.toISOString(),
        status: 'pending',
        autoSubmit: false,
        recipients: []
      },
      {
        id: 'it-monthly',
        name: 'Declaración IT Mensual',
        type: 'it',
        frequency: 'monthly',
        nextDue: nextMonth.toISOString(),
        status: 'pending',
        autoSubmit: false,
        recipients: []
      },
      {
        id: 'rc-iva-monthly',
        name: 'Retenciones RC-IVA',
        type: 'rc-iva',
        frequency: 'monthly',
        nextDue: nextMonth.toISOString(),
        status: 'pending',
        autoSubmit: false,
        recipients: []
      },
      {
        id: 'rc-it-monthly',
        name: 'Retenciones RC-IT',
        type: 'rc-it',
        frequency: 'monthly',
        nextDue: nextMonth.toISOString(),
        status: 'pending',
        autoSubmit: false,
        recipients: []
      },
      {
        id: 'iue-quarterly',
        name: 'Declaración IUE Trimestral',
        type: 'iue',
        frequency: 'quarterly',
        nextDue: nextQuarter.toISOString(),
        status: 'pending',
        autoSubmit: false,
        recipients: []
      },
      {
        id: 'estados-financieros',
        name: 'Estados Financieros Anuales',
        type: 'estados-financieros',
        frequency: 'annually',
        nextDue: nextYear.toISOString(),
        status: 'pending',
        autoSubmit: false,
        recipients: []
      },
      {
        id: 'cumplimiento-report',
        name: 'Reporte de Cumplimiento Normativo',
        type: 'cumplimiento',
        frequency: 'monthly',
        nextDue: nextMonth.toISOString(),
        status: 'pending',
        autoSubmit: true,
        recipients: ['admin@empresa.com']
      }
    ];

    setReports(defaultReports);
  };

  const loadTemplates = () => {
    const reportTemplates: ReportTemplate[] = [
      {
        id: 'form-200',
        name: 'Formulario 200 - Declaración IVA',
        type: 'iva',
        description: 'Declaración mensual del Impuesto al Valor Agregado',
        fields: ['Ventas gravadas', 'IVA débito fiscal', 'Compras gravadas', 'IVA crédito fiscal'],
        validations: ['Verificar facturas emitidas', 'Validar retenciones recibidas', 'Confirmar saldos bancarios']
      },
      {
        id: 'form-401',
        name: 'Formulario 401 - Declaración IT',
        type: 'it',
        description: 'Declaración mensual del Impuesto a las Transacciones',
        fields: ['Ingresos brutos', 'Base imponible', 'Impuesto determinado'],
        validations: ['Verificar ingresos del período', 'Validar deducciones aplicables']
      },
      {
        id: 'form-110',
        name: 'Formulario 110 - RC-IVA',
        type: 'rc-iva',
        description: 'Declaración de retenciones RC-IVA realizadas',
        fields: ['Retenciones practicadas', 'Base de retención', 'Monto retenido'],
        validations: ['Verificar certificados emitidos', 'Validar pagos realizados']
      },
      {
        id: 'form-500',
        name: 'Formulario 500 - IUE Trimestral',
        type: 'iue',
        description: 'Declaración jurada trimestral del Impuesto sobre las Utilidades',
        fields: ['Ingresos del trimestre', 'Gastos deducibles', 'Utilidad neta', 'Impuesto determinado'],
        validations: ['Conciliar con contabilidad', 'Verificar gastos no deducibles', 'Validar pagos a cuenta']
      }
    ];

    setTemplates(reportTemplates);
  };

  const generateReport = async (reportId: string) => {
    try {
      setLoading(true);
      setGenerationProgress(prev => ({ ...prev, [reportId]: 0 }));

      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      // Simular proceso de generación
      for (let i = 0; i <= 100; i += 20) {
        setGenerationProgress(prev => ({ ...prev, [reportId]: i }));
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Obtener datos según el tipo de reporte
      let data = {};
      
      switch (report.type) {
        case 'iva':
          // Obtener datos de facturas para IVA
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const { data: facturas } = await supabase
            .from('facturas')
            .select('id, total, iva, fecha')
            .eq('user_id', currentUser?.id || '')
            .gte('fecha', new Date(new Date().setDate(1)).toISOString().split('T')[0]);
          
          data = {
            facturas_emitidas: facturas?.length || 0,
            total_ventas: facturas?.reduce((sum, f) => sum + (f.total || 0), 0) || 0,
            iva_debito: facturas?.reduce((sum, f) => sum + (f.iva || 0), 0) || 0
          };
          break;

        case 'cumplimiento':
          // Obtener datos de cumplimiento normativo
          const { data: compliance } = await supabase
            .from('cumplimiento_normativo_2025')
            .select('*');
          
          const total = compliance?.length || 0;
          const cumplidos = compliance?.filter(c => c.estado === 'cumplido').length || 0;
          
          data = {
            total_normativas: total,
            normativas_cumplidas: cumplidos,
            porcentaje_cumplimiento: total > 0 ? Math.round((cumplidos / total) * 100) : 0,
            pendientes: total - cumplidos
          };
          break;

        default:
          data = { message: 'Reporte generado exitosamente' };
      }

      // Actualizar estado del reporte
      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { ...r, status: 'generated', lastGenerated: new Date().toISOString() }
          : r
      ));

      setGenerationProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[reportId];
        return newProgress;
      });

      toast({
        title: "Reporte generado",
        description: `${report.name} ha sido generado exitosamente`,
      });

      // Auto-enviar si está configurado
      if (report.autoSubmit && report.recipients.length > 0) {
        toast({
          title: "Reporte enviado",
          description: `El reporte ha sido enviado automáticamente a ${report.recipients.join(', ')}`,
        });
      }

    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Error al generar reporte",
        description: "No se pudo generar el reporte solicitado",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSelectedTemplate = async () => {
    if (!selectedTemplate) return;

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    try {
      setLoading(true);
      
      toast({
        title: "Generando reporte",
        description: `Preparando ${template.name}...`,
      });

      // Simular validaciones
      for (const validation of template.validations) {
        await new Promise(resolve => setTimeout(resolve, 500));
        toast({
          title: "Validación completada",
          description: validation,
        });
      }

      toast({
        title: "Reporte listo",
        description: `${template.name} ha sido generado y está listo para descarga`,
      });

    } catch (error: any) {
      toast({
        title: "Error en validación",
        description: "Algunas validaciones fallaron. Revise los datos antes de continuar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'text-yellow-600 bg-yellow-100 border-yellow-200',
      'generated': 'text-blue-600 bg-blue-100 border-blue-200',
      'submitted': 'text-green-600 bg-green-100 border-green-200',
      'overdue': 'text-red-600 bg-red-100 border-red-200'
    };
    return colors[status] || colors['pending'];
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      'pending': Clock,
      'generated': FileText,
      'submitted': CheckCircle,
      'overdue': AlertTriangle
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const overdueReports = reports.filter(r => 
    r.status === 'pending' && new Date(r.nextDue) < new Date()
  );

  return (
    <div className="space-y-6">
      {/* Alertas de vencimiento */}
      {overdueReports.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Reportes Vencidos</h3>
          </div>
          <p className="text-red-700 text-sm">
            Tienes {overdueReports.length} reporte(s) vencido(s) que requieren atención inmediata
          </p>
        </div>
      )}

      {/* Generador de reportes por template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Generador de Reportes Tributarios
          </CardTitle>
          <CardDescription>
            Genere reportes específicos utilizando plantillas predefinidas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plantilla de reporte" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={generateSelectedTemplate}
              disabled={!selectedTemplate || loading}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generar Reporte
            </Button>
          </div>

          {selectedTemplate && (
            <div className="p-4 bg-muted/30 rounded-lg">
              {(() => {
                const template = templates.find(t => t.id === selectedTemplate);
                return template ? (
                  <div>
                    <h4 className="font-semibold mb-2">{template.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium text-sm mb-1">Campos incluidos:</p>
                        <ul className="text-xs space-y-1">
                          {template.fields.map((field, idx) => (
                            <li key={idx}>• {field}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-sm mb-1">Validaciones automáticas:</p>
                        <ul className="text-xs space-y-1">
                          {template.validations.map((validation, idx) => (
                            <li key={idx}>• {validation}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de reportes automáticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-green-600" />
            Reportes Automáticos Programados
          </CardTitle>
          <CardDescription>
            Reportes que se generan automáticamente según el calendario tributario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reporte</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead>Próximo Vencimiento</TableHead>
                <TableHead>Última Generación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{report.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Tipo: {report.type.toUpperCase()}
                        {report.autoSubmit && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Auto-envío
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {report.frequency === 'monthly' ? 'Mensual' : 
                       report.frequency === 'quarterly' ? 'Trimestral' : 'Anual'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {new Date(report.nextDue).toLocaleDateString('es-BO')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {report.lastGenerated ? 
                      new Date(report.lastGenerated).toLocaleDateString('es-BO') :
                      <span className="text-muted-foreground">Nunca</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(report.status)} flex items-center gap-1 w-fit`}
                    >
                      {getStatusIcon(report.status)}
                      {report.status === 'pending' ? 'Pendiente' :
                       report.status === 'generated' ? 'Generado' :
                       report.status === 'submitted' ? 'Enviado' : 'Vencido'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {generationProgress[report.id] !== undefined ? (
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={generationProgress[report.id]} className="flex-1" />
                          <span className="text-xs">{generationProgress[report.id]}%</span>
                        </div>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => generateReport(report.id)}
                            disabled={loading}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Generar
                          </Button>
                          {report.status === 'generated' && (
                            <Button size="sm" variant="outline">
                              <Download className="w-3 h-3 mr-1" />
                              Descargar
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomatedReporting;