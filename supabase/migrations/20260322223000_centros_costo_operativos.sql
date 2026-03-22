alter table public.centros_costo
  add column if not exists responsable text null,
  add column if not exists presupuesto numeric(14,2) not null default 0,
  add column if not exists departamento text null,
  add column if not exists cuentas_contables jsonb not null default '[]'::jsonb,
  add column if not exists presupuesto_ejecutado numeric(14,2) not null default 0,
  add column if not exists estado text not null default 'activo';

update public.centros_costo
set estado = case when activo is false then 'inactivo' else 'activo' end
where estado is null;

alter table public.centros_costo
  alter column estado set default 'activo';

alter table public.centros_costo
  add constraint centros_costo_estado_check
  check (estado in ('activo','inactivo'));
