import type { FoodEntry } from '../types'
import { entryLineTotal } from '../hooks/useEntries'

interface Props {
  entries: FoodEntry[]
  onEdit: (entry: FoodEntry) => void
  onDelete: (entry: FoodEntry) => void
}

export function EntryList({ entries, onEdit, onDelete }: Props) {
  if (entries.length === 0) {
    return (
      <p className="empty-state">
        Ainda sem registos. Toca em <strong>+</strong> para adicionar.
      </p>
    )
  }

  return (
    <ul className="entry-list">
      {entries.map((e) => {
        const line = entryLineTotal(e)
        return (
          <li key={e.id} className="entry-item">
            <button
              type="button"
              className="entry-main"
              onClick={() => onEdit(e)}
              aria-label={`Editar ${e.name}`}
            >
              <span className="entry-kcal">
                {line}
                <span className="entry-kcal-unit"> kcal</span>
              </span>
              <span className="entry-body">
                <span className="entry-name">{e.name}</span>
                {e.quantity !== 1 && (
                  <span className="entry-qty">
                    {e.quantity}× {e.kcal} kcal
                  </span>
                )}
              </span>
            </button>
            <button
              type="button"
              className="entry-delete"
              onClick={() => onDelete(e)}
              aria-label={`Apagar ${e.name}`}
            >
              ✕
            </button>
          </li>
        )
      })}
    </ul>
  )
}
