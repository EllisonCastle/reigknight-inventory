import { useRef, useState } from 'react'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { Button } from '../ui/Button'
import type { InventoryPhoto } from '../../types'

interface PhotoUploaderProps {
  itemId: string
  photos: InventoryPhoto[]
  onChange: (photos: InventoryPhoto[]) => void | Promise<void>
}

export function PhotoUploader({ itemId, photos, onChange }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    try {
      const uploaded: InventoryPhoto[] = []
      let sortOrder = photos.length
      for (const file of Array.from(files)) {
        const path = `inventory/${itemId}/${crypto.randomUUID()}-${file.name}`
        const objRef = storageRef(storage, path)
        await uploadBytes(objRef, file)
        const url = await getDownloadURL(objRef)
        uploaded.push({ url, path, isPrimary: false, sortOrder: sortOrder++ })
      }
      const next = [...photos, ...uploaded]
      if (!next.some((p) => p.isPrimary) && next.length > 0) next[0].isPrimary = true
      await onChange(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const setPrimary = async (index: number) => {
    const next = photos.map((p, i) => ({ ...p, isPrimary: i === index }))
    await onChange(next)
  }

  const removePhoto = async (index: number) => {
    const photo = photos[index]
    try {
      await deleteObject(storageRef(storage, photo.path))
    } catch {
      // object may already be gone; proceed to remove the reference regardless
    }
    const next = photos.filter((_, i) => i !== index)
    if (photo.isPrimary && next.length > 0) next[0].isPrimary = true
    await onChange(next)
  }

  return (
    <div>
      {photos.length > 0 && (
        <div className="mb-3 grid grid-cols-4 gap-2">
          {photos.map((photo, index) => (
            <div key={photo.path} className="group relative overflow-hidden rounded-md border border-gray-200">
              <img src={photo.url} alt="" className="h-20 w-full object-cover" />
              {photo.isPrimary && (
                <span className="absolute left-1 top-1 rounded bg-regal px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/40 py-1 opacity-0 group-hover:opacity-100">
                {!photo.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(index)}
                    className="text-[10px] font-medium text-white hover:underline"
                  >
                    Make primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="text-[10px] font-medium text-white hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        id={`photo-upload-${itemId}`}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Uploading…' : '+ Add photos'}
      </Button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
