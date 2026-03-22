import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CategoriaProductoSupabase {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductoSupabase {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria_id?: string;
  unidad_medida: string;
  precio_venta: number;
  precio_compra: number;
  costo_unitario: number;
  stock_actual: number;
  stock_minimo: number;
  codigo_sin?: string;
  activo: boolean;
  imagen_url?: string;
  imagen_storage_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ImagenProductoResultado {
  publicUrl: string;
  path: string;
}

type ProductoPayload = Record<string, unknown>;

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

const PRODUCTOS_BUCKET = 'productos';
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const isMissingColumnError = (error: unknown, column: string) => {
  const supabaseError = error as { message?: string; details?: string };
  const message = `${supabaseError?.message || ''} ${supabaseError?.details || ''}`.toLowerCase();
  return message.includes(column.toLowerCase()) && (message.includes('column') || message.includes('schema cache'));
};

export const useSupabaseProductos = () => {
  const [productos, setProductos] = useState<ProductoSupabase[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProductoSupabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  const resolvePublicUrl = useCallback((path?: string | null) => {
    if (!path) return undefined;
    const { data } = supabase.storage.from(PRODUCTOS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const normalizeProducto = useCallback((producto: Record<string, unknown>): ProductoSupabase => ({
    id: String(producto.id),
    codigo: String(producto.codigo),
    nombre: String(producto.nombre),
    descripcion: (producto.descripcion as string | null | undefined) || undefined,
    categoria_id: (producto.categoria_id as string | null | undefined) || undefined,
    unidad_medida: (producto.unidad_medida as string | null | undefined) || 'PZA',
    precio_venta: Number(producto.precio_venta) || 0,
    precio_compra: Number(producto.precio_compra) || 0,
    costo_unitario: Number(producto.costo_unitario) || 0,
    stock_actual: Number(producto.stock_actual) || 0,
    stock_minimo: Number(producto.stock_minimo) || 0,
    codigo_sin: (producto.codigo_sin as string | null | undefined) || undefined,
    activo: Boolean(producto.activo),
    imagen_url: (producto.imagen_url as string | null | undefined) || resolvePublicUrl(producto.imagen_storage_path as string | null | undefined) || undefined,
    imagen_storage_path: (producto.imagen_storage_path as string | null | undefined) ?? null,
    created_at: (producto.created_at as string | null | undefined) || undefined,
    updated_at: (producto.updated_at as string | null | undefined) || undefined,
  }), [resolvePublicUrl]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        setProductos([]);
        setCategorias([]);
        return;
      }

      const [productosRes, categoriasRes] = await Promise.all([
        supabase.from('productos').select('*').eq('user_id', user.id).order('codigo'),
        supabase.from('categorias_productos').select('*').eq('user_id', user.id).order('nombre')
      ]);

      if (productosRes.error) throw productosRes.error;
      if (categoriasRes.error) throw categoriasRes.error;

      setProductos((productosRes.data || []).map(normalizeProducto));
      setCategorias(categoriasRes.data || []);
    } catch (error: unknown) {
      console.error('Error cargando productos:', error);
      toast({
        title: "Error al cargar productos",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [normalizeProducto, toast]);

  const crearCategoria = async (categoriaData: Omit<CategoriaProductoSupabase, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('categorias_productos')
        .insert([{ ...categoriaData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setCategorias((prev) => [...prev, data]);
      toast({
        title: "Categoria creada",
        description: "La categoria se registro exitosamente.",
      });

      return data;
    } catch (error: unknown) {
      toast({
        title: "Error al crear categoria",
        description: getErrorMessage(error),
        variant: "destructive"
      });
      throw error;
    }
  };

  const insertProductoRecord = async (payload: ProductoPayload) => {
    let response = await supabase.from('productos').insert([payload]).select().single();
    if (response.error && isMissingColumnError(response.error, 'imagen_storage_path')) {
      const { imagen_storage_path, ...legacyPayload } = payload;
      response = await supabase.from('productos').insert([legacyPayload]).select().single();
    }
    if (response.error) throw response.error;
    return normalizeProducto(response.data);
  };

  const updateProductoRecord = async (productoId: string, userId: string, payload: ProductoPayload) => {
    let response = await supabase
      .from('productos')
      .update(payload)
      .eq('id', productoId)
      .eq('user_id', userId)
      .select()
      .single();

    if (response.error && isMissingColumnError(response.error, 'imagen_storage_path')) {
      const { imagen_storage_path, ...legacyPayload } = payload;
      response = await supabase
        .from('productos')
        .update(legacyPayload)
        .eq('id', productoId)
        .eq('user_id', userId)
        .select()
        .single();
    }

    if (response.error) throw response.error;
    return normalizeProducto(response.data);
  };

  const crearProducto = async (productoData: Omit<ProductoSupabase, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Usuario no autenticado');

      const data = await insertProductoRecord({
        ...productoData,
        user_id: user.id
      });

      setProductos((prev) => [...prev, data]);
      toast({
        title: "Producto creado",
        description: "El producto se registro exitosamente.",
      });

      return data;
    } catch (error: unknown) {
      toast({
        title: "Error al crear producto",
        description: getErrorMessage(error),
        variant: "destructive"
      });
      throw error;
    }
  };

  const actualizarProducto = async (productoId: string, productoData: Partial<ProductoSupabase>) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Usuario no autenticado');

      const data = await updateProductoRecord(productoId, user.id, productoData);
      await fetchData();

      toast({
        title: "Producto actualizado",
        description: "Los cambios se guardaron correctamente.",
      });

      return data;
    } catch (error: unknown) {
      toast({
        title: "Error al actualizar producto",
        description: getErrorMessage(error),
        variant: "destructive"
      });
      throw error;
    }
  };

  const subirImagenProducto = async (file: File, currentPath?: string | null): Promise<ImagenProductoResultado> => {
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.');
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error('La imagen supera el limite de 4 MB.');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Usuario no autenticado');

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/${Date.now()}-${sanitizeFileName(file.name.replace(/\.[^.]+$/, ''))}.${extension}`;

    const uploadResult = await supabase.storage
      .from(PRODUCTOS_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadResult.error) throw uploadResult.error;

    if (currentPath && currentPath !== path) {
      await supabase.storage.from(PRODUCTOS_BUCKET).remove([currentPath]);
    }

    const publicUrl = resolvePublicUrl(path);
    if (!publicUrl) {
      throw new Error('No se pudo generar la URL publica de la imagen.');
    }

    return { publicUrl, path };
  };

  const eliminarImagenProducto = async (storagePath?: string | null) => {
    if (!storagePath) return;

    const result = await supabase.storage.from(PRODUCTOS_BUCKET).remove([storagePath]);
    if (result.error && !`${result.error.message || ''}`.toLowerCase().includes('not found')) {
      throw result.error;
    }
  };

  const actualizarStockProducto = async (productoId: string, cantidad: number, tipo: 'entrada' | 'salida') => {
    try {
      const producto = productos.find((item) => item.id === productoId);
      if (!producto) throw new Error('Producto no encontrado');

      const nuevoStock = tipo === 'entrada'
        ? producto.stock_actual + cantidad
        : producto.stock_actual - cantidad;

      if (nuevoStock < 0) {
        throw new Error('Stock insuficiente');
      }

      const { data, error } = await supabase
        .from('productos')
        .update({ stock_actual: nuevoStock })
        .eq('id', productoId)
        .select()
        .single();

      if (error) throw error;

      setProductos((prev) =>
        prev.map((item) => item.id === productoId ? normalizeProducto({ ...data, stock_actual: nuevoStock }) : item)
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('movimientos_inventario')
          .insert([{
            user_id: user.id,
            producto_id: productoId,
            fecha: new Date().toISOString().split('T')[0],
            tipo,
            cantidad,
            stock_anterior: producto.stock_actual,
            stock_actual: nuevoStock,
            costo_unitario: producto.costo_unitario || producto.precio_compra || 0,
            observaciones: `Movimiento ${tipo} manual`
          }]);
      }

      if (nuevoStock <= producto.stock_minimo && nuevoStock > 0) {
        toast({
          title: "Stock bajo",
          description: `El producto ${producto.nombre} tiene stock bajo (${nuevoStock} unidades).`,
          variant: "destructive"
        });
      }

      return true;
    } catch (error: unknown) {
      toast({
        title: "Error al actualizar stock",
        description: getErrorMessage(error),
        variant: "destructive"
      });
      return false;
    }
  };

  const generarCodigoProducto = () => {
    const ultimoCodigo = productos.reduce((max, prod) => {
      const numero = parseInt(prod.codigo.replace('PROD', ''));
      return Number.isNaN(numero) ? max : Math.max(numero, max);
    }, 0);

    return `PROD${(ultimoCodigo + 1).toString().padStart(3, '0')}`;
  };

  useEffect(() => {
    if (!initialized) {
      fetchData();
    }
  }, [fetchData, initialized]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchData();
      } else if (event === 'SIGNED_OUT') {
        setProductos([]);
        setCategorias([]);
        setLoading(false);
        setInitialized(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchData]);

  return {
    productos,
    categorias,
    loading,
    crearCategoria,
    crearProducto,
    actualizarProducto,
    actualizarStockProducto,
    subirImagenProducto,
    eliminarImagenProducto,
    generarCodigoProducto,
    refetch: fetchData
  };
};
