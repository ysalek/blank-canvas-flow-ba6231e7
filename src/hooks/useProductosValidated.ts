import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CategoriaProducto {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria_id?: string;
  categoria: string;
  unidad_medida: string;
  precio_venta: number;
  precio_compra: number;
  costo_unitario: number;
  stock_actual: number;
  stock_minimo: number;
  codigo_sin?: string;
  activo: boolean;
  imagen_url?: string;
  created_at?: string;
  updated_at?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  // Alias para compatibilidad
  unidadMedida?: string;
  precioVenta?: number;
  precioCompra?: number;
  costoUnitario?: number;
  stockActual?: number;
  stockMinimo?: number;
  codigoSIN?: string;
  imagenUrl?: string;
}

export interface ConnectivityStatus {
  isConnected: boolean;
  isAuthenticated: boolean;
  userId?: string;
  lastCheck: Date;
  error?: string;
}

/**
 * Hook validado para productos con conectividad robusta
 */
export const useProductosValidated = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>({
    isConnected: true,
    isAuthenticated: true,
    lastCheck: new Date()
  });
  
  const { toast } = useToast();
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const lastAuthLoadRef = useRef(0);

  const validateConnectivity = useCallback(async (): Promise<ConnectivityStatus> => {
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      const status: ConnectivityStatus = {
        isConnected: !authError,
        isAuthenticated: !authError && !!user,
        userId: user?.id,
        lastCheck: new Date(),
        error: authError?.message
      };
      
      setConnectivity(status);

      return status;
    } catch (error: any) {
      console.error('❌ [ProductosValidated] Error de conectividad:', error);
      
      const errorStatus: ConnectivityStatus = {
        isConnected: false,
        isAuthenticated: false,
        lastCheck: new Date(),
        error: error.message
      };
      
      setConnectivity(errorStatus);
      return errorStatus;
    }
  }, []);

  // Función para transformar producto de Supabase al formato unificado
  const transformarProducto = useCallback((producto: any, categoriasMap: Map<string, string>): Producto => {
    const nombreCategoria = categoriasMap.get(producto.categoria_id) || 'General';
    
    return {
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      categoria_id: producto.categoria_id,
      categoria: nombreCategoria,
      unidad_medida: producto.unidad_medida || 'PZA',
      precio_venta: Number(producto.precio_venta) || 0,
      precio_compra: Number(producto.precio_compra) || 0,
      costo_unitario: Number(producto.costo_unitario) || 0,
      stock_actual: Number(producto.stock_actual) || 0,
      stock_minimo: Number(producto.stock_minimo) || 0,
      codigo_sin: producto.codigo_sin || '00000000',
      activo: Boolean(producto.activo),
      imagen_url: producto.imagen_url,
      created_at: producto.created_at,
      updated_at: producto.updated_at,
      fechaCreacion: producto.created_at?.split('T')[0] || new Date().toISOString().slice(0, 10),
      fechaActualizacion: producto.updated_at?.split('T')[0] || new Date().toISOString().slice(0, 10),
      // Alias para compatibilidad
      unidadMedida: producto.unidad_medida || 'PZA',
      precioVenta: Number(producto.precio_venta) || 0,
      precioCompra: Number(producto.precio_compra) || 0,
      costoUnitario: Number(producto.costo_unitario) || 0,
      stockActual: Number(producto.stock_actual) || 0,
      stockMinimo: Number(producto.stock_minimo) || 0,
      codigoSIN: producto.codigo_sin || '00000000',
      imagenUrl: producto.imagen_url
    };
  }, []);

  // Función principal de carga de datos
  const loadData = useCallback(async (force: boolean = false) => {
    
    // Block concurrent loads even with force
    if (loadingRef.current) {

      return;
    }
    
    const currentRequestId = ++requestIdRef.current;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    // Timeout de seguridad
    const timeoutId = setTimeout(() => {
      if (mountedRef.current && loadingRef.current && requestIdRef.current === currentRequestId) {
        console.warn('⏱️ [ProductosValidated] Timeout de carga alcanzado (15s)');
        setLoading(false);
        setError('Tiempo de espera agotado. Pulse Reintentar.');
        loadingRef.current = false;
      }
    }, 15000);
    
    try {
      const connectivityStatus = await validateConnectivity();
      
      if (!connectivityStatus.isAuthenticated) {
        throw new Error('Usuario no autenticado');
      }
      
      
      // Cargar datos en paralelo con reintentos
      let categoriasData: CategoriaProducto[] = [];
      let productosData: any[] = [];
      
      // Reintentos para categorías
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          
          const categoriasResult = await supabase
            .from('categorias_productos')
            .select('id, nombre, descripcion, activo, created_at, updated_at')
            .eq('user_id', connectivityStatus.userId)
            .order('nombre');
          
          if (categoriasResult.error) {
            throw categoriasResult.error;
          }
          
          categoriasData = categoriasResult.data || [];
          
          break;
        } catch (error: any) {
          console.error(`❌ [ProductosValidated] Error cargando categorías (intento ${attempt}):`, error);
          if (attempt === 3) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      // Reintentos para productos
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          
          const productosResult = await supabase
            .from('productos')
            .select('id, codigo, nombre, descripcion, categoria_id, unidad_medida, precio_venta, precio_compra, costo_unitario, stock_actual, stock_minimo, codigo_sin, activo, imagen_url, created_at, updated_at')
            .eq('user_id', connectivityStatus.userId)
            .order('codigo');
          
          if (productosResult.error) {
            throw productosResult.error;
          }
          
          productosData = productosResult.data || [];
          console.log('✅ [ProductosValidated] Productos cargados:', productosData.length);
          break;
        } catch (error: any) {
          console.error(`❌ [ProductosValidated] Error cargando productos (intento ${attempt}):`, error);
          if (attempt === 3) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      // Transformar productos
      const categoriasMap = new Map(categoriasData.map(c => [c.id, c.nombre]));
      const productosTransformados = productosData.map(producto => 
        transformarProducto(producto, categoriasMap)
      );
      
      if (mountedRef.current && requestIdRef.current === currentRequestId) {
        setCategorias(categoriasData);
        setProductos(productosTransformados);
        setError(null);
        
        console.log('✅ [ProductosValidated] Datos sincronizados:', {
          productos: productosTransformados.length,
          categorias: categoriasData.length
        });
      }
      
    } catch (error: any) {
      console.error('❌ [ProductosValidated] Error cargando datos:', error);
      
      if (mountedRef.current) {
        setError(error.message);
        // Don't show toast for auth errors - they're expected during init
        if (error.message !== 'Usuario no autenticado') {
          toast({
            title: "Error al cargar productos",
            description: `${error.message}`,
            variant: "destructive"
          });
        }
      }
    } finally {
      clearTimeout(timeoutId);
      if (mountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [validateConnectivity, transformarProducto, toast]);

  // Crear producto
  const crearProducto = async (productoData: Omit<Producto, 'id' | 'created_at' | 'updated_at' | 'categoria' | 'fechaCreacion' | 'fechaActualizacion'>) => {
    console.log('🆕 [ProductosValidated] Creando producto:', productoData);
    
    try {
      const status = await validateConnectivity();
      if (!status.isAuthenticated) {
        throw new Error('Usuario no autenticado');
      }

      const dataForSupabase = {
        codigo: productoData.codigo,
        nombre: productoData.nombre,
        descripcion: productoData.descripcion,
        categoria_id: productoData.categoria_id,
        unidad_medida: productoData.unidad_medida,
        precio_venta: productoData.precio_venta,
        precio_compra: productoData.precio_compra,
        costo_unitario: productoData.costo_unitario,
        stock_actual: productoData.stock_actual,
        stock_minimo: productoData.stock_minimo,
        codigo_sin: productoData.codigo_sin,
        activo: productoData.activo,
        imagen_url: productoData.imagen_url,
        user_id: status.userId
      };
      
      const { data, error } = await supabase
        .from('productos')
        .insert([dataForSupabase])
        .select()
        .single();

      if (error) throw error;

      const categoriasMap = new Map(categorias.map(c => [c.id, c.nombre]));
      const productoTransformado = transformarProducto(data, categoriasMap);
      
      setProductos(prev => [...prev, productoTransformado]);
      
      toast({
        title: "Producto creado",
        description: "El producto se ha registrado exitosamente",
      });

      return productoTransformado;
    } catch (error: any) {
      console.error('❌ [ProductosValidated] Error creando producto:', error);
      toast({
        title: "Error al crear producto",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Actualizar stock con validación
  const actualizarStockProducto = async (productoId: string, cantidad: number, tipo: 'entrada' | 'salida') => {
    console.log('🔄 [ProductosValidated] Actualizando stock:', { productoId, cantidad, tipo });
    
    try {
      const status = await validateConnectivity();
      if (!status.isAuthenticated) {
        throw new Error('Usuario no autenticado - No se puede actualizar el stock');
      }

      const producto = productos.find(p => p.id === productoId);
      if (!producto) {
        console.error('❌ [ProductosValidated] Producto no encontrado en lista local:', productoId);
        console.log('📋 [ProductosValidated] Productos disponibles:', productos.map(p => ({ id: p.id, codigo: p.codigo, nombre: p.nombre })));
        throw new Error(`No se puede actualizar el stock para el producto seleccionado - Producto no encontrado`);
      }

      const nuevoStock = tipo === 'entrada' 
        ? producto.stock_actual + cantidad 
        : producto.stock_actual - cantidad;

      if (nuevoStock < 0) {
        throw new Error(`Stock insuficiente. Stock actual: ${producto.stock_actual}, se requiere: ${cantidad}`);
      }

      console.log('📊 [ProductosValidated] Actualizando stock en BD:', {
        productoId,
        nombreProducto: producto.nombre,
        stockAnterior: producto.stock_actual,
        cantidad,
        tipo,
        nuevoStock,
        userId: status.userId
      });

      // Actualizar con reintentos
      let updateSuccess = false;
      let lastError: any = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 [ProductosValidated] Intento ${attempt} - Actualizando stock...`);
          
          const { data, error } = await supabase
            .from('productos')
            .update({ stock_actual: nuevoStock })
            .eq('id', productoId)
            .eq('user_id', status.userId)
            .select()
            .single();

          if (error) {
            throw error;
          }

          console.log('✅ [ProductosValidated] Stock actualizado en BD:', data);

          // Actualizar en la lista local
          const categoriasMap = new Map(categorias.map(c => [c.id, c.nombre]));
          const productoTransformado = transformarProducto(data, categoriasMap);
          
          setProductos(prev => 
            prev.map(p => p.id === productoId ? productoTransformado : p)
          );

          updateSuccess = true;
          break;
        } catch (error: any) {
          lastError = error;
          console.error(`❌ [ProductosValidated] Error en intento ${attempt}:`, error);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (!updateSuccess) {
        throw lastError || new Error('Error actualizando stock después de 3 intentos');
      }

      // Crear movimiento de inventario (sin fallar si no funciona)
      try {
        await supabase
          .from('movimientos_inventario')
          .insert([{
            user_id: status.userId,
            producto_id: productoId,
            fecha: new Date().toISOString().split('T')[0],
            tipo,
            cantidad,
            stock_anterior: producto.stock_actual,
            stock_actual: nuevoStock,
            costo_unitario: producto.costo_unitario || producto.precio_compra || 0,
            observaciones: `Movimiento ${tipo} por facturación - Sistema validado`
          }]);
        console.log('✅ [ProductosValidated] Movimiento de inventario creado');
      } catch (movError: any) {
        console.warn('⚠️ [ProductosValidated] Error creando movimiento (no crítico):', movError);
      }

      // Verificar stock bajo
      if (nuevoStock <= producto.stock_minimo && nuevoStock > 0) {
        toast({
          title: "Stock bajo",
          description: `El producto ${producto.nombre} tiene stock bajo (${nuevoStock} unidades)`,
          variant: "destructive"
        });
      }

      console.log('✅ [ProductosValidated] Stock actualizado exitosamente');
      return true;
    } catch (error: any) {
      console.error('❌ [ProductosValidated] Error actualizando stock:', error);
      toast({
        title: "Error al actualizar stock",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  // Generar código de producto
  const generarCodigoProducto = () => {
    const ultimoCodigo = productos.reduce((max, prod) => {
      const numero = parseInt(prod.codigo.replace(/\D/g, ''));
      return numero > max ? numero : max;
    }, 0);
    
    return `PROD${(ultimoCodigo + 1).toString().padStart(3, '0')}`;
  };

  // Refetch
  const refetch = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  // Inicialización
  useEffect(() => {
    console.log('🎯 [ProductosValidated] Inicializando...');
    loadData();
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Auto-reconexión en cambios de auth (throttled globally)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const now = Date.now();
      // Throttle all auth-triggered reloads to max once every 5s
      if (now - lastAuthLoadRef.current < 5000) {
        return;
      }
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        lastAuthLoadRef.current = now;
        setTimeout(() => {
          if (mountedRef.current) loadData();
        }, 150);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadData]);

  return {
    productos,
    categorias,
    loading,
    error,
    connectivity,
    crearProducto,
    actualizarStockProducto,
    generarCodigoProducto,
    refetch,
    // Función de compatibilidad
    obtenerProductos: () => productos
  };
};