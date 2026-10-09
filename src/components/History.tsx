import { addDays, format, parse, startOfISOWeek } from 'date-fns'
import type { DaySummary } from '../types'
import { formatDateLabel, formatDatePT, todayISO } from '../lib/dates'
import { formatFatGrams } from '../lib/fatGrams'
import { Stats } from './Stats'

interface Props {
  days: DaySummary[]
  onSelectDay: (date: string) => void
}

function formatDiff(n: number): string {
  if (n > 0) return `+${n}`
  return String(n)
}

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function weekStartISO(iso: string): string {
  return format(startOfISOWeek(parse(iso, 'yyyy-MM-dd', new Date())), 'yyyy-MM-dd')
}

/** «Semana 5–11 Out», «Semana 28 Set–4 Out», year added when not the current year */
function formatWeekLabel(startIso: string, currentWeekStart: string): string {
  if (startIso === currentWeekStart) return 'Esta semana'
  const start = parse(startIso, 'yyyy-MM-dd', new Date())
  const end = addDays(start, 6)
  const thisYear = new Date().getFullYear()
  const sm = MONTHS_PT[start.getMonth()]
  const em = MONTHS_PT[end.getMonth()]
  const sy = start.getFullYear()
  const ey = end.getFullYear()
  let range: string
  if (sy !== ey) {
    range = `${start.getDate()} ${sm} ${sy}–${end.getDate()} ${em} ${ey}`
  } else if (start.getMonth() === end.getMonth()) {
    range = `${start.getDate()}–${end.getDate()} ${em}`
  } else {
    range = `${start.getDate()} ${sm}–${end.getDate()} ${em}`
  }
  if (sy === ey && ey !== thisYear) range += ` ${ey}`
  return `Semana ${range}`
}

interface WeekGroup {
  start: string
  days: DaySummary[]
  total: number
  burned: number
}

function groupByWeek(days: DaySummary[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>()
  for (const d of days) {
    const start = weekStartISO(d.date)
    let g = map.get(start)
    if (!g) {
      g = { start, days: [], total: 0, burned: 0 }
      map.set(start, g)
    }
    g.days.push(d)
    g.total += d.total
    g.burned += d.burned
  }
  const groups = [...map.values()].sort((a, b) => (a.start < b.start ? 1 : -1))
  for (const g of groups) g.days.sort((a, b) => (a.date < b.date ? 1 : -1))
  return groups
}

export function History({ days, onSelectDay }: Props) {
  const today = todayISO()
  const past = days.filter(
    (d) => d.date !== today || d.entries.length > 0 || d.burned > 0 || d.watchBurned > 0,
  )
  const weeks = groupByWeek(past)
  const currentWeekStart = weekStartISO(today)

  return (
    <div className="history">
      <h1 className="page-title">Histórico</h1>
      <Stats days={days} />

      {past.length === 0 ? (
        <p className="empty-state">Ainda não há dias registados.</p>
      ) : (
        <div className="history-weeks">
          {weeks.map((w) => {
            const wDiff = w.total - w.burned
            return (
              <section key={w.start} className="history-week">
                <div className="history-week-header">
                  <div className="history-week-title-row">
                    <h2 className="history-week-title">
                      {formatWeekLabel(w.start, currentWeekStart)}
                    </h2>
                    <span className="history-week-days">
                      {w.days.length} {w.days.length === 1 ? 'dia' : 'dias'}
                    </span>
                  </div>
                  <div className="history-week-grid">
                    <div className="history-week-card">
                      <span className="history-week-label">Ingeridas</span>
                      <span className="history-week-value">{w.total} kcal</span>
                    </div>
                    <div className="history-week-card">
                      <span className="history-week-label">Gastas</span>
                      <span className="history-week-value">{w.burned} kcal</span>
                    </div>
                    <div className="history-week-card">
                      <span className="history-week-label">Diferença</span>
                      <span
                        className={`history-week-value ${
                          wDiff > 0 ? 'surplus' : wDiff < 0 ? 'deficit' : ''
                        }`}
                      >
                        {formatDiff(wDiff)} kcal
                      </span>
                      {wDiff !== 0 && (
                        <span className="history-grams">{formatFatGrams(wDiff)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <ul className="history-list">
                  {w.days.map((d) => {
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
                              {diff !== 0 && (
                                <span className="history-grams">{formatFatGrams(diff)}</span>
                              )}
                            </span>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
