import { useEffect, useMemo, useState } from 'react'
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
  onSaveBurned: (date: string, kcal: number) => Promise<void>
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

function formatDiff(n: number): string {
  if (n > 0) return `+${n}`
  return String(n)
}

export function DayView({ day, onEdit, onDelete, onAdd, onSaveBurned }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('oldest')
  const [burnedInput, setBurnedInput] = useState(
    day.watchBurned > 0 ? String(day.watchBurned) : '',
  )
  const [savingBurned, setSavingBurned] = useState(false)

  useEffect(() => {
    setBurnedInput(day.watchBurned > 0 ? String(day.watchBurned) : '')
  }, [day.date, day.watchBurned])

  const sorted = useMemo(
    () => sortEntries(day.entries, sortMode),
    [day.entries, sortMode],
  )

  const diff = day.total - day.burned

  async function handleSaveBurned() {
    const value = Number(burnedInput.replace(',', '.'))
    setSavingBurned(true)
    try {
      await onSaveBurned(day.date, Number.isFinite(value) ? value : 0)
    } finally {
      setSavingBurned(false)
    }
  }

  return (
    <div className="day-view">
      <header className="day-header">
        <div>
          <h1 className="day-title">{formatDayTitle(day.date)}</h1>
          <p className="day-date">{formatDatePT(day.date)}</p>
        </div>
      </header>

      <section className="day-summary" aria-label="Resumo do dia">
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Ingeridas</span>
            <span className="summary-value">{day.total}</span>
            <span className="summary-unit">kcal</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Gastas</span>
            <span className="summary-value">{day.burned}</span>
            <span className="summary-unit">kcal</span>
          </div>
          <div className={`summary-card summary-diff ${diff > 0 ? 'surplus' : diff < 0 ? 'deficit' : ''}`}>
            <span className="summary-label">Diferença</span>
            <span className="summary-value">{formatDiff(diff)}</span>
            <span className="summary-unit">kcal</span>
          </div>
        </div>

        <div className="burned-form">
          <label className="burned-label" htmlFor="burned-kcal">
            Calorias gastas
          </label>
          <div className="burned-row">
            <input
              id="burned-kcal"
              className="burned-input"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="ex. 2100"
              value={burnedInput}
              onChange={(e) => setBurnedInput(e.target.value)}
            />
            <button
              type="button"
              className="burned-save"
              onClick={handleSaveBurned}
              disabled={savingBurned}
            >
              Guardar
            </button>
          </div>
          {day.watchBurned > 0 && day.burned !== day.watchBurned && (
            <p className="burned-hint">
              Efetivas no resumo: {day.burned} kcal (basal + pulseira com margem)
            </p>
          )}
        </div>
      </section>

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
