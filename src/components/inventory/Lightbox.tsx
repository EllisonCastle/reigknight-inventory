import { useEffect } from 'react'
import type { InventoryPhoto } from '../../types'

interface LightboxProps {
  photos: InventoryPhoto[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

export function Lightbox({ photos, index, onIndexChange, onClose }: LightboxProps) {
  const hasMultiple = photos.length > 1

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (hasMultiple && e.key === 'ArrowRight') onIndexChange((index + 1) % photos.length)
      if (hasMultiple && e.key === 'ArrowLeft') onIndexChange((index - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hasMultiple, index, onIndexChange, onClose, photos.length])

  const photo = photos[index]
  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-2xl leading-none text-white"
      >
        ✕
      </button>

      <img
        src={photo.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[92vw] object-contain"
      />

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange((index - 1 + photos.length) % photos.length)
            }}
            aria-label="Previous photo"
            className="absolute left-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white sm:left-3"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange((index + 1) % photos.length)
            }}
            aria-label="Next photo"
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white sm:right-3"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {index + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  )
}
