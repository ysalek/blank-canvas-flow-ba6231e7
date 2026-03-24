import { useEffect, useState, type ComponentType } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, FileText, ShoppingCart, Receipt, Users, Package, Building2, RefreshCw, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedHeader, EnhancedMetricCard, MetricGrid } from '../contable/dashboard/EnhancedLayout';

interface LogEntry {
  id: string;
  type: string;
  category: string;
  description: string;
  detail: string;
  timestamp: string;
  icon: ComponentType<{ className?: string }>;
}

const ActivityLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadActivityLogs(); }, []);

  const loadActivityLogs = async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const [facturas, compras, asientos, profiles, productos, clientes, proveedores] = await Promise.all([
        supabase.from('comprobantes_integrados').select('id, numero_comprobante, created_at, tipo_comprobante, razon_social, total').order('created_at', { ascending: false }).limit(10),
        supabase.from('compras').select('id, numero, created_at, total, estado').order('created_at', { ascending: false }).limit(10),
        supabase.from('asientos_contables').select('id, numero, concepto, created_at, debe, haber').order('created_at', { ascending: false }).limit(10),
        supabase.from('profiles').select('id, display_name, empresa, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('productos').select('id, nombre, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('clientes').select('id, nombre, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('proveedores').select('id, nombre, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      const entries: LogEntry[] = [
        ...(facturas.data || []).map(f => ({
          id: f.id, type: 'Comprobante', category: 'facturacion',
          description: `${f.tipo_comprobante} #${f.numero_comprobante}`,
          detail: `${f.razon_social} — Bs ${f.total?.toFixed(2) || '0.00'}`,
          timestamp: f.created_at, icon: Receipt,
        })),
        ...(compras.data || []).map(c => ({
          id: c.id, type: 'Compra', category: 'compras',
          description: `Compra #${c.numero}`,
          detail: `Total: Bs ${c.total?.toFixed(2) || '0.00'} — ${c.estado || 'pendiente'}`,
          timestamp: c.created_at || '', icon: ShoppingCart,
        })),
        ...(asientos.data || []).map(a => ({
          id: a.id, type: 'Asiento', category: 'contabilidad',
          description: `Asiento #${a.numero}`,
          detail: `${a.concepto} — D: ${a.debe?.toFixed(2) || '0'} / H: ${a.haber?.toFixed(2) || '0'}`,
          timestamp: a.created_at || '', icon: FileText,
        })),
        ...(profiles.data || []).map(p => ({
          id: p.id, type: 'Registro Usuario', category: 'usuarios',
          description: `Nuevo usuario: ${p.display_name || 'Sin nombre'}`,
          detail: `Empresa: ${p.empresa || 'Sin empresa'}`,
          timestamp: p.created_at, icon: Users,
        })),
        ...(productos.data || []).map(p => ({
          id: p.id, type: 'Producto', category: 'inventario',
          description: `Producto creado: ${p.nombre}`,
          detail: '', timestamp: p.created_at || '', icon: Package,
        })),
        ...(clientes.data || []).map(c => ({
          id: c.id, type: 'Cliente', category: 'clientes',
          description: `Cliente registrado: ${c.nombre}`,
          detail: '', timestamp: c.created_at || '', icon: Users,
        })),
        ...(proveedores.data || []).map(p => ({
          id: p.id, type: 'Proveedor', category: 'proveedores',
          description: `Proveedor registrado: ${p.nombre}`,
          detail: '', timestamp: p.created_at || '', icon: Building2,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 50);

      setLogs(entries);
    } catch (e) {
      console.error('Error loading activity:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const typeVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    'Comprobante': 'default',
    'Compra': 'secondary',
    'Asiento': 'outline',
    'Registro Usuario': 'default',
    'Producto': 'secondary',
    'Cliente': 'outline',
    'Proveedor': 'secondary',
  };

  const categories = ['all', ...new Set(logs.map(l => l.category))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.detail.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || log.category === filterType;
    return matchesSearch && matchesType;
  });

  // Stats by category
  const statsByCategory = logs.reduce((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const categoriasActivas = categories.filter(category => category !== 'all').length;

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Logs de actividad"
        subtitle="Monitorea operaciones recientes, trazabilidad administrativa y eventos relevantes del ecosistema."
        badge={{
          text: `${logs.length} registros`,
          variant: 'secondary',
        }}
        actions={
          <Button variant="outline" size="sm" onClick={loadActivityLogs} className="gap-2" disabled={loading || refreshing}>
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Button>
        }
      />

      <MetricGrid columns={4}>
        <EnhancedMetricCard title="Actividad total" value={logs.length} subtitle="Eventos recopilados" icon={Activity} />
        <EnhancedMetricCard title="Categorias" value={categoriasActivas} subtitle="Fuentes activas de trazabilidad" icon={Filter} />
        <EnhancedMetricCard title="Resultados" value={filteredLogs.length} subtitle="Coincidencias segun filtros" icon={Search} variant="success" />
        <EnhancedMetricCard title="Ultimo refresco" value={loading || refreshing ? "Cargando" : "Listo"} subtitle="Estado de sincronizacion" icon={RefreshCw} variant={loading || refreshing ? 'warning' : 'secondary'} />
      </MetricGrid>

      <div className="hero-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Trazabilidad ejecutiva
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">
              Consulta actividad comercial, contable y administrativa desde una sola linea de tiempo
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Esta vista ayuda a detectar cambios relevantes, validar eventos recientes y preparar
              revisiones operativas o de soporte sin navegar por multiples modulos.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Uso sugerido
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Filtra por categoria</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Reduce ruido y enfoca la revision por ventas, compras, usuarios o contabilidad.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Valida orden cronologico</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Usa el timeline para reconstruir incidencias y confirmar que los eventos sigan la secuencia esperada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statsByCategory).map(([type, count]) => (
          <Badge key={type} variant="outline" className="text-xs py-1 px-2">
            {type}: {count}
          </Badge>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en actividad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <Filter className="w-3 h-3 mr-2" />
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat === 'all' ? 'Todas las categorías' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actividad Reciente</CardTitle>
          <CardDescription>Todas las acciones del sistema en orden cronológico</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log, index) => {
                const showDateHeader = index === 0 || 
                  new Date(log.timestamp).toDateString() !== new Date(filteredLogs[index - 1].timestamp).toDateString();

                return (
                  <div key={`${log.type}-${log.id}`}>
                    {showDateHeader && (
                      <div className="py-2 mt-2 first:mt-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {new Date(log.timestamp).toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    )}
                    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                      <div className="mt-0.5 p-1.5 rounded bg-muted">
                        <log.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{log.description}</p>
                        {log.detail && (
                          <p className="text-xs text-muted-foreground mt-0.5">{log.detail}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.timestamp).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge variant={typeVariants[log.type] || 'outline'} className="text-xs flex-shrink-0">
                        {log.type}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {filteredLogs.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No hay actividad que coincida con los filtros</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-right">
        Mostrando {filteredLogs.length} de {logs.length} registros
      </p>
    </div>
  );
};

export default ActivityLogs;
