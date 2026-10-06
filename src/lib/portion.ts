import type { FoodEntry, PortionType } from '../types'

export function isPortionType(value: unknown): value is PortionType {
  return value === 'unit' || value === 'per100g'
}

/** Normalize an optional/unknown portion type (missing or invalid → 'unit'). */
export function portionOf(value: { portionType?: unknown } | null | undefined): PortionType {
  return value && isPortionType(value.portionType) ? value.portionType : 'unit'
}

/** Raw line total for kcal + quantity in the given portion mode. */
export function lineTotal(kcal: number, quantity: number, portionType: PortionType): number {
  if (portionType === 'per100g') return Math.round((kcal * quantity) / 100)
  return kcal * quantity
}

/** Line total of a logged entry, used for every day total / stats / diff. */
export function entryLineTotal(e: FoodEntry): number {
  return lineTotal(e.kcal, e.quantity, portionOf(e))
}

const numberFmt = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 })

export function formatNumber(n: number): string {
  return numberFmt.format(n)
}

/** Unit suffix for a kcal value, e.g. "kcal/un" or "kcal/100 g". */
export function kcalUnitLabel(portionType: PortionType): string {
  return portionType === 'per100g' ? 'kcal/100 g' : 'kcal/un'
}

/** Portion description for a logged entry, or null for a single unit. */
export function entryPortionLabel(e: FoodEntry): string | null {
  if (portionOf(e) === 'per100g') {
    return `${formatNumber(e.quantity)} g · ${e.kcal} kcal/100 g`
  }
  if (e.quantity === 1) return null
  return `${formatNumber(e.quantity)} × ${e.kcal} kcal`
}
