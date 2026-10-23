import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Faltan variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Revisá tu archivo .env (local) o las variables de entorno en Netlify.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function subirImagen(bucket, file) {
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export function subirImagenMaterial(file) {
  return subirImagen('material-imagenes', file)
}

export function subirImagenPendon(file) {
  return subirImagen('pendones-imagenes', file)
}
