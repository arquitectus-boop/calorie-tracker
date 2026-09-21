import { useMemo, useState } from 'react'
import type { DaySummary, FoodEntry } from '../types'
import { formatDayTitle, formatDatePT } from '../lib/dates'
import { entryLineTotal } from '../hooks/useEntries'
import { EntryList } from './EntryList'

type SortMode = 'oldest' | 'kcal'

interface Props {
  day: DaySummary
  onEdit: (entry: FoodEntry) => void
  onDelete: (entry: FoodEntry) => void
  onAdd: () => void
}

function sortEntries(entries: FoodEntry[], mode: SortMode): FoodEntry[] {
  const list = [...entries]
  if (mode === 'oldest') {
    return list.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  }
  return list.sort(
    (a, b) =>
      entryLineTotal(a) - entryLineTotal(b) ||
      a.createdAt - b.createdAt ||
      a.id.localeCompare(b.id),
  )
}

export function DayView({ day, onEdit, onDelete, onAdd }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('oldest')

  const sorted = useMemo(
    () => sortEntries(day.entries, sortMode),
    [day.entries, sortMode],
  )

  return (
    <div className="day-view">
      <header className="day-header">
        <div>
          <h1 className="day-title">{formatDayTitle(day.date)}</h1>
          <p className="day-date">{formatDatePT(day.date)}</p>
        </div>
        <div className="day-total" aria-label="Total do dia">
          <span className="day-total-num">{day.total}</span>
          <span className="day-total-unit">kcal</span>
        </div>
      </header>

      {day.entries.length > 1 && (
        <div className="sort-bar" role="group" aria-label="Ordenar entradas">
          <span className="sort-label">Ordenar</span>
          <div className="sort-options">
            <button
              type="button"
              className={sortMode === 'oldest' ? 'sort-btn active' : 'sort-btn'}
              onClick={() => setSortMode('oldest')}
            >
              Mais antiga → recente
            </button>
            <button
              type="button"
              className={sortMode === 'kcal' ? 'sort-btn active' : 'sort-btn'}
              onClick={() => setSortMode('kcal')}
            >
              Menos → mais calórica
            </button>
          </div>
        </div>
      )}

      <EntryList entries={sorted} onEdit={onEdit} onDelete={onDelete} />

      <button type="button" className="fab" onClick={onAdd} aria-label="Adicionar">
        +
      </button>
    </div>
  )
}
