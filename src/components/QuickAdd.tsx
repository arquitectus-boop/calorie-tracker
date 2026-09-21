interface FoodChip {
  name: string
  kcal: number
  count?: number
}

interface Props {
  recent: FoodChip[]
  frequent: FoodChip[]
  onPick: (food: { name: string; kcal: number }) => void
}

export function QuickAdd({ recent, frequent, onPick }: Props) {
  const hasRecent = recent.length > 0
  const hasFrequent = frequent.length > 0
  if (!hasRecent && !hasFrequent) return null

  return (
    <div className="quick-add">
      {hasRecent && (
        <section>
          <h3 className="section-label">Recentes</h3>
          <div className="chip-row">
            {recent.map((f) => (
              <button
                key={`r-${f.name}-${f.kcal}`}
                type="button"
                className="chip"
                onClick={() => onPick(f)}
              >
                <span className="chip-kcal">{f.kcal}</span>
                <span className="chip-name">{f.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {hasFrequent && (
        <section>
          <h3 className="section-label">Frequentes</h3>
          <div className="chip-row">
            {frequent.slice(0, 10).map((f) => (
              <button
                key={`f-${f.name}-${f.kcal}`}
                type="button"
                className="chip"
                onClick={() => onPick(f)}
              >
                <span className="chip-kcal">{f.kcal}</span>
                <span className="chip-name">{f.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
