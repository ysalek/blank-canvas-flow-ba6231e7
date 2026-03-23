import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Presupuesto, PresupuestoItem } from '../types';

const LEGACY_PRESUPUESTOS_KEY = 'presupuestos';
const LEGACY_ITEMS_KEY = 'itemsPresupuesto';

const mapPresupuestoRow = (row: {
  id: string;
  nombre: string;
  descripcion: string | null;
  periodo: string;
  estado: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  responsable: string | null;
  total_presupuestado: number | null;
  total_ejecutado: number | null;
}): Presupuesto => ({
  id: row.id,
  nombre: row.nombre,
  descripcion: row.descripcion || '',
  periodo: row.periodo,
  estado: (row.estado as Presupuesto['estado']) || 'borrador',
  fechaInicio: row.fecha_inicio,
  fechaFin: row.fecha_fin,
  responsable: row.responsable || '',
  totalPresupuestado: Number(row.total_presupuestado || 0),
  totalEjecutado: Number(row.total_ejecutado || 0),
});

const mapItemRow = (row: {
  id: string;
  concepto: string;
  categoria: string;
  presupuestado: number;
  ejecutado: number | null;
  variacion: number | null;
  porcentaje_ejecucion: number | null;
  presupuesto_id: string | null;
}): PresupuestoItem & { presupuestoId?: string } => ({
  id: row.id,
  concepto: row.concepto,
  categoria: row.categoria,
  presupuestado: Number(row.presupuestado || 0),
  ejecutado: Number(row.ejecutado || 0),
  variacion: Number(row.variacion || 0),
  porcentajeEjecucion: Number(row.porcentaje_ejecucion || 0),
  presupuestoId: row.presupuesto_id || undefined,
});

const recomputePresupuesto = (items: PresupuestoItem[]) => {
  const totalPresupuestado = items.reduce((sum, item) => sum + Number(item.presupuestado || 0), 0);
  const totalEjecutado = items.reduce((sum, item) => sum + Number(item.ejecutado || 0), 0);

  return {
    totalPresupuestado,
    totalEjecutado,
  };
};

export const usePresupuestos = () => {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [itemsPresupuesto, setItemsPresupuesto] = useState<PresupuestoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        setPresupuestos([]);
        setItemsPresupuesto([]);
        setLoading(false);
        return;
      }

      const [presupuestosRes, itemsRes] = await Promise.all([
        supabase
          .from('presupuestos')
          .select('id, nombre, descripcion, periodo, estado, fecha_inicio, fecha_fin, responsable, total_presupuestado, total_ejecutado')
          .eq('user_id', user.id)
          .order('fecha_inicio', { ascending: false }),
        supabase
          .from('items_presupuestos')
          .select('id, concepto, categoria, presupuestado, ejecutado, variacion, porcentaje_ejecucion, presupuesto_id'),
      ]);

      if (presupuestosRes.error) throw presupuestosRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const presupuestosMapped = (presupuestosRes.data || []).map(mapPresupuestoRow);
      let itemsMapped = (itemsRes.data || []).map(mapItemRow);

      const presupuestoIds = new Set(presupuestosMapped.map((item) => item.id));
      itemsMapped = itemsMapped.filter((item) => item.presupuestoId && presupuestoIds.has(item.presupuestoId));

      if (presupuestosMapped.length === 0 && itemsMapped.length === 0) {
        const legacyPresupuestos = typeof window !== 'undefined' ? window.localStorage.getItem(LEGACY_PRESUPUESTOS_KEY) : null;
        const legacyItems = typeof window !== 'undefined' ? window.localStorage.getItem(LEGACY_ITEMS_KEY) : null;

        if (legacyPresupuestos) {
          const parsedPresupuestos = JSON.parse(legacyPresupuestos) as Presupuesto[];
          const parsedItems = legacyItems ? (JSON.parse(legacyItems) as PresupuestoItem[]) : [];

          for (const presupuesto of parsedPresupuestos) {
            const { data: insertedPresupuesto, error: presupuestoError } = await supabase
              .from('presupuestos')
              .insert({
                user_id: user.id,
                nombre: presupuesto.nombre,
                descripcion: presupuesto.descripcion,
                periodo: presupuesto.periodo,
                estado: presupuesto.estado,
                fecha_inicio: presupuesto.fechaInicio,
                fecha_fin: presupuesto.fechaFin,
                responsable: presupuesto.responsable,
                total_presupuestado: presupuesto.totalPresupuestado,
                total_ejecutado: presupuesto.totalEjecutado,
              })
              .select('id')
              .single();

            if (presupuestoError) throw presupuestoError;

            const legacyItemsForBudget = parsedItems.filter((item) => item.id.startsWith(`${presupuesto.id}-`) || item.id.includes(presupuesto.id));
            if (legacyItemsForBudget.length > 0) {
              const payload = legacyItemsForBudget.map((item) => ({
                presupuesto_id: insertedPresupuesto.id,
                concepto: item.concepto,
                categoria: item.categoria,
                presupuestado: item.presupuestado,
                ejecutado: item.ejecutado,
                variacion: item.variacion,
                porcentaje_ejecucion: item.porcentajeEjecucion,
              }));

              const { error: itemsError } = await supabase.from('items_presupuestos').insert(payload);
              if (itemsError) throw itemsError;
            }
          }

          window.localStorage.removeItem(LEGACY_PRESUPUESTOS_KEY);
          window.localStorage.removeItem(LEGACY_ITEMS_KEY);
          toast({
            title: 'Presupuestos migrados',
            description: 'Los presupuestos guardados en este navegador se migraron a la base principal.',
          });

          return fetchData();
        }
      }

      setPresupuestos(presupuestosMapped);
      setItemsPresupuesto(itemsMapped);
    } catch (error) {
      console.error('Error cargando presupuestos:', error);
      toast({
        title: 'Error al cargar presupuestos',
        description: 'No se pudo conectar la capa presupuestaria con la base principal.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const crearPresupuesto = useCallback(async (presupuestoData: Omit<Presupuesto, 'id'>) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('presupuestos')
      .insert({
        user_id: user.id,
        nombre: presupuestoData.nombre,
        descripcion: presupuestoData.descripcion,
        periodo: presupuestoData.periodo,
        estado: presupuestoData.estado,
        fecha_inicio: presupuestoData.fechaInicio,
        fecha_fin: presupuestoData.fechaFin,
        responsable: presupuestoData.responsable,
        total_presupuestado: presupuestoData.totalPresupuestado,
        total_ejecutado: presupuestoData.totalEjecutado,
      })
      .select('id, nombre, descripcion, periodo, estado, fecha_inicio, fecha_fin, responsable, total_presupuestado, total_ejecutado')
      .single();

    if (error) throw error;

    const nuevoPresupuesto = mapPresupuestoRow(data);
    setPresupuestos((prev) => [nuevoPresupuesto, ...prev]);
    return nuevoPresupuesto;
  }, []);

  const actualizarPresupuesto = useCallback(async (id: string, presupuestoData: Partial<Presupuesto>) => {
    const payload: Record<string, unknown> = {};
    if (presupuestoData.nombre !== undefined) payload.nombre = presupuestoData.nombre;
    if (presupuestoData.descripcion !== undefined) payload.descripcion = presupuestoData.descripcion;
    if (presupuestoData.periodo !== undefined) payload.periodo = presupuestoData.periodo;
    if (presupuestoData.estado !== undefined) payload.estado = presupuestoData.estado;
    if (presupuestoData.fechaInicio !== undefined) payload.fecha_inicio = presupuestoData.fechaInicio;
    if (presupuestoData.fechaFin !== undefined) payload.fecha_fin = presupuestoData.fechaFin;
    if (presupuestoData.responsable !== undefined) payload.responsable = presupuestoData.responsable;
    if (presupuestoData.totalPresupuestado !== undefined) payload.total_presupuestado = presupuestoData.totalPresupuestado;
    if (presupuestoData.totalEjecutado !== undefined) payload.total_ejecutado = presupuestoData.totalEjecutado;

    const { data, error } = await supabase
      .from('presupuestos')
      .update(payload)
      .eq('id', id)
      .select('id, nombre, descripcion, periodo, estado, fecha_inicio, fecha_fin, responsable, total_presupuestado, total_ejecutado')
      .single();

    if (error) throw error;

    const presupuestoActualizado = mapPresupuestoRow(data);
    setPresupuestos((prev) => prev.map((item) => (item.id === id ? presupuestoActualizado : item)));
    return presupuestoActualizado;
  }, []);

  const eliminarPresupuesto = useCallback(async (id: string) => {
    const { error } = await supabase.from('presupuestos').delete().eq('id', id);
    if (error) throw error;

    setPresupuestos((prev) => prev.filter((item) => item.id !== id));
    setItemsPresupuesto((prev) => prev.filter((item) => !('presupuestoId' in item) || (item as PresupuestoItem & { presupuestoId?: string }).presupuestoId !== id));
  }, []);

  const crearItemPresupuesto = useCallback(async (
    presupuestoId: string,
    itemData: Omit<PresupuestoItem, 'id' | 'variacion' | 'porcentajeEjecucion'>,
  ) => {
    const variacion = Number(itemData.ejecutado || 0) - Number(itemData.presupuestado || 0);
    const porcentajeEjecucion = Number(itemData.presupuestado || 0) > 0
      ? (Number(itemData.ejecutado || 0) / Number(itemData.presupuestado || 0)) * 100
      : 0;

    const { data, error } = await supabase
      .from('items_presupuestos')
      .insert({
        presupuesto_id: presupuestoId,
        concepto: itemData.concepto,
        categoria: itemData.categoria,
        presupuestado: itemData.presupuestado,
        ejecutado: itemData.ejecutado,
        variacion,
        porcentaje_ejecucion: porcentajeEjecucion,
      })
      .select('id, concepto, categoria, presupuestado, ejecutado, variacion, porcentaje_ejecucion, presupuesto_id')
      .single();

    if (error) throw error;

    const nuevoItem = mapItemRow(data);
    setItemsPresupuesto((prev) => [...prev, nuevoItem]);

    const itemsDelPresupuesto = [...itemsPresupuesto, nuevoItem].filter(
      (item) => (item as PresupuestoItem & { presupuestoId?: string }).presupuestoId === presupuestoId,
    );
    const totals = recomputePresupuesto(itemsDelPresupuesto);
    await actualizarPresupuesto(presupuestoId, totals);

    return nuevoItem;
  }, [actualizarPresupuesto, itemsPresupuesto]);

  const actualizarItemPresupuesto = useCallback(async (id: string, itemData: Partial<PresupuestoItem>) => {
    const current = itemsPresupuesto.find((item) => item.id === id) as (PresupuestoItem & { presupuestoId?: string }) | undefined;
    if (!current) return;

    const ejecutado = itemData.ejecutado ?? current.ejecutado;
    const presupuestado = itemData.presupuestado ?? current.presupuestado;
    const variacion = Number(ejecutado) - Number(presupuestado);
    const porcentajeEjecucion = Number(presupuestado) > 0 ? (Number(ejecutado) / Number(presupuestado)) * 100 : 0;

    const { data, error } = await supabase
      .from('items_presupuestos')
      .update({
        concepto: itemData.concepto ?? current.concepto,
        categoria: itemData.categoria ?? current.categoria,
        presupuestado,
        ejecutado,
        variacion,
        porcentaje_ejecucion: porcentajeEjecucion,
      })
      .eq('id', id)
      .select('id, concepto, categoria, presupuestado, ejecutado, variacion, porcentaje_ejecucion, presupuesto_id')
      .single();

    if (error) throw error;

    const itemActualizado = mapItemRow(data);
    const nuevosItems = itemsPresupuesto.map((item) => (item.id === id ? itemActualizado : item));
    setItemsPresupuesto(nuevosItems);

    if (current.presupuestoId) {
      const itemsDelPresupuesto = nuevosItems.filter(
        (item) => (item as PresupuestoItem & { presupuestoId?: string }).presupuestoId === current.presupuestoId,
      );
      const totals = recomputePresupuesto(itemsDelPresupuesto);
      await actualizarPresupuesto(current.presupuestoId, totals);
    }
  }, [actualizarPresupuesto, itemsPresupuesto]);

  const eliminarItemPresupuesto = useCallback(async (id: string) => {
    const current = itemsPresupuesto.find((item) => item.id === id) as (PresupuestoItem & { presupuestoId?: string }) | undefined;
    const { error } = await supabase.from('items_presupuestos').delete().eq('id', id);
    if (error) throw error;

    const nuevosItems = itemsPresupuesto.filter((item) => item.id !== id);
    setItemsPresupuesto(nuevosItems);

    if (current?.presupuestoId) {
      const itemsDelPresupuesto = nuevosItems.filter(
        (item) => (item as PresupuestoItem & { presupuestoId?: string }).presupuestoId === current.presupuestoId,
      );
      const totals = recomputePresupuesto(itemsDelPresupuesto);
      await actualizarPresupuesto(current.presupuestoId, totals);
    }
  }, [actualizarPresupuesto, itemsPresupuesto]);

  const obtenerItemsPorPresupuesto = useCallback((presupuestoId: string) => {
    return itemsPresupuesto.filter(
      (item) => (item as PresupuestoItem & { presupuestoId?: string }).presupuestoId === presupuestoId,
    );
  }, [itemsPresupuesto]);

  const obtenerMetricas = useCallback(() => {
    const totalPresupuestado = presupuestos.reduce((sum, item) => sum + Number(item.totalPresupuestado || 0), 0);
    const totalEjecutado = presupuestos.reduce((sum, item) => sum + Number(item.totalEjecutado || 0), 0);
    const presupuestosActivos = presupuestos.filter((item) => item.estado === 'en_ejecucion').length;
    const variacionTotal = totalEjecutado - totalPresupuestado;

    return {
      totalPresupuestado,
      totalEjecutado,
      variacionTotal,
      presupuestosActivos,
      porcentajeEjecucion: totalPresupuestado > 0 ? (totalEjecutado / totalPresupuestado) * 100 : 0,
    };
  }, [presupuestos]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    presupuestos,
    itemsPresupuesto,
    loading,
    crearPresupuesto,
    actualizarPresupuesto,
    eliminarPresupuesto,
    crearItemPresupuesto,
    actualizarItemPresupuesto,
    eliminarItemPresupuesto,
    obtenerItemsPorPresupuesto,
    obtenerMetricas,
    refetch: fetchData,
  };
};
