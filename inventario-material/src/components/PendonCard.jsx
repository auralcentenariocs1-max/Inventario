import { useRef } from 'react'

function fmtFecha(iso) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  )
}

export default function PendonCard({ pendon, onPrestar, onDevolver, onImageChange, onDelete }) {
  const prestado = pendon.estado === 'prestado'
  const fileInputRef = useRef(null)

  function handleFileSelected(e) {
    const file = e.target.files?.[0]
    if (file) onImageChange(pendon, file)
    e.target.value = ''
  }

  return (
    <div className={`pendon${prestado ? ' prestado' : ''}`}>
      <div
        className="pendon-image"
        onClick={() => fileInputRef.current?.click()}
        title="Cambiar imagen"
      >
        {pendon.imagen_url ? (
          <img src={pendon.imagen_url} alt={pendon.nombre} />
        ) : (
          <span className="material-image-placeholder">+ foto</span>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <div className="name">{pendon.nombre}</div>
      <span className={`badge ${prestado ? 'badge-prestado' : 'badge-disponible'}`}>
        {prestado ? 'Prestado' : 'Disponible'}
      </span>

      {prestado && pendon.prestamo_actual && (
        <div className="pendon-loan-info">
          <div><strong>{pendon.prestamo_actual.persona}</strong> · {pendon.prestamo_actual.area}</div>
          <div className="muted-small">Desde {fmtFecha(pendon.prestamo_actual.fecha_prestamo)}</div>
        </div>
      )}

      <div className="material-actions">
        {prestado ? (
          <button type="button" className="secondary" onClick={() => onDevolver(pendon)}>
            Registrar devolución
          </button>
        ) : (
          <button type="button" onClick={() => onPrestar(pendon)}>
            Prestar
          </button>
        )}
        <button type="button" className="danger" onClick={() => onDelete(pendon)}>
          Eliminar
        </button>
      </div>
    </div>
  )
}
