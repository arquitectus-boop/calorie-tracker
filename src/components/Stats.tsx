import { useMemo } from 'react'
import type { DaySummary } from '../types'
import { computePeriodStats, type PeriodStats } from '../lib/stats'

interface Props {
  days: DaySummary[]
}

function formatSaldo(n: number): string {
  if (n > 0) return `+${n}`
  return String(n)
}

function PeriodCard({ stats }: { stats: PeriodStats }) {
  const saldoClass =
    stats.saldo > 0 ? 'surplus' : stats.saldo < 0 ? 'deficit' : ''

  if (stats.dayCount === 0) {
    return (
      <div className="stats-period">
        <h3 className="stats-period-title">{stats.label}</h3>
        <p className="stats-empty">Sem dias com dados neste período.</p>
      </div>
    )
  }

  return (
    <div className="stats-period">
      <h3 className="stats-period-title">{stats.label}</h3>
      <p className="stats-days">
        {stats.dayCount} {stats.dayCount === 1 ? 'dia' : 'dias'} com dados
      </p>
      <div className="stats-grid">
        <div className="stats-card">
          <span className="stats-label">Média ingeridas</span>
          <span className="stats-value">{stats.avgIngested}</span>
          <span className="stats-unit">kcal</span>
        </div>
        <div className="stats-card">
          <span className="stats-label">Média gastas</span>
          <span className="stats-value">{stats.avgBurned}</span>
          <span className="stats-unit">kcal</span>
        </div>
        <div className={`stats-card stats-saldo ${saldoClass}`}>
          <span className="stats-label">Saldo</span>
          <span className="stats-value">{formatSaldo(stats.saldo)}</span>
          <span className="stats-unit">kcal</span>
          <span className="stats-grams">≈ {stats.grams} g</span>
        </div>
      </div>
    </div>
  )
}

export function Stats({ days }: Props) {
  const { last7, thisMonth } = useMemo(() => computePeriodStats(days), [days])

  return (
    <section className="stats-section" aria-label="Estatísticas">
      <h2 className="stats-heading">Estatísticas</h2>
      <PeriodCard stats={last7} />
      <PeriodCard stats={thisMonth} />
    </section>
  )
}
