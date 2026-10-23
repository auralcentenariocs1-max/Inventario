import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const CIUDADES = ['Cali', 'Medellín', 'Cartagena', 'Barranquilla', 'Bogotá']

export default function Solicitudes() {
  const [materiales, setMateriales] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const [materialId, setMaterialId] = useState('')
  const [area, setArea] = useState('')
  const [persona, setPersona] = useState('')
  const [cantidad, setCantidad] = useState('')

  async function cargar() {
    setLoading(true)
    const [{ data: mats, error: errMats }, { data: hist, error: errHist }] = await Promise.all([
      supabase.from('materiales').select('*').eq('activo', true).order('nombre'),
      supabase.from('solicitudes').select('*').order('created_at', { ascending: false }).limit(100),
    ])

    if (errMats || errHist) {
      mostrarToast('No se pudo cargar la información.', true)
    } else {
      setMateriales(mats)
      setHistorial(hist)
      if (mats.length > 0 && !materialId) setMaterialId(mats[0].id)
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function registrar(e) {
    e.preventDefault()
    const cantidadNum = parseInt(cantidad, 10)

    if (!materialId) { mostrarToast('Elegí un material.', true); return }
    if (!area.trim()) { mostrarToast('Indicá qué área lo solicita.', true); return }
    if (!persona.trim()) { mostrarToast('Indicá quién retira el material.', true); return }
    if (isNaN(cantidadNum) || cantidadNum <= 0) { mostrarToast('Cantidad no válida.', true); return }

    const materialAntes = materiales.find(m => m.id === materialId)

    const { data, error } = await supabase.rpc('registrar_solicitud', {
      p_material_id: materialId,
      p_area: area.trim(),
      p_persona: persona.trim(),
      p_cantidad: cantidadNum,
    })

    if (error) {
      mostrarToast(error.message.includes('Stock insuficiente')
        ? `No hay stock suficiente. Quedan ${materialAntes?.stock ?? 0}.`
        : 'No se pudo registrar la solicitud.', true)
      return
    }

    setArea('')
    setPersona('')
    setCantidad('')

    const nuevoStock = data.stock
    const cruzoUmbral = materialAntes && materialAntes.stock > materialAntes.umbral && nuevoStock <= materialAntes.umbral

    if (cruzoUmbral) {
      mostrarToast(`Atención: "${materialAntes.nombre}" llegó a ${nuevoStock}, en el límite de alerta.`, true)
    } else {
      mostrarToast(`Solicitud registrada: ${cantidadNum} de "${materialAntes?.nombre}".`)
    }

    cargar()
  }

  return (
    <div>
      <div className="card">
        <h2>Registrar solicitud de un área</h2>
        <form onSubmit={registrar}>
          <div className="field">
            <label htmlFor="reqMaterial">Material</label>
            <select id="reqMaterial" value={materialId} onChange={e => setMaterialId(e.target.value)} required>
              {materiales.length === 0 && <option value="">Agregá un material primero</option>}
              {materiales.map(m => (
                <option key={m.id} value={m.id}>{m.nombre} (stock: {m.stock})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="reqArea">Área que solicita</label>
            <input id="reqArea" type="text" list="areaOptions" placeholder="Ej: Bogotá"
              value={area} onChange={e => setArea(e.target.value)} required />
            <datalist id="areaOptions">
              {CIUDADES.map(c => (<option key={c} value={c} />))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="reqPersona">Persona que retira</label>
            <input id="reqPersona" type="text" placeholder="Ej: Yurani Gómez"
              value={persona} onChange={e => setPersona(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="reqQty">Cantidad solicitada</label>
            <input id="reqQty" type="number" min="1"
              value={cantidad} onChange={e => setCantidad(e.target.value)} required />
          </div>
          <button type="submit">Registrar solicitud</button>
        </form>
      </div>

      <div className="card">
        <h2>Últimas solicitudes</h2>
        {loading ? (
          <div className="empty">Cargando...</div>
        ) : historial.length === 0 ? (
          <div className="empty">Todavía no hay solicitudes registradas.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Fecha</th><th>Material</th><th>Área</th><th>Persona</th><th>Cantidad</th></tr>
            </thead>
            <tbody>
              {historial.map(h => (
                <tr key={h.id}>
                  <td>{fmtFecha(h.created_at)}</td>
                  <td>{h.material_nombre}</td>
                  <td>{h.area}</td>
                  <td>{h.persona}</td>
                  <td>{h.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="muted-small" style={{ marginTop: 10 }}>
          Mostrando las últimas 100. Para ver y descargar todo el historial por mes, usá la pestaña Reportes.
        </div>
      </div>

      {toast && (
        <div className={`toast show${toast.warn ? ' warn' : ''}`}>{toast.msg}</div>
      )}
    </div>
  )
}
