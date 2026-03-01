import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CuentaBancaria {
  id?: string;
  nombre: string;
  banco: string;
  numero_cuenta: string;
  tipo_cuenta?: string;
  moneda?: string;
  saldo?: number;
  activa?: boolean;
}

export interface MovimientoBancario {
  id?: string;
  cuenta_bancaria_id: string;
  fecha: string;
  tipo: string;
  monto: number;
  descripcion: string;
  numero_comprobante?: string;
  beneficiario?: string;
  saldo_anterior?: number;
  saldo_actual?: number;
}

export const useSupabaseBancos = () => {
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);
  const [movimientosBancarios, setMovimientosBancarios] = useState<MovimientoBancario[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCuentasBancarias = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCuentasBancarias([]); return; }

      const { data, error } = await supabase
        .from('cuentas_bancarias')
        .select('id, nombre, banco, numero_cuenta, tipo_cuenta, moneda, saldo, activa, user_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCuentasBancarias(data || []);
    } catch (error) {
      console.error('Error fetching cuentas bancarias:', error);
      toast({ title: "Error", description: "No se pudieron cargar las cuentas bancarias", variant: "destructive" });
    }
  };

  const fetchMovimientosBancarios = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMovimientosBancarios([]); return; }

      const { data, error } = await supabase
        .from('movimientos_bancarios')
        .select('id, cuenta_bancaria_id, fecha, tipo, monto, descripcion, numero_comprobante, beneficiario, saldo_anterior, saldo_actual, user_id, created_at, cuentas_bancarias(nombre, banco)')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setMovimientosBancarios(data || []);
    } catch (error) {
      console.error('Error fetching movimientos bancarios:', error);
      toast({ title: "Error", description: "No se pudieron cargar los movimientos bancarios", variant: "destructive" });
    }
  };

  const createCuentaBancaria = async (cuenta: Omit<CuentaBancaria, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('cuentas_bancarias')
        .insert([{ ...cuenta, user_id: user.id }])
        .select('id, nombre, banco, numero_cuenta, tipo_cuenta, moneda, saldo, activa, user_id, created_at')
        .maybeSingle();

      if (error) throw error;
      setCuentasBancarias(prev => [data, ...prev]);
      toast({ title: "Éxito", description: "Cuenta bancaria creada correctamente" });
      return data;
    } catch (error) {
      console.error('Error creating cuenta bancaria:', error);
      toast({ title: "Error", description: "No se pudo crear la cuenta bancaria", variant: "destructive" });
      throw error;
    }
  };

  const updateCuentaBancaria = async (id: string, updates: Partial<CuentaBancaria>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('cuentas_bancarias')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, nombre, banco, numero_cuenta, tipo_cuenta, moneda, saldo, activa, user_id, created_at')
        .maybeSingle();

      if (error) throw error;
      setCuentasBancarias(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
      toast({ title: "Éxito", description: "Cuenta bancaria actualizada correctamente" });
      return data;
    } catch (error) {
      console.error('Error updating cuenta bancaria:', error);
      toast({ title: "Error", description: "No se pudo actualizar la cuenta bancaria", variant: "destructive" });
      throw error;
    }
  };

  const createMovimientoBancario = async (movimiento: Omit<MovimientoBancario, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const cuenta = cuentasBancarias.find(c => c.id === movimiento.cuenta_bancaria_id);
      const saldoAnterior = cuenta?.saldo || 0;
      const saldoActual = movimiento.tipo === 'ingreso' ? saldoAnterior + movimiento.monto : saldoAnterior - movimiento.monto;

      const { data, error } = await supabase
        .from('movimientos_bancarios')
        .insert([{ ...movimiento, user_id: user.id, saldo_anterior: saldoAnterior, saldo_actual: saldoActual }])
        .select('id, cuenta_bancaria_id, fecha, tipo, monto, descripcion, numero_comprobante, beneficiario, saldo_anterior, saldo_actual, user_id, created_at')
        .maybeSingle();

      if (error) throw error;
      await updateCuentaBancaria(movimiento.cuenta_bancaria_id, { saldo: saldoActual });
      setMovimientosBancarios(prev => [data, ...prev]);
      toast({ title: "Éxito", description: "Movimiento bancario registrado correctamente" });
      return data;
    } catch (error) {
      console.error('Error creating movimiento bancario:', error);
      toast({ title: "Error", description: "No se pudo registrar el movimiento bancario", variant: "destructive" });
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCuentasBancarias(), fetchMovimientosBancarios()]);
      setLoading(false);
    };
    loadData();
  }, []);

  return {
    cuentasBancarias, movimientosBancarios, loading,
    createCuentaBancaria, updateCuentaBancaria, createMovimientoBancario,
    refetch: () => Promise.all([fetchCuentasBancarias(), fetchMovimientosBancarios()])
  };
};
