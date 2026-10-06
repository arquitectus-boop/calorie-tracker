import { useEffect } from 'react'

interface Props {
  url: string
  name: string
  onClose: () => void
}

/** Fullscreen photo viewer shared by Hoje/histórico and Lista. */
export function PhotoLightbox({ url, name, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto de ${name}`}
      onClick={onClose}
    >
      <button
        type="button"
        className="photo-lightbox-close"
        onClick={(ev) => {
          ev.stopPropagation()
          onClose()
        }}
        aria-label="Fechar"
      >
        ✕
      </button>
      <img
        src={url}
        alt={name}
        className="photo-lightbox-img"
        onClick={(ev) => ev.stopPropagation()}
      />
      <p className="photo-lightbox-caption">{name}</p>
    </div>
  )
}
