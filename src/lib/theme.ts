import type { AppThemeId } from '../types'

export interface ThemeTokens {
  id: AppThemeId
  label: string
  swatch: string
  bg: string
  bgElevated: string
  bgCard: string
  bgCardHover: string
  accent: string
  accentBright: string
  accentSoft: string
  accentMuted: string
  text: string
  textMuted: string
  border: string
}

export const THEMES: Record<AppThemeId, ThemeTokens> = {
  verde: {
    id: 'verde',
    label: 'Verde',
    swatch: '#2e8b57',
    bg: '#0a1f12',
    bgElevated: '#0d2818',
    bgCard: '#123525',
    bgCardHover: '#16432e',
    accent: '#1b5e3a',
    accentBright: '#2e8b57',
    accentSoft: '#a8e6c3',
    accentMuted: '#6bb890',
    text: '#e8f5ee',
    textMuted: '#8fb9a3',
    border: 'rgba(168, 230, 195, 0.12)',
  },
  azul: {
    id: 'azul',
    label: 'Azul',
    swatch: '#3b82f6',
    bg: '#0a1628',
    bgElevated: '#0d1f38',
    bgCard: '#132a4a',
    bgCardHover: '#183656',
    accent: '#1e4f8c',
    accentBright: '#3b82f6',
    accentSoft: '#a8c8f0',
    accentMuted: '#6b93c8',
    text: '#e8f0f8',
    textMuted: '#8fadc9',
    border: 'rgba(168, 200, 240, 0.12)',
  },
  roxo: {
    id: 'roxo',
    label: 'Roxo',
    swatch: '#8b5cf6',
    bg: '#160a28',
    bgElevated: '#1f0d38',
    bgCard: '#2a134a',
    bgCardHover: '#361856',
    accent: '#5b2d91',
    accentBright: '#8b5cf6',
    accentSoft: '#d4b8f8',
    accentMuted: '#a078d0',
    text: '#f3eafc',
    textMuted: '#b89fd4',
    border: 'rgba(212, 184, 248, 0.12)',
  },
  laranja: {
    id: 'laranja',
    label: 'Laranja',
    swatch: '#f59e0b',
    bg: '#1f1208',
    bgElevated: '#2a180a',
    bgCard: '#3a2210',
    bgCardHover: '#4a2c14',
    accent: '#b45309',
    accentBright: '#f59e0b',
    accentSoft: '#f8d9a8',
    accentMuted: '#d4a05a',
    text: '#faf3e8',
    textMuted: '#c9b08f',
    border: 'rgba(248, 217, 168, 0.12)',
  },
  vermelho: {
    id: 'vermelho',
    label: 'Vermelho',
    swatch: '#ef4444',
    bg: '#1f0a0c',
    bgElevated: '#2a0d12',
    bgCard: '#3a1318',
    bgCardHover: '#4a181e',
    accent: '#991b1b',
    accentBright: '#ef4444',
    accentSoft: '#f5b4b4',
    accentMuted: '#d07070',
    text: '#fceaea',
    textMuted: '#c99a9a',
    border: 'rgba(245, 180, 180, 0.12)',
  },
  cinza: {
    id: 'cinza',
    label: 'Cinza',
    swatch: '#94a3b8',
    bg: '#0f1419',
    bgElevated: '#161c24',
    bgCard: '#1e2630',
    bgCardHover: '#27303c',
    accent: '#475569',
    accentBright: '#64748b',
    accentSoft: '#cbd5e1',
    accentMuted: '#94a3b8',
    text: '#e8eef4',
    textMuted: '#94a3b8',
    border: 'rgba(203, 213, 225, 0.12)',
  },
}

export const THEME_OPTIONS = Object.values(THEMES)

export function isThemeId(value: unknown): value is AppThemeId {
  return typeof value === 'string' && value in THEMES
}

export function applyTheme(themeId: AppThemeId): void {
  const theme = THEMES[themeId] ?? THEMES.verde
  const root = document.documentElement
  root.dataset.theme = theme.id
  root.style.setProperty('--bg', theme.bg)
  root.style.setProperty('--bg-elevated', theme.bgElevated)
  root.style.setProperty('--bg-card', theme.bgCard)
  root.style.setProperty('--bg-card-hover', theme.bgCardHover)
  root.style.setProperty('--green', theme.accent)
  root.style.setProperty('--green-bright', theme.accentBright)
  root.style.setProperty('--green-soft', theme.accentSoft)
  root.style.setProperty('--green-muted', theme.accentMuted)
  root.style.setProperty('--text', theme.text)
  root.style.setProperty('--text-muted', theme.textMuted)
  root.style.setProperty('--border', theme.border)

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme.bgElevated)
}
