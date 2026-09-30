import { useRef } from 'react'

export default function MaterialCard({ material, onRestock, onDelete, onImageChange }) {
  const low = material.stock <= material.umbral
  const fileInputRef = useRef(null)

  function handleFileSelected(e) {
    const file = e.target.files?.[0]
    if (file) onImageChange(material, file)
    e.target.value = ''
  }

  return (
    <div className={`material${low ? ' low' : ''}`}>
      <div
        className="material-image"
        onClick={() => fileInputRef.current?.click()}
        title="Cambiar imagen"
      >
        {material.imagen_url ? (
          <img src={material.imagen_url} alt={material.nombre} />
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

      <div className="name">{material.nombre}</div>
      <div className="stock">{material.stock}</div>
      <div className="threshold">Alerta en {material.umbral}</div>
      <div className="material-actions">
        <button type="button" className="secondary" onClick={() => onRestock(material)}>
          Reponer
        </button>
        <button type="button" className="danger" onClick={() => onDelete(material)}>
          Eliminar
        </button>
      </div>
    </div>
  )
}
