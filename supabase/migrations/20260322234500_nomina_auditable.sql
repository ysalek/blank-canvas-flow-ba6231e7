create table if not exists public.nomina_planillas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  periodo text not null,
  fecha_generacion date not null,
  fecha_pago date null,
  estado text not null default 'borrador',
  total_ingresos numeric(14,2) not null default 0,
  total_descuentos numeric(14,2) not null default 0,
  total_aportes_patronales numeric(14,2) not null default 0,
  total_neto numeric(14,2) not null default 0,
  total_rciva numeric(14,2) not null default 0,
  observaciones text null,
  asiento_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nomina_planillas_estado_check check (estado in ('borrador', 'aprobada', 'pagada'))
);

create unique index if not exists nomina_planillas_user_periodo_idx
  on public.nomina_planillas(user_id, periodo);

create table if not exists public.nomina_planilla_detalles (
  id uuid primary key default gen_random_uuid(),
  planilla_id uuid not null references public.nomina_planillas(id) on delete cascade,
  empleado_id uuid null references public.empleados(id) on delete set null,
  nombre_empleado text not null,
  ci_empleado text not null,
  cargo text not null,
  departamento text not null,
  fecha_ingreso date not null,
  salario_base numeric(14,2) not null default 0,
  ingresos jsonb not null default '{}'::jsonb,
  descuentos jsonb not null default '{}'::jsonb,
  aportes_patronales jsonb not null default '{}'::jsonb,
  total_ingresos numeric(14,2) not null default 0,
  total_descuentos numeric(14,2) not null default 0,
  total_aportes_patronales numeric(14,2) not null default 0,
  salario_neto numeric(14,2) not null default 0,
  rciva jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists nomina_planilla_detalles_planilla_idx
  on public.nomina_planilla_detalles(planilla_id);

create index if not exists nomina_planilla_detalles_empleado_idx
  on public.nomina_planilla_detalles(empleado_id);

create table if not exists public.nomina_facturas_rciva (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  periodo text not null,
  numero_factura text not null,
  nit_proveedor text not null,
  razon_social text not null,
  fecha date not null,
  importe_total numeric(14,2) not null default 0,
  codigo_control text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists nomina_facturas_rciva_unique_idx
  on public.nomina_facturas_rciva(user_id, empleado_id, periodo, numero_factura);

create index if not exists nomina_facturas_rciva_periodo_idx
  on public.nomina_facturas_rciva(user_id, periodo);

alter table public.nomina_planillas enable row level security;
alter table public.nomina_planilla_detalles enable row level security;
alter table public.nomina_facturas_rciva enable row level security;

drop policy if exists "Users can view their nomina planillas" on public.nomina_planillas;
create policy "Users can view their nomina planillas"
  on public.nomina_planillas
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their nomina planillas" on public.nomina_planillas;
create policy "Users can insert their nomina planillas"
  on public.nomina_planillas
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their nomina planillas" on public.nomina_planillas;
create policy "Users can update their nomina planillas"
  on public.nomina_planillas
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their nomina detalles" on public.nomina_planilla_detalles;
create policy "Users can view their nomina detalles"
  on public.nomina_planilla_detalles
  for select
  using (
    exists (
      select 1
      from public.nomina_planillas planilla
      where planilla.id = nomina_planilla_detalles.planilla_id
        and planilla.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert their nomina detalles" on public.nomina_planilla_detalles;
create policy "Users can insert their nomina detalles"
  on public.nomina_planilla_detalles
  for insert
  with check (
    exists (
      select 1
      from public.nomina_planillas planilla
      where planilla.id = nomina_planilla_detalles.planilla_id
        and planilla.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their nomina detalles" on public.nomina_planilla_detalles;
create policy "Users can update their nomina detalles"
  on public.nomina_planilla_detalles
  for update
  using (
    exists (
      select 1
      from public.nomina_planillas planilla
      where planilla.id = nomina_planilla_detalles.planilla_id
        and planilla.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.nomina_planillas planilla
      where planilla.id = nomina_planilla_detalles.planilla_id
        and planilla.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view their nomina facturas rciva" on public.nomina_facturas_rciva;
create policy "Users can view their nomina facturas rciva"
  on public.nomina_facturas_rciva
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their nomina facturas rciva" on public.nomina_facturas_rciva;
create policy "Users can insert their nomina facturas rciva"
  on public.nomina_facturas_rciva
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their nomina facturas rciva" on public.nomina_facturas_rciva;
create policy "Users can update their nomina facturas rciva"
  on public.nomina_facturas_rciva
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists update_nomina_planillas_updated_at on public.nomina_planillas;
create trigger update_nomina_planillas_updated_at
before update on public.nomina_planillas
for each row execute function public.update_updated_at_column();

drop trigger if exists update_nomina_facturas_rciva_updated_at on public.nomina_facturas_rciva;
create trigger update_nomina_facturas_rciva_updated_at
before update on public.nomina_facturas_rciva
for each row execute function public.update_updated_at_column();
