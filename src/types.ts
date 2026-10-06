/**
 * How a food's kcal relate to its quantity.
 *  - 'unit':    kcal per unit, quantity = number of units (default, legacy data)
 *  - 'per100g': kcal per 100 g, quantity = grams
 */
export type PortionType = 'unit' | 'per100g'

export interface FoodEntry {
  id: string
  date: string // YYYY-MM-DD
  /** kcal per unit ('unit') or per 100 g ('per100g') */
  kcal: number
  name: string
  /** Number of units ('unit') or grams ('per100g') */
  quantity: number
  /** Optional; missing means 'unit' (older data) */
  portionType?: PortionType
  createdAt: number
  updatedAt: number
}

export type View = 'hoje' | 'historico' | 'adicionar' | 'lista' | 'definicoes'

export type AppThemeId = 'verde' | 'azul' | 'roxo' | 'laranja' | 'vermelho' | 'cinza'

export interface AppSettings {
  /** Basal metabolic rate in kcal/day */
  basalKcal: number
  /** Watch overestimate margin as percent (0–100) */
  watchErrorPercent: number
  /** App color theme */
  themeId: AppThemeId
}

export interface DaySummary {
  date: string
  total: number
  /** Raw value from the watch field */
  watchBurned: number
  /** Effective burned: basal + watch*(1 - error%/100) when watch > 0, else 0 */
  burned: number
  entries: FoodEntry[]
}
