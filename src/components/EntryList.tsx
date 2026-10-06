import { useEffect, useState } from 'react'
import type { FoodEntry } from '../types'
import { foodKey } from '../lib/foodCatalog'
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

  useEffect(() => {
    if (!lightbox) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [lightbox])

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
              {photoUrl && (
                <button
                  type="button"
                  className="entry-thumb-btn"
                  onClick={() => setLightbox({ url: photoUrl, name: e.name })}
                  aria-label={`Ver foto de ${e.name}`}
                >
                  <img src={photoUrl} alt="" className="entry-thumb" />
                </button>
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
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${lightbox.name}`}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="photo-lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Fechar"
          >
            ✕
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.name}
            className="photo-lightbox-img"
            onClick={(ev) => ev.stopPropagation()}
          />
          <p className="photo-lightbox-caption">{lightbox.name}</p>
        </div>
      )}
    </>
  )
}
