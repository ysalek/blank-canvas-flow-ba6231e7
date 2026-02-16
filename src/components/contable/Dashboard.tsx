import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users, CheckCircle, AlertTriangle, Activity, Target, BarChart3 } from 'lucide-react';
import { useContabilidadIntegration } from '@/hooks/useContabilidadIntegration';
import NotificationsIcon from './dashboard/NotificationsIcon';
import EnhancedFinancialDashboard from './dashboard/EnhancedFinancialDashboard';
import SystemHealth from './dashboard/SystemHealth';
import { inicializarSistemaCompleto } from '../../utils/inicializarSistema';
import { inicializarDatosDemo } from '@/utils/inicializarDatosDemo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [fechaActual] = useState(new Date().toLocaleDateString('es-BO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  const [sistemaInicializado, setSistemaInicializado] = useState(false);
  const { toast } = useToast();

  const { obtenerBalanceGeneral } = useContabilidadIntegration();
  const balance = obtenerBalanceGeneral();

  const [dataCargada, setDataCargada] = useState(false);

  useEffect(() => {
    const cargarDatosDesdeLocalStorage = () => {
      try {
        // Intenta cargar los datos desde localStorage
        const facturasGuardadas = localStorage.getItem('facturas');
        const asientosGuardados = localStorage.getItem('asientosContables');
        const productosGuardados = localStorage.getItem('productos');
        const comprobantesGuardados = localStorage.getItem('comprobantes_integrados');
        const clientesGuardados = localStorage.getItem('clientes');
        const proveedoresGuardados = localStorage.getItem('proveedores');

        // Si alguno de los datos no existe, inicializa el sistema
        if (!facturasGuardadas || !asientosGuardados || !productosGuardados || !comprobantesGuardados || !clientesGuardados || !proveedoresGuardados) {
          inicializarSistemaCompleto();
          toast({
            title: "¡Bienvenido!",
            description: "El sistema se ha inicializado con datos de demostración.",
          })
        }
        setDataCargada(true);
      } catch (error) {
        console.error("Error al cargar datos desde localStorage:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Hubo un problema al cargar los datos iniciales.",
        })
      }
    };

    cargarDatosDesdeLocalStorage();
  }, [toast]);

  const facturas = JSON.parse(localStorage.getItem('facturas') || '[]');
  const asientos = JSON.parse(localStorage.getItem('asientosContables') || '[]');
  const productos = JSON.parse(localStorage.getItem('productos') || '[]');
  const comprobantes = JSON.parse(localStorage.getItem('comprobantes_integrados') || '[]');
  const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
  const proveedores = JSON.parse(localStorage.getItem('proveedores') || '[]');

  useEffect(() => {
    const initSystem = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await inicializarDatosDemo(user.id);
        }
        setSistemaInicializado(true);
      } catch (error) {
        console.error('Error inicializando sistema:', error);
        setSistemaInicializado(true);
      }
    };
    initSystem();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStr = lastMonth.toISOString().slice(0, 7);

  const comprobantesAutorizados = comprobantes.filter((c: any) => c.estado === 'autorizado');
  const comprobantesConAsientos = comprobantes.filter((c: any) => c.asientoGenerado);
  const totalIngresos = comprobantes.filter((c: any) => c.tipo === 'ingreso' && c.estado === 'autorizado').reduce((sum: number, c: any) => sum + c.monto, 0);
  const totalGastos = comprobantes.filter((c: any) => c.tipo === 'egreso' && c.estado === 'autorizado').reduce((sum: number, c: any) => sum + c.monto, 0);

  const ventasHoy = facturas.filter((f: any) => f.fecha === today && f.estado !== 'anulada').reduce((sum: number, f: any) => sum + f.total, 0);
  const ventasMes = facturas.filter((f: any) => f.fecha.startsWith(thisMonth) && f.estado !== 'anulada').reduce((sum: number, f: any) => sum + f.total, 0);
  const ventasMesAnterior = facturas.filter((f: any) => f.fecha.startsWith(lastMonthStr) && f.estado !== 'anulada').reduce((sum: number, f: any) => sum + f.total, 0);
  const crecimientoVentas = ventasMesAnterior > 0 ? ((ventasMes - ventasMesAnterior) / ventasMesAnterior * 100) : 0;

  const margenBruto = ventasMes > 0 ? ((ventasMes - totalGastos) / ventasMes * 100) : 0;
  const ebitda = totalIngresos - totalGastos;
  const roiMensual = totalGastos > 0 ? (ebitda / totalGastos * 100) : 0;

  const clientesActivosMes = new Set(facturas.filter((f: any) => f.fecha.startsWith(thisMonth)).map((f: any) => f.cliente?.id)).size;
  const clientesNuevosMes = clientes.filter((c: any) => c.fechaRegistro && c.fechaRegistro.startsWith(thisMonth)).length;
  const ticketPromedio = facturas.length > 0 ? ventasMes / Math.max(facturas.filter((f: any) => f.fecha.startsWith(thisMonth) && f.estado !== 'anulada').length, 1) : 0;

  const valorInventario = productos.reduce((sum: number, p: any) => sum + (p.stockActual * p.costoUnitario), 0);
  const productosStockBajo = productos.filter((p: any) => p.stockActual <= p.stockMinimo && p.stockActual > 0).length;
  const rotacionInventario = ventasMes > 0 && valorInventario > 0 ? (ventasMes / valorInventario * 12) : 0;

  const facturasPendientes = facturas.filter((f: any) => f.estado === 'enviada').length;
  const eficienciaCobranza = facturasPendientes > 0 ? ((facturas.length - facturasPendientes) / facturas.length * 100) : 100;

  return (
    <div className="min-h-screen bg-gradient-subtle pb-12">
      <div className="bg-gradient-primary px-8 py-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Activity className="w-8 h-8" />
              Dashboard Empresarial
            </h1>
            <p className="text-white/90 text-sm">{fechaActual}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge 
              variant={balance.activos === (balance.pasivos + balance.patrimonio) ? "default" : "destructive"}
              className="text-sm px-4 py-2 bg-white/20 backdrop-blur border-white/30"
            >
              {balance.activos === (balance.pasivos + balance.patrimonio) ? (
                <><CheckCircle className="w-4 h-4 mr-2" /> Balance Cuadrado</>
              ) : (
                <><AlertTriangle className="w-4 h-4 mr-2" /> Verificar Balance</>
              )}
            </Badge>
            <NotificationsIcon />
          </div>
        </div>
      </div>

      <div className="px-8 space-y-8">
        {/* Métricas principales */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Métricas Principales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-modern hover:shadow-glow transition-smooth">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-success/10">
                    <DollarSign className="w-6 h-6 text-success" />
                  </div>
                  {crecimientoVentas !== 0 && (
                    <Badge variant={crecimientoVentas > 0 ? "default" : "destructive"} className="text-xs">
                      {crecimientoVentas > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {Math.abs(crecimientoVentas).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">Bs. {ventasMes.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
              </CardContent>
            </Card>

            <Card className="card-modern hover:shadow-glow transition-smooth">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <Badge variant={ebitda > 0 ? "default" : "destructive"} className="text-xs">
                    {ebitda > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {margenBruto.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">Bs. {ebitda.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">EBITDA</p>
              </CardContent>
            </Card>

            <Card className="card-modern hover:shadow-glow transition-smooth">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-warning/10">
                    <Users className="w-6 h-6 text-warning" />
                  </div>
                  {clientesNuevosMes > 0 && (
                    <Badge variant="default" className="text-xs">+{clientesNuevosMes} nuevos</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">{clientesActivosMes}</p>
                <p className="text-sm text-muted-foreground">Clientes Activos</p>
              </CardContent>
            </Card>

            <Card className="card-modern hover:shadow-glow transition-smooth">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  {productosStockBajo > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />{productosStockBajo}
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">Bs. {valorInventario.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Valor Inventario</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Indicadores Secundarios */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Rendimiento Comercial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ticket Promedio</span>
                <span className="text-lg font-bold">Bs. {ticketPromedio.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ventas Hoy</span>
                <span className="text-lg font-bold text-success">Bs. {ventasHoy.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ROI Mensual</span>
                <Badge variant={roiMensual > 15 ? "default" : "destructive"}>
                  {roiMensual.toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Control de Inventario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rotación Anual</span>
                <span className="text-lg font-bold">{rotacionInventario.toFixed(1)}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Productos Activos</span>
                <span className="text-lg font-bold">{productos.filter((p: any) => p.stockActual > 0).length}/{productos.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stock Bajo</span>
                {productosStockBajo > 0 ? (
                  <Badge variant="destructive">{productosStockBajo} productos</Badge>
                ) : (
                  <Badge variant="default">Óptimo</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Eficiencia Operativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cobranza</span>
                <Badge variant={eficienciaCobranza > 90 ? "default" : "destructive"}>
                  {eficienciaCobranza.toFixed(0)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pendientes</span>
                <span className="text-lg font-bold text-warning">{facturasPendientes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tiempo Cobro</span>
                <span className="text-lg font-bold">30 días</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        {(Math.abs(balance.activos - (balance.pasivos + balance.patrimonio)) > 0.01 || 
          productosStockBajo > 0 || facturasPendientes > 0 || roiMensual > 20) && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Alertas y Notificaciones</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Math.abs(balance.activos - (balance.pasivos + balance.patrimonio)) > 0.01 && (
                <Card className="border-l-4 border-l-destructive bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                      <div>
                        <p className="font-semibold text-destructive mb-1">Balance Descuadrado</p>
                        <p className="text-sm text-muted-foreground">
                          Diferencia: {Math.abs(balance.activos - (balance.pasivos + balance.patrimonio)).toFixed(2)} Bs.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {productosStockBajo > 0 && (
                <Card className="border-l-4 border-l-warning bg-warning/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-warning mt-0.5" />
                      <div>
                        <p className="font-semibold text-warning mb-1">Stock Bajo</p>
                        <p className="text-sm text-muted-foreground">{productosStockBajo} productos necesitan reposición</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {facturasPendientes > 0 && (
                <Card className="border-l-4 border-l-warning bg-warning/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                      <div>
                        <p className="font-semibold text-warning mb-1">Cuentas por Cobrar</p>
                        <p className="text-sm text-muted-foreground">{facturasPendientes} facturas pendientes de cobro</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {Math.abs(balance.activos - (balance.pasivos + balance.patrimonio)) <= 0.01 && (
                <Card className="border-l-4 border-l-success bg-success/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                      <div>
                        <p className="font-semibold text-success mb-1">Sistema Integrado</p>
                        <p className="text-sm text-muted-foreground">Balance cuadrado • Inventario sincronizado</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Análisis Financiero */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Análisis Financiero</h2>
          <EnhancedFinancialDashboard facturas={facturas} asientos={asientos} productos={productos} />
        </div>

        {/* Monitoreo del Sistema */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Monitoreo del Sistema</h2>
          <SystemHealth />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
