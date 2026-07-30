import { useEffect, useState } from 'react'
import { supabase, subirImagenMaterial } from '../supabaseClient'
import MaterialCard from '../components/MaterialCard'
import AlertBanner from '../components/AlertBanner'

export default function Materiales() {
  const [materiales, setMateriales] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const [nombre, setNombre] = useState('')
  const [stock, setStock] = useState('')
  const [umbral, setUmbral] = useState('100')
  const [imagenFile, setImagenFile] = useState(null)
  const [subiendo, setSubiendo] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('materiales')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (error) {
      mostrarToast('No se pudo cargar el inventario.', true)
    } else {
      setMateriales(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function mostrarToast(msg, warn) {
    setToast({ msg, warn: !!warn })
    setTimeout(() => setToast(null), 3200)
  }

  async function agregarMaterial(e) {
    e.preventDefault()
    const stockNum = parseInt(stock, 10)
    const umbralNum = parseInt(umbral, 10)

    if (!nombre.trim() || isNaN(stockNum) || isNaN(umbralNum)) {
      mostrarToast('Completá todos los campos.', true)
      return
    }

    setSubiendo(true)
    let imagenUrl = null
    try {
      if (imagenFile) {
        imagenUrl = await subirImagenMaterial(imagenFile)
      }
    } catch (err) {
      setSubiendo(false)
      mostrarToast('No se pudo subir la imagen.', true)
      return
    }

    const { error } = await supabase
      .from('materiales')
      .insert({ nombre: nombre.trim(), stock: stockNum, umbral: umbralNum, imagen_url: imagenUrl })

    setSubiendo(false)

    if (error) {
      mostrarToast('No se pudo agregar el material.', true)
      return
    }

    setNombre('')
    setStock('')
    setUmbral('100')
    setImagenFile(null)
    mostrarToast('Material agregado.')
    cargar()
  }

  async function cambiarImagen(material, file) {
    try {
      const imagenUrl = await subirImagenMaterial(file)
      const { error } = await supabase
        .from('materiales')
        .update({ imagen_url: imagenUrl })
        .eq('id', material.id)

      if (error) throw error
      mostrarToast('Imagen actualizada.')
      cargar()
    } catch (err) {
      mostrarToast('No se pudo actualizar la imagen.', true)
    }
  }

  async function restock(material) {
    const cantidadStr = prompt(`¿Cuánto vas a sumar al stock de "${material.nombre}"?`)
    if (cantidadStr === null) return
    const cantidad = parseInt(cantidadStr, 10)
    if (isNaN(cantidad) || cantidad <= 0) {
      mostrarToast('Cantidad no válida.', true)
      return
    }

    const { error } = await supabase.rpc('reponer_stock', {
      p_material_id: material.id,
      p_cantidad: cantidad,
    })

    if (error) {
      mostrarToast('No se pudo reponer el stock.', true)
      return
    }

    mostrarToast(`Se sumaron ${cantidad} a "${material.nombre}".`)
    cargar()
  }

  async function eliminar(material) {
    const confirmado = confirm(
      `¿Eliminar "${material.nombre}" del inventario? El historial de solicitudes se conserva.`
    )
    if (!confirmado) return

    const { error } = await supabase
      .from('materiales')
      .update({ activo: false })
      .eq('id', material.id)

    if (error) {
      mostrarToast('No se pudo eliminar el material.', true)
      return
    }

    mostrarToast('Material eliminado.')
    cargar()
  }

  return (
    <div>
      <AlertBanner materiales={materiales} />

      <div className="card">
        <h2>Materiales en inventario</h2>

        {loading ? (
          <div className="empty">Cargando...</div>
        ) : materiales.length === 0 ? (
          <div className="empty">Todavía no agregaste materiales. Sumá el primero abajo.</div>
        ) : (
          <div className="materials-grid">
            {materiales.map(m => (
              <MaterialCard
                key={m.id}
                material={m}
                onRestock={restock}
                onDelete={eliminar}
                onImageChange={cambiarImagen}
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <form onSubmit={agregarMaterial}>
            <div className="field">
              <label htmlFor="newName">Nombre del material</label>
              <input
                id="newName"
                type="text"
                placeholder="Ej: Volantes chequeo gratis"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="newStock">Cantidad actual</label>
              <input
                id="newStock"
                type="number"
                min="0"
                placeholder="0"
                value={stock}
                onChange={e => setStock(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="newThreshold">Alertar en</label>
              <input
                id="newThreshold"
                type="number"
                min="0"
                value={umbral}
                onChange={e => setUmbral(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="newImage">Foto (opcional)</label>
              <input
                id="newImage"
                type="file"
                accept="image/*"
                onChange={e => setImagenFile(e.target.files?.[0] || null)}
              />
            </div>
            <button type="submit" disabled={subiendo}>
              {subiendo ? 'Guardando...' : 'Agregar material'}
            </button>
          </form>
        </div>
      </div>

      {toast && (
        <div className={`toast show${toast.warn ? ' warn' : ''}`}>{toast.msg}</div>
      )}
    </div>
  )
}
