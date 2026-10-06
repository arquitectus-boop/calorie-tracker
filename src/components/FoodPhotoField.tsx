import { useRef } from 'react'

interface Props {
  previewUrl?: string
  photoBusy?: boolean
  disabled?: boolean
  onFile: (file: File) => void
  onRemove: () => void
}

/** Câmara / galeria / pré-visualização / remover — partilhado entre Lista e Adicionar. */
export function FoodPhotoField({
  previewUrl,
  photoBusy = false,
  disabled = false,
  onFile,
  onRemove,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const locked = disabled || photoBusy

  return (
    <div className="food-photo-block">
      {previewUrl ? (
        <div className="food-photo-preview-wrap">
          <img src={previewUrl} alt="Foto do alimento" className="food-photo-preview" />
          <button
            type="button"
            className="btn btn-ghost food-photo-remove"
            onClick={onRemove}
            disabled={locked}
          >
            Remover foto
          </button>
        </div>
      ) : (
        <div className="food-photo-preview-wrap">
          <span className="food-photo-preview food-photo-preview-empty" aria-hidden>
            🍽
          </span>
          <p className="food-photo-empty">Sem foto (opcional)</p>
        </div>
      )}
      <div className="food-photo-actions">
        <button
          type="button"
          className="btn btn-ghost food-photo-btn"
          disabled={locked}
          onClick={() => cameraRef.current?.click()}
        >
          {photoBusy ? 'A processar…' : '📷 Câmara'}
        </button>
        <button
          type="button"
          className="btn btn-ghost food-photo-btn"
          disabled={locked}
          onClick={() => galleryRef.current?.click()}
        >
          Galeria
        </button>
      </div>
      {/* capture=environment → câmara traseira no iPhone Safari */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="food-photo-input"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onFile(file)
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
          if (file) onFile(file)
        }}
      />
    </div>
  )
}
