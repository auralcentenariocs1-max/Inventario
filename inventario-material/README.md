# Inventario de material publicitario

App interna (React + Vite + Supabase) para Aural: stock de material consumible con alerta de umbral, solicitudes por área y persona, préstamo de pendones y reportes mensuales descargables en Excel.

## Supabase
- Proyecto nuevo: corré `supabase/schema.sql` completo en el SQL Editor.
- Si ya tenías el inventario corriendo (con o sin pendones): corré `supabase/migration_pendones.sql` para agregar pendones (Reportes no necesita cambios en la base de datos).

## Local
```bash
cp .env.example .env   # completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Netlify
Build: `npm run build` — Publish: `dist`. Variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Pestañas
- **Inventario**: materiales con foto, stock, reponer, baja lógica.
- **Solicitudes**: descuenta stock registrando área y persona.
- **Pendones**: préstamo y devolución con fecha, área y persona.
- **Reportes**: por mes (o todo el historial) muestra quién se llevó qué, totales por material y detalle; botón **Descargar Excel** con 3 hojas (resumen por persona, entregas de material, préstamos de pendones).

## Seguridad
Panel interno sin login: cualquiera con la URL y la anon key puede leer y escribir.
