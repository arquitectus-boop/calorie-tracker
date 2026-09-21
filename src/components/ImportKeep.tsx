import { useState } from 'react'
import { keepDaysToEntries, parseKeepText } from '../lib/parseKeep'
import type { FoodEntry } from '../types'

interface Props {
  onImport: (entries: FoodEntry[]) => Promise<number>
  onDone: () => void
}

export function ImportKeep({ onImport, onDone }: Props) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ReturnType<typeof parseKeepText> | null>(
    null,
  )
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  function handleParse() {
    setMessage('')
    const days = parseKeepText(text)
    setPreview(days)
    if (days.length === 0) {
      setMessage('Não foi possível reconhecer datas ou linhas de calorias.')
    }
  }

  async function handleImport() {
    if (!preview || preview.length === 0) return
    setBusy(true)
    setMessage('')
    try {
      const entries = keepDaysToEntries(preview)
      const n = await onImport(entries)
      setMessage(`Importados ${n} registos em ${preview.length} dia(s).`)
      setText('')
      setPreview(null)
      setTimeout(onDone, 900)
    } finally {
      setBusy(false)
    }
  }

  const totalLines =
    preview?.reduce((s, d) => s + d.entries.length, 0) ?? 0

  return (
    <div className="import-keep">
      <h1 className="page-title">Importar do Keep</h1>
      <p className="hint">
        Cola o texto do Google Keep. Formato esperado: cabeçalhos de data
        (ex. <code>21/09/26</code> ou <code>20/09/2026 1431 kcal</code>) e
        linhas como <code>79 iogurte</code> ou{' '}
        <code>2x 126 pão pequeno branco</code>.
      </p>

      <textarea
        className="import-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`21/09/26\n79 iogurte\n726 sandes frango ESSO\n138 actimel (2x)\n\n20/09/2026 1431 kcal\n2x 126 pão pequeno branco`}
        rows={12}
      />

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleParse}
          disabled={!text.trim()}
        >
          Pré-visualizar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleImport}
          disabled={!preview || totalLines === 0 || busy}
        >
          {busy ? 'A importar…' : `Importar${totalLines ? ` (${totalLines})` : ''}`}
        </button>
      </div>

      {message && <p className="form-message">{message}</p>}

      {preview && preview.length > 0 && (
        <div className="import-preview">
          {preview.map((d) => (
            <div key={d.date} className="import-day">
              <strong>
                {d.date}
                {d.headerTotal !== undefined ? ` · header ${d.headerTotal} kcal` : ''}
                {' · '}
                {d.entries.reduce((s, e) => s + e.kcal * e.quantity, 0)} kcal
              </strong>
              <ul>
                {d.entries.map((e, i) => (
                  <li key={i}>
                    {e.quantity !== 1 ? `${e.quantity}× ` : ''}
                    {e.kcal} {e.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
