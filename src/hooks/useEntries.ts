import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DaySummary, FoodEntry } from '../types'
import {
  deleteEntry as deleteEntryStorage,
  loadEntries,
  saveEntry,
  saveEntriesBulk,
} from '../lib/storage'
import { todayISO } from '../lib/dates'

function sortEntries(a: FoodEntry, b: FoodEntry) {
  if (a.date !== b.date) return b.date.localeCompare(a.date)
  return b.createdAt - a.createdAt
}

export function entryLineTotal(e: FoodEntry): number {
  return e.kcal * e.quantity
}

export function useEntries() {
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await loadEntries()
      if (!cancelled) {
        setEntries(data.sort(sortEntries))
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async () => {
    const data = await loadEntries()
    setEntries(data.sort(sortEntries))
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
    const result: DaySummary[] = []
    for (const [date, list] of map) {
      const total = list.reduce((s, e) => s + entryLineTotal(e), 0)
      result.push({
        date,
        total,
        entries: list.sort((a, b) => b.createdAt - a.createdAt),
      })
    }
    return result.sort((a, b) => b.date.localeCompare(a.date))
  }, [entries])

  const today = useMemo(() => {
    const iso = todayISO()
    return (
      days.find((d) => d.date === iso) ?? {
        date: iso,
        total: 0,
        entries: [] as FoodEntry[],
      }
    )
  }, [days])

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
    addEntry,
    updateEntry,
    removeEntry,
    importEntries,
    refresh,
    frequentFoods,
    recentFoods,
  }
}
