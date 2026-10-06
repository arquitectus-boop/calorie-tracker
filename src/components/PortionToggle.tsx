import type { PortionType } from '../types'

interface Props {
  value: PortionType
  onChange: (value: PortionType) => void
}

const OPTIONS: { id: PortionType; label: string }[] = [
  { id: 'unit', label: 'Unidade' },
  { id: 'per100g', label: 'Por 100 g' },
]

export function PortionToggle({ value, onChange }: Props) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Tipo de porção">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={value === o.id ? 'segmented-btn active' : 'segmented-btn'}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
