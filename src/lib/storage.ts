import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FoodEntry } from '../types'

interface DayBurned {
  date: string
  kcal: number
}

interface CalorieDB extends DBSchema {
  entries: {
    key: string
    value: FoodEntry
    indexes: { 'by-date': string }
  }
  burned: {
    key: string
    value: DayBurned
  }
}

const DB_NAME = 'calorie-tracker'
const DB_VERSION = 2
const LS_KEY = 'calorie-tracker-entries-v1'
const LS_BURNED_KEY = 'calorie-tracker-burned-v1'

let dbPromise: Promise<IDBPDatabase<CalorieDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CalorieDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('entries', { keyPath: 'id' })
          store.createIndex('by-date', 'date')
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('burned')) {
          db.createObjectStore('burned', { keyPath: 'date' })
        }
      },
    })
  }
  return dbPromise
}

function loadFromLocalStorage(): FoodEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as FoodEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToLocalStorage(entries: FoodEntry[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries))
  } catch {
    // quota exceeded — ignore
  }
}

function loadBurnedFromLocalStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_BURNED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveBurnedToLocalStorage(map: Record<string, number>) {
  try {
    localStorage.setItem(LS_BURNED_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

async function syncLocalStorageFromIDB() {
  try {
    const db = await getDB()
    const all = await db.getAll('entries')
    saveToLocalStorage(all)
  } catch {
    // ignore
  }
}

async function syncBurnedLocalStorageFromIDB() {
  try {
    const db = await getDB()
    const all = await db.getAll('burned')
    const map: Record<string, number> = {}
    for (const row of all) map[row.date] = row.kcal
    saveBurnedToLocalStorage(map)
  } catch {
    // ignore
  }
}

export async function loadEntries(): Promise<FoodEntry[]> {
  try {
    const db = await getDB()
    let all = await db.getAll('entries')
    if (all.length === 0) {
      const ls = loadFromLocalStorage()
      if (ls.length > 0) {
        const tx = db.transaction('entries', 'readwrite')
        await Promise.all([...ls.map((e) => tx.store.put(e)), tx.done])
        all = ls
      }
    } else {
      saveToLocalStorage(all)
    }
    return all
  } catch {
    return loadFromLocalStorage()
  }
}

export async function saveEntry(entry: FoodEntry): Promise<void> {
  try {
    const db = await getDB()
    await db.put('entries', entry)
    await syncLocalStorageFromIDB()
  } catch {
    const all = loadFromLocalStorage()
    const idx = all.findIndex((e) => e.id === entry.id)
    if (idx >= 0) all[idx] = entry
    else all.push(entry)
    saveToLocalStorage(all)
  }
}

export async function saveEntriesBulk(entries: FoodEntry[]): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction('entries', 'readwrite')
    await Promise.all([...entries.map((e) => tx.store.put(e)), tx.done])
    await syncLocalStorageFromIDB()
  } catch {
    const all = loadFromLocalStorage()
    const map = new Map(all.map((e) => [e.id, e]))
    for (const e of entries) map.set(e.id, e)
    saveToLocalStorage([...map.values()])
  }
}

export async function deleteEntry(id: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('entries', id)
    await syncLocalStorageFromIDB()
  } catch {
    saveToLocalStorage(loadFromLocalStorage().filter((e) => e.id !== id))
  }
}

export async function clearAllEntries(): Promise<void> {
  try {
    const db = await getDB()
    await db.clear('entries')
    localStorage.removeItem(LS_KEY)
  } catch {
    localStorage.removeItem(LS_KEY)
  }
}

export async function loadBurnedMap(): Promise<Record<string, number>> {
  try {
    const db = await getDB()
    const all = await db.getAll('burned')
    if (all.length === 0) {
      const ls = loadBurnedFromLocalStorage()
      const dates = Object.keys(ls)
      if (dates.length > 0) {
        const tx = db.transaction('burned', 'readwrite')
        await Promise.all([
          ...dates.map((date) => tx.store.put({ date, kcal: ls[date] })),
          tx.done,
        ])
      }
      return ls
    }
    const map: Record<string, number> = {}
    for (const row of all) map[row.date] = row.kcal
    saveBurnedToLocalStorage(map)
    return map
  } catch {
    return loadBurnedFromLocalStorage()
  }
}

export async function saveBurned(date: string, kcal: number): Promise<void> {
  const value = Math.max(0, Math.round(kcal) || 0)
  try {
    const db = await getDB()
    if (value === 0) {
      await db.delete('burned', date)
    } else {
      await db.put('burned', { date, kcal: value })
    }
    await syncBurnedLocalStorageFromIDB()
  } catch {
    const map = loadBurnedFromLocalStorage()
    if (value === 0) delete map[date]
    else map[date] = value
    saveBurnedToLocalStorage(map)
  }
}
