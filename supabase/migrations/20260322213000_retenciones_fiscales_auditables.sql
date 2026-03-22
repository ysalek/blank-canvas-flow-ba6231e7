create table if not exists public.retenciones_fiscales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  numero_retencion text not null,
  fecha_retencion date not null,
  nit_retenido text not null,
  razon_social_retenido text not null,
  numero_factura text not null,
  fecha_factura date not null,
  monto_factura numeric(14,2) not null default 0,
  tipo_retencion text not null,
  porcentaje_retencion numeric(8,2) not null default 0,
  monto_retencion numeric(14,2) not null default 0,
  codigo_retencion text not null,
  estado text not null default 'emitida',
  observaciones text null,
  asiento_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retenciones_fiscales_estado_check check (estado in ('emitida','presentada','anulada'))
);

create unique index if not exists retenciones_fiscales_user_numero_idx
  on public.retenciones_fiscales(user_id, numero_retencion);

create unique index if not exists retenciones_fiscales_user_codigo_idx
  on public.retenciones_fiscales(user_id, codigo_retencion);

alter table public.retenciones_fiscales enable row level security;

drop policy if exists "Users can view their retenciones fiscales" on public.retenciones_fiscales;
create policy "Users can view their retenciones fiscales"
  on public.retenciones_fiscales
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their retenciones fiscales" on public.retenciones_fiscales;
create policy "Users can insert their retenciones fiscales"
  on public.retenciones_fiscales
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their retenciones fiscales" on public.retenciones_fiscales;
create policy "Users can update their retenciones fiscales"
  on public.retenciones_fiscales
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists update_retenciones_fiscales_updated_at on public.retenciones_fiscales;
create trigger update_retenciones_fiscales_updated_at
before update on public.retenciones_fiscales
for each row execute function public.update_updated_at_column();
