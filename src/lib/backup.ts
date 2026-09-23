import type { AppSettings, FoodEntry } from '../types'
import { loadSettings, saveSettings } from './settings'
import { isThemeId } from './theme'
import {
  loadBurnedMap,
  loadEntries,
  replaceAllBurned,
  replaceAllEntries,
} from './storage'

export interface CalorieBackup {
  version: 1
  exportedAt: string
  entries: FoodEntry[]
  burned: Record<string, number>
  settings: AppSettings
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isFoodEntry(value: unknown): value is FoodEntry {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(value.date)) &&
    isFiniteNumber(value.kcal) &&
    value.kcal >= 0 &&
    typeof value.name === 'string' &&
    isFiniteNumber(value.quantity) &&
    value.quantity > 0 &&
    isFiniteNumber(value.createdAt) &&
    isFiniteNumber(value.updatedAt)
  )
}

function isSettings(value: unknown): value is AppSettings {
  if (!isRecord(value)) return false
  return (
    isFiniteNumber(value.basalKcal) &&
    value.basalKcal >= 0 &&
    isFiniteNumber(value.watchErrorPercent) &&
    value.watchErrorPercent >= 0 &&
    value.watchErrorPercent <= 100 &&
    isThemeId(value.themeId)
  )
}

export function parseBackup(value: unknown): CalorieBackup {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error('Cópia inválida ou versão não suportada')
  }
  if (
    typeof value.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.exportedAt)) ||
    !Array.isArray(value.entries) ||
    !value.entries.every(isFoodEntry) ||
    !isRecord(value.burned) ||
    !Object.values(value.burned).every(
      (kcal) => isFiniteNumber(kcal) && kcal >= 0,
    ) ||
    !isSettings(value.settings)
  ) {
    throw new Error('O ficheiro não tem um formato de cópia válido')
  }

  return {
    version: 1,
    exportedAt: value.exportedAt,
    entries: value.entries,
    burned: value.burned as Record<string, number>,
    settings: value.settings,
  }
}

export async function readBackupFile(file: File): Promise<CalorieBackup> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('Não foi possível ler o ficheiro JSON')
  }
  return parseBackup(parsed)
}

export async function createBackup(): Promise<CalorieBackup> {
  const [entries, burned] = await Promise.all([loadEntries(), loadBurnedMap()])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
    burned,
    settings: loadSettings(),
  }
}

function localDateStamp(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function downloadBackup(backup: CalorieBackup): Promise<void> {
  const filename = `calorias-backup-${localDateStamp(new Date())}.json`
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const file = new File([blob], filename, { type: 'application/json' })

  if (
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      title: 'Cópia de segurança das calorias',
    })
    return
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function restoreBackup(backup: CalorieBackup): Promise<void> {
  await replaceAllEntries(backup.entries)
  await replaceAllBurned(backup.burned)
  saveSettings(backup.settings)
}
