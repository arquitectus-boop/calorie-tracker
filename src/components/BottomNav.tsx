import type { View } from '../types'

interface Props {
  view: View
  onChange: (v: View) => void
}

export function BottomNav({ view, onChange }: Props) {
  const items: { id: View; label: string; icon: string }[] = [
    { id: 'hoje', label: 'Hoje', icon: '📅' },
    { id: 'historico', label: 'Histórico', icon: '📋' },
    { id: 'adicionar', label: 'Adicionar', icon: '＋' },
    { id: 'importar', label: 'Importar', icon: '📥' },
    { id: 'definicoes', label: 'Ajustes', icon: '⚙️' },
  ]

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-item${view === item.id ? ' active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          <span className="nav-icon" aria-hidden>
            {item.icon}
          </span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
