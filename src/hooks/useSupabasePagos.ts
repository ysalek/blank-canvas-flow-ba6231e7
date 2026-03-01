import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Pago {
  id?: string;
  tipo: string;
  factura_id?: string;
  compra_id?: string;
  fecha: string;
  monto: number;
  metodo_pago?: string;
  numero_comprobante?: string;
  observaciones?: string;
  estado?: string;
}

export const useSupabasePagos = () => {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPagos = async () => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPagos([]);
        return;
      }

      const { data, error } = await supabase
        .from('pagos')
        .select(`
          *,
          facturas(numero, total),
          compras(numero, total)
        `)
        .eq('user_id', user.id) // SECURITY FIX: Filtro explícito por usuario
        .order('fecha', { ascending: false });

      if (error) throw error;
      setPagos(data || []);
    } catch (error) {
      console.error('Error fetching pagos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pagos",
        variant: "destructive"
      });
    }
  };

  const createPago = async (pago: Omit<Pago, 'id'>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('pagos')
        .insert([{ ...pago, user_id: user.user.id }])
        .select('id, tipo, factura_id, compra_id, fecha, monto, metodo_pago, numero_comprobante, observaciones, estado, user_id, created_at')
        .maybeSingle();

      if (error) throw error;
      
      setPagos(prev => [data, ...prev]);
      toast({
        title: "Éxito",
        description: "Pago registrado correctamente"
      });
      
      return data;
    } catch (error) {
      console.error('Error creating pago:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updatePago = async (id: string, updates: Partial<Pago>) => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('pagos')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, tipo, factura_id, compra_id, fecha, monto, metodo_pago, numero_comprobante, observaciones, estado, user_id, created_at')
        .maybeSingle();

      if (error) throw error;
      
      setPagos(prev => prev.map(item => 
        item.id === id ? { ...item, ...data } : item
      ));
      
      toast({
        title: "Éxito",
        description: "Pago actualizado correctamente"
      });
      
      return data;
    } catch (error) {
      console.error('Error updating pago:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el pago",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deletePago = async (id: string) => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('pagos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // SECURITY FIX: Verificar propiedad del pago

      if (error) throw error;
      
      setPagos(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Éxito",
        description: "Pago eliminado correctamente"
      });
    } catch (error) {
      console.error('Error deleting pago:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el pago",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchPagos();
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    pagos,
    loading,
    createPago,
    updatePago,
    deletePago,
    refetch: fetchPagos
  };
};