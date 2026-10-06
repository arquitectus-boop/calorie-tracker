import type { FoodEntry, PortionType } from '../types'
import { isPortionType, portionOf } from './portion'

/**
 * Lightweight food catalog for the Lista tab, stored in localStorage.
 *
 * The Lista is a merge of:
 *  - foods derived from the FoodEntry history (name + kcal), and
 *  - catalog foods (manually added or edited in the Lista).
 *
 * Deleting a food from the Lista never touches FoodEntry history: it only
 * removes the catalog food (if any) and records the food key as hidden.
 * A hidden history food reappears automatically if it is logged again later.
 */

export interface CatalogFood {
  id: string
  name: string
  kcal: number
  /** Optional; missing means 'unit' (older catalogs) */
  portionType?: PortionType
  /** IndexedDB photo id (JPEG data URL stored separately) */
  photoId?: string
  /** Older history keys (name|kcal) merged into this food, e.g. after an edit */
  aliases: string[]
  createdAt: number
  updatedAt: number
}

export interface FoodCatalog {
  version: 1
  foods: CatalogFood[]
  /** food key → timestamp when it was removed from the Lista */
  hidden: Record<string, number>
}

export interface FoodListItem {
  /** Primary key (normalized name|kcal) */
  key: string
  /** Every key whose history entries count towards this item */
  keys: string[]
  name: string
  kcal: number
  portionType: PortionType
  count: number
  lastUsed: number
  catalogId?: string
  /** IndexedDB photo id when the food has a catalog photo */
  photoId?: string
}

const LS_KEY = 'calorie-tracker-foods-v1'

export function emptyCatalog(): FoodCatalog {
  return { version: 1, foods: [], hidden: {} }
}

/**
 * Food identity key. Unit foods keep the legacy `name|kcal` format so older
 * aliases / hidden keys stay valid; per-100 g foods get a `|100g` suffix.
 */
export function foodKey(
  name: string,
  kcal: number,
  portionType: PortionType = 'unit',
): string {
  const base = `${name.trim().toLowerCase()}|${Math.round(kcal)}`
  return portionType === 'per100g' ? `${base}|100g` : base
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCatalogFood(value: unknown): value is CatalogFood {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    typeof value.kcal === 'number' &&
    Number.isFinite(value.kcal) &&
    value.kcal >= 0 &&
    (value.portionType === undefined || isPortionType(value.portionType)) &&
    (value.photoId === undefined || typeof value.photoId === 'string') &&
    Array.isArray(value.aliases) &&
    value.aliases.every((a) => typeof a === 'string') &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  )
}

/** Validate unknown data (localStorage or backup). Returns null when invalid. */
export function parseCatalog(value: unknown): FoodCatalog | null {
  if (!isRecord(value) || value.version !== 1) return null
  if (!Array.isArray(value.foods) || !value.foods.every(isCatalogFood)) return null
  if (!isRecord(value.hidden)) return null
  const hidden: Record<string, number> = {}
  for (const [k, v] of Object.entries(value.hidden)) {
    if (typeof v === 'number' && Number.isFinite(v)) hidden[k] = v
  }
  return { version: 1, foods: value.foods, hidden }
}

export function loadCatalog(): FoodCatalog {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyCatalog()
    return parseCatalog(JSON.parse(raw)) ?? emptyCatalog()
  } catch {
    return emptyCatalog()
  }
}

export function saveCatalog(catalog: FoodCatalog): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(catalog))
  } catch {
    // quota exceeded — ignore
  }
}

interface HistoryAgg {
  name: string
  kcal: number
  portionType: PortionType
  count: number
  lastUsed: number
  nameTs: number
}

function aggregateHistory(entries: FoodEntry[]): Map<string, HistoryAgg> {
  const map = new Map<string, HistoryAgg>()
  for (const e of entries) {
    const portionType = portionOf(e)
    const key = foodKey(e.name, e.kcal, portionType)
    const cur = map.get(key)
    if (cur) {
      cur.count += 1
      cur.lastUsed = Math.max(cur.lastUsed, e.createdAt)
      if (e.createdAt > cur.nameTs) {
        cur.name = e.name.trim()
        cur.nameTs = e.createdAt
      }
    } else {
      map.set(key, {
        name: e.name.trim(),
        kcal: e.kcal,
        portionType,
        count: 1,
        lastUsed: e.createdAt,
        nameTs: e.createdAt,
      })
    }
  }
  return map
}

/** Merge catalog + history into the visible Lista (sorted by frequency). */
export function mergeFoods(
  entries: FoodEntry[],
  catalog: FoodCatalog,
): FoodListItem[] {
  const history = aggregateHistory(entries)
  const consumed = new Set<string>()
  const result: FoodListItem[] = []

  for (const food of catalog.foods) {
    const own = foodKey(food.name, food.kcal, portionOf(food))
    const keys = [own, ...food.aliases.filter((a) => a !== own)].filter(
      (k) => !consumed.has(k),
    )
    if (keys.length === 0) continue
    let count = 0
    let lastUsed = food.updatedAt
    for (const k of keys) {
      consumed.add(k)
      const h = history.get(k)
      if (h) {
        count += h.count
        lastUsed = Math.max(lastUsed, h.lastUsed)
      }
    }
    result.push({
      key: own,
      keys,
      name: food.name,
      kcal: food.kcal,
      portionType: portionOf(food),
      count,
      lastUsed,
      catalogId: food.id,
      ...(food.photoId ? { photoId: food.photoId } : {}),
    })
  }

  for (const [key, h] of history) {
    if (consumed.has(key)) continue
    const hiddenAt = catalog.hidden[key]
    if (hiddenAt !== undefined && h.lastUsed <= hiddenAt) continue
    result.push({
      key,
      keys: [key],
      name: h.name,
      kcal: h.kcal,
      portionType: h.portionType,
      count: h.count,
      lastUsed: h.lastUsed,
    })
  }

  return result.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
}

function unhide(hidden: Record<string, number>, key: string) {
  const next = { ...hidden }
  delete next[key]
  return next
}

export function addCatalogFood(
  catalog: FoodCatalog,
  name: string,
  kcal: number,
  portionType: PortionType = 'unit',
  photoId?: string,
): FoodCatalog {
  const now = Date.now()
  const clean = name.trim()
  const key = foodKey(clean, kcal, portionType)
  const food: CatalogFood = {
    id: crypto.randomUUID(),
    name: clean,
    kcal: Math.round(kcal),
    portionType,
    ...(photoId ? { photoId } : {}),
    aliases: [],
    createdAt: now,
    updatedAt: now,
  }
  return {
    ...catalog,
    foods: [...catalog.foods, food],
    hidden: unhide(catalog.hidden, key),
  }
}

/** Edit a Lista item (catalog or history-derived). History is not touched. */
export function editCatalogFood(
  catalog: FoodCatalog,
  item: FoodListItem,
  name: string,
  kcal: number,
  portionType: PortionType = item.portionType,
  /** undefined = keep existing; null = clear; string = set */
  photoId?: string | null,
): FoodCatalog {
  const now = Date.now()
  const clean = name.trim()
  const rounded = Math.round(kcal)
  const newKey = foodKey(clean, rounded, portionType)

  // Keys absorbed by this food: everything the item already covered.
  const absorbed = new Set<string>(item.keys)

  // Merge any other catalog food that already uses the new key.
  const others: CatalogFood[] = []
  for (const f of catalog.foods) {
    if (f.id === item.catalogId) continue
    const fKeys = [foodKey(f.name, f.kcal, portionOf(f)), ...f.aliases]
    if (fKeys.includes(newKey)) {
      for (const k of fKeys) absorbed.add(k)
    } else {
      others.push(f)
    }
  }
  absorbed.delete(newKey)

  const existing = catalog.foods.find((f) => f.id === item.catalogId)
  const resolvedPhotoId =
    photoId === undefined ? existing?.photoId : photoId === null ? undefined : photoId
  const food: CatalogFood = {
    id: existing?.id ?? crypto.randomUUID(),
    name: clean,
    kcal: rounded,
    portionType,
    ...(resolvedPhotoId ? { photoId: resolvedPhotoId } : {}),
    aliases: [...absorbed],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  // Keep the original position of an existing catalog food.
  const foods = existing
    ? catalog.foods
        .filter((f) => f.id === existing.id || others.includes(f))
        .map((f) => (f.id === existing.id ? food : f))
    : [...others, food]

  return { ...catalog, foods, hidden: unhide(catalog.hidden, newKey) }
}

/** Remove an item from the Lista. FoodEntry history stays untouched. */
export function removeCatalogFood(
  catalog: FoodCatalog,
  item: FoodListItem,
): FoodCatalog {
  const now = Date.now()
  const hidden = { ...catalog.hidden }
  for (const k of item.keys) hidden[k] = now
  return {
    ...catalog,
    foods: catalog.foods.filter((f) => f.id !== item.catalogId),
    hidden,
  }
}

/** Map foodKey (and aliases) → photo data URL for day-entry thumbnails. */
export function buildPhotoLookup(
  foods: FoodListItem[],
  photoUrls: Record<string, string>,
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const f of foods) {
    if (!f.photoId) continue
    const url = photoUrls[f.photoId]
    if (!url) continue
    for (const k of f.keys) map[k] = url
  }
  return map
}
