-- ============================================================
-- SCHEMA COMPLETO - Sistema Contable Boliviano
-- Generado para migración a VPS con PostgreSQL
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum de roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLAS MAESTRAS (sin dependencias)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  display_name TEXT,
  empresa TEXT,
  telefono TEXT,
  permisos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL,
  subscribed BOOLEAN DEFAULT FALSE,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLAS OPERATIVAS PRINCIPALES
-- ============================================================

CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  nit TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  codigo TEXT,
  activo BOOLEAN DEFAULT TRUE,
  saldo_deuda NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  nit TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  codigo TEXT,
  activo BOOLEAN DEFAULT TRUE,
  saldo_deuda NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categorias_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  categoria_id UUID REFERENCES categorias_productos(id),
  unidad_medida TEXT DEFAULT 'unidad',
  precio_compra NUMERIC DEFAULT 0,
  precio_venta NUMERIC DEFAULT 0,
  costo_unitario NUMERIC DEFAULT 0,
  stock_actual NUMERIC DEFAULT 0,
  stock_minimo NUMERIC DEFAULT 0,
  stock_maximo NUMERIC,
  metodo_valuacion TEXT DEFAULT 'promedio_ponderado',
  activo BOOLEAN DEFAULT TRUE,
  iva_incluido BOOLEAN DEFAULT TRUE,
  ice_aplicable BOOLEAN DEFAULT FALSE,
  porcentaje_ice NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_cuentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  naturaleza TEXT NOT NULL,
  nivel INTEGER,
  cuenta_padre TEXT,
  saldo NUMERIC DEFAULT 0,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_cuentas_2025 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  naturaleza TEXT NOT NULL,
  nivel INTEGER DEFAULT 1,
  cuenta_padre TEXT,
  saldo NUMERIC DEFAULT 0,
  activa BOOLEAN DEFAULT TRUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  ci TEXT NOT NULL,
  cargo TEXT NOT NULL,
  departamento TEXT,
  fecha_ingreso TEXT NOT NULL,
  salario_basico NUMERIC NOT NULL,
  tipo_contrato TEXT DEFAULT 'indefinido',
  estado TEXT DEFAULT 'activo',
  nua_cua TEXT,
  cuenta_bancaria TEXT,
  banco TEXT,
  haber_basico NUMERIC DEFAULT 0,
  bono_antiguedad NUMERIC DEFAULT 0,
  horas_extra NUMERIC DEFAULT 0,
  otros_ingresos NUMERIC DEFAULT 0,
  afp NUMERIC DEFAULT 0,
  rc_iva NUMERIC DEFAULT 0,
  otros_descuentos NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nombre_banco TEXT NOT NULL,
  numero_cuenta TEXT NOT NULL,
  tipo_cuenta TEXT DEFAULT 'corriente',
  moneda TEXT DEFAULT 'BOB',
  saldo_actual NUMERIC DEFAULT 0,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activos_fijos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  fecha_adquisicion TEXT NOT NULL,
  costo_inicial NUMERIC DEFAULT 0,
  valor_residual NUMERIC DEFAULT 0,
  vida_util_anos INTEGER NOT NULL,
  metodo_depreciacion TEXT DEFAULT 'linea_recta',
  estado TEXT DEFAULT 'activo',
  ubicacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLAS DE TRANSACCIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  numero_factura TEXT NOT NULL,
  numero_autorizacion TEXT,
  codigo_control TEXT,
  fecha_emision TEXT NOT NULL,
  fecha_vencimiento TEXT,
  subtotal NUMERIC DEFAULT 0,
  descuento NUMERIC DEFAULT 0,
  iva NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  estado TEXT DEFAULT 'emitida',
  tipo TEXT DEFAULT 'venta',
  metodo_pago TEXT DEFAULT 'contado',
  notas TEXT,
  nit_comprador TEXT,
  razon_social TEXT,
  moneda TEXT DEFAULT 'BOB',
  tipo_cambio NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items_facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID REFERENCES facturas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  descripcion TEXT,
  cantidad NUMERIC NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  descuento NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  proveedor_id UUID REFERENCES proveedores(id),
  numero_factura TEXT,
  numero_autorizacion TEXT,
  codigo_control TEXT,
  fecha_compra TEXT NOT NULL,
  subtotal NUMERIC DEFAULT 0,
  descuento NUMERIC DEFAULT 0,
  iva NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  estado TEXT DEFAULT 'registrada',
  tipo_compra TEXT DEFAULT 'mercaderia',
  metodo_pago TEXT DEFAULT 'contado',
  notas TEXT,
  nit_proveedor TEXT,
  razon_social_proveedor TEXT,
  moneda TEXT DEFAULT 'BOB',
  tipo_cambio NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items_compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID REFERENCES compras(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  descripcion TEXT,
  cantidad NUMERIC NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  descuento NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asientos_contables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  numero INTEGER,
  fecha TEXT NOT NULL,
  concepto TEXT NOT NULL,
  tipo TEXT DEFAULT 'diario',
  estado TEXT DEFAULT 'borrador',
  referencia TEXT,
  total_debe NUMERIC DEFAULT 0,
  total_haber NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cuentas_asientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asiento_id UUID REFERENCES asientos_contables(id) ON DELETE CASCADE,
  cuenta_codigo TEXT NOT NULL,
  cuenta_nombre TEXT NOT NULL,
  debe NUMERIC DEFAULT 0,
  haber NUMERIC DEFAULT 0,
  glosa TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comprobantes_integrados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL,
  fecha TEXT NOT NULL,
  concepto TEXT NOT NULL,
  beneficiario TEXT,
  nit_beneficiario TEXT,
  total_debe NUMERIC DEFAULT 0,
  total_haber NUMERIC DEFAULT 0,
  estado TEXT DEFAULT 'borrador',
  codigo_control TEXT,
  referencia TEXT,
  moneda TEXT DEFAULT 'BOB',
  tipo_cambio NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items_comprobantes_integrados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id UUID REFERENCES comprobantes_integrados(id) ON DELETE CASCADE,
  cuenta_codigo TEXT NOT NULL,
  cuenta_nombre TEXT NOT NULL,
  debe NUMERIC DEFAULT 0,
  haber NUMERIC DEFAULT 0,
  glosa TEXT,
  centro_costo TEXT,
  user_id UUID NOT NULL,
  cantidad NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLAS DE MOVIMIENTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  producto_id UUID REFERENCES productos(id),
  tipo TEXT NOT NULL,
  cantidad NUMERIC NOT NULL,
  stock_anterior NUMERIC DEFAULT 0,
  stock_nuevo NUMERIC DEFAULT 0,
  costo_unitario NUMERIC DEFAULT 0,
  costo_promedio_ponderado NUMERIC DEFAULT 0,
  valor_movimiento NUMERIC DEFAULT 0,
  referencia TEXT,
  motivo TEXT,
  documento_referencia TEXT,
  fecha TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos_bancarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cuenta_id UUID REFERENCES cuentas_bancarias(id),
  tipo TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  fecha TEXT NOT NULL,
  concepto TEXT,
  referencia TEXT,
  beneficiario TEXT,
  saldo_anterior NUMERIC DEFAULT 0,
  saldo_nuevo NUMERIC DEFAULT 0,
  conciliado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  factura_id UUID REFERENCES facturas(id),
  compra_id UUID REFERENCES compras(id),
  tipo TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  fecha TEXT NOT NULL,
  metodo_pago TEXT DEFAULT 'efectivo',
  referencia TEXT,
  notas TEXT,
  estado TEXT DEFAULT 'completado',
  cuenta_bancaria_id UUID REFERENCES cuentas_bancarias(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLAS ADICIONALES
-- ============================================================

CREATE TABLE IF NOT EXISTS depreciaciones_activos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id UUID NOT NULL REFERENCES activos_fijos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  periodo TEXT NOT NULL,
  monto_depreciacion NUMERIC NOT NULL,
  depreciacion_acumulada NUMERIC NOT NULL,
  valor_en_libros NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS centros_costo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  responsable TEXT,
  presupuesto NUMERIC DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT DEFAULT 'mensual',
  periodo_inicio TEXT NOT NULL,
  periodo_fin TEXT NOT NULL,
  monto_total NUMERIC DEFAULT 0,
  estado TEXT DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items_presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id UUID REFERENCES presupuestos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT,
  monto_presupuestado NUMERIC DEFAULT 0,
  monto_ejecutado NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ventas_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  factura_id UUID NOT NULL REFERENCES facturas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  fecha_venta TEXT NOT NULL,
  fecha_vencimiento TEXT NOT NULL,
  monto_total NUMERIC NOT NULL,
  monto_pagado NUMERIC DEFAULT 0,
  saldo_pendiente NUMERIC NOT NULL,
  plazo_dias INTEGER NOT NULL,
  interes_mora NUMERIC DEFAULT 0,
  estado TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anticipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  proveedor_id UUID REFERENCES proveedores(id),
  tipo TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  monto_aplicado NUMERIC DEFAULT 0,
  saldo NUMERIC NOT NULL,
  fecha TEXT NOT NULL,
  referencia TEXT,
  estado TEXT DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracion_tributaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actividad_economica TEXT NOT NULL,
  nit_empresa TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  regimen_tributario TEXT DEFAULT 'general',
  direccion_fiscal TEXT,
  municipio TEXT,
  departamento TEXT,
  numero_autorizacion_dosificacion TEXT,
  fecha_limite_emision TEXT,
  tipo_facturacion TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS declaraciones_tributarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  periodo TEXT NOT NULL,
  fecha_presentacion TEXT,
  fecha_vencimiento TEXT NOT NULL,
  monto_determinado NUMERIC DEFAULT 0,
  monto_pagado NUMERIC DEFAULT 0,
  estado TEXT DEFAULT 'pendiente',
  formulario TEXT,
  numero_orden TEXT,
  base_imponible NUMERIC DEFAULT 0,
  credito_fiscal NUMERIC DEFAULT 0,
  debito_fiscal NUMERIC DEFAULT 0,
  saldo_favor NUMERIC DEFAULT 0,
  beneficio_iva_cero BOOLEAN DEFAULT FALSE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS normativas_2025 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL,
  fecha_vigencia TEXT NOT NULL,
  estado TEXT DEFAULT 'vigente',
  referencia_legal TEXT,
  impacto TEXT,
  acciones_requeridas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cumplimiento_normativo_2025 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  normativa TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  estado TEXT DEFAULT 'pendiente',
  fecha_limite TEXT,
  fecha_cumplimiento TEXT,
  responsable TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registro_bancarizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  periodo TEXT NOT NULL,
  fecha_transaccion TEXT NOT NULL,
  numero_factura TEXT NOT NULL,
  nit_proveedor TEXT NOT NULL,
  razon_social_proveedor TEXT NOT NULL,
  monto_transaccion NUMERIC NOT NULL,
  tipo_documento_pago TEXT,
  numero_documento_pago TEXT NOT NULL,
  banco TEXT NOT NULL,
  fecha_limite_declaracion TEXT NOT NULL,
  declarado BOOLEAN DEFAULT FALSE,
  estado TEXT DEFAULT 'pendiente',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS control_existencias_ice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  producto_id UUID REFERENCES productos(id),
  periodo TEXT NOT NULL,
  stock_inicial NUMERIC DEFAULT 0,
  compras_periodo NUMERIC DEFAULT 0,
  produccion_periodo NUMERIC DEFAULT 0,
  ventas_periodo NUMERIC DEFAULT 0,
  stock_final NUMERIC DEFAULT 0,
  alicuota_ice NUMERIC DEFAULT 0,
  base_imponible_ice NUMERIC DEFAULT 0,
  ice_determinado NUMERIC DEFAULT 0,
  precio_venta_ice NUMERIC DEFAULT 0,
  declarado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facilidades_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  numero_solicitud TEXT,
  tipo_deuda TEXT NOT NULL,
  monto_total NUMERIC NOT NULL,
  cuotas INTEGER NOT NULL,
  monto_cuota NUMERIC NOT NULL,
  tasa_interes NUMERIC DEFAULT 0,
  fecha_inicio TEXT NOT NULL,
  estado TEXT DEFAULT 'activa',
  saldo_pendiente NUMERIC NOT NULL,
  cuotas_pagadas INTEGER DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facilidades_pago_2025 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  numero_solicitud TEXT,
  tipo_deuda TEXT NOT NULL,
  monto_total NUMERIC NOT NULL,
  cuotas INTEGER NOT NULL,
  monto_cuota NUMERIC NOT NULL,
  tasa_interes NUMERIC DEFAULT 0,
  fecha_inicio TEXT NOT NULL,
  estado TEXT DEFAULT 'activa',
  saldo_pendiente NUMERIC NOT NULL,
  cuotas_pagadas INTEGER DEFAULT 0,
  observaciones TEXT,
  fecha_vencimiento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clasificador_actividades_2025 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  alicuota_iva NUMERIC DEFAULT 13,
  alicuota_it NUMERIC DEFAULT 3,
  alicuota_iue NUMERIC DEFAULT 25,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_clientes_user ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_user ON proveedores(user_id);
CREATE INDEX IF NOT EXISTS idx_productos_user ON productos(user_id);
CREATE INDEX IF NOT EXISTS idx_facturas_user ON facturas(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_user ON compras(user_id);
CREATE INDEX IF NOT EXISTS idx_asientos_user ON asientos_contables(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_user ON plan_cuentas(user_id);
CREATE INDEX IF NOT EXISTS idx_empleados_user ON empleados(user_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_inv_user ON movimientos_inventario(user_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_banc_user ON movimientos_bancarios(user_id);
CREATE INDEX IF NOT EXISTS idx_pagos_user ON pagos(user_id);
CREATE INDEX IF NOT EXISTS idx_items_facturas_factura ON items_facturas(factura_id);
CREATE INDEX IF NOT EXISTS idx_items_compras_compra ON items_compras(compra_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_asientos_asiento ON cuentas_asientos(asiento_id);

-- ============================================================
-- MENSAJE FINAL
-- ============================================================
DO $$ BEGIN
  RAISE NOTICE '✅ Schema del Sistema Contable Boliviano creado exitosamente';
  RAISE NOTICE '📊 Tablas creadas: ~35 tablas operativas';
  RAISE NOTICE '🔒 Índices creados para rendimiento';
END $$;
