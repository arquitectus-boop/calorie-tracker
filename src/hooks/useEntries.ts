import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppSettings, DaySummary, FoodEntry } from '../types'
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

function sortEntries(a: FoodEntry, b: FoodEntry) {
  if (a.date !== b.date) return b.date.localeCompare(a.date)
  return b.createdAt - a.createdAt
}

export function entryLineTotal(e: FoodEntry): number {
  return e.kcal * e.quantity
}

export function useEntries() {
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [burnedByDate, setBurnedByDate] = useState<Record<string, number>>({})
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [loading, setLoading] = useState(true)

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
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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

  const addEntry = useCallback(
    async ( partial: {
      date: string
      kcal: number
      name: string
      quantity: number
    }) => {
      const now = Date.now()
      const entry: FoodEntry = {
        id: crypto.randomUUID(),
        date: partial.date,
        kcal: partial.kcal,
        name: partial.name.trim(),
        quantity: partial.quantity,
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

  const frequentFoods = useMemo(() => {
    const counts = new Map<
      string,
      { name: string; kcal: number; count: number; lastUsed: number }
    >()
    for (const e of entries) {
      const key = `${e.name.toLowerCase()}|${e.kcal}`
      const cur = counts.get(key)
      if (cur) {
        cur.count += 1
        cur.lastUsed = Math.max(cur.lastUsed, e.createdAt)
      } else {
        counts.set(key, {
          name: e.name,
          kcal: e.kcal,
          count: 1,
          lastUsed: e.createdAt,
        })
      }
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
      .slice(0, 20)
  }, [entries])

  const recentFoods = useMemo(() => {
    const seen = new Set<string>()
    const result: { name: string; kcal: number }[] = []
    for (const e of entries) {
      const key = `${e.name.toLowerCase()}|${e.kcal}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push({ name: e.name, kcal: e.kcal })
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
    refresh,
    setDayBurned,
    updateSettings,
    frequentFoods,
    recentFoods,
  }
}
