import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import type { Factura, Cliente, ItemFactura } from "@/components/contable/billing/BillingData";

type FacturaElectronicaUpdate = Partial<
  Pick<Factura, "estado" | "estadoSIN" | "cuf" | "cufd" | "puntoVenta" | "codigoControl" | "observaciones">
>;

type FacturaRow = Database["public"]["Tables"]["facturas"]["Row"];
type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
type ItemFacturaRow = Database["public"]["Tables"]["items_facturas"]["Row"];

export const useFacturas = () => {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFacturas = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { 
        console.log('📋 [Facturas] No hay usuario autenticado');
        setFacturas([]); 
        return; 
      }

      console.log('📋 [Facturas] Consultando facturas para user:', user.id);

      const { data: facturasData, error: facturasError } = await supabase
        .from('facturas')
        .select('id,numero,cliente_id,fecha,fecha_vencimiento,subtotal,descuento_total,iva,total,estado,estado_sin,cuf,cufd,punto_venta,codigo_control,observaciones,created_at,user_id')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });

      if (facturasError) {
        console.error('❌ [Facturas] Error:', facturasError);
        throw facturasError;
      }

      console.log('✅ [Facturas] Facturas encontradas:', facturasData?.length || 0);

      // Fetch related clients
      const clienteIds = [...new Set((facturasData || []).map((factura) => factura.cliente_id).filter(Boolean))] as string[];
      const clientesMap: Record<string, ClienteRow> = {};
      if (clienteIds.length > 0) {
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nombre, nit, email, telefono, direccion, activo, created_at')
          .in('id', clienteIds);
        (clientesData || []).forEach((cliente) => { clientesMap[cliente.id] = cliente; });
      }

      // Fetch related items
      const facturaIds = (facturasData || []).map((factura) => factura.id);
      let itemsData: ItemFacturaRow[] = [];
      if (facturaIds.length > 0) {
        const { data, error: iError } = await supabase
          .from('items_facturas')
          .select('id, factura_id, producto_id, codigo, descripcion, cantidad, precio_unitario, descuento, subtotal, codigo_sin')
          .in('factura_id', facturaIds);

        if (iError) {
          console.error('⚠️ [Facturas] Error cargando items:', iError);
        } else {
          itemsData = data || [];
        }
      }

      const mapped: Factura[] = ((facturasData || []) as FacturaRow[]).map((f) => {
        const clienteData = f.cliente_id ? clientesMap[f.cliente_id] : null;
        const cliente: Cliente = clienteData ? {
          id: clienteData.id,
          nombre: clienteData.nombre,
          nit: clienteData.nit,
          email: clienteData.email || '',
          telefono: clienteData.telefono || '',
          direccion: clienteData.direccion || '',
          activo: clienteData.activo ?? true,
          fechaCreacion: clienteData.created_at?.split('T')[0] || ''
        } : { id: '', nombre: 'Cliente eliminado', nit: '', email: '', telefono: '', direccion: '', activo: false, fechaCreacion: '' };

        const items: ItemFactura[] = (itemsData)
          .filter((item) => item.factura_id === f.id)
          .map((item) => ({
            id: item.id,
            productoId: item.producto_id || '',
            codigo: item.codigo,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precioUnitario: item.precio_unitario,
            descuento: item.descuento || 0,
            subtotal: item.subtotal,
            codigoSIN: item.codigo_sin || ''
          }));

        return {
          id: f.id,
          numero: f.numero,
          cliente,
          fecha: f.fecha,
          fechaVencimiento: f.fecha_vencimiento || '',
          items,
          subtotal: f.subtotal || 0,
          descuentoTotal: f.descuento_total || 0,
          iva: f.iva || 0,
          total: f.total || 0,
          estado: f.estado as Factura['estado'],
          estadoSIN: (f.estado_sin || 'pendiente') as Factura['estadoSIN'],
          cuf: f.cuf || '',
          cufd: f.cufd || '',
          puntoVenta: f.punto_venta || 0,
          codigoControl: f.codigo_control || '',
          observaciones: f.observaciones || '',
          fechaCreacion: f.created_at?.split('T')[0] || ''
        };
      });

      console.log('✅ [Facturas] Mapped:', mapped.length, 'facturas. Totales:', mapped.map(f => ({ num: f.numero, total: f.total, estado: f.estado, fecha: f.fecha })));
      setFacturas(mapped);
    } catch (error) {
      console.error('❌ [Facturas] Error general:', error);
      // Don't fallback to localStorage - it masks real errors
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFacturas(); }, [fetchFacturas]);

  const guardarFactura = async (factura: Factura): Promise<Factura | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes iniciar sesión para guardar facturas",
          variant: "destructive"
        });
        return null;
      }

      // Buscar cliente_id en Supabase por NIT
      let clienteId: string | null = null;
      if (factura.cliente?.nit) {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('id')
          .eq('user_id', user.id)
          .eq('nit', factura.cliente.nit)
          .limit(1)
          .maybeSingle();
        
        if (clienteData) {
          clienteId = clienteData.id;
        } else {
          // Crear cliente si no existe
          const { data: nuevoCliente } = await supabase
            .from('clientes')
            .insert({
              nombre: factura.cliente.nombre,
              nit: factura.cliente.nit,
              email: factura.cliente.email || null,
              telefono: factura.cliente.telefono || null,
              direccion: factura.cliente.direccion || null,
              user_id: user.id
            })
            .select('id')
            .single();
          if (nuevoCliente) clienteId = nuevoCliente.id;
        }
      }

      const { data: nuevaFactura, error } = await supabase
        .from('facturas')
        .insert({
          numero: factura.numero,
          cliente_id: clienteId,
          fecha: factura.fecha,
          fecha_vencimiento: factura.fechaVencimiento || null,
          subtotal: factura.subtotal,
          descuento_total: factura.descuentoTotal,
          iva: factura.iva,
          total: factura.total,
          estado: factura.estado,
          estado_sin: factura.estadoSIN,
          cuf: factura.cuf || null,
          cufd: factura.cufd || null,
          punto_venta: factura.puntoVenta,
          codigo_control: factura.codigoControl || null,
          observaciones: factura.observaciones || null,
          user_id: user.id
        })
        .select('id, numero, cliente_id, fecha, fecha_vencimiento, subtotal, descuento_total, iva, total, estado, estado_sin, cuf, cufd, punto_venta, codigo_control, observaciones, created_at, user_id')
        .maybeSingle();

      if (error) throw error;

      // Insertar items
      if (factura.items.length > 0) {
        const itemsInsert = factura.items.map(item => ({
          factura_id: nuevaFactura.id,
          producto_id: item.productoId || null,
          codigo: item.codigo,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario,
          descuento: item.descuento,
          subtotal: item.subtotal,
          codigo_sin: item.codigoSIN || null
        }));

        const { error: itemsError } = await supabase
          .from('items_facturas')
          .insert(itemsInsert);

        if (itemsError) console.error('Error inserting items:', itemsError);
      }

      const facturaCompleta = { ...factura, id: nuevaFactura.id };
      // Refetch from DB to ensure list is up-to-date
      await fetchFacturas();
      return facturaCompleta;

    } catch (error) {
      console.error('Error guardando factura:', error);
      toast({
        title: "Error al guardar factura",
        description: "No se pudo guardar la factura en la base de datos. Intente nuevamente.",
        variant: "destructive"
      });
      return null;
    }
  };

  const actualizarEstadoFactura = async (facturaId: string, nuevoEstado: Factura['estado']): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('facturas')
        .update({ estado: nuevoEstado })
        .eq('id', facturaId);

      if (error) throw error;

      setFacturas(prev => prev.map(f =>
        f.id === facturaId ? { ...f, estado: nuevoEstado } : f
      ));
      return true;
    } catch (error) {
      console.error('Error actualizando estado factura:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la factura",
        variant: "destructive"
      });
      return false;
    }
  };

  const actualizarFacturaElectronica = async (
    facturaId: string,
    updates: FacturaElectronicaUpdate
  ): Promise<boolean> => {
    try {
      const payload: Record<string, unknown> = {};

      if (updates.estado !== undefined) payload.estado = updates.estado;
      if (updates.estadoSIN !== undefined) payload.estado_sin = updates.estadoSIN;
      if (updates.cuf !== undefined) payload.cuf = updates.cuf || null;
      if (updates.cufd !== undefined) payload.cufd = updates.cufd || null;
      if (updates.puntoVenta !== undefined) payload.punto_venta = updates.puntoVenta;
      if (updates.codigoControl !== undefined) payload.codigo_control = updates.codigoControl || null;
      if (updates.observaciones !== undefined) payload.observaciones = updates.observaciones || null;

      const { error } = await supabase
        .from("facturas")
        .update(payload)
        .eq("id", facturaId);

      if (error) throw error;

      setFacturas((prev) =>
        prev.map((factura) =>
          factura.id === facturaId
            ? {
                ...factura,
                ...updates,
              }
            : factura
        )
      );

      return true;
    } catch (error) {
      console.error("Error actualizando datos electronicos de factura:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado electronico de la factura.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    facturas,
    loading,
    guardarFactura,
    actualizarEstadoFactura,
    actualizarFacturaElectronica,
    refetch: fetchFacturas,
  };
};
