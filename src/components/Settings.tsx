import { useEffect, useState } from 'react'
import type { AppSettings, AppThemeId } from '../types'
import { WATCH_ERROR_OPTIONS } from '../lib/settings'
import { THEME_OPTIONS, applyTheme } from '../lib/theme'

interface Props {
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

export function Settings({ settings, onSave }: Props) {
  const [basal, setBasal] = useState(
    settings.basalKcal > 0 ? String(settings.basalKcal) : '',
  )
  const [errorPct, setErrorPct] = useState(settings.watchErrorPercent)
  const [themeId, setThemeId] = useState<AppThemeId>(settings.themeId)

  useEffect(() => {
    setBasal(settings.basalKcal > 0 ? String(settings.basalKcal) : '')
    setErrorPct(settings.watchErrorPercent)
    setThemeId(settings.themeId)
  }, [settings])

  function pickTheme(id: AppThemeId) {
    setThemeId(id)
    applyTheme(id)
  }

  function handleSave() {
    const value = Number(basal.replace(',', '.'))
    onSave({
      basalKcal: Number.isFinite(value) ? value : 0,
      watchErrorPercent: errorPct,
      themeId,
    })
  }

  return (
    <div className="settings">
      <h1 className="page-title">Definições</h1>

      <section className="settings-card">
        <h2 className="settings-title">Cor da app</h2>
        <p className="settings-help">Escolhe a cor principal do ecrã.</p>
        <div className="theme-options" role="group" aria-label="Cor da app">
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={themeId === theme.id ? 'theme-btn active' : 'theme-btn'}
              onClick={() => pickTheme(theme.id)}
              aria-pressed={themeId === theme.id}
            >
              <span
                className="theme-swatch"
                style={{ background: theme.swatch }}
                aria-hidden
              />
              <span className="theme-name">{theme.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <h2 className="settings-title">Margem de erro da pulseira</h2>
        <p className="settings-help">
          Percentagem a descontar das calorias gastas que introduzires no dia.
        </p>
        <div className="pct-options" role="group" aria-label="Margem de erro">
          {WATCH_ERROR_OPTIONS.map((pct) => (
            <button
              key={pct}
              type="button"
              className={errorPct === pct ? 'pct-btn active' : 'pct-btn'}
              onClick={() => setErrorPct(pct)}
            >
              {pct}%
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <h2 className="settings-title">Kcal basal</h2>
        <p className="settings-help">
          Calorias basais diárias. Somam-se às da pulseira (já com a margem).
        </p>
        <input
          className="settings-input"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder="ex. 1600"
          value={basal}
          onChange={(e) => setBasal(e.target.value)}
        />
      </section>

      <p className="settings-formula">
        No dia: <strong>Kcal basal + (Calorias gastas − margem)</strong>
      </p>

      <button type="button" className="settings-save" onClick={handleSave}>
        Guardar definições
      </button>
    </div>
  )
}
