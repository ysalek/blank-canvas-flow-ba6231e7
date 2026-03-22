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
import { useCumplimientoEjecutivo } from '@/hooks/useCumplimientoEjecutivo';

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
  const { metrics: complianceMetrics, alerts: complianceAlerts, loading: complianceLoading } = useCumplimientoEjecutivo();

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

  const navigateTo = (view: string, params?: Record<string, string>) => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    window.history.pushState({}, '', `${url.pathname}${url.search}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const navigateFromAlert = (alert: (typeof complianceAlerts)[number]) => {
    if (alert.navigation) {
      navigateTo(alert.navigation.view, alert.navigation.params);
      return;
    }
    navigateTo('cumplimiento-normativo', { tab: 'requisitos' });
  };

  const isLoading = facturasLoading || productosLoading || clientesLoading || complianceLoading;
  const balanceCuadrado = Math.abs(balance.activos - (balance.pasivos + balance.patrimonio)) <= 0.01;
  const alertasCriticas = complianceAlerts.filter(a => a.priority === 'critical' && a.id !== 'sin-alertas').length;
  const alertasActivas = complianceAlerts.filter(a => a.id !== 'sin-alertas').length;

  return (
    <div className="page-shell space-y-6 pb-12">
      <div className="hero-panel rounded-[2rem] p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_340px]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="feature-chip">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Vision ejecutiva
              </span>
              <Badge variant={balanceCuadrado ? "default" : "destructive"} className="text-xs">
                {balanceCuadrado
                  ? <><CheckCircle className="mr-1 h-3.5 w-3.5" /> Balance cuadrado</>
                  : <><AlertTriangle className="mr-1 h-3.5 w-3.5" /> Balance descuadrado</>
                }
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Centro de mando contable</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              Supervisa ingresos, inventario, clientes y cierre contable desde una vista comercial unificada.
              Cada bloque prioriza accion, control y lectura ejecutiva.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium capitalize">
                {fechaActual}
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium">
                {alertasActivas} alertas activas
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium">
                {metrics.facturasDelMes} facturas este mes
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Panel rapido</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">Prioridades del dia</p>
              </div>
              <NotificationsIcon />
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ventas del mes</p>
                  <p className="text-xs text-slate-500">Lectura comercial consolidada</p>
                </div>
                <p className="text-xl font-bold text-slate-950">Bs {metrics.ventasMes.toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Stock bajo</p>
                  <p className="text-xs text-slate-500">Productos a reponer</p>
                </div>
                <p className="text-xl font-bold text-amber-700">{metrics.stockBajo}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Cierre tributario</p>
                  <p className="text-xs text-slate-500">Pendientes para tesoreria y cumplimiento</p>
                </div>
                <p className="text-xl font-bold text-rose-700">{alertasCriticas}</p>
              </div>
            </div>
          </div>
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

      <div className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_35%),linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#ecfeff_100%)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Centro de cierre</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Salud contable, tributaria y operativa</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Este bloque consolida declaraciones, conciliacion bancaria, nomina y cumplimiento normativo directamente desde la base real.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigateTo('cumplimiento-normativo', { tab: 'requisitos' })}>Cumplimiento</Button>
            <Button variant="outline" onClick={() => navigateTo('declaraciones-tributarias')}>Declaraciones</Button>
            <Button variant="outline" onClick={() => navigateTo('conciliacion-bancaria')}>Tesoreria</Button>
            <Button onClick={() => navigateTo('nomina', { tab: 'planillas' })}>Nomina</Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-rose-200 bg-rose-50/90">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Alertas criticas</p>
                  <p className="mt-2 text-2xl font-bold text-rose-950">{alertasCriticas}</p>
                  <p className="text-xs text-rose-700">Hallazgos de cierre que requieren accion</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/90">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Declaraciones pendientes</p>
                  <p className="mt-2 text-2xl font-bold text-amber-950">{complianceMetrics.declaracionesPendientes}</p>
                  <p className="text-xs text-amber-700">Obligaciones aun no presentadas</p>
                </div>
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-sky-200 bg-sky-50/90">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-700">Conciliaciones abiertas</p>
                  <p className="mt-2 text-2xl font-bold text-sky-950">{complianceMetrics.conciliacionesAbiertas}</p>
                  <p className="text-xs text-sky-700">Cortes bancarios pendientes de cierre</p>
                </div>
                <CreditCard className="h-6 w-6 text-sky-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/90">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Planillas pendientes</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-950">{complianceMetrics.planillasPendientes}</p>
                  <p className="text-xs text-emerald-700">Nomina aun no pagada o sin cierre</p>
                </div>
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {alertasActivas > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
            {complianceAlerts
              .filter(alert => alert.id !== 'sin-alertas')
              .slice(0, 3)
              .map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => navigateFromAlert(alert)}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{alert.priority.toUpperCase()}</Badge>
                    <Badge variant="outline">{alert.source}</Badge>
                  </div>
                  <p className="mt-3 font-semibold text-slate-900">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
                </button>
              ))}
          </div>
        )}
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
      {(metrics.stockBajo > 0 || metrics.pendientes > 0 || !balanceCuadrado || alertasActivas > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Alertas</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
            {alertasActivas > 0 && (
              <Card className="border-l-4 border-l-rose-500 bg-rose-50/60 cursor-pointer" onClick={() => navigateTo('cumplimiento-normativo', { tab: 'requisitos' })}>
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-rose-700 text-sm">Cierre y Cumplimiento</p>
                    <p className="text-xs text-muted-foreground">{alertasActivas} alertas activas en tesoreria, nomina o declaraciones</p>
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
