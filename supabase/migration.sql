-- =========================================================
-- Migración: correr SOLO si ya habías ejecutado schema.sql antes
-- de esta actualización (agrega imagen a materiales y persona
-- a solicitudes). Si estás arrancando de cero, ignorá este
-- archivo y corré directamente schema.sql completo.
-- =========================================================

alter table materiales add column if not exists imagen_url text;

alter table solicitudes add column if not exists persona text not null default 'Sin especificar';
alter table solicitudes alter column persona drop default;

drop function if exists registrar_solicitud(uuid, text, integer);

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

insert into storage.buckets (id, name, public)
values ('material-imagenes', 'material-imagenes', true)
on conflict (id) do nothing;

create policy if not exists "material_imagenes_select" on storage.objects
  for select using (bucket_id = 'material-imagenes');

create policy if not exists "material_imagenes_insert" on storage.objects
  for insert with check (bucket_id = 'material-imagenes');

create policy if not exists "material_imagenes_update" on storage.objects
  for update using (bucket_id = 'material-imagenes');

create policy if not exists "material_imagenes_delete" on storage.objects
  for delete using (bucket_id = 'material-imagenes');
