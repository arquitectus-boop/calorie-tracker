import { parseKeepDate } from './dates'
import type { FoodEntry } from '../types'

export interface ParsedKeepLine {
  kcal: number
  name: string
  quantity: number
}

export interface ParsedKeepDay {
  date: string
  entries: ParsedKeepLine[]
  headerTotal?: number
}

/**
 * Parse a single food line from Keep notes.
 * Supported:
 *   "79 iogurte"                    → 79 kcal, qty 1
 *   "726 sandes frango ESSO"        → 726 kcal, qty 1
 *   "138 actimel (2x)"              → line total 138 → 69 kcal × 2
 *   "2x 126 pão pequeno branco"     → 126 kcal × 2
 *   "2 x 126 pão"                   → 126 kcal × 2
 *
 * Daily totals in Keep sum the leading kcal (or qty×unit for "Nx kcal" form).
 */
export function parseFoodLine(line: string): ParsedKeepLine | null {
  const raw = line.trim()
  if (!raw) return null

  // Skip pure date headers / totals-only lines
  if (parseKeepDate(raw)) return null
  if (/^\d+\s*kcal\s*$/i.test(raw)) return null

  // Pattern: Nx kcal name  OR  N x kcal name  (kcal = per unit)
  let m = raw.match(/^(\d+)\s*[x×]\s+(\d+)\s+(.+)$/i)
  if (m) {
    const quantity = parseInt(m[1]!, 10)
    const kcal = parseInt(m[2]!, 10)
    const name = cleanName(m[3]!)
    if (quantity > 0 && kcal > 0 && name) {
      return { quantity, kcal, name }
    }
  }

  // Pattern: kcal name  (optional trailing (Nx) — leading number is LINE TOTAL)
  m = raw.match(/^(\d+)\s+(.+)$/)
  if (m) {
    const leading = parseInt(m[1]!, 10)
    let name = m[2]!.trim()
    const q = name.match(/\((\d+)\s*[x×]\)\s*$/i)
    if (q) {
      const quantity = parseInt(q[1]!, 10)
      name = cleanName(name.replace(/\((\d+)\s*[x×]\)\s*$/i, ''))
      if (quantity > 0 && leading > 0 && name) {
        const unit = Math.round(leading / quantity)
        return { quantity, kcal: unit || leading, name }
      }
    }
    name = cleanName(name)
    if (leading > 0 && name) {
      return { quantity: 1, kcal: leading, name }
    }
  }

  return null
}

function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim()
}

/**
 * Parse full Keep-style paste (newest-first days with date headers + food lines).
 */
export function parseKeepText(text: string): ParsedKeepDay[] {
  const lines = text.split(/\r?\n/)
  const days: ParsedKeepDay[] = []
  let current: ParsedKeepDay | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const date = parseKeepDate(trimmed)
    if (date) {
      const totalMatch = trimmed.match(/\b(\d+)\s*kcal\b/i)
      current = {
        date,
        entries: [],
        headerTotal: totalMatch ? parseInt(totalMatch[1]!, 10) : undefined,
      }
      days.push(current)
      continue
    }

    const food = parseFoodLine(trimmed)
    if (food && current) {
      current.entries.push(food)
    }
  }

  return days
}

export function keepDaysToEntries(
  days: ParsedKeepDay[],
  idFactory: () => string = () => crypto.randomUUID(),
): FoodEntry[] {
  const now = Date.now()
  const entries: FoodEntry[] = []
  for (const day of days) {
    for (const e of day.entries) {
      entries.push({
        id: idFactory(),
        date: day.date,
        kcal: e.kcal,
        name: e.name,
        quantity: e.quantity,
        createdAt: now,
        updatedAt: now,
      })
    }
  }
  return entries
}
