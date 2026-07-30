import { useState } from 'react'
import Materiales from './pages/Materiales'
import Solicitudes from './pages/Solicitudes'

export default function App() {
  const [tab, setTab] = useState('inventario')

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>Inventario de material publicitario</h1>
          <p>Registrá lo que sale, descontá el stock y enterate cuando un material llega a su límite.</p>
        </div>
        <div className="wave" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </header>

      <nav className="tabs">
        <button
          type="button"
          className={tab === 'inventario' ? 'tab active' : 'tab'}
          onClick={() => setTab('inventario')}
        >
          Inventario
        </button>
        <button
          type="button"
          className={tab === 'solicitudes' ? 'tab active' : 'tab'}
          onClick={() => setTab('solicitudes')}
        >
          Solicitudes
        </button>
      </nav>

      {tab === 'inventario' ? <Materiales /> : <Solicitudes />}
    </div>
  )
}
