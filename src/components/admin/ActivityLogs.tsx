import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, FileText, ShoppingCart, Receipt, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LogEntry {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  icon: any;
}

const ActivityLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityLogs();
  }, []);

  const loadActivityLogs = async () => {
    setLoading(true);
    try {
      // Aggregate recent activity from multiple tables
      const [facturas, compras, asientos, comprobantes] = await Promise.all([
        supabase.from('comprobantes_integrados').select('id, numero_comprobante, created_at, tipo_comprobante').order('created_at', { ascending: false }).limit(5),
        supabase.from('compras').select('id, numero, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('asientos_contables').select('id, numero, concepto, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('id, display_name, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      const entries: LogEntry[] = [
        ...(facturas.data || []).map(f => ({
          id: f.id,
          type: 'Comprobante',
          description: `${f.tipo_comprobante} #${f.numero_comprobante}`,
          timestamp: f.created_at,
          icon: Receipt,
        })),
        ...(compras.data || []).map(c => ({
          id: c.id,
          type: 'Compra',
          description: `Compra #${c.numero}`,
          timestamp: c.created_at || '',
          icon: ShoppingCart,
        })),
        ...(asientos.data || []).map(a => ({
          id: a.id,
          type: 'Asiento',
          description: `${a.concepto} (#${a.numero})`,
          timestamp: a.created_at || '',
          icon: FileText,
        })),
        ...(comprobantes.data || []).map(p => ({
          id: p.id,
          type: 'Registro',
          description: `Usuario: ${p.display_name || 'Nuevo'}`,
          timestamp: p.created_at,
          icon: Users,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 20);

      setLogs(entries);
    } catch (e) {
      console.error('Error loading activity:', e);
    } finally {
      setLoading(false);
    }
  };

  const typeColors: Record<string, string> = {
    'Comprobante': 'default',
    'Compra': 'secondary',
    'Asiento': 'outline',
    'Registro': 'default',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Logs de Actividad</h2>
          <p className="text-sm text-muted-foreground">Actividad reciente en el sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={`${log.type}-${log.id}`} className="flex items-center gap-3 p-3 rounded-lg border">
                  <log.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <Badge variant={typeColors[log.type] as any || 'outline'}>
                    {log.type}
                  </Badge>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No hay actividad reciente</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogs;
