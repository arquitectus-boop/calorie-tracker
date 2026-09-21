import type { DaySummary, FoodEntry } from '../types'
import { formatDayTitle, formatDatePT } from '../lib/dates'
import { EntryList } from './EntryList'

interface Props {
  day: DaySummary
  onEdit: (entry: FoodEntry) => void
  onDelete: (entry: FoodEntry) => void
  onAdd: () => void
}

export function DayView({ day, onEdit, onDelete, onAdd }: Props) {
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

      <EntryList entries={day.entries} onEdit={onEdit} onDelete={onDelete} />

      <button type="button" className="fab" onClick={onAdd} aria-label="Adicionar">
        +
      </button>
    </div>
  )
}
