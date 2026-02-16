import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Factura, Cliente, ItemFactura } from "@/components/contable/billing/BillingData";

export const useFacturas = () => {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFacturas = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setFacturas([]); return; }

      const { data: facturasData, error: fError } = await supabase
        .from('facturas')
        .select('*, clientes(*)')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });

      if (fError) throw fError;

      const { data: itemsData, error: iError } = await supabase
        .from('items_facturas')
        .select('*');

      if (iError) throw iError;

      const mapped: Factura[] = (facturasData || []).map((f: any) => {
        const cliente: Cliente = f.clientes ? {
          id: f.clientes.id,
          nombre: f.clientes.nombre,
          nit: f.clientes.nit,
          email: f.clientes.email || '',
          telefono: f.clientes.telefono || '',
          direccion: f.clientes.direccion || '',
          activo: f.clientes.activo ?? true,
          fechaCreacion: f.clientes.created_at?.split('T')[0] || ''
        } : { id: '', nombre: 'Cliente eliminado', nit: '', email: '', telefono: '', direccion: '', activo: false, fechaCreacion: '' };

        const items: ItemFactura[] = (itemsData || [])
          .filter((item: any) => item.factura_id === f.id)
          .map((item: any) => ({
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

      setFacturas(mapped);
    } catch (error) {
      console.error('Error fetching facturas:', error);
      // Fallback localStorage
      const local = localStorage.getItem('facturas');
      if (local) setFacturas(JSON.parse(local));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFacturas(); }, [fetchFacturas]);

  const guardarFactura = async (factura: Factura): Promise<Factura | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Fallback localStorage
        setFacturas(prev => {
          const updated = [factura, ...prev];
          localStorage.setItem('facturas', JSON.stringify(updated));
          return updated;
        });
        return factura;
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
        .select()
        .single();

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
      setFacturas(prev => [facturaCompleta, ...prev]);
      return facturaCompleta;

    } catch (error) {
      console.error('Error guardando factura:', error);
      // Fallback
      setFacturas(prev => {
        const updated = [factura, ...prev];
        localStorage.setItem('facturas', JSON.stringify(updated));
        return updated;
      });
      return factura;
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
      // Fallback
      setFacturas(prev => {
        const updated = prev.map(f => f.id === facturaId ? { ...f, estado: nuevoEstado } : f);
        localStorage.setItem('facturas', JSON.stringify(updated));
        return updated;
      });
      return true;
    }
  };

  return { facturas, loading, guardarFactura, actualizarEstadoFactura, refetch: fetchFacturas };
};
