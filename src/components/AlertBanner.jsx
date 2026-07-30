export default function AlertBanner({ materiales }) {
  const bajos = materiales.filter(m => m.stock <= m.umbral)

  if (bajos.length === 0) return null

  return (
    <div className="alert-banner show">
      <strong>Stock bajo</strong>
      <div>
        {bajos.map(m => (
          <div key={m.id}>
            {m.nombre}: quedan {m.stock} (umbral {m.umbral})
          </div>
        ))}
      </div>
    </div>
  )
}
