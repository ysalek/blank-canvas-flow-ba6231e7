import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProveedorSupabase {
  id: string;
  user_id?: string;
  codigo: string;
  nombre: string;
  nit: string;
  telefono: string;
  direccion: string;
  email?: string;
  activo: boolean;
  saldo_deuda: number;
  created_at?: string;
  updated_at?: string;
}

export interface CompraProveedorSupabase {
  id: string;
  user_id: string;
  proveedor_id: string;
  numero: string;
  fecha: string;
  fecha_vencimiento?: string;
  subtotal: number;
  descuento_total: number;
  iva: number;
  total: number;
  estado: 'pendiente' | 'recibida' | 'pagada' | 'anulada';
  tipo_pago: 'contado' | 'credito';
  monto_pagado: number;
  saldo_pendiente: number;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

export const useSupabaseProveedores = () => {
  const [proveedores, setProveedores] = useState<ProveedorSupabase[]>([]);
  const [compras, setCompras] = useState<CompraProveedorSupabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  // Cargar proveedores y compras
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 [Proveedores] Cargando datos...');

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!user) {
        console.log('❌ [Proveedores] No hay usuario autenticado');
        setProveedores([]);
        setCompras([]);
        return;
      }

      if (userError) throw userError;

      // Cargar proveedores
      const { data: proveedoresData, error: proveedoresError } = await supabase
        .from('proveedores')
        .select('id, codigo, nombre, nit, telefono, direccion, email, activo, saldo_deuda, user_id, created_at, updated_at')
        .eq('user_id', user.id)
        .order('nombre');

      if (proveedoresError) throw proveedoresError;

      setProveedores(proveedoresData || []);

      // Cargar compras (separado para no bloquear proveedores si falla)
      try {
        const { data: comprasData, error: comprasError } = await supabase
          .from('compras')
          .select('id, user_id, numero, proveedor_id, fecha, fecha_vencimiento, subtotal, descuento_total, iva, total, estado, tipo_pago, monto_pagado, saldo_pendiente, observaciones, created_at, updated_at')
          .eq('user_id', user.id)
          .order('fecha', { ascending: false });

        if (comprasError) {
          console.warn('⚠️ [Proveedores] Error al cargar compras:', comprasError.message);
          setCompras([]);
        } else {
          setCompras((comprasData || []).map(c => ({
            ...c,
            estado: c.estado as 'pendiente' | 'recibida' | 'pagada' | 'anulada',
            tipo_pago: c.tipo_pago as 'contado' | 'credito'
          })));
        }
      } catch (comprasErr) {
        console.warn('⚠️ [Proveedores] Error inesperado en compras:', comprasErr);
        setCompras([]);
      }

      console.log('✅ [Proveedores] Datos cargados:', {
        proveedores: proveedoresData?.length || 0
      });
    } catch (error: any) {
      console.error('❌ [Proveedores] Error:', error);
      toast({
        title: "Error al cargar proveedores",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [toast]);

  // Crear proveedor
  const crearProveedor = async (proveedorData: Omit<ProveedorSupabase, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('proveedores')
        .insert([{ ...proveedorData, user_id: user.id }])
        .select('id, codigo, nombre, nit, telefono, direccion, email, activo, saldo_deuda, user_id, created_at, updated_at')
        .maybeSingle();

      if (error) throw error;

      console.log('✅ [Proveedores] Proveedor creado:', data);
      await fetchData();

      toast({
        title: "Proveedor creado",
        description: `${proveedorData.nombre} registrado exitosamente.`,
      });

      return data;
    } catch (error: any) {
      console.error('❌ [Proveedores] Error al crear:', error);
      toast({
        title: "Error al crear proveedor",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Actualizar proveedor
  const actualizarProveedor = async (id: string, proveedorData: Partial<ProveedorSupabase>) => {
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .update(proveedorData)
        .eq('id', id)
        .select('id, codigo, nombre, nit, telefono, direccion, email, activo, saldo_deuda, user_id, created_at, updated_at')
        .maybeSingle();

      if (error) throw error;

      console.log('✅ [Proveedores] Proveedor actualizado:', data);
      await fetchData();

      toast({
        title: "Proveedor actualizado",
        description: "Los cambios se guardaron exitosamente.",
      });

      return data;
    } catch (error: any) {
      console.error('❌ [Proveedores] Error al actualizar:', error);
      toast({
        title: "Error al actualizar proveedor",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Actualizar deuda de proveedor
  const actualizarDeudaProveedor = async (proveedorId: string, monto: number) => {
    try {
      const proveedor = proveedores.find(p => p.id === proveedorId);
      if (!proveedor) throw new Error('Proveedor no encontrado');

      const nuevaSaldoDeuda = proveedor.saldo_deuda + monto;

      await actualizarProveedor(proveedorId, { saldo_deuda: nuevaSaldoDeuda });
    } catch (error: any) {
      console.error('❌ [Proveedores] Error al actualizar deuda:', error);
      throw error;
    }
  };

  // Crear compra
  const crearCompra = async (
    compraData: Omit<CompraProveedorSupabase, 'id' | 'created_at' | 'updated_at' | 'user_id'>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('compras')
        .insert([{ ...compraData, user_id: user.id }])
        .select('id, numero, proveedor_id, fecha, fecha_vencimiento, subtotal, descuento_total, iva, total, estado, tipo_pago, monto_pagado, saldo_pendiente, observaciones, created_at, updated_at')
        .maybeSingle();

      if (error) throw error;

      console.log('✅ [Proveedores] Compra creada:', data);

      // Actualizar deuda del proveedor si es a crédito
      if (compraData.tipo_pago === 'credito') {
        await actualizarDeudaProveedor(compraData.proveedor_id, compraData.saldo_pendiente);
      }

      await fetchData();

      toast({
        title: "Compra registrada",
        description: `Compra ${compraData.numero} registrada exitosamente.`,
      });

      return data;
    } catch (error: any) {
      console.error('❌ [Proveedores] Error al crear compra:', error);
      toast({
        title: "Error al registrar compra",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Actualizar compra
  const actualizarCompra = async (id: string, compraData: Partial<CompraProveedorSupabase>) => {
    try {
      const { data, error } = await supabase
        .from('compras')
        .update(compraData)
        .eq('id', id)
        .select('id, numero, proveedor_id, fecha, fecha_vencimiento, subtotal, descuento_total, iva, total, estado, tipo_pago, monto_pagado, saldo_pendiente, observaciones, created_at, updated_at')
        .maybeSingle();

      if (error) throw error;

      console.log('✅ [Proveedores] Compra actualizada:', data);
      await fetchData();

      toast({
        title: "Compra actualizada",
        description: "Los cambios se guardaron exitosamente.",
      });

      return data;
    } catch (error: any) {
      console.error('❌ [Proveedores] Error al actualizar compra:', error);
      toast({
        title: "Error al actualizar compra",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Cargar datos inicialmente
  useEffect(() => {
    if (!initialized) {
      fetchData();
    }
  }, [initialized, fetchData]);

  // Listener de cambios de autenticación
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('🔐 [Proveedores] Auth change:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchData();
      } else if (event === 'SIGNED_OUT') {
        setProveedores([]);
        setCompras([]);
        setInitialized(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  return {
    proveedores,
    compras,
    loading,
    crearProveedor,
    actualizarProveedor,
    actualizarDeudaProveedor,
    crearCompra,
    actualizarCompra,
    refetch: fetchData
  };
};
