import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { foodKey, type FoodListItem } from '../lib/foodCatalog'

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
  historyCount?: number
  submitLabel: string
  validate: (name: string, kcal: number) => string | null
  onSubmit: (name: string, kcal: number, applyToHistory: boolean) => Promise<void> | void
  onCancel: () => void
}

function FoodEditor({
  title,
  initialName = '',
  initialKcal,
  historyCount = 0,
  submitLabel,
  validate,
  onSubmit,
  onCancel,
}: EditorProps) {
  const [name, setName] = useState(initialName)
  const [kcal, setKcal] = useState(initialKcal !== undefined ? String(initialKcal) : '')
  const [applyToHistory, setApplyToHistory] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    const k = parseInt(kcal, 10)
    if (!clean) return setError('Indica o nome do alimento.')
    if (!Number.isFinite(k) || k <= 0) return setError('Indica as calorias (número positivo).')
    const problem = validate(clean, k)
    if (problem) return setError(problem)
    setBusy(true)
    try {
      await onSubmit(clean, k, applyToHistory)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form ref={ref} className="food-editor" onSubmit={handleSubmit}>
      <h2 className="food-editor-title">{title}</h2>
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
          <span>kcal</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            placeholder="ex. 79"
          />
        </label>
      </div>
      {historyCount > 0 && (
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
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'A guardar…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

interface Props {
  foods: FoodListItem[]
  onPick: (food: { name: string; kcal: number }) => void
  onAdd: (name: string, kcal: number) => void
  onEdit: (
    item: FoodListItem,
    name: string,
    kcal: number,
    applyToHistory: boolean,
  ) => Promise<number>
  onRemove: (item: FoodListItem) => void
  onToast: (msg: string) => void
}

export function FoodList({ foods, onPick, onAdd, onEdit, onRemove, onToast }: Props) {
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

  function findDuplicate(name: string, kcal: number, except?: FoodListItem) {
    const key = foodKey(name, kcal)
    return foods.find((f) => f !== except && f.key === key)
  }

  function handleRemove(item: FoodListItem) {
    const extra =
      item.count > 0
        ? `\n\nOs ${item.count} ${item.count === 1 ? 'registo' : 'registos'} nos dias anteriores ficam intactos.`
        : ''
    const ok = window.confirm(`Remover «${item.name}» (${item.kcal} kcal) da Lista?${extra}`)
    if (!ok) return
    if (editingKey === item.key) setEditingKey(null)
    onRemove(item)
    onToast('Removido da Lista')
  }

  return (
    <div className="food-list-view">
      <h1 className="page-title">Lista</h1>
      <p className="hint">
        Toca num alimento para o adicionar. ✎ edita, ✕ remove só da Lista (o histórico fica).
      </p>

      {adding ? (
        <FoodEditor
          title="Novo alimento"
          submitLabel="Guardar na Lista"
          validate={(n, k) =>
            findDuplicate(n, k) ? 'Esse alimento já está na Lista.' : null
          }
          onCancel={() => setAdding(false)}
          onSubmit={(n, k) => {
            onAdd(n, k)
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
                  historyCount={f.count}
                  submitLabel="Guardar"
                  validate={() => null}
                  onCancel={() => setEditingKey(null)}
                  onSubmit={async (n, k, apply) => {
                    const merged = findDuplicate(n, k, f)
                    const changed = await onEdit(f, n, k, apply)
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
                  onClick={() => onPick({ name: f.name, kcal: f.kcal })}
                  aria-label={`Adicionar ${f.name}, ${f.kcal} kcal`}
                >
                  <div className="food-list-left">
                    <span className="food-list-name">{f.name}</span>
                    <span className="food-list-count">{countLabel(f.count)}</span>
                  </div>
                  <span className="food-list-kcal">
                    {f.kcal}
                    <span className="food-list-kcal-unit"> kcal</span>
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
