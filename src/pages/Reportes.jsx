import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabaseClient'

const PAGE = 1000

async function traerTodo(tabla, campoFecha, desde, hasta) {
  let filas = []
  let from = 0
  // Paginamos para no toparnos con el límite de 1000 filas de Supabase
  while (true) {
    let q = supabase.from(tabla).select('*').order(campoFecha, { ascending: true }).range(from, from + PAGE - 1)
    if (desde) q = q.gte(campoFecha, desde.toISOString())
    if (hasta) q = q.lt(campoFecha, hasta.toISOString())
    const { data, error } = await q
    if (error) throw error
    filas = filas.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return filas
}

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function claveMes(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtFecha(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return (
    d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  )
}

function nombreMes(clave) {
  const [y, m] = clave.split('-').map(Number)
  const txt = new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

export default function Reportes() {
  const [modo, setModo] = useState('mes') // 'mes' | 'todo'
  const [mes, setMes] = useState(mesActual())
  const [entregas, setEntregas] = useState([])
  const [prestamos, setPrestamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function cargar() {
    setLoading(true)
    setError(null)
    try {
      let desde = null
      let hasta = null
      if (modo === 'mes' && mes) {
        const [y, m] = mes.split('-').map(Number)
        desde = new Date(y, m - 1, 1)
        hasta = new Date(y, m, 1)
      }
      const [ent, pre] = await Promise.all([
        traerTodo('solicitudes', 'created_at', desde, hasta),
        traerTodo('prestamos_pendones', 'fecha_prestamo', desde, hasta),
      ])
      setEntregas(ent)
      setPrestamos(pre)
    } catch (e) {
      setError('No se pudo cargar el reporte. Intentá de nuevo.')
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, mes])

  // Resumen por persona (agrupado por nombre sin distinguir mayúsculas/espacios)
  const resumen = useMemo(() => {
    const mapa = new Map()
    const get = (persona) => {
      const k = persona.trim().toLowerCase()
      if (!mapa.has(k)) {
        mapa.set(k, { persona: persona.trim(), areas: new Set(), entregas: 0, unidades: 0, pendones: 0 })
      }
      return mapa.get(k)
    }
    entregas.forEach(e => {
      const r = get(e.persona)
      r.areas.add(e.area)
      r.entregas += 1
      r.unidades += e.cantidad
    })
    prestamos.forEach(p => {
      const r = get(p.persona)
      r.areas.add(p.area)
      r.pendones += 1
    })
    return [...mapa.values()]
      .map(r => ({ ...r, areas: [...r.areas].join(', ') }))
      .sort((a, b) => b.unidades + b.pendones - (a.unidades + a.pendones))
  }, [entregas, prestamos])

  // Total por material en el periodo
  const porMaterial = useMemo(() => {
    const mapa = new Map()
    entregas.forEach(e => mapa.set(e.material_nombre, (mapa.get(e.material_nombre) || 0) + e.cantidad))
    return [...mapa.entries()].sort((a, b) => b[1] - a[1])
  }, [entregas])

  const totalUnidades = entregas.reduce((s, e) => s + e.cantidad, 0)
  const titulo = modo === 'mes' ? nombreMes(mes) : 'Todo el historial'

  function descargar() {
    const wb = XLSX.utils.book_new()

    const hojaResumen = resumen.map(r => ({
      Persona: r.persona,
      'Área(s)': r.areas,
      'Entregas de material': r.entregas,
      'Unidades recibidas': r.unidades,
      'Pendones prestados': r.pendones,
    }))
    const hojaEntregas = entregas.map(e => ({
      Mes: nombreMes(claveMes(e.created_at)),
      Fecha: fmtFecha(e.created_at),
      Material: e.material_nombre,
      Área: e.area,
      Persona: e.persona,
      Cantidad: e.cantidad,
    }))
    const hojaPrestamos = prestamos.map(p => ({
      Mes: nombreMes(claveMes(p.fecha_prestamo)),
      Pendón: p.pendon_nombre,
      Área: p.area,
      Persona: p.persona,
      'Fecha de préstamo': fmtFecha(p.fecha_prestamo),
      'Fecha de devolución': p.devuelto ? fmtFecha(p.fecha_devolucion) : 'En préstamo',
      Estado: p.devuelto ? 'Devuelto' : 'Pendiente',
    }))

    const agregar = (filas, nombre, vacio) => {
      const ws = XLSX.utils.json_to_sheet(filas.length ? filas : [vacio])
      ws['!cols'] = Object.keys((filas[0] || vacio)).map(k => ({ wch: Math.max(14, k.length + 4) }))
      XLSX.utils.book_append_sheet(wb, ws, nombre)
    }

    agregar(hojaResumen, 'Resumen por persona', { Persona: 'Sin movimientos en este periodo' })
    agregar(hojaEntregas, 'Entregas de material', { Material: 'Sin entregas en este periodo' })
    agregar(hojaPrestamos, 'Préstamos de pendones', { Pendón: 'Sin préstamos en este periodo' })

    const sufijo = modo === 'mes' ? mes : 'historial-completo'
    XLSX.writeFile(wb, `inventario-aural-${sufijo}.xlsx`)
  }

  return (
    <div>
      <div className="card">
        <h2>Reporte de entregas</h2>
        <form onSubmit={e => e.preventDefault()}>
          <div className="field">
            <label htmlFor="repModo">Periodo</label>
            <select id="repModo" value={modo} onChange={e => setModo(e.target.value)}>
              <option value="mes">Un mes</option>
              <option value="todo">Todo el historial</option>
            </select>
          </div>
          {modo === 'mes' && (
            <div className="field">
              <label htmlFor="repMes">Mes</label>
              <input id="repMes" type="month" value={mes} onChange={e => e.target.value && setMes(e.target.value)} />
            </div>
          )}
          <button type="button" onClick={descargar} disabled={loading || !!error}>
            Descargar Excel
          </button>
        </form>
        <div className="muted-small" style={{ marginTop: 10 }}>
          El Excel trae 3 hojas: resumen por persona, entregas de material y préstamos de pendones.
        </div>
      </div>

      {error && <div className="alert-banner show">{error}</div>}

      {loading ? (
        <div className="card"><div className="empty">Cargando...</div></div>
      ) : (
        <>
          <div className="card">
            <h2>{titulo}</h2>
            <div className="stats">
              <div className="stat"><div className="stat-num">{totalUnidades}</div><div className="stat-label">unidades entregadas</div></div>
              <div className="stat"><div className="stat-num">{entregas.length}</div><div className="stat-label">entregas</div></div>
              <div className="stat"><div className="stat-num">{prestamos.length}</div><div className="stat-label">pendones prestados</div></div>
              <div className="stat"><div className="stat-num">{resumen.length}</div><div className="stat-label">personas</div></div>
            </div>
          </div>

          <div className="card">
            <h2>Quién se llevó qué</h2>
            {resumen.length === 0 ? (
              <div className="empty">No hay movimientos en este periodo.</div>
            ) : (
              <table>
                <thead>
                  <tr><th>Persona</th><th>Área</th><th>Entregas</th><th>Unidades</th><th>Pendones</th></tr>
                </thead>
                <tbody>
                  {resumen.map(r => (
                    <tr key={r.persona.toLowerCase()}>
                      <td>{r.persona}</td>
                      <td>{r.areas}</td>
                      <td>{r.entregas}</td>
                      <td>{r.unidades}</td>
                      <td>{r.pendones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {porMaterial.length > 0 && (
            <div className="card">
              <h2>Total por material</h2>
              <table>
                <thead><tr><th>Material</th><th>Unidades entregadas</th></tr></thead>
                <tbody>
                  {porMaterial.map(([nombre, total]) => (
                    <tr key={nombre}><td>{nombre}</td><td>{total}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="card">
            <h2>Detalle de entregas</h2>
            {entregas.length === 0 ? (
              <div className="empty">No hay entregas en este periodo.</div>
            ) : (
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Material</th><th>Área</th><th>Persona</th><th>Cantidad</th></tr>
                </thead>
                <tbody>
                  {[...entregas].reverse().map(e => (
                    <tr key={e.id}>
                      <td>{fmtFecha(e.created_at)}</td>
                      <td>{e.material_nombre}</td>
                      <td>{e.area}</td>
                      <td>{e.persona}</td>
                      <td>{e.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2>Detalle de préstamos de pendones</h2>
            {prestamos.length === 0 ? (
              <div className="empty">No hay préstamos en este periodo.</div>
            ) : (
              <table>
                <thead>
                  <tr><th>Pendón</th><th>Área</th><th>Persona</th><th>Prestado</th><th>Devuelto</th></tr>
                </thead>
                <tbody>
                  {[...prestamos].reverse().map(p => (
                    <tr key={p.id}>
                      <td>{p.pendon_nombre}</td>
                      <td>{p.area}</td>
                      <td>{p.persona}</td>
                      <td>{fmtFecha(p.fecha_prestamo)}</td>
                      <td>{p.devuelto ? fmtFecha(p.fecha_devolucion) : 'En préstamo'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
