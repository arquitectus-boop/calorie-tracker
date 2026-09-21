export interface FoodEntry {
  id: string
  date: string // YYYY-MM-DD
  kcal: number
  name: string
  quantity: number
  createdAt: number
  updatedAt: number
}

export type View = 'hoje' | 'historico' | 'adicionar' | 'importar' | 'definicoes'

export interface AppSettings {
  /** Basal metabolic rate in kcal/day */
  basalKcal: number
  /** Watch overestimate margin as percent (0–100) */
  watchErrorPercent: number
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
