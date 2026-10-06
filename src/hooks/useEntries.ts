import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppSettings, DaySummary, FoodEntry, PortionType } from '../types'
import { entryLineTotal, portionOf } from '../lib/portion'
import {
  deleteEntry as deleteEntryStorage,
  loadBurnedMap,
  loadEntries,
  saveBurned,
  saveEntry,
  saveEntriesBulk,
} from '../lib/storage'
import { todayISO } from '../lib/dates'
import { effectiveBurned, loadSettings, saveSettings } from '../lib/settings'
import { applyTheme } from '../lib/theme'
import {
  createBackup,
  downloadBackup,
  readBackupFile,
  restoreBackup,
} from '../lib/backup'
import {
  addCatalogFood,
  editCatalogFood,
  foodKey,
  loadCatalog,
  mergeFoods,
  removeCatalogFood,
  saveCatalog,
  type FoodCatalog,
  type FoodListItem,
} from '../lib/foodCatalog'
import { deletePhoto, getPhoto, putPhoto } from '../lib/photo'

/** How the Lista editor changes the food photo. */
export type PhotoChange =
  | { action: 'keep' }
  | { action: 'remove' }
  | { action: 'set'; dataUrl: string }

function sortEntries(a: FoodEntry, b: FoodEntry) {
  if (a.date !== b.date) return b.date.localeCompare(a.date)
  return b.createdAt - a.createdAt
}

export { entryLineTotal }

export function useEntries() {
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [burnedByDate, setBurnedByDate] = useState<Record<string, number>>({})
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [loading, setLoading] = useState(true)
  const [catalog, setCatalog] = useState<FoodCatalog>(() => loadCatalog())
  /** photoId → data URL for thumbnails (loaded lazily / after mutations) */
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

  const commitCatalog = useCallback((next: FoodCatalog) => {
    saveCatalog(next)
    setCatalog(next)
  }, [])

  const refreshPhotoUrls = useCallback(async (cat: FoodCatalog) => {
    const ids = cat.foods.map((f) => f.photoId).filter((id): id is string => !!id)
    if (ids.length === 0) {
      setPhotoUrls({})
      return
    }
    const entries = await Promise.all(
      ids.map(async (id) => {
        const url = await getPhoto(id)
        return url ? ([id, url] as const) : null
      }),
    )
    const map: Record<string, string> = {}
    for (const row of entries) {
      if (row) map[row[0]] = row[1]
    }
    setPhotoUrls(map)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [data, burned] = await Promise.all([loadEntries(), loadBurnedMap()])
      if (!cancelled) {
        setEntries(data.sort(sortEntries))
        setBurnedByDate(burned)
        const loaded = loadSettings()
        setSettings(loaded)
        applyTheme(loaded.themeId)
        const cat = loadCatalog()
        setCatalog(cat)
        await refreshPhotoUrls(cat)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshPhotoUrls])

  const refresh = useCallback(async () => {
    const [data, burned] = await Promise.all([loadEntries(), loadBurnedMap()])
    setEntries(data.sort(sortEntries))
    setBurnedByDate(burned)
  }, [])

  const setDayBurned = useCallback(async (date: string, kcal: number) => {
    const value = Math.max(0, Math.round(kcal) || 0)
    await saveBurned(date, value)
    setBurnedByDate((prev) => {
      const next = { ...prev }
      if (value === 0) delete next[date]
      else next[date] = value
      return next
    })
  }, [])

  const updateSettings = useCallback((next: AppSettings) => {
    saveSettings(next)
    setSettings(next)
  }, [])

  const exportBackup = useCallback(async () => {
    const backup = await createBackup()
    await downloadBackup(backup)
  }, [])

  const importBackup = useCallback(
    async (file: File) => {
      const backup = await readBackupFile(file)
      const confirmed = window.confirm(
        'Restaurar esta cópia de segurança? Os registos e definições atuais serão substituídos.',
      )
      if (!confirmed) return false

      await restoreBackup(backup)
      await refresh()
      const loaded = loadSettings()
      setSettings(loaded)
      applyTheme(loaded.themeId)
      const cat = loadCatalog()
      setCatalog(cat)
      await refreshPhotoUrls(cat)
      return true
    },
    [refresh, refreshPhotoUrls],
  )

  const addEntry = useCallback(
    async ( partial: {
      date: string
      kcal: number
      name: string
      quantity: number
      portionType: PortionType
    }) => {
      const now = Date.now()
      const entry: FoodEntry = {
        id: crypto.randomUUID(),
        date: partial.date,
        kcal: partial.kcal,
        name: partial.name.trim(),
        quantity: partial.quantity,
        portionType: partial.portionType,
        createdAt: now,
        updatedAt: now,
      }
      await saveEntry(entry)
      setEntries((prev) => [...prev, entry].sort(sortEntries))
      return entry
    },
    [],
  )

  const updateEntry = useCallback(async (entry: FoodEntry) => {
    const updated = { ...entry, updatedAt: Date.now(), name: entry.name.trim() }
    await saveEntry(updated)
    setEntries((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e)).sort(sortEntries),
    )
    return updated
  }, [])

  const removeEntry = useCallback(async (id: string) => {
    await deleteEntryStorage(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const importEntries = useCallback(async (newOnes: FoodEntry[]) => {
    if (newOnes.length === 0) return 0
    await saveEntriesBulk(newOnes)
    setEntries((prev) => {
      const map = new Map(prev.map((e) => [e.id, e]))
      for (const e of newOnes) map.set(e.id, e)
      return [...map.values()].sort(sortEntries)
    })
    return newOnes.length
  }, [])

  const days = useMemo((): DaySummary[] => {
    const map = new Map<string, FoodEntry[]>()
    for (const e of entries) {
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    }
    for (const date of Object.keys(burnedByDate)) {
      if (!map.has(date)) map.set(date, [])
    }
    const result: DaySummary[] = []
    for (const [date, list] of map) {
      const total = list.reduce((s, e) => s + entryLineTotal(e), 0)
      const watchBurned = burnedByDate[date] ?? 0
      result.push({
        date,
        total,
        watchBurned,
        burned: effectiveBurned(watchBurned, settings),
        entries: list.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)),
      })
    }
    return result.sort((a, b) => b.date.localeCompare(a.date))
  }, [entries, burnedByDate, settings])

  const today = useMemo(() => {
    const iso = todayISO()
    return (
      days.find((d) => d.date === iso) ?? {
        date: iso,
        total: 0,
        watchBurned: burnedByDate[iso] ?? 0,
        burned: effectiveBurned(burnedByDate[iso] ?? 0, settings),
        entries: [] as FoodEntry[],
      }
    )
  }, [days, burnedByDate, settings])

  const allFoods = useMemo(
    () => mergeFoods(entries, catalog),
    [entries, catalog],
  )

  const addFoodToList = useCallback(
    async (
      name: string,
      kcal: number,
      portionType: PortionType,
      photo: PhotoChange = { action: 'keep' },
    ) => {
      let photoId: string | undefined
      let dataUrl: string | undefined
      if (photo.action === 'set') {
        dataUrl = photo.dataUrl
        photoId = await putPhoto(dataUrl)
      }
      const next = addCatalogFood(catalog, name, kcal, portionType, photoId)
      commitCatalog(next)
      if (photoId && dataUrl) {
        setPhotoUrls((prev) => ({ ...prev, [photoId!]: dataUrl! }))
      }
    },
    [catalog, commitCatalog],
  )

  const editFoodInList = useCallback(
    async (
      item: FoodListItem,
      name: string,
      kcal: number,
      portionType: PortionType,
      applyToHistory: boolean,
      photo: PhotoChange = { action: 'keep' },
    ) => {
      let photoArg: string | null | undefined = undefined
      if (photo.action === 'remove') {
        photoArg = null
        if (item.photoId) await deletePhoto(item.photoId)
      } else if (photo.action === 'set') {
        const newId = await putPhoto(photo.dataUrl)
        photoArg = newId
        if (item.photoId && item.photoId !== newId) await deletePhoto(item.photoId)
        setPhotoUrls((prev) => {
          const next = { ...prev }
          if (item.photoId) delete next[item.photoId]
          next[newId] = photo.dataUrl
          return next
        })
      }

      const next = editCatalogFood(catalog, item, name, kcal, portionType, photoArg)
      commitCatalog(next)

      if (photo.action === 'remove' && item.photoId) {
        setPhotoUrls((prev) => {
          const n = { ...prev }
          delete n[item.photoId!]
          return n
        })
      }

      // Changing unit ↔ per 100 g would reinterpret logged quantities, so the
      // history is only updated when the portion type stays the same.
      if (!applyToHistory || portionType !== item.portionType) return 0
      const keys = new Set(item.keys)
      const now = Date.now()
      const changed = entries
        .filter(
          (e) =>
            portionOf(e) === portionType &&
            keys.has(foodKey(e.name, e.kcal, portionOf(e))),
        )
        .map((e) => ({ ...e, name: name.trim(), kcal: Math.round(kcal), updatedAt: now }))
      if (changed.length === 0) return 0
      await saveEntriesBulk(changed)
      setEntries((prev) => {
        const map = new Map(prev.map((e) => [e.id, e]))
        for (const e of changed) map.set(e.id, e)
        return [...map.values()].sort(sortEntries)
      })
      return changed.length
    },
    [catalog, commitCatalog, entries],
  )

  const removeFoodFromList = useCallback(
    async (item: FoodListItem) => {
      if (item.photoId) {
        await deletePhoto(item.photoId)
        setPhotoUrls((prev) => {
          const n = { ...prev }
          delete n[item.photoId!]
          return n
        })
      }
      commitCatalog(removeCatalogFood(catalog, item))
    },
    [catalog, commitCatalog],
  )

  const frequentFoods = useMemo(
    () => allFoods.filter((f) => f.count > 0).slice(0, 20),
    [allFoods],
  )

  const recentFoods = useMemo(() => {
    const seen = new Set<string>()
    const result: { name: string; kcal: number; portionType: PortionType }[] = []
    for (const e of entries) {
      const portionType = portionOf(e)
      const key = foodKey(e.name, e.kcal, portionType)
      if (seen.has(key)) continue
      seen.add(key)
      result.push({ name: e.name, kcal: e.kcal, portionType })
      if (result.length >= 12) break
    }
    return result
  }, [entries])

  return {
    entries,
    days,
    today,
    loading,
    settings,
    addEntry,
    updateEntry,
    removeEntry,
    importEntries,
    exportBackup,
    importBackup,
    refresh,
    setDayBurned,
    updateSettings,
    frequentFoods,
    allFoods,
    recentFoods,
    addFoodToList,
    editFoodInList,
    removeFoodFromList,
    photoUrls,
  }
}
