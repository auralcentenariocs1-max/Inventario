import { useEffect, useState } from 'react'
import { supabase, subirImagenPendon } from '../supabaseClient'
import PendonCard from '../components/PendonCard'

const CIUDADES = ['Cali', 'Medellín', 'Cartagena', 'Barranquilla', 'Bogotá']

export default function Pendones() {
  const [pendones, setPendones] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const [nombre, setNombre] = useState('')
  const [imagenFile, setImagenFile] = useState(null)
  const [subiendo, setSubiendo] = useState(false)

  async function cargar() {
    setLoading(true)
    const [{ data: pends, error: errPends }, { data: hist, error: errHist }] = await Promise.all([
      supabase.from('pendones').select('*').eq('activo', true).order('nombre'),
      supabase
        .from('prestamos_pendones')
        .select('*')
        .order('fecha_prestamo', { ascending: false })
        .limit(100),
    ])

    if (errPends || errHist) {
      mostrarToast('No se pudo cargar los pendones.', true)
      setLoading(false)
      return
    }

    // A cada pendón prestado le adjuntamos su préstamo abierto (para mostrar a quién y desde cuándo)
    const prestamosAbiertos = hist.filter(h => !h.devuelto)
    const conPrestamo = pends.map(p => ({
      ...p,
      prestamo_actual: prestamosAbiertos.find(pr => pr.pendon_id === p.id) || null,
    }))

    setPendones(conPrestamo)
    setHistorial(hist)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function mostrarToast(msg, warn) {
    setToast({ msg, warn: !!warn })
    setTimeout(() => setToast(null), 3200)
  }

  function fmtFecha(iso) {
    const d = new Date(iso)
    return (
      d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    )
  }

  async function agregarPendon(e) {
    e.preventDefault()
    if (!nombre.trim()) {
      mostrarToast('Ponele un nombre al pendón.', true)
      return
    }

    setSubiendo(true)
    let imagenUrl = null
    try {
      if (imagenFile) {
        imagenUrl = await subirImagenPendon(imagenFile)
      }
    } catch (err) {
      setSubiendo(false)
      mostrarToast('No se pudo subir la imagen.', true)
      return
    }

    const { error } = await supabase
      .from('pendones')
      .insert({ nombre: nombre.trim(), imagen_url: imagenUrl })

    setSubiendo(false)

    if (error) {
      mostrarToast('No se pudo agregar el pendón.', true)
      return
    }

    setNombre('')
    setImagenFile(null)
    mostrarToast('Pendón agregado.')
    cargar()
  }

  async function cambiarImagen(pendon, file) {
    try {
      const imagenUrl = await subirImagenPendon(file)
      const { error } = await supabase
        .from('pendones')
        .update({ imagen_url: imagenUrl })
        .eq('id', pendon.id)

      if (error) throw error
      mostrarToast('Imagen actualizada.')
      cargar()
    } catch (err) {
      mostrarToast('No se pudo actualizar la imagen.', true)
    }
  }

  async function prestar(pendon) {
    const area = prompt('¿Qué área lo solicita?')
    if (area === null) return
    if (!area.trim()) {
      mostrarToast('Indicá un área válida.', true)
      return
    }

    const persona = prompt('¿Quién se lo lleva (persona)?')
    if (persona === null) return
    if (!persona.trim()) {
      mostrarToast('Indicá una persona válida.', true)
      return
    }

    const { error } = await supabase.rpc('prestar_pendon', {
      p_pendon_id: pendon.id,
      p_area: area.trim(),
      p_persona: persona.trim(),
    })

    if (error) {
      mostrarToast('No se pudo registrar el préstamo.', true)
      return
    }

    mostrarToast(`"${pendon.nombre}" prestado a ${persona.trim()} (${area.trim()}).`)
    cargar()
  }

  async function devolver(pendon) {
    const confirmado = confirm(`¿Registrar la devolución de "${pendon.nombre}"?`)
    if (!confirmado) return

    const { error } = await supabase.rpc('devolver_pendon', { p_pendon_id: pendon.id })

    if (error) {
      mostrarToast('No se pudo registrar la devolución.', true)
      return
    }

    mostrarToast(`"${pendon.nombre}" disponible de nuevo.`)
    cargar()
  }

  async function eliminar(pendon) {
    if (pendon.estado === 'prestado') {
      mostrarToast('No podés eliminar un pendón que está prestado.', true)
      return
    }
    const confirmado = confirm(
      `¿Eliminar "${pendon.nombre}"? El historial de préstamos se conserva.`
    )
    if (!confirmado) return

    const { error } = await supabase
      .from('pendones')
      .update({ activo: false })
      .eq('id', pendon.id)

    if (error) {
      mostrarToast('No se pudo eliminar el pendón.', true)
      return
    }

    mostrarToast('Pendón eliminado.')
    cargar()
  }

  return (
    <div>
      <div className="card">
        <h2>Pendones</h2>

        {loading ? (
          <div className="empty">Cargando...</div>
        ) : pendones.length === 0 ? (
          <div className="empty">Todavía no agregaste pendones. Sumá el primero abajo.</div>
        ) : (
          <div className="materials-grid">
            {pendones.map(p => (
              <PendonCard
                key={p.id}
                pendon={p}
                onPrestar={prestar}
                onDevolver={devolver}
                onImageChange={cambiarImagen}
                onDelete={eliminar}
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <form onSubmit={agregarPendon}>
            <div className="field">
              <label htmlFor="newPendonName">Nombre del pendón</label>
              <input
                id="newPendonName"
                type="text"
                placeholder="Ej: Pendón chequeo auditivo gratis"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="newPendonImage">Foto (opcional)</label>
              <input
                id="newPendonImage"
                type="file"
                accept="image/*"
                onChange={e => setImagenFile(e.target.files?.[0] || null)}
              />
            </div>
            <button type="submit" disabled={subiendo}>
              {subiendo ? 'Guardando...' : 'Agregar pendón'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <h2>Historial de préstamos</h2>
        {loading ? (
          <div className="empty">Cargando...</div>
        ) : historial.length === 0 ? (
          <div className="empty">Todavía no hay préstamos registrados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pendón</th>
                <th>Área</th>
                <th>Persona</th>
                <th>Prestado</th>
                <th>Devuelto</th>
              </tr>
            </thead>
            <tbody>
              {historial.map(h => (
                <tr key={h.id}>
                  <td>{h.pendon_nombre}</td>
                  <td>{h.area}</td>
                  <td>{h.persona}</td>
                  <td>{fmtFecha(h.fecha_prestamo)}</td>
                  <td>{h.devuelto ? fmtFecha(h.fecha_devolucion) : 'En préstamo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && (
        <div className={`toast show${toast.warn ? ' warn' : ''}`}>{toast.msg}</div>
      )}
    </div>
  )
}
