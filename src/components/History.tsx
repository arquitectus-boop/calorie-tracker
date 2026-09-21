import type { DaySummary } from '../types'
import { formatDateLabel, formatDatePT, todayISO } from '../lib/dates'

interface Props {
  days: DaySummary[]
  onSelectDay: (date: string) => void
}

export function History({ days, onSelectDay }: Props) {
  const today = todayISO()
  const past = days.filter((d) => d.date !== today || d.entries.length > 0)

  if (past.length === 0) {
    return (
      <div className="history">
        <h1 className="page-title">Histórico</h1>
        <p className="empty-state">Ainda não há dias registados.</p>
      </div>
    )
  }

  return (
    <div className="history">
      <h1 className="page-title">Histórico</h1>
      <ul className="history-list">
        {past.map((d) => (
          <li key={d.date}>
            <button
              type="button"
              className="history-item"
              onClick={() => onSelectDay(d.date)}
            >
              <div className="history-left">
                <span className="history-label">
                  {d.date === today ? 'Hoje' : formatDateLabel(d.date)}
                </span>
                <span className="history-date">{formatDatePT(d.date)}</span>
              </div>
              <div className="history-right">
                <span className="history-total">{d.total}</span>
                <span className="history-unit">kcal</span>
                <span className="history-count">
                  {d.entries.length}{' '}
                  {d.entries.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
