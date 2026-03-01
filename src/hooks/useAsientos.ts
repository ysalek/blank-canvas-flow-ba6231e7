import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AsientoContable, CuentaAsiento } from "@/components/contable/diary/DiaryData";
import { useState, useEffect, useCallback } from "react";

export const useAsientos = () => {
  const { toast } = useToast();
  const [asientos, setAsientos] = useState<AsientoContable[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar asientos desde Supabase
  const fetchAsientos = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAsientos([]);
        return;
      }

      // Obtener asientos contables
      const { data: asientosData, error: asientosError } = await supabase
        .from('asientos_contables')
        .select('id, numero, fecha, concepto, referencia, debe, haber, estado, user_id, created_at')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });

      if (asientosError) throw asientosError;

      // Obtener IDs de asientos del usuario
      const asientoIds = (asientosData || []).map(a => a.id);
      
      let cuentasData: any[] = [];
      if (asientoIds.length > 0) {
        const { data, error: cuentasError } = await supabase
          .from('cuentas_asientos')
          .select('id, asiento_id, codigo_cuenta, nombre_cuenta, debe, haber')
          .in('asiento_id', asientoIds);

        if (cuentasError) throw cuentasError;
        cuentasData = data || [];
      }

      // Mapear asientos con sus cuentas
      const asientosConCuentas: AsientoContable[] = (asientosData || []).map(asiento => {
        const cuentasDelAsiento = (cuentasData || [])
          .filter(cuenta => cuenta.asiento_id === asiento.id)
          .map(cuenta => ({
            codigo: cuenta.codigo_cuenta,
            nombre: cuenta.nombre_cuenta,
            debe: cuenta.debe || 0,
            haber: cuenta.haber || 0
          }));

        return {
          id: asiento.id,
          numero: asiento.numero,
          fecha: asiento.fecha,
          concepto: asiento.concepto,
          referencia: asiento.referencia || '',
          debe: asiento.debe || 0,
          haber: asiento.haber || 0,
          estado: asiento.estado as 'borrador' | 'registrado' | 'anulado',
          cuentas: cuentasDelAsiento
        };
      });

      setAsientos(asientosConCuentas);
    } catch (error) {
      console.error('Error fetching asientos:', error);
      setAsientos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAsientos();
  }, [fetchAsientos]);

  const getAsientos = (): AsientoContable[] => {
    return asientos;
  };

  const validarTransaccion = (asiento: AsientoContable): boolean => {
    const totalDebe = asiento.cuentas.reduce((sum, cuenta) => sum + cuenta.debe, 0);
    const totalHaber = asiento.cuentas.reduce((sum, cuenta) => sum + cuenta.haber, 0);
    
    if (Math.abs(totalDebe - totalHaber) > 0.01) {
      console.error("Error: El asiento no está balanceado", { totalDebe, totalHaber });
      return false;
    }
    
    return true;
  };

  const guardarAsiento = async (asiento: AsientoContable): Promise<boolean> => {
    if (!validarTransaccion(asiento)) {
      toast({
        title: "Error en el asiento contable",
        description: "El asiento no está balanceado. Debe = Haber",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes iniciar sesión para registrar asientos contables",
          variant: "destructive"
        });
        return false;
      }

      // Insertar asiento en Supabase
      const { data: nuevoAsiento, error: asientoError } = await supabase
        .from('asientos_contables')
        .insert({
          numero: asiento.numero,
          fecha: asiento.fecha,
          concepto: asiento.concepto,
          referencia: asiento.referencia || null,
          debe: asiento.debe,
          haber: asiento.haber,
          estado: asiento.estado || 'registrado',
          user_id: user.id
        })
        .select('id, numero, fecha, concepto, referencia, debe, haber, estado, user_id, created_at')
        .maybeSingle();

      if (asientoError) throw asientoError;

      // Insertar cuentas del asiento
      if (asiento.cuentas && asiento.cuentas.length > 0) {
        const cuentasParaInsertar = asiento.cuentas.map(cuenta => ({
          asiento_id: nuevoAsiento.id,
          codigo_cuenta: cuenta.codigo,
          nombre_cuenta: cuenta.nombre,
          debe: cuenta.debe,
          haber: cuenta.haber
        }));

        const { error: cuentasError } = await supabase
          .from('cuentas_asientos')
          .insert(cuentasParaInsertar);

        if (cuentasError) throw cuentasError;
      }

      // Actualizar estado local
      const asientoCompleto: AsientoContable = {
        ...asiento,
        id: nuevoAsiento.id
      };
      setAsientos(prev => [asientoCompleto, ...prev]);

      console.log("Asiento guardado correctamente en Supabase:", nuevoAsiento);
      
      toast({
        title: "Asiento contable registrado",
        description: `Asiento ${asiento.numero} registrado exitosamente`,
      });
      return true;

    } catch (error) {
      console.error('Error guardando asiento:', error);
      toast({
        title: "Error al guardar asiento",
        description: "No se pudo guardar el asiento en la base de datos. Intente nuevamente.",
        variant: "destructive"
      });
      return false;
    }
  };

  const actualizarEstadoAsiento = async (id: string, nuevoEstado: 'borrador' | 'registrado' | 'anulado'): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('asientos_contables')
        .update({ estado: nuevoEstado })
        .eq('id', id);

      if (error) throw error;

      setAsientos(prev => prev.map(a => 
        a.id === id ? { ...a, estado: nuevoEstado } : a
      ));

      return true;
    } catch (error) {
      console.error('Error actualizando estado:', error);
      return false;
    }
  };

  const refetch = () => {
    fetchAsientos();
  };

  return { 
    getAsientos, 
    guardarAsiento, 
    validarTransaccion,
    actualizarEstadoAsiento,
    loading,
    refetch
  };
};
