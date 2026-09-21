import type { DaySummary } from '../types'
import { formatDateLabel, formatDatePT, todayISO } from '../lib/dates'

interface Props {
  days: DaySummary[]
  onSelectDay: (date: string) => void
}

function formatDiff(n: number): string {
  if (n > 0) return `+${n}`
  return String(n)
}

export function History({ days, onSelectDay }: Props) {
  const today = todayISO()
  const past = days.filter(
    (d) => d.date !== today || d.entries.length > 0 || d.burned > 0,
  )

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
        {past.map((d) => {
          const diff = d.total - d.burned
          return (
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
                  <span className="history-count">
                    {d.entries.length}{' '}
                    {d.entries.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <div className="history-right history-metrics">
                  <span className="history-metric">
                    <span className="history-metric-label">Ingeridas</span>
                    <span className="history-metric-value">{d.total} kcal</span>
                  </span>
                  <span className="history-metric">
                    <span className="history-metric-label">Gastas</span>
                    <span className="history-metric-value">{d.burned} kcal</span>
                  </span>
                  <span className="history-metric">
                    <span className="history-metric-label">Diferença</span>
                    <span
                      className={`history-metric-value ${
                        diff > 0 ? 'surplus' : diff < 0 ? 'deficit' : ''
                      }`}
                    >
                      {formatDiff(diff)} kcal
                    </span>
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
