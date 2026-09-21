import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FoodEntry } from '../types'

interface CalorieDB extends DBSchema {
  entries: {
    key: string
    value: FoodEntry
    indexes: { 'by-date': string }
  }
}

const DB_NAME = 'calorie-tracker'
const DB_VERSION = 1
const LS_KEY = 'calorie-tracker-entries-v1'

let dbPromise: Promise<IDBPDatabase<CalorieDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CalorieDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('entries', { keyPath: 'id' })
        store.createIndex('by-date', 'date')
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

async function syncLocalStorageFromIDB() {
  try {
    const db = await getDB()
    const all = await db.getAll('entries')
    saveToLocalStorage(all)
  } catch {
    // ignore
  }
}

export async function loadEntries(): Promise<FoodEntry[]> {
  try {
    const db = await getDB()
    let all = await db.getAll('entries')
    if (all.length === 0) {
      // migrate from localStorage if present
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
