# Inventario de material publicitario

App interna (React + Vite + Supabase) para llevar el stock de material publicitario de Aural, descontar cuando un área lo solicita, y alertar cuando un material llega a su umbral (100 por defecto).

## 1. Crear el proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) y creá un **proyecto nuevo**.
2. Entrá a **SQL Editor** → pegá todo el contenido de `supabase/schema.sql` → ejecutalo.
3. En **Project Settings → API** copiá:
   - `Project URL`
   - `anon public key`

## 2. Configurar el proyecto localmente

```bash
cp .env.example .env
```

Editá `.env` y pegá tus valores:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
```

Instalá dependencias y corré en local:

```bash
npm install
npm run dev
```

## 3. Desplegar en Netlify

1. Subí este proyecto a un repo de GitHub (o arrastralo directo a Netlify).
2. En Netlify, **Add new site → Import an existing project**.
3. Build command: `npm run build` — Publish directory: `dist` (ya está en `netlify.toml`).
4. En **Site settings → Environment variables**, agregá:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

## Cómo funciona

- **Pestaña Inventario**: agregar materiales (con foto opcional), ver stock actual, reponer, cambiar la foto tocando la imagen, o dar de baja (baja lógica, no borra el historial). Las fotos se guardan en un bucket público de Supabase Storage llamado `material-imagenes` (ya lo crea `schema.sql`).
- **Pestaña Solicitudes**: elegir material + área + **persona que retira** + cantidad → descuenta el stock de forma atómica vía la función `registrar_solicitud` en Postgres (evita condiciones de carrera si dos personas registran al mismo tiempo). El historial queda con fecha, material, área, persona y cantidad.
- **Alertas**: si el stock de un material queda en o por debajo de su umbral (100 por defecto, editable por material), aparece un banner arriba y un aviso al momento de cruzar ese límite.

## Si ya habías creado el proyecto antes de este cambio

Corré `supabase/migration.sql` en el SQL Editor en lugar de `schema.sql` — agrega la columna de imagen, la columna de persona y el bucket de fotos sin tocar los datos que ya tengas cargados.

## Seguridad

Este panel no tiene login: cualquiera con la URL de Netlify y la anon key puede leer y escribir. Es el mismo nivel de exposición que un panel interno sin autenticación. Si más adelante querés protegerlo con una contraseña simple o con Supabase Auth, decime y lo agregamos.
