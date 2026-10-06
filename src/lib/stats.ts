import { format, parse, startOfMonth, endOfMonth, subDays, isWithinInterval } from 'date-fns'
import type { DaySummary } from '../types'
import { todayISO } from './dates'
import { kcalToFatGrams } from './fatGrams'

export interface PeriodStats {
  label: string
  dayCount: number
  avgIngested: number
  avgBurned: number
  /** Sum of (total − burned) over counted days */
  saldo: number
  grams: number
}

function dayHasData(d: DaySummary): boolean {
  return d.entries.length > 0 || d.burned > 0 || d.watchBurned > 0
}

function parseISO(iso: string): Date {
  return parse(iso, 'yyyy-MM-dd', new Date())
}

function computeForDays(days: DaySummary[], label: string): PeriodStats {
  const counted = days.filter(dayHasData)
  const dayCount = counted.length
  if (dayCount === 0) {
    return {
      label,
      dayCount: 0,
      avgIngested: 0,
      avgBurned: 0,
      saldo: 0,
      grams: 0,
    }
  }
  const sumIngested = counted.reduce((s, d) => s + d.total, 0)
  const sumBurned = counted.reduce((s, d) => s + d.burned, 0)
  const saldo = counted.reduce((s, d) => s + (d.total - d.burned), 0)
  return {
    label,
    dayCount,
    avgIngested: Math.round(sumIngested / dayCount),
    avgBurned: Math.round(sumBurned / dayCount),
    saldo: Math.round(saldo),
    grams: kcalToFatGrams(saldo),
  }
}

/** Days in the inclusive window [startISO, endISO] that appear in `days`. */
function daysInRange(days: DaySummary[], startISO: string, endISO: string): DaySummary[] {
  const start = parseISO(startISO)
  const end = parseISO(endISO)
  return days.filter((d) => {
    const date = parseISO(d.date)
    return isWithinInterval(date, { start, end })
  })
}

export function computePeriodStats(days: DaySummary[]): {
  last7: PeriodStats
  thisMonth: PeriodStats
} {
  const today = todayISO()
  const todayDate = parseISO(today)
  const start7 = format(subDays(todayDate, 6), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(todayDate), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(todayDate), 'yyyy-MM-dd')

  return {
    last7: computeForDays(daysInRange(days, start7, today), 'Últimos 7 dias'),
    thisMonth: computeForDays(daysInRange(days, monthStart, monthEnd), 'Este mês'),
  }
}
