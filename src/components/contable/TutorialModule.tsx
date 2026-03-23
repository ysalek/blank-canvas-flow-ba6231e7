
import React, { useState } from 'react';
import { useAuth } from "@/components/auth/AuthProvider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { tutorialMasterIndex } from "@/components/contable/tutorial/tutorialIndex";
import { 
  Play, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  Video, 
  Users, 
  Settings, 
  Calculator, 
  FileText, 
  ShoppingCart, 
  Package, 
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Target,
  Zap,
  Star,
  Award
} from 'lucide-react';

const TutorialModule = () => {
  const { user } = useAuth();
  const role = user?.rol || 'usuario';
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [activeModule, setActiveModule] = useState<string>('inicio-rapido');

  const markStepCompleted = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const quickStartGuides = {
    admin: [
      {
        id: 'config-empresa',
        title: '1. Configurar Datos de la Empresa',
        description: 'Configura NIT, razón social y datos fiscales básicos',
        duration: '5 min',
        priority: 'high',
        steps: [
          'Ve a Configuración → Empresa',
          'Ingresa el NIT de tu empresa',
          'Completa razón social y dirección',
          'Configura la actividad económica principal',
          'Guarda los cambios'
        ]
      },
      {
        id: 'crear-usuarios',
        title: '2. Crear Usuarios del Sistema',
        description: 'Define roles y permisos para tu equipo',
        duration: '10 min',
        priority: 'high',
        steps: [
          'Ve a Configuración → Usuarios',
          'Clic en "Nuevo Usuario"',
          'Asigna rol (Admin, Contador, Ventas)',
          'Define permisos específicos',
          'Envía credenciales al usuario'
        ]
      },
      {
        id: 'plan-cuentas',
        title: '3. Revisar Plan de Cuentas',
        description: 'Adapta el plan contable a tu empresa',
        duration: '15 min',
        priority: 'medium',
        steps: [
          'Ve a Contabilidad → Plan de Cuentas',
          'Revisa cuentas preconfiguradas',
          'Agrega cuentas específicas si necesitas',
          'Configura códigos auxiliares',
          'Valida estructura contable'
        ]
      }
    ],
    contador: [
      {
        id: 'revisar-asientos',
        title: '1. Revisar Libro Diario',
        description: 'Verifica los asientos contables del día',
        duration: '10 min',
        priority: 'high',
        steps: [
          'Ve a Contabilidad → Libro Diario',
          'Filtra por fecha actual',
          'Revisa cada asiento contable',
          'Verifica partida doble',
          'Marca como revisado'
        ]
      },
      {
        id: 'balance-comprobacion',
        title: '2. Generar Balance de Comprobación',
        description: 'Verifica que saldos cuadren correctamente',
        duration: '5 min',
        priority: 'high',
        steps: [
          'Ve a Contabilidad → Balance de Comprobación',
          'Selecciona período',
          'Genera el balance',
          'Verifica que sumas cuadren',
          'Exporta si está correcto'
        ]
      }
    ],
    ventas: [
      {
        id: 'primera-factura',
        title: '1. Crear tu Primera Factura',
        description: 'Aprende el proceso completo de facturación',
        duration: '8 min',
        priority: 'high',
        steps: [
          'Ve a Facturación → Nueva Factura',
          'Selecciona o crea cliente',
          'Agrega productos/servicios',
          'Verifica cálculos automáticos',
          'Guarda e imprime factura'
        ]
      },
      {
        id: 'gestionar-clientes',
        title: '2. Gestionar Base de Clientes',
        description: 'Organiza tu cartera de clientes',
        duration: '10 min',
        priority: 'medium',
        steps: [
          'Ve a Clientes → Gestión',
          'Agrega nuevo cliente',
          'Completa información fiscal',
          'Configura términos de pago',
          'Asigna categoría de cliente'
        ]
      }
    ]
  };

  const detailedModules = {
    admin: [
      {
        id: 'dashboard',
        title: 'Dashboard Ejecutivo',
        icon: TrendingUp,
        description: 'Centro de control para supervisión general',
        content: {
          overview: 'Tu panel principal para monitorear toda la operación contable y financiera en tiempo real.',
          features: [
            'Métricas financieras en tiempo real',
            'Alertas de vencimientos fiscales', 
            'Resumen de ventas y compras del día',
            'Indicadores de salud del sistema',
            'Accesos rápidos a funciones críticas'
          ],
          tips: [
            'Revisa las notificaciones diariamente',
            'Configura alertas personalizadas',
            'Usa los widgets para acceso rápido',
            'Monitorea los KPIs principales'
          ],
          commonTasks: [
            'Supervisar ingresos diarios',
            'Verificar estado de declaraciones',
            'Revisar alertas del sistema',
            'Generar reportes ejecutivos'
          ]
        }
      },
      {
        id: 'configuracion',
        title: 'Configuración del Sistema',
        icon: Settings,
        description: 'Configuración avanzada y administración',
        content: {
          overview: 'Configura todos los aspectos críticos del sistema contable para tu empresa.',
          features: [
            'Gestión de datos fiscales y empresa',
            'Administración de usuarios y permisos',
            'Configuración de impuestos y tasas',
            'Numeración de documentos fiscales',
            'Respaldos y seguridad de datos'
          ],
          tips: [
            'Mantén siempre actualizado el NIT',
            'Revisa permisos de usuarios regularmente',
            'Configura respaldos automáticos',
            'Actualiza tasas de impuestos según SIN'
          ],
          commonTasks: [
            'Crear nuevos usuarios',
            'Actualizar datos de empresa',
            'Configurar secuencias de facturación',
            'Gestionar respaldos del sistema'
          ]
        }
      },
      {
        id: 'usuarios',
        title: 'Gestión de Usuarios',
        icon: Users,
        description: 'Administra equipos y permisos de acceso',
        content: {
          overview: 'Controla quién tiene acceso al sistema y qué puede hacer cada usuario.',
          features: [
            'Creación de cuentas de usuario',
            'Asignación de roles y permisos',
            'Monitoreo de actividad de usuarios',
            'Configuración de políticas de seguridad',
            'Gestión de sesiones activas'
          ],
          tips: [
            'Usa el principio de menor privilegio',
            'Revisa logs de actividad regularmente',
            'Mantén actualizada la información de contacto',
            'Configura políticas de contraseñas fuertes'
          ],
          commonTasks: [
            'Dar de alta nuevos empleados',
            'Modificar permisos según cambios de puesto',
            'Desactivar usuarios que ya no trabajan',
            'Revisar intentos de acceso fallidos'
          ]
        }
      }
    ],
    contador: [
      {
        id: 'contabilidad',
        title: 'Módulos Contables',
        icon: Calculator,
        description: 'Núcleo del sistema contable boliviano',
        content: {
          overview: 'El corazón del sistema donde se registra y controla toda la información contable.',
          features: [
            'Plan de cuentas según normativa boliviana',
            'Libro diario con partida doble automática',
            'Libro mayor con saldos actualizados',
            'Balances automáticos (Comprobación y General)',
            'Validaciones contables en tiempo real'
          ],
          tips: [
            'Revisa asientos diariamente',
            'Verifica cuadre de saldos semanalmente',
            'Mantén nomenclatura consistente',
            'Usa auxiliares para mejor control'
          ],
          commonTasks: [
            'Verificar asientos automáticos',
            'Crear asientos de ajuste',
            'Generar balances mensuales',
            'Analizar movimientos por cuenta'
          ]
        }
      },
      {
        id: 'reportes',
        title: 'Reportes Contables',
        icon: FileText,
        description: 'Estados financieros y reportes fiscales',
        content: {
          overview: 'Genera todos los reportes necesarios para cumplimiento fiscal y análisis financiero.',
          features: [
            'Estado de Resultados automatizado',
            'Balance General actualizado',
            'Declaraciones de IVA (Form 200/603)',
            'Flujo de caja proyectado',
            'Análisis financiero con ratios'
          ],
          tips: [
            'Genera reportes antes de cada cierre',
            'Verifica datos antes de presentar',
            'Mantén copias de respaldo',
            'Usa filtros para análisis específicos'
          ],
          commonTasks: [
            'Preparar declaración mensual de IVA',
            'Generar estados financieros',
            'Analizar rentabilidad por período',
            'Crear reportes para gerencia'
          ]
        }
      }
    ],
    ventas: [
      {
        id: 'facturacion',
        title: 'Sistema de Facturación',
        icon: FileText,
        description: 'Emisión de facturas y documentos fiscales',
        content: {
          overview: 'Tu herramienta principal para generar ingresos y mantener control de ventas.',
          features: [
            'Facturación rápida con autocompletado',
            'Cálculo automático de impuestos',
            'Integración automática con contabilidad',
            'Control de stock en tiempo real',
            'Gestión de cuentas por cobrar'
          ],
          tips: [
            'Verifica datos del cliente antes de facturar',
            'Usa códigos de productos para agilizar',
            'Revisa cálculos antes de confirmar',
            'Mantén actualizada la lista de precios'
          ],
          commonTasks: [
            'Emitir facturas a clientes',
            'Consultar estado de pagos',
            'Generar reportes de ventas',
            'Gestionar devoluciones'
          ]
        }
      },
      {
        id: 'clientes',
        title: 'Gestión de Clientes',
        icon: Users,
        description: 'Base de datos de clientes y cartera',
        content: {
          overview: 'Organiza y mantén actualizada tu base de clientes para una facturación eficiente.',
          features: [
            'Registro completo de datos fiscales',
            'Historial de compras y pagos',
            'Categorización de clientes',
            'Términos de pago personalizados',
            'Alertas de vencimiento'
          ],
          tips: [
            'Solicita siempre el NIT o CI',
            'Actualiza datos de contacto regularmente',
            'Usa categorías para segmentar',
            'Configura límites de crédito'
          ],
          commonTasks: [
            'Registrar nuevos clientes',
            'Actualizar información de contacto',
            'Revisar cuentas por cobrar',
            'Generar reportes de cartera'
          ]
        }
      }
    ]
  };

  const roleInfo = {
    admin: {
      title: 'Administrador del Sistema',
      description: 'Acceso completo y responsabilidad sobre toda la operación',
      color: 'from-purple-500 to-pink-500',
      responsibilities: [
        'Configuración general del sistema',
        'Gestión de usuarios y permisos',
        'Supervisión de operaciones contables',
        'Cumplimiento normativo y fiscal',
        'Respaldos y seguridad de datos'
      ]
    },
    contador: {
      title: 'Contador/a',
      description: 'Responsable de la integridad contable y fiscal',
      color: 'from-blue-500 to-cyan-500',
      responsibilities: [
        'Supervisión de registros contables',
        'Generación de estados financieros',
        'Preparación de declaraciones fiscales',
        'Análisis financiero y de costos',
        'Control de inventarios'
      ]
    },
    ventas: {
      title: 'Equipo de Ventas',
      description: 'Enfocado en la generación de ingresos',
      color: 'from-green-500 to-emerald-500',
      responsibilities: [
        'Emisión de facturas y documentos',
        'Gestión de clientes y cartera',
        'Control de productos y precios',
        'Seguimiento de ventas y metas',
        'Atención al cliente'
      ]
    },
    usuario: {
      title: 'Usuario General',
      description: 'Acceso limitado a consultas básicas',
      color: 'from-gray-500 to-slate-500',
      responsibilities: [
        'Consulta de información básica',
        'Visualización de reportes generales'
      ]
    }
  };

  const currentRoleInfo = roleInfo[role as keyof typeof roleInfo] || roleInfo.usuario;
  const currentQuickStart = quickStartGuides[role as keyof typeof quickStartGuides] || [];
  const currentModules = detailedModules[role as keyof typeof detailedModules] || [];
  const totalMasterModules = tutorialMasterIndex.reduce((sum, group) => sum + group.modules.length, 0);

  const calculateProgress = () => {
    const totalSteps = currentQuickStart.length;
    const completed = currentQuickStart.filter(step => completedSteps.includes(step.id)).length;
    return totalSteps > 0 ? (completed / totalSteps) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header with Role Info */}
      <div className={`relative overflow-hidden rounded-xl p-6 bg-gradient-to-r ${currentRoleInfo.color}`}>
        <div className="relative z-10 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{currentRoleInfo.title}</h1>
                <p className="text-white/90">{currentRoleInfo.description}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Nivel: {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Tus Responsabilidades
              </h3>
              <ul className="space-y-1 text-sm text-white/90">
                {currentRoleInfo.responsibilities.map((item, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-2 text-white/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progreso de Configuración</span>
                <span className="text-sm">{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="bg-white/20" />
              <p className="text-xs text-white/80">
                {completedSteps.length} de {currentQuickStart.length} pasos completados
              </p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeModule} onValueChange={setActiveModule} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inicio-rapido" className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>Inicio Rápido</span>
          </TabsTrigger>
          <TabsTrigger value="modulos" className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <span>Módulos</span>
          </TabsTrigger>
          <TabsTrigger value="video-tutoriales" className="flex items-center space-x-2">
            <Video className="w-4 h-4" />
            <span>Videos</span>
          </TabsTrigger>
          <TabsTrigger value="guia-maestra" className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <span>GuÃ­a</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center space-x-2">
            <Lightbulb className="w-4 h-4" />
            <span>FAQ</span>
          </TabsTrigger>
        </TabsList>

        {/* Quick Start Guide */}
        <TabsContent value="inicio-rapido" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                Guía de Inicio Rápido
              </CardTitle>
              <CardDescription>
                Sigue estos pasos para configurar y empezar a usar el sistema en minutos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {currentQuickStart.map((guide, index) => (
                  <Card key={guide.id} className={`transition-all duration-200 ${
                    completedSteps.includes(guide.id) 
                      ? 'bg-green-50 border-green-200' 
                      : 'hover:shadow-md'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            completedSteps.includes(guide.id)
                              ? 'bg-green-500 text-white'
                              : guide.priority === 'high'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {completedSteps.includes(guide.id) ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{guide.title}</h3>
                            <p className="text-sm text-muted-foreground">{guide.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={guide.priority === 'high' ? 'destructive' : 'secondary'}>
                            {guide.priority === 'high' ? 'Prioritario' : 'Recomendado'}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {guide.duration}
                          </span>
                        </div>
                      </div>
                      
                      <div className="ml-11">
                        <Accordion type="single" collapsible>
                          <AccordionItem value={guide.id}>
                            <AccordionTrigger className="text-sm">
                              Ver pasos detallados ({guide.steps.length} pasos)
                            </AccordionTrigger>
                            <AccordionContent>
                              <ol className="space-y-2 text-sm">
                                {guide.steps.map((step, stepIndex) => (
                                  <li key={stepIndex} className="flex items-start">
                                    <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">
                                      {stepIndex + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                              <div className="mt-4 pt-4 border-t">
                                <Button 
                                  size="sm" 
                                  onClick={() => markStepCompleted(guide.id)}
                                  disabled={completedSteps.includes(guide.id)}
                                  className="w-full"
                                >
                                  {completedSteps.includes(guide.id) ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      ¡Completado!
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4 mr-2" />
                                      Marcar como Completado
                                    </>
                                  )}
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Modules */}
        <TabsContent value="modulos" className="space-y-6">
          <div className="grid gap-6">
            {currentModules.map((module) => (
              <Card key={module.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="flex items-center">
                    <div className="p-2 bg-white rounded-lg mr-3">
                      <module.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    {module.title}
                  </CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Overview */}
                    <div>
                      <h4 className="font-semibold mb-2 text-primary">¿Qué es y para qué sirve?</h4>
                      <p className="text-muted-foreground">{module.content.overview}</p>
                    </div>

                    {/* Features */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Star className="w-4 h-4 mr-2 text-yellow-500" />
                        Funcionalidades Principales
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {module.content.features.map((feature, index) => (
                          <div key={index} className="flex items-center p-2 bg-muted/30 rounded">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tips */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
                        Consejos y Mejores Prácticas
                      </h4>
                      <div className="space-y-2">
                        {module.content.tips.map((tip, index) => (
                          <div key={index} className="flex items-start p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                            <AlertCircle className="w-4 h-4 mr-2 text-yellow-600 mt-0.5" />
                            <span className="text-sm text-yellow-800">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Common Tasks */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Target className="w-4 h-4 mr-2 text-blue-500" />
                        Tareas Más Comunes
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {module.content.commonTasks.map((task, index) => (
                          <div key={index} className="flex items-center p-2 border rounded hover:bg-muted/30 transition-colors">
                            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                              {index + 1}
                            </div>
                            <span className="text-sm">{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Video Tutorials */}
        <TabsContent value="video-tutoriales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Video className="w-5 h-5 mr-2 text-red-500" />
                Video Tutoriales
              </CardTitle>
              <CardDescription>
                Aprende visualmente con nuestros videos explicativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: 'Configuración Inicial', duration: '5:30', views: '1.2k' },
                  { title: 'Primera Factura', duration: '8:15', views: '890' },
                  { title: 'Reportes Contables', duration: '12:20', views: '650' },
                  { title: 'Gestión de Inventario', duration: '9:45', views: '420' },
                  { title: 'Declaración de IVA', duration: '15:30', views: '780' },
                  { title: 'Análisis Financiero', duration: '18:00', views: '320' }
                ].map((video, index) => (
                  <Card key={index} className="group cursor-pointer hover:shadow-md transition-all">
                    <div className="aspect-video bg-gradient-to-br from-blue-400 to-blue-600 rounded-t-lg relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-1">{video.title}</h4>
                      <p className="text-xs text-muted-foreground">{video.views} visualizaciones</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guia-maestra" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-primary" />
                GuÃ­a Maestra de MÃ³dulos
              </CardTitle>
              <CardDescription>
                Cobertura completa de la suite. La versiÃ³n detallada para capacitaciÃ³n interna estÃ¡ en <strong>docs/tutorial-completo-modulos-2026-03-23.md</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">MÃ³dulos</p>
                    <p className="mt-2 text-3xl font-bold text-slate-950">{totalMasterModules}</p>
                    <p className="text-sm text-slate-600">MÃ³dulos cubiertos en el sistema</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Bloques</p>
                    <p className="mt-2 text-3xl font-bold text-slate-950">{tutorialMasterIndex.length}</p>
                    <p className="text-sm text-slate-600">Grupos funcionales documentados</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Uso recomendado</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">CapacitaciÃ³n por procesos</p>
                    <p className="text-sm text-slate-600">Empieza por Principal, Operaciones, Finanzas e Impuestos SIN.</p>
                  </CardContent>
                </Card>
              </div>

              <Accordion type="multiple" className="space-y-4">
                {tutorialMasterIndex.map((group) => (
                  <AccordionItem key={group.group} value={group.group} className="rounded-xl border px-4">
                    <AccordionTrigger className="text-left">
                      <div>
                        <div className="font-semibold">{group.group}</div>
                        <div className="text-sm text-muted-foreground">{group.modules.length} mÃ³dulo(s)</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        {group.modules.map((module) => (
                          <Card key={module.view} className="border-slate-200">
                            <CardContent className="space-y-3 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="font-semibold">{module.title}</h4>
                                  <p className="text-sm text-muted-foreground">{module.summary}</p>
                                </div>
                                <Badge variant="outline">{module.plan}</Badge>
                              </div>
                              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                                <span className="font-medium text-slate-900">Ideal para:</span> {module.idealFor}
                              </div>
                              <div className="text-xs text-slate-500">
                                Ruta sugerida: <span className="font-mono">/?view={module.view}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                Preguntas Frecuentes
              </CardTitle>
              <CardDescription>
                Respuestas a las dudas más comunes según tu rol
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {[
                  {
                    question: "¿Cómo puedo cambiar mi contraseña?",
                    answer: "Ve a tu perfil en la esquina superior derecha, selecciona 'Configuración de cuenta' y luego 'Cambiar contraseña'. Asegúrate de usar una contraseña segura."
                  },
                  {
                    question: "¿Qué hago si no cuadran los saldos contables?",
                    answer: "Primero verifica el Balance de Comprobación. Si hay diferencias, revisa los últimos asientos en el Libro Diario. Busca errores de digitación o asientos incompletos."
                  },
                  {
                    question: "¿Cómo genero la declaración de IVA?",
                    answer: "Ve a Reportes → Declaraciones Fiscales → IVA. Selecciona el período, verifica que todos los datos estén correctos y genera el formulario 200 o 603 según corresponda."
                  },
                  {
                    question: "¿Puedo personalizar el plan de cuentas?",
                    answer: "Sí, como administrador o contador puedes agregar, modificar o eliminar cuentas. Ve a Contabilidad → Plan de Cuentas y usa las opciones de edición."
                  },
                  {
                    question: "¿Cómo hago respaldo de la información?",
                    answer: "Ve a Configuración → Respaldos. Puedes generar respaldos manuales o programar respaldos automáticos diarios. Siempre mantén copias en lugar seguro."
                  }
                ].map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TutorialModule;
