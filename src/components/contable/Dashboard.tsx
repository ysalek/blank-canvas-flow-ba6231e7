import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users,
  CheckCircle, AlertTriangle, Activity, Target, BarChart3, ArrowUpRight,
  Calendar, Clock, Receipt, CreditCard, FileText, PiggyBank
} from 'lucide-react';
import { useContabilidadIntegration } from '@/hooks/useContabilidadIntegration';
import { useAsientos } from '@/hooks/useAsientos';
import NotificationsIcon from './dashboard/NotificationsIcon';
import EnhancedFinancialDashboard from './dashboard/EnhancedFinancialDashboard';
import SystemHealth from './dashboard/SystemHealth';
import { useProductosValidated } from '@/hooks/useProductosValidated';
import { useClientesSupabase } from '@/hooks/useClientesSupabase';
import { useFacturas } from '@/hooks/useFacturas';

const Dashboard = () => {
  const fechaActual = useMemo(() => new Date().toLocaleDateString('es-BO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }), []);

  const { obtenerBalanceGeneral } = useContabilidadIntegration();
  const balance = obtenerBalanceGeneral();
  const { getAsientos } = useAsientos();
  const asientosReales = getAsientos();
  const { productos, loading: productosLoading } = useProductosValidated();
  const { clientes, loading: clientesLoading } = useClientesSupabase();
  const { facturas, loading: facturasLoading } = useFacturas();

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStr = lastMonth.toISOString().slice(0, 7);

  const metrics = useMemo(() => {
    const ventasHoy = facturas.filter(f => f.fecha === today && f.estado !== 'anulada').reduce((s, f) => s + f.total, 0);
    const ventasMes = facturas.filter(f => f.fecha?.startsWith(thisMonth) && f.estado !== 'anulada').reduce((s, f) => s + f.total, 0);
    const ventasMesAnterior = facturas.filter(f => f.fecha?.startsWith(lastMonthStr) && f.estado !== 'anulada').reduce((s, f) => s + f.total, 0);
    const crecimiento = ventasMesAnterior > 0 ? ((ventasMes - ventasMesAnterior) / ventasMesAnterior * 100) : 0;
    const clientesActivos = clientes.filter(c => c.activo !== false).length;
    const clientesNuevos = clientes.filter(c => c.fechaCreacion?.startsWith(thisMonth)).length;
    const facturasDelMes = facturas.filter(f => f.fecha?.startsWith(thisMonth) && f.estado !== 'anulada');
    const ticket = facturasDelMes.length > 0 ? ventasMes / facturasDelMes.length : 0;
    const valorInv = productos.reduce((s, p) => s + (Number(p.stock_actual || 0) * Number(p.costo_unitario || 0)), 0);
    const stockBajo = productos.filter(p => Number(p.stock_actual || 0) <= Number(p.stock_minimo || 0) && Number(p.stock_actual || 0) > 0).length;
    const pendientes = facturas.filter(f => f.estado === 'enviada').length;
    const cobranza = facturas.length > 0 ? ((facturas.length - pendientes) / facturas.length * 100) : 100;
    const rotacion = ventasMes > 0 && valorInv > 0 ? (ventasMes / valorInv * 12) : 0;
    return { ventasHoy, ventasMes, crecimiento, clientesActivos, clientesNuevos, ticket, valorInv, stockBajo, pendientes, cobranza, rotacion, facturasDelMes: facturasDelMes.length };
  }, [facturas, clientes, productos, today, thisMonth, lastMonthStr]);

  const navigateTo = (view: string) => {
    window.history.pushState({}, '', `/?view=${view}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const isLoading = facturasLoading || productosLoading || clientesLoading;
  const balanceCuadrado = Math.abs(balance.activos - (balance.pasivos + balance.patrimonio)) <= 0.01;

  return (
    <div className="space-y-6 pb-12">
      {/* Header con resumen */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{fechaActual}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={balanceCuadrado ? "default" : "destructive"} className="text-xs">
            {balanceCuadrado
              ? <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Cuadrado</>
              : <><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Descuadrado</>
            }
          </Badge>
          <NotificationsIcon />
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-modern group hover:shadow-glow hover-lift cursor-pointer animate-slide-up stagger-1" onClick={() => navigateTo('facturacion')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-success/10 group-hover:scale-110 transition-transform duration-200"><DollarSign className="w-5 h-5 text-success" /></div>
              {metrics.crecimiento !== 0 && (
                <Badge variant={metrics.crecimiento > 0 ? "default" : "destructive"} className="text-xs">
                  {metrics.crecimiento > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(metrics.crecimiento).toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">Bs {metrics.ventasMes.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ingresos del Mes</p>
            <div className="flex items-center gap-1 text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Ver facturación <ArrowUpRight className="w-3 h-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern group hover:shadow-glow hover-lift cursor-pointer animate-slide-up stagger-2" onClick={() => navigateTo('balance-general')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10 group-hover:scale-110 transition-transform duration-200"><BarChart3 className="w-5 h-5 text-primary" /></div>
              <Badge variant="outline" className="text-xs">{balanceCuadrado ? 'OK' : 'Revisar'}</Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">Bs {balance.activos.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Activos</p>
            <div className="flex items-center gap-1 text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Ver balance <ArrowUpRight className="w-3 h-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern group hover:shadow-glow hover-lift cursor-pointer animate-slide-up stagger-3" onClick={() => navigateTo('clientes')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-warning/10 group-hover:scale-110 transition-transform duration-200"><Users className="w-5 h-5 text-warning" /></div>
              {metrics.clientesNuevos > 0 && <Badge className="text-xs">+{metrics.clientesNuevos}</Badge>}
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.clientesActivos}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Clientes Activos</p>
            <div className="flex items-center gap-1 text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Ver clientes <ArrowUpRight className="w-3 h-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern group hover:shadow-glow hover-lift cursor-pointer animate-slide-up stagger-4" onClick={() => navigateTo('inventario')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-accent group-hover:scale-110 transition-transform duration-200"><Package className="w-5 h-5 text-accent-foreground" /></div>
              {metrics.stockBajo > 0 && <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />{metrics.stockBajo}</Badge>}
            </div>
            <p className="text-2xl font-bold text-foreground">Bs {metrics.valorInv.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Valor Inventario</p>
            <div className="flex items-center gap-1 text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Ver inventario <ArrowUpRight className="w-3 h-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="animate-fade-in stagger-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acceso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Nueva Factura', icon: Receipt, view: 'facturacion', color: 'bg-success/10 text-success' },
            { label: 'Punto de Venta', icon: CreditCard, view: 'punto-venta', color: 'bg-primary/10 text-primary' },
            { label: 'Libro Diario', icon: FileText, view: 'diario', color: 'bg-accent text-accent-foreground' },
            { label: 'Compras', icon: ShoppingCart, view: 'compras', color: 'bg-warning/10 text-warning' },
            { label: 'Cuentas CxC', icon: PiggyBank, view: 'cuentas-cobrar-pagar', color: 'bg-destructive/10 text-destructive' },
            { label: 'Reportes', icon: BarChart3, view: 'reportes', color: 'bg-primary/10 text-primary' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigateTo(item.view)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 bg-card hover:bg-accent/50 hover:shadow-sm hover-lift transition-all duration-200 hover:scale-[1.02]"
            >
              <div className={`p-2.5 rounded-lg ${item.color} transition-transform duration-200 group-hover:scale-110`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-foreground">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Indicadores secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in stagger-6">
        <Card className="card-modern">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" /> Rendimiento Comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ticket Promedio</span>
              <span className="font-bold">Bs {metrics.ticket.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ventas Hoy</span>
              <span className="font-bold text-success">Bs {metrics.ventasHoy.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Facturas este mes</span>
              <span className="font-bold">{metrics.facturasDelMes}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Control de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rotación Anual</span>
              <span className="font-bold">{metrics.rotacion.toFixed(1)}x</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Productos con Stock</span>
              <span className="font-bold">{productos.filter(p => Number(p.stock_actual || 0) > 0).length}/{productos.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Stock Bajo</span>
              {metrics.stockBajo > 0
                ? <Badge variant="destructive" className="text-xs">{metrics.stockBajo} productos</Badge>
                : <Badge className="text-xs">Óptimo</Badge>
              }
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Eficiencia Operativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Cobranza</span>
                <span className="text-sm font-bold">{metrics.cobranza.toFixed(0)}%</span>
              </div>
              <Progress value={metrics.cobranza} className="h-2" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Facturas pendientes</span>
              <span className="font-bold text-warning">{metrics.pendientes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Balance</span>
              <Badge variant={balanceCuadrado ? "default" : "destructive"} className="text-xs">
                {balanceCuadrado ? 'Cuadrado' : 'Descuadrado'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(metrics.stockBajo > 0 || metrics.pendientes > 0 || !balanceCuadrado) && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Alertas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {!balanceCuadrado && (
              <Card className="border-l-4 border-l-destructive bg-destructive/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-destructive text-sm">Balance Descuadrado</p>
                    <p className="text-xs text-muted-foreground">Diferencia: Bs {Math.abs(balance.activos - (balance.pasivos + balance.patrimonio)).toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {metrics.stockBajo > 0 && (
              <Card className="border-l-4 border-l-warning bg-warning/5 cursor-pointer" onClick={() => navigateTo('inventario')}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Package className="w-5 h-5 text-warning mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-warning text-sm">Stock Bajo</p>
                    <p className="text-xs text-muted-foreground">{metrics.stockBajo} productos necesitan reposición</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {metrics.pendientes > 0 && (
              <Card className="border-l-4 border-l-warning bg-warning/5 cursor-pointer" onClick={() => navigateTo('cuentas-cobrar-pagar')}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Receipt className="w-5 h-5 text-warning mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-warning text-sm">Cuentas por Cobrar</p>
                    <p className="text-xs text-muted-foreground">{metrics.pendientes} facturas pendientes</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Análisis Financiero */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Análisis</h2>
        <EnhancedFinancialDashboard facturas={facturas} asientos={asientosReales} productos={productos.map(p => ({
          id: String(p.id),
          codigo: String(p.codigo || ''),
          nombre: String(p.nombre || ''),
          descripcion: String(p.descripcion || ''),
          categoria: String(p.categoria_id || 'General'),
          unidadMedida: String(p.unidad_medida || 'PZA'),
          precioVenta: Number(p.precio_venta || 0),
          precioCompra: Number(p.precio_compra || 0),
          costoUnitario: Number(p.costo_unitario || 0),
          stockActual: Number(p.stock_actual || 0),
          stockMinimo: Number(p.stock_minimo || 0),
          codigoSIN: String(p.codigo_sin || '00000000'),
          activo: Boolean(p.activo),
          fechaCreacion: p.created_at?.split('T')[0] || '',
          fechaActualizacion: p.updated_at?.split('T')[0] || ''
        }))} />
      </div>

      {/* Monitoreo */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Monitoreo del Sistema</h2>
        <SystemHealth />
      </div>
    </div>
  );
};

export default Dashboard;
