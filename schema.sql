-- =========================================================
-- Inventario de material publicitario · Aural
-- Ejecutar completo en el SQL Editor de un proyecto Supabase NUEVO
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Tabla: materiales (consumibles: se descuentan y no vuelven)
-- ---------------------------------------------------------
create table if not exists materiales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  stock integer not null default 0,
  umbral integer not null default 100,
  imagen_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Tabla: solicitudes (historial de consumo, nunca se borra)
-- ---------------------------------------------------------
create table if not exists solicitudes (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materiales(id) on delete restrict,
  material_nombre text not null,
  area text not null,
  persona text not null,
  cantidad integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_solicitudes_material on solicitudes(material_id);
create index if not exists idx_solicitudes_created on solicitudes(created_at desc);

-- ---------------------------------------------------------
-- Tabla: pendones (activos prestables: van y vuelven)
-- ---------------------------------------------------------
create table if not exists pendones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  imagen_url text,
  estado text not null default 'disponible' check (estado in ('disponible', 'prestado')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Tabla: prestamos_pendones (historial de préstamos, nunca se borra)
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- Función: registrar_solicitud
-- Descuenta stock de forma atómica y registra el historial.
-- ---------------------------------------------------------
create or replace function registrar_solicitud(
  p_material_id uuid,
  p_area text,
  p_persona text,
  p_cantidad integer
) returns materiales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material materiales;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  if p_area is null or length(trim(p_area)) = 0 then
    raise exception 'Debés indicar el área que solicita';
  end if;

  if p_persona is null or length(trim(p_persona)) = 0 then
    raise exception 'Debés indicar la persona que retira el material';
  end if;

  update materiales
  set stock = stock - p_cantidad
  where id = p_material_id
    and activo = true
    and stock >= p_cantidad
  returning * into v_material;

  if v_material.id is null then
    raise exception 'Stock insuficiente o material no encontrado';
  end if;

  insert into solicitudes (material_id, material_nombre, area, persona, cantidad)
  values (v_material.id, v_material.nombre, trim(p_area), trim(p_persona), p_cantidad);

  return v_material;
end;
$$;

-- ---------------------------------------------------------
-- Función: reponer_stock
-- ---------------------------------------------------------
create or replace function reponer_stock(
  p_material_id uuid,
  p_cantidad integer
) returns materiales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material materiales;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  update materiales
  set stock = stock + p_cantidad
  where id = p_material_id
  returning * into v_material;

  if v_material.id is null then
    raise exception 'Material no encontrado';
  end if;

  return v_material;
end;
$$;

-- ---------------------------------------------------------
-- Función: prestar_pendon
-- Marca el pendón como prestado y abre un registro de préstamo.
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- Función: devolver_pendon
-- Cierra el préstamo abierto y deja el pendón disponible de nuevo.
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- Storage: bucket público para fotos de materiales
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('material-imagenes', 'material-imagenes', true)
on conflict (id) do nothing;

create policy "material_imagenes_select" on storage.objects
  for select using (bucket_id = 'material-imagenes');

create policy "material_imagenes_insert" on storage.objects
  for insert with check (bucket_id = 'material-imagenes');

create policy "material_imagenes_update" on storage.objects
  for update using (bucket_id = 'material-imagenes');

create policy "material_imagenes_delete" on storage.objects
  for delete using (bucket_id = 'material-imagenes');

-- ---------------------------------------------------------
-- Storage: bucket público para fotos de pendones
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pendones-imagenes', 'pendones-imagenes', true)
on conflict (id) do nothing;

create policy "pendones_imagenes_select" on storage.objects
  for select using (bucket_id = 'pendones-imagenes');

create policy "pendones_imagenes_insert" on storage.objects
  for insert with check (bucket_id = 'pendones-imagenes');

create policy "pendones_imagenes_update" on storage.objects
  for update using (bucket_id = 'pendones-imagenes');

create policy "pendones_imagenes_delete" on storage.objects
  for delete using (bucket_id = 'pendones-imagenes');

-- ---------------------------------------------------------
-- Row Level Security
-- Este es un panel interno (no público), protegido solo por la
-- URL del sitio de Netlify. El anon key puede leer/escribir.
-- ---------------------------------------------------------
alter table materiales enable row level security;
alter table solicitudes enable row level security;
alter table pendones enable row level security;
alter table prestamos_pendones enable row level security;

create policy "materiales_select" on materiales for select using (true);
create policy "materiales_insert" on materiales for insert with check (true);
create policy "materiales_update" on materiales for update using (true);

create policy "solicitudes_select" on solicitudes for select using (true);

create policy "pendones_select" on pendones for select using (true);
create policy "pendones_insert" on pendones for insert with check (true);
create policy "pendones_update" on pendones for update using (true);

create policy "prestamos_pendones_select" on prestamos_pendones for select using (true);

-- Nota: las escrituras que modifican stock/estado siempre pasan por las
-- funciones de arriba (security definer), no por escritura directa a la tabla.
