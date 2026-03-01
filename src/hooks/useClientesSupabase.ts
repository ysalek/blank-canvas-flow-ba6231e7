import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente } from "@/components/contable/billing/BillingData";

export const useClientesSupabase = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setClientes([]); return; }

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', user.id)
        .order('nombre');

      if (error) throw error;

      const mapped: Cliente[] = (data || []).map(c => ({
        id: c.id,
        nombre: c.nombre,
        nit: c.nit,
        email: c.email || '',
        telefono: c.telefono || '',
        direccion: c.direccion || '',
        activo: c.activo ?? true,
        fechaCreacion: c.created_at?.split('T')[0] || ''
      }));

      setClientes(mapped);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const agregarCliente = async (cliente: Omit<Cliente, 'id' | 'fechaCreacion'>): Promise<Cliente | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre: cliente.nombre,
          nit: cliente.nit,
          email: cliente.email || null,
          telefono: cliente.telefono || null,
          direccion: cliente.direccion || null,
          activo: cliente.activo,
          user_id: user.id
        })
        .select('id, nombre, nit, email, telefono, direccion, activo, created_at, user_id')
        .maybeSingle();

      if (error) throw error;

      const nuevoCliente: Cliente = {
        id: data.id,
        nombre: data.nombre,
        nit: data.nit,
        email: data.email || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        activo: data.activo ?? true,
        fechaCreacion: data.created_at?.split('T')[0] || ''
      };

      setClientes(prev => [nuevoCliente, ...prev]);
      return nuevoCliente;
    } catch (error) {
      console.error('Error agregando cliente:', error);
      return null;
    }
  };

  return { clientes, loading, agregarCliente, refetch: fetchClientes };
};
