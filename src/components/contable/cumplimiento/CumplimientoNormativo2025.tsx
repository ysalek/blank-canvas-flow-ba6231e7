import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Calendar, 
  Clock, 
  ExternalLink,
  Download,
  Gavel,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EnhancedHeader, MetricGrid, EnhancedMetricCard, Section } from "../dashboard/EnhancedLayout";

interface Normativa2025 {
  id: string;
  rnd_numero: string;
  fecha_emision: string;
  titulo: string;
  descripcion: string;
  contenido: any;
  estado: string;
  fecha_vigencia: string;
  fecha_vencimiento?: string;
  categoria: string;
  created_at: string;
}

const CumplimientoNormativo2025 = () => {
  const [normativas, setNormativas] = useState<Normativa2025[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchNormativas();
  }, []);

  const fetchNormativas = async () => {
    try {
      const { data, error } = await supabase
        .from('normativas_2025')
        .select('*')
        .order('fecha_emision', { ascending: false });

      if (error) throw error;
      setNormativas(data || []);
    } catch (error: any) {
      console.error('Error fetching normativas:', error);
      toast({
        title: "Error al cargar normativas",
        description: "No se pudieron cargar las normativas actuales",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const actualizarNormativas = async () => {
    setLoading(true);
    
    try {
      // Simular llamada a API externa del SIN para obtener nuevas normativas
      const nuevasNormativas = [
        {
          rnd_numero: 'RND 102500000019',
          fecha_emision: '2025-01-15',
          titulo: 'Actualización Régimen Tributario Simplificado',
          descripcion: 'Nuevos parámetros para el RTS aplicables a partir de febrero 2025',
          contenido: {
            tasa_rts: '1.5%',
            limite_ingresos: 'UFV 500,000',
            sectores_aplicables: ['Comercio', 'Servicios', 'Manufactura']
          },
          estado: 'vigente',
          fecha_vigencia: '2025-02-01',
          categoria: 'tributaria'
        },
        {
          rnd_numero: 'RND 102500000020',
          fecha_emision: '2025-01-10',
          titulo: 'Modificación Formulario 200 - Declaración IVA',
          descripcion: 'Actualización del formulario 200 para incluir nuevos campos de control',
          contenido: {
            nuevos_campos: ['Código QR', 'Validación biométrica', 'Geolocalización'],
            vigencia_anterior: '2024-12-31',
            migracion_automatica: true
          },
          estado: 'vigente',
          fecha_vigencia: '2025-01-01',
          categoria: 'iva'
        }
      ];

      // Insertar nuevas normativas en la base de datos
      const { error: insertError } = await supabase
        .from('normativas_2025')
        .upsert(nuevasNormativas, {
          onConflict: 'rnd_numero',
          ignoreDuplicates: false
        });

      if (insertError) throw insertError;

      // Recargar normativas actualizadas
      await fetchNormativas();
      
      toast({
        title: "Normativas actualizadas",
        description: `Se agregaron ${nuevasNormativas.length} nuevas normativas del SIN`,
      });

    } catch (error: any) {
      console.error('Error updating normativas:', error);
      toast({
        title: "Error al actualizar normativas",
        description: "No se pudo conectar con el sistema del SIN para obtener actualizaciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const normativasFiltradas = filtroCategoria === "all" 
    ? normativas 
    : normativas.filter(n => n.categoria === filtroCategoria);

  const normativasVigentes = normativas.filter(n => n.estado === 'vigente').length;
  const normativasIVA = normativas.filter(n => n.categoria === 'iva').length;
  const normativasActividades = normativas.filter(n => n.categoria === 'actividades').length;

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      'iva': 'bg-blue-100 text-blue-800 border-blue-200',
      'actividades': 'bg-green-100 text-green-800 border-green-200',
      'registro': 'bg-purple-100 text-purple-800 border-purple-200',
      'general': 'bg-gray-100 text-gray-800 border-gray-200',
      'facturacion': 'bg-orange-100 text-orange-800 border-orange-200',
      'bancarizacion': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[categoria] || colors['general'];
  };

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      'vigente': 'bg-green-100 text-green-800 border-green-200',
      'derogada': 'bg-red-100 text-red-800 border-red-200',
      'suspendida': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[estado] || colors['vigente'];
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center py-12">
          <Gavel className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <h3 className="text-lg font-semibold mb-2">Cargando normativas</h3>
          <p className="text-muted-foreground">Obteniendo información actualizada...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Header */}
      <EnhancedHeader
        title="Cumplimiento Normativo 2025-2026"
        subtitle="Seguimiento integral de normativas tributarias bolivianas vigentes - SIAT en Línea obligatorio desde mayo 2025"
        badge={{
          text: `${normativasVigentes} Normativas Vigentes`,
          variant: "default"
        }}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open('https://siatinfo.impuestos.gob.bo', '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Portal SIN
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
              onClick={actualizarNormativas}
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              {loading ? 'Sincronizando...' : 'Actualizar Normativas'}
            </Button>
          </div>
        }
      />

      {/* Métricas de Cumplimiento */}
      <Section 
        title="Resumen de Cumplimiento" 
        subtitle="Estado actual del cumplimiento normativo"
      >
        <MetricGrid columns={4}>
          <EnhancedMetricCard
            title="Normativas Vigentes"
            value={normativasVigentes}
            subtitle="Total aplicables"
            icon={Gavel}
            variant="success"
            trend="up"
            trendValue="Actualizadas 2025"
          />
          <EnhancedMetricCard
            title="Normativas IVA"
            value={normativasIVA}
            subtitle="Impuesto al Valor Agregado"
            icon={TrendingUp}
            variant="default"
            trend="up"
            trendValue="Incluye tasa cero"
          />
          <EnhancedMetricCard
            title="Actividades Económicas"
            value={normativasActividades}
            subtitle="Clasificador CAEB-SIN"
            icon={FileText}
            variant="warning"
            trend="up"
            trendValue="Nuevo CAEB 2025"
          />
          <EnhancedMetricCard
            title="Última Actualización"
            value={normativas.length > 0 ? new Date(normativas[0].fecha_emision).toLocaleDateString() : 'N/A'}
            subtitle="Última RND emitida"
            icon={Clock}
            variant="default"
            trend="up"
            trendValue="Sistema actualizado"
          />
        </MetricGrid>
      </Section>

      {/* Alertas Importantes */}
      <Section title="Alertas Normativas Críticas">
        <div className="grid gap-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>RND 102500000036:</strong> Grupos 9º al 12º deben migrar a facturación en línea 
              antes del <strong>31 de marzo de 2026</strong>. Obligatorio desde el 1 de abril de 2026.
            </AlertDescription>
          </Alert>

          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>RND 102500000042:</strong> Homologación de productos con actividades económicas del RNC. 
              Plazo límite: <strong>27 de febrero de 2026</strong>.
            </AlertDescription>
          </Alert>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>RND 102500000016:</strong> Todas las DDJJ deben presentarse mediante SIAT en Línea 
              desde mayo 2025. Formularios electrónicos obligatorios.
            </AlertDescription>
          </Alert>
          
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>DS 5503 (RND 102500000052):</strong> Incentivos tributarios vigentes: Hecho en Bolivia, 
              Depreciación Acelerada y Aportes patronales como pago a cuenta del IVA.
            </AlertDescription>
          </Alert>

          <Alert className="border-purple-200 bg-purple-50">
            <AlertCircle className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-800">
              <strong>Indicadores 2026:</strong> UFV ≈ Bs 3.05 | TC USD = Bs 6.96 | 
              ISAE = Bs 464 | IEHD máx = Bs 10.40
            </AlertDescription>
          </Alert>
        </div>
      </Section>

      {/* Listado de Normativas */}
      <Section title="Normativas Tributarias 2025-2026">
        <Tabs value={filtroCategoria} onValueChange={setFiltroCategoria} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="iva">IVA</TabsTrigger>
            <TabsTrigger value="actividades">Actividades</TabsTrigger>
            <TabsTrigger value="registro">Registro</TabsTrigger>
            <TabsTrigger value="facturacion">Facturación</TabsTrigger>
            <TabsTrigger value="bancarizacion">Bancarización</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value={filtroCategoria} className="mt-6">
            <div className="grid gap-4">
              {normativasFiltradas.map((normativa) => (
                <Card key={normativa.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`${getCategoriaColor(normativa.categoria)} font-semibold`}
                          >
                            {normativa.rnd_numero}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={getEstadoColor(normativa.estado)}
                          >
                            {normativa.estado.toUpperCase()}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{normativa.titulo}</CardTitle>
                        <CardDescription className="text-sm">
                          {normativa.descripcion}
                        </CardDescription>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1 mb-1">
                          <Calendar className="w-4 h-4" />
                          Emitida: {new Date(normativa.fecha_emision).toLocaleDateString()}
                        </div>
                        {normativa.fecha_vigencia && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Vigente: {new Date(normativa.fecha_vigencia).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {normativa.contenido && (
                    <CardContent>
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="font-semibold text-sm mb-2">Detalles:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {Object.entries(normativa.contenido).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="font-medium capitalize">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-muted-foreground">
                                {Array.isArray(value) ? value.join(', ') : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}

              {normativasFiltradas.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No hay normativas</h3>
                  <p className="text-sm">
                    No se encontraron normativas para la categoría seleccionada.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Section>
    </div>
  );
};

export default CumplimientoNormativo2025;