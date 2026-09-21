import { format, parse, isValid } from 'date-fns'
import { pt } from 'date-fns/locale'

/** Today's date as YYYY-MM-DD in local timezone */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Format YYYY-MM-DD for display: 21/09/2026 */
export function formatDatePT(iso: string): string {
  const d = parse(iso, 'yyyy-MM-dd', new Date())
  if (!isValid(d)) return iso
  return format(d, 'dd/MM/yyyy')
}

/** Short weekday + date: Seg, 21 set */
export function formatDateLabel(iso: string): string {
  const d = parse(iso, 'yyyy-MM-dd', new Date())
  if (!isValid(d)) return iso
  return format(d, "EEE, d MMM", { locale: pt })
}

/** Relative-ish label */
export function formatDayTitle(iso: string): string {
  const t = todayISO()
  if (iso === t) return 'Hoje'
  const d = parse(iso, 'yyyy-MM-dd', new Date())
  if (!isValid(d)) return formatDatePT(iso)
  return format(d, "EEEE, d 'de' MMMM", { locale: pt })
}

/**
 * Parse Keep-style date headers:
 * "21/09/26", "20/09/2026", "20/09/2026 1431 kcal"
 */
export function parseKeepDate(line: string): string | null {
  const m = line.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/)
  if (!m) return null
  let [, dd, mm, yy] = m
  let year = parseInt(yy!, 10)
  if (yy!.length === 2) {
    year += year >= 70 ? 1900 : 2000
  }
  const day = parseInt(dd!, 10)
  const month = parseInt(mm!, 10)
  const iso = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  const d = parse(iso, 'yyyy-MM-dd', new Date())
  if (!isValid(d)) return null
  return iso
}
