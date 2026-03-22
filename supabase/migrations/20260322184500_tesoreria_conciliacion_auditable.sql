ALTER TABLE public.cuentas_bancarias
  ADD COLUMN IF NOT EXISTS codigo_cuenta_contable TEXT,
  ADD COLUMN IF NOT EXISTS nombre_cuenta_contable TEXT;

UPDATE public.cuentas_bancarias
SET
  codigo_cuenta_contable = COALESCE(codigo_cuenta_contable, '1113'),
  nombre_cuenta_contable = COALESCE(nombre_cuenta_contable, 'Bancos')
WHERE codigo_cuenta_contable IS NULL OR nombre_cuenta_contable IS NULL;

ALTER TABLE public.movimientos_bancarios
  ADD COLUMN IF NOT EXISTS origen_registro TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS detalle_importacion JSONB,
  ADD COLUMN IF NOT EXISTS naturaleza_movimiento TEXT;

UPDATE public.movimientos_bancarios
SET
  tipo = CASE
    WHEN tipo = 'ingreso' THEN 'deposito'
    WHEN tipo = 'egreso' THEN 'otro'
    ELSE tipo
  END,
  naturaleza_movimiento = CASE
    WHEN tipo IN ('ingreso', 'deposito', 'interes', 'nota_credito') THEN 'credito'
    WHEN tipo IN ('egreso', 'cheque', 'comision', 'nota_debito') THEN 'debito'
    WHEN monto < 0 THEN 'debito'
    ELSE 'credito'
  END,
  origen_registro = COALESCE(origen_registro, 'manual')
WHERE naturaleza_movimiento IS NULL OR tipo IN ('ingreso', 'egreso');

ALTER TABLE public.movimientos_bancarios
  ALTER COLUMN naturaleza_movimiento SET DEFAULT 'credito',
  ALTER COLUMN naturaleza_movimiento SET NOT NULL,
  ALTER COLUMN origen_registro SET DEFAULT 'manual',
  ALTER COLUMN origen_registro SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'movimientos_bancarios_tipo_check'
  ) THEN
    ALTER TABLE public.movimientos_bancarios
      ADD CONSTRAINT movimientos_bancarios_tipo_check
      CHECK (tipo IN ('deposito', 'transferencia', 'cheque', 'comision', 'interes', 'nota_credito', 'nota_debito', 'otro'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'movimientos_bancarios_naturaleza_check'
  ) THEN
    ALTER TABLE public.movimientos_bancarios
      ADD CONSTRAINT movimientos_bancarios_naturaleza_check
      CHECK (naturaleza_movimiento IN ('debito', 'credito'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'movimientos_bancarios_origen_registro_check'
  ) THEN
    ALTER TABLE public.movimientos_bancarios
      ADD CONSTRAINT movimientos_bancarios_origen_registro_check
      CHECK (origen_registro IN ('manual', 'importado'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.conciliaciones_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cuenta_bancaria_id UUID NOT NULL REFERENCES public.cuentas_bancarias(id) ON DELETE CASCADE,
  fecha_corte DATE NOT NULL,
  saldo_banco NUMERIC NOT NULL DEFAULT 0,
  saldo_libros NUMERIC NOT NULL DEFAULT 0,
  diferencia NUMERIC NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'borrador',
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT conciliaciones_bancarias_estado_check CHECK (estado IN ('borrador', 'conciliado', 'con_diferencias')),
  CONSTRAINT conciliaciones_bancarias_unique UNIQUE (user_id, cuenta_bancaria_id, fecha_corte)
);

CREATE TABLE IF NOT EXISTS public.conciliacion_bancaria_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conciliacion_id UUID NOT NULL REFERENCES public.conciliaciones_bancarias(id) ON DELETE CASCADE,
  movimiento_bancario_id UUID REFERENCES public.movimientos_bancarios(id) ON DELETE SET NULL,
  asiento_id UUID REFERENCES public.asientos_contables(id) ON DELETE SET NULL,
  origen TEXT NOT NULL,
  tipo_partida TEXT NOT NULL,
  fecha DATE NOT NULL,
  referencia TEXT,
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL DEFAULT 0,
  conciliado BOOLEAN NOT NULL DEFAULT false,
  requiere_ajuste BOOLEAN NOT NULL DEFAULT false,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT conciliacion_bancaria_items_origen_check CHECK (origen IN ('movimiento_bancario', 'asiento_contable', 'ajuste_propuesto')),
  CONSTRAINT conciliacion_bancaria_items_tipo_check CHECK (tipo_partida IN ('coincidencia', 'cheque_transito', 'deposito_transito', 'cargo_bancario', 'abono_bancario', 'diferencia_manual')),
  CONSTRAINT conciliacion_bancaria_items_estado_check CHECK (estado IN ('pendiente', 'aplicado', 'omitido'))
);

CREATE INDEX IF NOT EXISTS idx_movimientos_bancarios_cuenta_fecha
  ON public.movimientos_bancarios (cuenta_bancaria_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_conciliaciones_bancarias_cuenta_fecha
  ON public.conciliaciones_bancarias (cuenta_bancaria_id, fecha_corte DESC);

CREATE INDEX IF NOT EXISTS idx_conciliacion_bancaria_items_conciliacion
  ON public.conciliacion_bancaria_items (conciliacion_id);

ALTER TABLE public.conciliaciones_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conciliacion_bancaria_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conciliaciones_bancarias'
      AND policyname = 'Users can manage their own conciliaciones_bancarias'
  ) THEN
    CREATE POLICY "Users can manage their own conciliaciones_bancarias"
    ON public.conciliaciones_bancarias
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conciliacion_bancaria_items'
      AND policyname = 'Users can manage their own conciliacion_bancaria_items'
  ) THEN
    CREATE POLICY "Users can manage their own conciliacion_bancaria_items"
    ON public.conciliacion_bancaria_items
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

CREATE TRIGGER update_conciliaciones_bancarias_updated_at
  BEFORE UPDATE ON public.conciliaciones_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conciliacion_bancaria_items_updated_at
  BEFORE UPDATE ON public.conciliacion_bancaria_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
