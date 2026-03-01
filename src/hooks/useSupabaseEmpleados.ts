import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmpleadoSupabase {
  id: string;
  numero_empleado: string;
  nombres: string;
  apellidos: string;
  ci: string;
  fecha_nacimiento: string;
  genero: 'masculino' | 'femenino' | 'otro' | null;
  estado_civil: 'soltero' | 'casado' | 'divorciado' | 'viudo' | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  departamento: string;
  cargo: string;
  fecha_ingreso: string;
  salario_base: number;
  beneficios: string[] | null;
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'licencia' | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const useSupabaseEmpleados = () => {
  const [empleados, setEmpleados] = useState<EmpleadoSupabase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Cargar empleados
  const fetchEmpleados = async () => {
    try {
      setLoading(true);

      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEmpleados([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('user_id', user.id) // SECURITY FIX: Filtro explícito por usuario
        .order('numero_empleado');

      if (error) throw error;
      setEmpleados(data as EmpleadoSupabase[] || []);
    } catch (error: any) {
      toast({
        title: "Error al cargar empleados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Crear empleado
  const crearEmpleado = async (empleadoData: Omit<EmpleadoSupabase, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('empleados')
        .insert([{
          ...empleadoData,
          user_id: user.id
        }])
        .select('id, numero_empleado, nombres, apellidos, ci, fecha_nacimiento, genero, estado_civil, email, telefono, direccion, departamento, cargo, fecha_ingreso, salario_base, beneficios, estado, user_id, created_at, updated_at')
        .maybeSingle();

      if (error) throw error;

      setEmpleados(prev => [...prev, data as EmpleadoSupabase]);
      
      toast({
        title: "Empleado creado",
        description: "El empleado se ha registrado exitosamente",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error al crear empleado",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Actualizar empleado
  const actualizarEmpleado = async (id: string, empleadoData: Partial<EmpleadoSupabase>) => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('empleados')
        .update(empleadoData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, numero_empleado, nombres, apellidos, ci, fecha_nacimiento, genero, estado_civil, email, telefono, direccion, departamento, cargo, fecha_ingreso, salario_base, beneficios, estado, user_id, created_at, updated_at')
        .maybeSingle();

      if (error) throw error;

      setEmpleados(prev => 
        prev.map(emp => emp.id === id ? { ...emp, ...(data as EmpleadoSupabase) } : emp)
      );

      toast({
        title: "Empleado actualizado",
        description: "Los datos del empleado se han actualizado exitosamente",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error al actualizar empleado",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Eliminar empleado
  const eliminarEmpleado = async (id: string) => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('empleados')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // SECURITY FIX: Verificar propiedad del empleado

      if (error) throw error;

      setEmpleados(prev => prev.filter(emp => emp.id !== id));

      toast({
        title: "Empleado eliminado",
        description: "El empleado se ha eliminado exitosamente",
      });
    } catch (error: any) {
      toast({
        title: "Error al eliminar empleado",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Generar número de empleado
  const generarNumeroEmpleado = () => {
    const ultimoNumero = empleados.reduce((max, emp) => {
      const numero = parseInt(emp.numero_empleado.replace('EMP-', ''));
      return numero > max ? numero : max;
    }, 0);
    
    return `EMP-${(ultimoNumero + 1).toString().padStart(3, '0')}`;
  };

  useEffect(() => {
    fetchEmpleados();
  }, []);

  return {
    empleados,
    loading,
    crearEmpleado,
    actualizarEmpleado,
    eliminarEmpleado,
    generarNumeroEmpleado,
    refetch: fetchEmpleados
  };
};