import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Shield, 
  BookOpen,
  TrendingUp,
  Calendar,
  Download,
  ExternalLink
} from "lucide-react";
import { normativaService, NormativaVigente, RequisitosCumplimiento } from "@/services/normativaService";

const CumplimientoNormativoModule = () => {
  const [normativas, setNormativas] = useState<NormativaVigente[]>([]);
  const [requisitos, setRequisitos] = useState<RequisitosCumplimiento[]>([]);
  const [alertas, setAlertas] = useState<RequisitosCumplimiento[]>([]);
  const [resumen, setResumen] = useState({
    total: 0,
    cumplidos: 0,
    pendientes: 0,
    vencidos: 0,
    porcentajeCumplimiento: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = () => {
    setNormativas(normativaService.getNormativasVigentes());
    setRequisitos(normativaService.getRequisitosCumplimiento());
    setAlertas(normativaService.getAlertasVencimiento());
    setResumen(normativaService.getResumenCumplimiento());
  };

  const marcarComoCumplido = (codigo: string) => {
    normativaService.marcarComoCumplido(codigo);
    cargarDatos();
    toast({
      title: "Requisito marcado como cumplido",
      description: "El estado del requisito ha sido actualizado correctamente.",
    });
  };

  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'cumplido': return 'default';
      case 'pendiente': return 'secondary';
      case 'vencido': return 'destructive';
      default: return 'outline';
    }
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'contable': return 'text-blue-600';
      case 'tributaria': return 'text-red-600';
      case 'facturacion': return 'text-green-600';
      case 'laboral': return 'text-purple-600';
      case 'financiera': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDiasRestantes = (fechaLimite: string) => {
    return normativaService.getDiasHastaVencimiento(fechaLimite);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Cumplimiento Normativo</h1>
            <p className="text-muted-foreground">
              Gestión integral del cumplimiento de normativas bolivianas 2025-2026 (actualizado marzo 2026)
            </p>
          </div>
          <Button onClick={cargarDatos} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Alertas críticas */}
        {alertas.length > 0 && (
          <Alert className="border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alertas de Vencimiento</AlertTitle>
            <AlertDescription>
              Tienes {alertas.length} requisito(s) próximo(s) a vencer o vencido(s).
              Revisa la sección de requisitos para más detalles.
            </AlertDescription>
          </Alert>
        )}

        {/* Resumen general */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requisitos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumen.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cumplidos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{resumen.cumplidos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{resumen.pendientes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cumplimiento</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumen.porcentajeCumplimiento}%</div>
              <Progress value={resumen.porcentajeCumplimiento} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal */}
        <Tabs defaultValue="requisitos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="requisitos">
              <Shield className="h-4 w-4 mr-2" />
              Requisitos de Cumplimiento
            </TabsTrigger>
            <TabsTrigger value="normativas">
              <BookOpen className="h-4 w-4 mr-2" />
              Normativas Vigentes
            </TabsTrigger>
            <TabsTrigger value="calendario">
              <Calendar className="h-4 w-4 mr-2" />
              Calendario Fiscal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requisitos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Requisitos de Cumplimiento</CardTitle>
                <CardDescription>
                  Seguimiento de obligaciones tributarias y contables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Frecuencia</TableHead>
                      <TableHead>Fecha Límite</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisitos.map((requisito) => {
                      const diasRestantes = requisito.fechaLimite ? getDiasRestantes(requisito.fechaLimite) : null;
                      
                      return (
                        <TableRow key={requisito.codigo}>
                          <TableCell className="font-medium">{requisito.codigo}</TableCell>
                          <TableCell>{requisito.descripcion}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{requisito.frecuencia}</Badge>
                          </TableCell>
                          <TableCell>
                            {requisito.fechaLimite ? (
                              <div>
                                {formatearFecha(requisito.fechaLimite)}
                                {diasRestantes !== null && (
                                  <div className={`text-xs ${
                                    diasRestantes < 0 ? 'text-red-600' : 
                                    diasRestantes <= 15 ? 'text-yellow-600' : 'text-green-600'
                                  }`}>
                                    {diasRestantes < 0 ? 
                                      `Vencido hace ${Math.abs(diasRestantes)} días` :
                                      `${diasRestantes} días restantes`
                                    }
                                  </div>
                                )}
                              </div>
                            ) : (
                              'Sin fecha límite'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant(requisito.estado)}>
                              {requisito.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {requisito.estado !== 'cumplido' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => marcarComoCumplido(requisito.codigo)}
                              >
                                Marcar como cumplido
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="normativas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Normativas Vigentes 2024-2025</CardTitle>
                <CardDescription>
                  Normativas contables y tributarias actualizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Organismo</TableHead>
                      <TableHead>Vigencia</TableHead>
                      <TableHead>Actualización</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {normativas.map((normativa) => (
                      <TableRow key={normativa.codigo}>
                        <TableCell className="font-medium">{normativa.codigo}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{normativa.titulo}</div>
                            <div className="text-sm text-muted-foreground">
                              {normativa.descripcion}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getCategoriaColor(normativa.categoria)}
                          >
                            {normativa.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell>{normativa.organismo}</TableCell>
                        <TableCell>{formatearFecha(normativa.fechaVigencia)}</TableCell>
                        <TableCell>{formatearFecha(normativa.fechaActualizacion)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendario" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Calendario Fiscal 2025</CardTitle>
                <CardDescription>
                  Fechas importantes y vencimientos tributarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {requisitos
                    .filter(r => r.fechaLimite)
                    .sort((a, b) => new Date(a.fechaLimite!).getTime() - new Date(b.fechaLimite!).getTime())
                    .map((requisito) => {
                      const diasRestantes = getDiasRestantes(requisito.fechaLimite!);
                      
                      return (
                        <Card key={requisito.codigo} className={`
                          ${diasRestantes < 0 ? 'border-red-500' : 
                            diasRestantes <= 15 ? 'border-yellow-500' : 'border-green-500'}
                        `}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-sm">{requisito.codigo}</CardTitle>
                              <Badge variant={getBadgeVariant(requisito.estado)}>
                                {requisito.estado}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-2">
                              {requisito.descripcion}
                            </p>
                            <div className="text-sm font-medium">
                              {formatearFecha(requisito.fechaLimite!)}
                            </div>
                            <div className={`text-xs ${
                              diasRestantes < 0 ? 'text-red-600' : 
                              diasRestantes <= 15 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {diasRestantes < 0 ? 
                                `Vencido hace ${Math.abs(diasRestantes)} días` :
                                `${diasRestantes} días restantes`
                              }
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CumplimientoNormativoModule;