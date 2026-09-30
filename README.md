# Inventario de material publicitario

App interna (React + Vite + Supabase) para Aural: lleva el stock de material publicitario consumible, descuenta cuando un área lo solicita, alerta al llegar al umbral, y ahora también controla el préstamo y devolución de pendones.

## 1. Supabase

Si es un proyecto nuevo: en **SQL Editor**, pegá y corré todo `supabase/schema.sql`.

Si ya tenías corrido un `schema.sql` anterior (sin el módulo de pendones): corré en cambio `supabase/migration_pendones.sql` — agrega solo lo nuevo, sin tocar lo que ya tenés cargado.

En **Project Settings → Data API** copiá el `Project URL` y la `anon public key`.

## 2. Local

```bash
cp .env.example .env
```
Completá `.env` con tus dos valores de Supabase, luego:
```bash
npm install
npm run dev
```

## 3. Netlify

Build command: `npm run build` — Publish directory: `dist` (ya en `netlify.toml`).
En **Site settings → Environment variables** agregá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, después Deploy.

## Cómo funciona

- **Inventario**: materiales consumibles (con foto opcional), stock, reponer, dar de baja.
- **Solicitudes**: descuenta stock a nombre de un área + una persona, con historial completo.
- **Pendones** (nuevo): pendones prestables con foto. Cada uno está **Disponible** o **Prestado**.
  - Con "Prestar" indicás área y persona, y queda registrada la fecha de préstamo.
  - Con "Registrar devolución" el pendón vuelve a estar disponible para prestarlo de nuevo, y queda la fecha de devolución en el historial.
  - El historial de préstamos muestra: pendón, área, persona, fecha de préstamo y fecha de devolución (o "En préstamo" si todavía no volvió).
- **Alertas**: si el stock de un material consumible queda en o por debajo de su umbral (100 por defecto), aparece un banner y un aviso al cruzar ese límite.

## Seguridad

Panel interno sin login: cualquiera con la URL de Netlify y la anon key puede leer y escribir. Si más adelante querés protegerlo con contraseña o Supabase Auth, avisame.
