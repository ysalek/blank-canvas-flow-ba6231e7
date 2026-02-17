import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ActivoFijo {
  id?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  fecha_adquisicion: string;
  costo_inicial: number;
  valor_residual?: number;
  vida_util_anos: number;
  metodo_depreciacion?: string;
  categoria?: string;
  ubicacion?: string;
  estado?: string;
}

export interface DepreciacionActivo {
  id?: string;
  activo_id: string;
  periodo: string;
  valor_depreciacion: number;
  depreciacion_acumulada: number;
  valor_neto: number;
  fecha_depreciacion: string;
}

export const useSupabaseActivosFijos = () => {
  const [activosFijos, setActivosFijos] = useState<ActivoFijo[]>([]);
  const [depreciaciones, setDepreciaciones] = useState<DepreciacionActivo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchActivosFijos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setActivosFijos([]); return; }

      const { data, error } = await supabase
        .from('activos_fijos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivosFijos(data || []);
    } catch (error) {
      console.error('Error fetching activos fijos:', error);
      toast({ title: "Error", description: "No se pudieron cargar los activos fijos", variant: "destructive" });
    }
  };

  const fetchDepreciaciones = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setDepreciaciones([]); return; }

      const { data, error } = await supabase
        .from('depreciaciones_activos')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha_depreciacion', { ascending: false });

      if (error) throw error;
      setDepreciaciones(data || []);
    } catch (error) {
      console.error('Error fetching depreciaciones:', error);
      toast({ title: "Error", description: "No se pudieron cargar las depreciaciones", variant: "destructive" });
    }
  };

  const createActivoFijo = async (activo: Omit<ActivoFijo, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('activos_fijos')
        .insert([{ ...activo, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      setActivosFijos(prev => [data, ...prev]);
      toast({ title: "Éxito", description: "Activo fijo creado correctamente" });
      return data;
    } catch (error) {
      console.error('Error creating activo fijo:', error);
      toast({ title: "Error", description: "No se pudo crear el activo fijo", variant: "destructive" });
      throw error;
    }
  };

  const updateActivoFijo = async (id: string, updates: Partial<ActivoFijo>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('activos_fijos')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setActivosFijos(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
      toast({ title: "Éxito", description: "Activo fijo actualizado correctamente" });
      return data;
    } catch (error) {
      console.error('Error updating activo fijo:', error);
      toast({ title: "Error", description: "No se pudo actualizar el activo fijo", variant: "destructive" });
      throw error;
    }
  };

  const deleteActivoFijo = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('activos_fijos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setActivosFijos(prev => prev.filter(item => item.id !== id));
      toast({ title: "Éxito", description: "Activo fijo eliminado correctamente" });
    } catch (error) {
      console.error('Error deleting activo fijo:', error);
      toast({ title: "Error", description: "No se pudo eliminar el activo fijo", variant: "destructive" });
      throw error;
    }
  };

  const createDepreciacion = async (depreciacion: Omit<DepreciacionActivo, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('depreciaciones_activos')
        .insert([{ ...depreciacion, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      setDepreciaciones(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating depreciacion:', error);
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchActivosFijos(), fetchDepreciaciones()]);
      setLoading(false);
    };
    loadData();
  }, []);

  return {
    activosFijos, depreciaciones, loading,
    createActivoFijo, updateActivoFijo, deleteActivoFijo, createDepreciacion,
    refetch: () => Promise.all([fetchActivosFijos(), fetchDepreciaciones()])
  };
};
