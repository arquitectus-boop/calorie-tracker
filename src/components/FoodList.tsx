import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { foodKey, type FoodListItem } from '../lib/foodCatalog'
import { compressImageFile } from '../lib/photo'
import { kcalUnitLabel } from '../lib/portion'
import type { PhotoChange } from '../hooks/useEntries'
import type { PortionType } from '../types'
import { PortionToggle } from './PortionToggle'

export type { FoodListItem }

type SortMode = 'freq' | 'az' | 'kcal-asc' | 'kcal-desc'

const SORT_KEY = 'calorie-tracker-lista-sort-v1'
const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'freq', label: 'Frequência' },
  { id: 'az', label: 'A → Z' },
  { id: 'kcal-asc', label: 'Menos → mais kcal' },
  { id: 'kcal-desc', label: 'Mais → menos kcal' },
]

function loadSort(): SortMode {
  try {
    const v = localStorage.getItem(SORT_KEY)
    if (SORT_OPTIONS.some((o) => o.id === v)) return v as SortMode
  } catch {
    // ignore
  }
  return 'freq'
}

const collator = new Intl.Collator('pt-PT', { sensitivity: 'base', numeric: true })

function sortFoods(foods: FoodListItem[], mode: SortMode): FoodListItem[] {
  const list = [...foods]
  const byName = (a: FoodListItem, b: FoodListItem) => collator.compare(a.name, b.name)
  switch (mode) {
    case 'az':
      return list.sort((a, b) => byName(a, b) || a.kcal - b.kcal)
    case 'kcal-asc':
      return list.sort((a, b) => a.kcal - b.kcal || byName(a, b))
    case 'kcal-desc':
      return list.sort((a, b) => b.kcal - a.kcal || byName(a, b))
    default:
      return list.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
  }
}

function countLabel(n: number): string {
  if (n === 0) return 'Ainda não registado'
  return `${n}× ${n === 1 ? 'vez' : 'vezes'}`
}

interface EditorProps {
  title: string
  initialName?: string
  initialKcal?: number
  initialPortion?: PortionType
  /** Existing photo preview URL (from IndexedDB cache) */
  initialPhotoUrl?: string
  historyCount?: number
  submitLabel: string
  validate: (name: string, kcal: number, portionType: PortionType) => string | null
  onSubmit: (
    name: string,
    kcal: number,
    portionType: PortionType,
    applyToHistory: boolean,
    photo: PhotoChange,
  ) => Promise<void> | void
  onCancel: () => void
}

function FoodEditor({
  title,
  initialName = '',
  initialKcal,
  initialPortion = 'unit',
  initialPhotoUrl,
  historyCount = 0,
  submitLabel,
  validate,
  onSubmit,
  onCancel,
}: EditorProps) {
  const [name, setName] = useState(initialName)
  const [kcal, setKcal] = useState(initialKcal !== undefined ? String(initialKcal) : '')
  const [portionType, setPortionType] = useState<PortionType>(initialPortion)
  const [applyToHistory, setApplyToHistory] = useState(false)
  const portionChanged = portionType !== initialPortion
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  /** Preview shown in the form (may be new compressed data URL) */
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialPhotoUrl)
  /** Pending photo mutation relative to the saved food */
  const [photoChange, setPhotoChange] = useState<PhotoChange>({ action: 'keep' })
  const ref = useRef<HTMLFormElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  async function handlePhotoFile(file: File | undefined) {
    if (!file) return
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
    // Clear a newly picked photo, or mark a saved photo for deletion.
    setPhotoChange(initialPhotoUrl ? { action: 'remove' } : { action: 'keep' })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    const k = parseInt(kcal, 10)
    if (!clean) return setError('Indica o nome do alimento.')
    if (!Number.isFinite(k) || k <= 0) return setError('Indica as calorias (número positivo).')
    const problem = validate(clean, k, portionType)
    if (problem) return setError(problem)
    setBusy(true)
    try {
      await onSubmit(clean, k, portionType, applyToHistory && !portionChanged, photoChange)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form ref={ref} className="food-editor" onSubmit={handleSubmit}>
      <h2 className="food-editor-title">{title}</h2>
      <PortionToggle value={portionType} onChange={setPortionType} />

      <div className="food-photo-block">
        {previewUrl ? (
          <div className="food-photo-preview-wrap">
            <img
              src={previewUrl}
              alt="Foto do alimento"
              className="food-photo-preview"
            />
            <button
              type="button"
              className="btn btn-ghost food-photo-remove"
              onClick={removePhoto}
              disabled={busy || photoBusy}
            >
              Remover foto
            </button>
          </div>
        ) : (
          <p className="food-photo-empty">Sem foto (opcional)</p>
        )}
        <div className="food-photo-actions">
          <button
            type="button"
            className="btn btn-ghost food-photo-btn"
            disabled={busy || photoBusy}
            onClick={() => cameraRef.current?.click()}
          >
            {photoBusy ? 'A processar…' : '📷 Câmara'}
          </button>
          <button
            type="button"
            className="btn btn-ghost food-photo-btn"
            disabled={busy || photoBusy}
            onClick={() => galleryRef.current?.click()}
          >
            Galeria
          </button>
        </div>
        {/* capture=environment → rear camera on iPhone Safari */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="food-photo-input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void handlePhotoFile(file)
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="food-photo-input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void handlePhotoFile(file)
          }}
        />
      </div>

      <div className="food-editor-fields">
        <label className="field">
          <span>Alimento</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. iogurte natural"
            autoComplete="off"
            autoFocus
          />
        </label>
        <label className="field">
          <span>{portionType === 'per100g' ? 'kcal/100 g' : 'kcal/un'}</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            placeholder={portionType === 'per100g' ? 'ex. 50' : 'ex. 79'}
          />
        </label>
      </div>
      {historyCount > 0 && portionChanged && (
        <p className="food-editor-note">
          Ao mudar entre unidade e 100 g, os registos anteriores ficam como estão.
        </p>
      )}
      {historyCount > 0 && !portionChanged && (
        <label className="food-editor-check">
          <input
            type="checkbox"
            checked={applyToHistory}
            onChange={(e) => setApplyToHistory(e.target.checked)}
          />
          <span>
            {historyCount === 1
              ? 'Aplicar também ao registo anterior'
              : `Aplicar também aos ${historyCount} registos anteriores`}
            <small>Os totais desses dias podem mudar. Por omissão só a Lista muda.</small>
          </span>
        </label>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy || photoBusy}>
          {busy ? 'A guardar…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

interface Props {
  foods: FoodListItem[]
  photoUrls: Record<string, string>
  onPick: (food: { name: string; kcal: number; portionType: PortionType }) => void
  onAdd: (
    name: string,
    kcal: number,
    portionType: PortionType,
    photo: PhotoChange,
  ) => Promise<void> | void
  onEdit: (
    item: FoodListItem,
    name: string,
    kcal: number,
    portionType: PortionType,
    applyToHistory: boolean,
    photo: PhotoChange,
  ) => Promise<number>
  onRemove: (item: FoodListItem) => void | Promise<void>
  onToast: (msg: string) => void
}

export function FoodList({
  foods,
  photoUrls,
  onPick,
  onAdd,
  onEdit,
  onRemove,
  onToast,
}: Props) {
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>(() => loadSort())
  const [adding, setAdding] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)

  function changeSort(mode: SortMode) {
    setSortMode(mode)
    try {
      localStorage.setItem(SORT_KEY, mode)
    } catch {
      // ignore
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods
    return sortFoods(filtered, sortMode)
  }, [foods, query, sortMode])

  function findDuplicate(
    name: string,
    kcal: number,
    portionType: PortionType,
    except?: FoodListItem,
  ) {
    const key = foodKey(name, kcal, portionType)
    return foods.find((f) => f !== except && f.key === key)
  }

  function handleRemove(item: FoodListItem) {
    const extra =
      item.count > 0
        ? `\n\nOs ${item.count} ${item.count === 1 ? 'registo' : 'registos'} nos dias anteriores ficam intactos.`
        : ''
    const ok = window.confirm(`Remover «${item.name}» (${item.kcal} ${kcalUnitLabel(item.portionType)}) da Lista?${extra}`)
    if (!ok) return
    if (editingKey === item.key) setEditingKey(null)
    void onRemove(item)
    onToast('Removido da Lista')
  }

  return (
    <div className="food-list-view">
      <h1 className="page-title">Lista</h1>
      <p className="hint">
        Toca num alimento para o adicionar. ✎ edita (podes pôr foto), ✕ remove só da Lista (o histórico fica).
      </p>

      {adding ? (
        <FoodEditor
          title="Novo alimento"
          submitLabel="Guardar na Lista"
          validate={(n, k, pt) =>
            findDuplicate(n, k, pt) ? 'Esse alimento já está na Lista.' : null
          }
          onCancel={() => setAdding(false)}
          onSubmit={async (n, k, pt, _apply, photo) => {
            await onAdd(n, k, pt, photo)
            setAdding(false)
            onToast('Adicionado à Lista')
          }}
        />
      ) : (
        <button
          type="button"
          className="btn btn-ghost food-add-btn"
          onClick={() => {
            setEditingKey(null)
            setAdding(true)
          }}
        >
          + Adicionar alimento à Lista
        </button>
      )}

      <label className="field food-search-field">
        <span className="visually-hidden">Pesquisar</span>
        <input
          type="search"
          className="food-search-input"
          placeholder="Pesquisar alimento…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          enterKeyHint="search"
        />
      </label>

      {foods.length > 1 && (
        <div className="sort-bar" role="group" aria-label="Ordenar alimentos">
          <span className="sort-label">Ordenar</span>
          <div className="sort-options food-sort-options">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={sortMode === o.id ? 'sort-btn active' : 'sort-btn'}
                aria-pressed={sortMode === o.id}
                onClick={() => changeSort(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {foods.length === 0 ? (
        <p className="empty-state">Ainda não há alimentos na Lista.</p>
      ) : visible.length === 0 ? (
        <p className="empty-state">Nenhum alimento corresponde à pesquisa.</p>
      ) : (
        <ul className="food-list">
          {visible.map((f) =>
            editingKey === f.key ? (
              <li key={f.key}>
                <FoodEditor
                  title="Editar alimento"
                  initialName={f.name}
                  initialKcal={f.kcal}
                  initialPortion={f.portionType}
                  initialPhotoUrl={f.photoId ? photoUrls[f.photoId] : undefined}
                  historyCount={f.count}
                  submitLabel="Guardar"
                  validate={() => null}
                  onCancel={() => setEditingKey(null)}
                  onSubmit={async (n, k, pt, apply, photo) => {
                    const merged = findDuplicate(n, k, pt, f)
                    const changed = await onEdit(f, n, k, pt, apply, photo)
                    setEditingKey(null)
                    onToast(
                      changed > 0
                        ? `Lista e ${changed} ${changed === 1 ? 'registo atualizado' : 'registos atualizados'}`
                        : merged
                          ? 'Juntado ao alimento existente'
                          : 'Lista atualizada',
                    )
                  }}
                />
              </li>
            ) : (
              <li key={f.key} className="food-list-row">
                <button
                  type="button"
                  className="food-list-item"
                  onClick={() =>
                    onPick({ name: f.name, kcal: f.kcal, portionType: f.portionType })
                  }
                  aria-label={`Adicionar ${f.name}, ${f.kcal} ${kcalUnitLabel(f.portionType)}`}
                >
                  {f.photoId && photoUrls[f.photoId] ? (
                    <img
                      src={photoUrls[f.photoId]}
                      alt=""
                      className="food-list-thumb"
                    />
                  ) : (
                    <span className="food-list-thumb food-list-thumb-empty" aria-hidden>
                      🍽
                    </span>
                  )}
                  <div className="food-list-left">
                    <span className="food-list-name">{f.name}</span>
                    <span className="food-list-count">{countLabel(f.count)}</span>
                  </div>
                  <span className="food-list-kcal">
                    {f.kcal}
                    <span className="food-list-kcal-unit"> {kcalUnitLabel(f.portionType)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="food-list-action"
                  onClick={() => {
                    setAdding(false)
                    setEditingKey(f.key)
                  }}
                  aria-label={`Editar ${f.name}`}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="food-list-action food-list-action-delete"
                  onClick={() => handleRemove(f)}
                  aria-label={`Remover ${f.name} da Lista`}
                >
                  ✕
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}
