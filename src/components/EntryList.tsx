import { useCallback, useState } from 'react'
import type { FoodEntry } from '../types'
import { foodKey } from '../lib/foodCatalog'
import { FoodPhotoPlaceholder } from './FoodPhotoPlaceholder'
import { PhotoLightbox } from './PhotoLightbox'
import { entryLineTotal, entryPortionLabel, formatNumber, portionOf } from '../lib/portion'

interface Props {
  entries: FoodEntry[]
  /** foodKey(name|kcal|portion) → photo data URL from Lista catalog */
  photoByKey?: Record<string, string>
  onEdit: (entry: FoodEntry) => void
  onDelete: (entry: FoodEntry) => void
}

interface LightboxState {
  url: string
  name: string
}

export function EntryList({ entries, photoByKey = {}, onEdit, onDelete }: Props) {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)

  const closeLightbox = useCallback(() => setLightbox(null), [])

  if (entries.length === 0) {
    return (
      <p className="empty-state">
        Ainda sem registos. Toca em <strong>+</strong> para adicionar.
      </p>
    )
  }

  return (
    <>
      <ul className="entry-list">
        {entries.map((e) => {
          const line = entryLineTotal(e)
          const portion = entryPortionLabel(e)
          const photoUrl = photoByKey[foodKey(e.name, e.kcal, portionOf(e))]
          return (
            <li key={e.id} className="entry-item">
              {photoUrl ? (
                <button
                  type="button"
                  className="entry-thumb-btn"
                  onClick={() => setLightbox({ url: photoUrl, name: e.name })}
                  aria-label={`Ver foto de ${e.name}`}
                >
                  <img src={photoUrl} alt="" className="entry-thumb" />
                </button>
              ) : (
                <span className="entry-thumb-btn" aria-hidden>
                  <FoodPhotoPlaceholder className="entry-thumb entry-thumb-empty" />
                </span>
              )}
              <button
                type="button"
                className="entry-main"
                onClick={() => onEdit(e)}
                aria-label={`Editar ${e.name}`}
              >
                <span className="entry-kcal">
                  {formatNumber(line)}
                  <span className="entry-kcal-unit"> kcal</span>
                </span>
                <span className="entry-body">
                  <span className="entry-name">{e.name}</span>
                  {portion && <span className="entry-qty">{portion}</span>}
                </span>
              </button>
              <button
                type="button"
                className="entry-delete"
                onClick={() => onDelete(e)}
                aria-label={`Apagar ${e.name}`}
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>

      {lightbox && (
        <PhotoLightbox url={lightbox.url} name={lightbox.name} onClose={closeLightbox} />
      )}
    </>
  )
}
