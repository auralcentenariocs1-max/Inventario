import { useState } from 'react'
import Materiales from './pages/Materiales'
import Solicitudes from './pages/Solicitudes'
import Pendones from './pages/Pendones'
import Reportes from './pages/Reportes'

const TABS = [
  ['inventario', 'Inventario'],
  ['solicitudes', 'Solicitudes'],
  ['pendones', 'Pendones'],
  ['reportes', 'Reportes'],
]

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
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'inventario' && <Materiales />}
      {tab === 'solicitudes' && <Solicitudes />}
      {tab === 'pendones' && <Pendones />}
      {tab === 'reportes' && <Reportes />}
    </div>
  )
}
