import { useMemo, useState } from 'react'

export interface FoodListItem {
  name: string
  kcal: number
  count: number
}

interface Props {
  foods: FoodListItem[]
  onPick: (food: { name: string; kcal: number }) => void
}

export function FoodList({ foods, onPick }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return foods
    return foods.filter((f) => f.name.toLowerCase().includes(q))
  }, [foods, query])

  return (
    <div className="food-list-view">
      <h1 className="page-title">Lista</h1>
      <p className="hint">Alimentos do teu histórico, ordenados por frequência.</p>

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

      {foods.length === 0 ? (
        <p className="empty-state">Ainda não há alimentos no histórico.</p>
      ) : filtered.length === 0 ? (
        <p className="empty-state">Nenhum alimento corresponde à pesquisa.</p>
      ) : (
        <ul className="food-list">
          {filtered.map((f) => (
            <li key={`${f.name.toLowerCase()}|${f.kcal}`}>
              <button
                type="button"
                className="food-list-item"
                onClick={() => onPick({ name: f.name, kcal: f.kcal })}
              >
                <div className="food-list-left">
                  <span className="food-list-name">{f.name}</span>
                  <span className="food-list-count">
                    {f.count}× {f.count === 1 ? 'vez' : 'vezes'}
                  </span>
                </div>
                <span className="food-list-kcal">
                  {f.kcal}
                  <span className="food-list-kcal-unit"> kcal</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
