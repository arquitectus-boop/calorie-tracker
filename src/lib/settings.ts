import type { AppSettings, AppThemeId } from '../types'
import { applyTheme, isThemeId } from './theme'

const LS_KEY = 'calorie-tracker-settings-v1'

export const DEFAULT_SETTINGS: AppSettings = {
  basalKcal: 0,
  watchErrorPercent: 0,
  themeId: 'verde',
}

export const WATCH_ERROR_OPTIONS = [0, 5, 10, 15, 20, 25, 30] as const

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    const themeId: AppThemeId = isThemeId(parsed.themeId)
      ? parsed.themeId
      : DEFAULT_SETTINGS.themeId
    return {
      basalKcal: Math.max(0, Math.round(Number(parsed.basalKcal) || 0)),
      watchErrorPercent: Math.min(
        100,
        Math.max(0, Math.round(Number(parsed.watchErrorPercent) || 0)),
      ),
      themeId,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  const next: AppSettings = {
    basalKcal: Math.max(0, Math.round(settings.basalKcal) || 0),
    watchErrorPercent: Math.min(
      100,
      Math.max(0, Math.round(settings.watchErrorPercent) || 0),
    ),
    themeId: isThemeId(settings.themeId) ? settings.themeId : 'verde',
  }
  localStorage.setItem(LS_KEY, JSON.stringify(next))
  applyTheme(next.themeId)
}

export function effectiveBurned(
  watchKcal: number,
  settings: AppSettings,
): number {
  if (watchKcal <= 0) return 0
  const margin = Math.min(100, Math.max(0, settings.watchErrorPercent)) / 100
  const adjustedWatch = watchKcal * (1 - margin)
  return Math.round(settings.basalKcal + Math.max(0, adjustedWatch))
}
