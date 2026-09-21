import { useEffect, useState } from 'react'
import type { AppSettings } from '../types'
import { WATCH_ERROR_OPTIONS } from '../lib/settings'

interface Props {
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

export function Settings({ settings, onSave }: Props) {
  const [basal, setBasal] = useState(
    settings.basalKcal > 0 ? String(settings.basalKcal) : '',
  )
  const [errorPct, setErrorPct] = useState(settings.watchErrorPercent)

  useEffect(() => {
    setBasal(settings.basalKcal > 0 ? String(settings.basalKcal) : '')
    setErrorPct(settings.watchErrorPercent)
  }, [settings])

  function handleSave() {
    const value = Number(basal.replace(',', '.'))
    onSave({
      basalKcal: Number.isFinite(value) ? value : 0,
      watchErrorPercent: errorPct,
    })
  }

  return (
    <div className="settings">
      <h1 className="page-title">Definições</h1>

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
