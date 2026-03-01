import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MovimientoInventario } from '@/components/contable/inventory/InventoryData';

export interface MovimientoInventarioSupabase {
  id: string;
  user_id: string;
  producto_id: string;
  fecha: string;
  tipo: string;
  cantidad: number;
  stock_anterior: number;
  stock_actual: number;
  costo_unitario?: number;
  observaciones?: string;
  factura_id?: string;
  compra_id?: string;
  created_at?: string;
}

export const useSupabaseMovimientos = () => {
  const [movimientos, setMovimientos] = useState<MovimientoInventarioSupabase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Cargar movimientos de inventario
  const fetchMovimientos = async () => {
    try {
      setLoading(true);
      
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMovimientos([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('movimientos_inventario')
        .select(`
          *,
          productos (
            codigo,
            nombre,
            costo_unitario,
            precio_compra
          )
        `)
        .eq('user_id', user.id) // SECURITY FIX: Filtro explícito por usuario
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMovimientos(data || []);
    } catch (error: any) {
      console.error('Error cargando movimientos:', error);
      toast({
        title: "Error al cargar movimientos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Crear movimiento de inventario
  const crearMovimiento = async (movimientoData: Omit<MovimientoInventarioSupabase, 'id' | 'created_at' | 'user_id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('movimientos_inventario')
        .insert([{
          ...movimientoData,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setMovimientos(prev => [data, ...prev]);
      
      toast({
        title: "Movimiento registrado",
        description: "El movimiento de inventario se ha registrado exitosamente",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error al crear movimiento",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Convertir movimientos de Supabase al formato esperado por la UI
  const getMovimientosInventario = (): MovimientoInventario[] => {
    return movimientos.map(mov => {
      const prodData = (mov as any).productos;
      const costoReal = mov.costo_unitario || prodData?.costo_unitario || prodData?.precio_compra || 0;
      return {
        id: mov.id,
        fecha: mov.fecha,
        tipo: mov.tipo as 'entrada' | 'salida' | 'ajuste',
        productoId: mov.producto_id,
        producto: prodData?.nombre || 'Producto no encontrado',
        cantidad: mov.cantidad,
        costoUnitario: costoReal,
        costoPromedioPonderado: costoReal,
        motivo: mov.observaciones || `Movimiento ${mov.tipo}`,
        documento: mov.factura_id || mov.compra_id || 'N/A',
        usuario: 'Sistema',
        stockAnterior: mov.stock_anterior || 0,
        stockNuevo: mov.stock_actual || 0,
        valorMovimiento: costoReal * mov.cantidad
      };
    });
  };

  // Limpiar todos los movimientos (para resetear sistema)
  const limpiarMovimientos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('movimientos_inventario')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setMovimientos([]);
      
      toast({
        title: "Movimientos eliminados",
        description: "Todos los movimientos de inventario han sido eliminados",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error al limpiar movimientos",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchMovimientos();
  }, []);

  return {
    movimientos,
    loading,
    crearMovimiento,
    getMovimientosInventario,
    limpiarMovimientos,
    refetch: fetchMovimientos
  };
};