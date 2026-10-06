import { useEffect, useState, type FormEvent } from 'react'
import { todayISO } from '../lib/dates'
import { compressImageFile } from '../lib/photo'
import { formatNumber, lineTotal, portionOf } from '../lib/portion'
import type { PhotoChange } from '../hooks/useEntries'
import type { FoodEntry, PortionType } from '../types'
import { FoodPhotoField } from './FoodPhotoField'
import { PortionToggle } from './PortionToggle'

interface Props {
  initial?: Partial<FoodEntry>
  /** Foto do catálogo (Lista) para este alimento, se existir */
  initialPhotoUrl?: string
  submitLabel: string
  onSubmit: (data: {
    date: string
    kcal: number
    name: string
    quantity: number
    portionType: PortionType
    photo: PhotoChange
  }) => void | Promise<void>
  onCancel?: () => void
}

function initialQuantity(initial: Partial<FoodEntry> | undefined, portionType: PortionType) {
  if (initial?.quantity !== undefined) {
    // A new per-100 g pick arrives with the default quantity 1 → ask for grams.
    if (portionType === 'per100g' && !initial.id && initial.quantity === 1) return ''
    return String(initial.quantity)
  }
  return portionType === 'per100g' ? '' : '1'
}

function parseQuantity(value: string): number {
  return parseFloat(value.replace(',', '.'))
}

export function EntryForm({
  initial,
  initialPhotoUrl,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [portionType, setPortionType] = useState<PortionType>(portionOf(initial))
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [kcal, setKcal] = useState(
    initial?.kcal !== undefined ? String(initial.kcal) : '',
  )
  const [name, setName] = useState(initial?.name ?? '')
  const [quantity, setQuantity] = useState(() =>
    initialQuantity(initial, portionOf(initial)),
  )
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialPhotoUrl)
  const [photoChange, setPhotoChange] = useState<PhotoChange>({ action: 'keep' })
  const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | undefined>(initialPhotoUrl)
  const [error, setError] = useState('')

  useEffect(() => {
    const pt = portionOf(initial)
    setPortionType(pt)
    setDate(initial?.date ?? todayISO())
    setKcal(initial?.kcal !== undefined ? String(initial.kcal) : '')
    setName(initial?.name ?? '')
    setQuantity(initialQuantity(initial, pt))
    setPreviewUrl(initialPhotoUrl)
    setSavedPhotoUrl(initialPhotoUrl)
    setPhotoChange({ action: 'keep' })
  }, [initial, initialPhotoUrl])

  const per100g = portionType === 'per100g'
  const k = parseInt(kcal, 10)
  const q = parseQuantity(quantity)
  const preview =
    Number.isFinite(k) && k > 0 && Number.isFinite(q) && q > 0
      ? lineTotal(k, q, portionType)
      : null

  function changePortion(next: PortionType) {
    if (next === portionType) return
    setPortionType(next)
    // Swap sensible defaults: units ↔ grams are not interchangeable.
    if (next === 'per100g' && (quantity === '1' || quantity === '')) setQuantity('')
    else if (next === 'unit' && (quantity === '' || q >= 20)) setQuantity('1')
  }

  async function handlePhotoFile(file: File) {
    setPhotoBusy(true)
    setError('')
    try {
      const dataUrl = await compressImageFile(file)
      setPreviewUrl(dataUrl)
      setPhotoChange({ action: 'set', dataUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível usar a foto')
    } finally {
      setPhotoBusy(false)
    }
  }

  function removePhoto() {
    setPreviewUrl(undefined)
    // Clear a newly picked photo, or mark a saved catalog photo for deletion.
    setPhotoChange(savedPhotoUrl ? { action: 'remove' } : { action: 'keep' })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Indica o nome do alimento.')
      return
    }
    if (!Number.isFinite(k) || k <= 0) {
      setError(
        per100g
          ? 'Indica as calorias por 100 g (número positivo).'
          : 'Indica as calorias (número positivo).',
      )
      return
    }
    if (!Number.isFinite(q) || q <= 0) {
      setError(per100g ? 'Indica os gramas (número positivo).' : 'A quantidade deve ser positiva.')
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
        portionType,
        photo: photoChange,
      })
    } finally {
      setBusy(false)
    }
  }

  const prefilled = Boolean(initial?.name && initial?.kcal !== undefined)

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <PortionToggle value={portionType} onChange={changePortion} />

      <FoodPhotoField
        previewUrl={previewUrl}
        photoBusy={photoBusy}
        disabled={busy}
        onFile={(file) => void handlePhotoFile(file)}
        onRemove={removePhoto}
      />

      <label className="field">
        <span>{per100g ? 'kcal por 100 g' : 'kcal'}</span>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={kcal}
          onChange={(e) => setKcal(e.target.value)}
          placeholder={per100g ? 'ex. 50' : 'ex. 126'}
          autoFocus={!(prefilled && per100g)}
          required
        />
      </label>

      <label className="field">
        <span>Alimento</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={per100g ? 'ex. pepino' : 'ex. pão pequeno branco'}
          required
          autoComplete="off"
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>{per100g ? 'gramas' : 'quantidade'}</span>
          <input
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={per100g ? 'ex. 120' : '1'}
            autoFocus={prefilled && per100g}
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

      <p className="line-preview" aria-live="polite">
        Total: <strong>{preview !== null ? formatNumber(preview) : '—'}</strong> kcal
        {preview !== null && (
          <span className="line-preview-detail">
            {per100g
              ? ` (${k} kcal/100 g × ${formatNumber(q)} g)`
              : q !== 1
                ? ` (${formatNumber(q)} × ${k} kcal)`
                : ''}
          </span>
        )}
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || photoBusy}>
          {busy ? 'A guardar…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
