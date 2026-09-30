-- =========================================================
-- Migración: agrega el módulo de préstamo de pendones
-- a un proyecto que YA tiene corrido schema.sql (con materiales,
-- solicitudes, imágenes y persona). No borra nada existente.
-- =========================================================

create table if not exists pendones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  imagen_url text,
  estado text not null default 'disponible' check (estado in ('disponible', 'prestado')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists prestamos_pendones (
  id uuid primary key default gen_random_uuid(),
  pendon_id uuid not null references pendones(id) on delete restrict,
  pendon_nombre text not null,
  area text not null,
  persona text not null,
  fecha_prestamo timestamptz not null default now(),
  fecha_devolucion timestamptz,
  devuelto boolean not null default false
);

create index if not exists idx_prestamos_pendon on prestamos_pendones(pendon_id);
create index if not exists idx_prestamos_created on prestamos_pendones(fecha_prestamo desc);

create or replace function prestar_pendon(
  p_pendon_id uuid,
  p_area text,
  p_persona text
) returns pendones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pendon pendones;
begin
  if p_area is null or length(trim(p_area)) = 0 then
    raise exception 'Debés indicar el área que lo solicita';
  end if;

  if p_persona is null or length(trim(p_persona)) = 0 then
    raise exception 'Debés indicar la persona que se lo lleva';
  end if;

  update pendones
  set estado = 'prestado'
  where id = p_pendon_id
    and activo = true
    and estado = 'disponible'
  returning * into v_pendon;

  if v_pendon.id is null then
    raise exception 'El pendón no está disponible';
  end if;

  insert into prestamos_pendones (pendon_id, pendon_nombre, area, persona)
  values (v_pendon.id, v_pendon.nombre, trim(p_area), trim(p_persona));

  return v_pendon;
end;
$$;

create or replace function devolver_pendon(
  p_pendon_id uuid
) returns pendones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pendon pendones;
begin
  update prestamos_pendones
  set fecha_devolucion = now(), devuelto = true
  where pendon_id = p_pendon_id and devuelto = false;

  update pendones
  set estado = 'disponible'
  where id = p_pendon_id
  returning * into v_pendon;

  if v_pendon.id is null then
    raise exception 'Pendón no encontrado';
  end if;

  return v_pendon;
end;
$$;

insert into storage.buckets (id, name, public)
values ('pendones-imagenes', 'pendones-imagenes', true)
on conflict (id) do nothing;

create policy if not exists "pendones_imagenes_select" on storage.objects
  for select using (bucket_id = 'pendones-imagenes');

create policy if not exists "pendones_imagenes_insert" on storage.objects
  for insert with check (bucket_id = 'pendones-imagenes');

create policy if not exists "pendones_imagenes_update" on storage.objects
  for update using (bucket_id = 'pendones-imagenes');

create policy if not exists "pendones_imagenes_delete" on storage.objects
  for delete using (bucket_id = 'pendones-imagenes');

alter table pendones enable row level security;
alter table prestamos_pendones enable row level security;

create policy if not exists "pendones_select" on pendones for select using (true);
create policy if not exists "pendones_insert" on pendones for insert with check (true);
create policy if not exists "pendones_update" on pendones for update using (true);

create policy if not exists "prestamos_pendones_select" on prestamos_pendones for select using (true);
