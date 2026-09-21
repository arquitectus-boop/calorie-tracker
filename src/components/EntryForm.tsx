import { useEffect, useState, type FormEvent } from 'react'
import { todayISO } from '../lib/dates'
import type { FoodEntry } from '../types'

interface Props {
  initial?: Partial<FoodEntry>
  submitLabel: string
  onSubmit: (data: {
    date: string
    kcal: number
    name: string
    quantity: number
  }) => void | Promise<void>
  onCancel?: () => void
}

export function EntryForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [kcal, setKcal] = useState(
    initial?.kcal !== undefined ? String(initial.kcal) : '',
  )
  const [name, setName] = useState(initial?.name ?? '')
  const [quantity, setQuantity] = useState(
    initial?.quantity !== undefined ? String(initial.quantity) : '1',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDate(initial?.date ?? todayISO())
    setKcal(initial?.kcal !== undefined ? String(initial.kcal) : '')
    setName(initial?.name ?? '')
    setQuantity(
      initial?.quantity !== undefined ? String(initial.quantity) : '1',
    )
  }, [initial])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const k = parseInt(kcal, 10)
    const q = parseFloat(quantity.replace(',', '.'))
    if (!name.trim()) {
      setError('Indica o nome do alimento.')
      return
    }
    if (!Number.isFinite(k) || k <= 0) {
      setError('Indica as calorias (número positivo).')
      return
    }
    if (!Number.isFinite(q) || q <= 0) {
      setError('A quantidade deve ser positiva.')
      return
    }
    if (!date) {
      setError('Indica a data.')
      return
    }
    setBusy(true)
    try {
      await onSubmit({
        date,
        kcal: k,
        name: name.trim(),
        quantity: q,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Calorias (kcal)</span>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={kcal}
          onChange={(e) => setKcal(e.target.value)}
          placeholder="ex. 126"
          autoFocus
          required
        />
      </label>

      <label className="field">
        <span>Alimento</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex. pão pequeno branco"
          required
          autoComplete="off"
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Quantidade</span>
          <input
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="1"
          />
        </label>
        <label className="field">
          <span>Data</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'A guardar…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
