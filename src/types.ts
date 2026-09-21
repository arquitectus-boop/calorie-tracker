export interface FoodEntry {
  id: string
  date: string // YYYY-MM-DD
  kcal: number
  name: string
  quantity: number
  createdAt: number
  updatedAt: number
}

export type View = 'hoje' | 'historico' | 'adicionar' | 'importar'

export interface DaySummary {
  date: string
  total: number
  burned: number
  entries: FoodEntry[]
}
