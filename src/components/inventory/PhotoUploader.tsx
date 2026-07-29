import { useEffect, useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { Button } from '../ui/Button'
import type { InventoryPhoto } from '../../types'

interface PhotoUploaderProps {
  itemId: string
  photos: InventoryPhoto[]
  onChange: (photos: InventoryPhoto[]) => void | Promise<void>
  autoOpenCamera?: boolean
}

interface UploadTask {
  id: string
  file: File
  originalSize: number
  compressedSize: number | null
  progress: number
  status: 'compressing' | 'uploading' | 'error'
  error?: string
  path?: string
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function PhotoUploader({ itemId, photos, onChange, autoOpenCamera }: PhotoUploaderProps) {
  const [tasks, setTasks] = useState<UploadTask[]>([])
  const [hasCamera, setHasCamera] = useState(false)
  const [cameraNotice, setCameraNotice] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    setHasCamera(coarsePointer)
    if (autoOpenCamera && coarsePointer) {
      cameraInputRef.current?.click()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateTask = (id: string, patch: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const commitPhoto = async (path: string, url: string) => {
    const next = [...photos, { url, path, isPrimary: photos.length === 0, sortOrder: photos.length }]
    await onChange(next)
  }

  const runUpload = (task: UploadTask) => {
    updateTask(task.id, { status: 'uploading', progress: 0, error: undefined })
    const path = task.path ?? `inventory/${itemId}/${crypto.randomUUID()}-${task.file.name}`
    const objRef = storageRef(storage, path)
    const uploadTask = uploadBytesResumable(objRef, task.file)
    uploadTask.on(
      'state_changed',
      (snap) => {
        const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0
        updateTask(task.id, { progress: pct, path })
      },
      (err) => {
        updateTask(task.id, { status: 'error', error: err.message, path })
      },
      async () => {
        const url = await getDownloadURL(objRef)
        await commitPhoto(path, url)
        setTasks((prev) => prev.filter((t) => t.id !== task.id))
      },
    )
  }

  const processNewFile = async (file: File) => {
    const id = crypto.randomUUID()
    const task: UploadTask = {
      id,
      file,
      originalSize: file.size,
      compressedSize: null,
      progress: 0,
      status: 'compressing',
    }
    setTasks((prev) => [...prev, task])
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1600,
        initialQuality: 0.8,
        useWebWorker: true,
      })
      const compressedTask: UploadTask = { ...task, file: compressed, compressedSize: compressed.size }
      setTasks((prev) => prev.map((t) => (t.id === id ? compressedTask : t)))
      runUpload(compressedTask)
    } catch (err) {
      updateTask(id, { status: 'error', error: err instanceof Error ? err.message : 'Compression failed.' })
    }
  }

  const handleFiles = (files: FileList | null, source: 'camera' | 'library') => {
    if (!files || files.length === 0) {
      if (source === 'camera') {
        setCameraNotice(
          "Didn't get a photo. If your browser blocked camera access, check Settings → Camera permissions for this site — or use Choose from Library instead.",
        )
      }
      return
    }
    setCameraNotice('')
    Array.from(files).forEach((file) => processNewFile(file))
  }

  const handleRetry = (task: UploadTask) => {
    if (task.status === 'error' && task.compressedSize == null) {
      removeTask(task.id)
      processNewFile(task.file)
      return
    }
    runUpload(task)
  }

  const removeTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id))

  const setPrimary = async (index: number) => {
    const next = photos.map((p, i) => ({ ...p, isPrimary: i === index }))
    await onChange(next)
  }

  const removePhoto = async (index: number) => {
    const photo = photos[index]
    try {
      await deleteObject(storageRef(storage, photo.path))
    } catch {
      // object may already be gone; still drop the reference
    }
    const next = photos.filter((_, i) => i !== index)
    if (photo.isPrimary && next.length > 0) next[0].isPrimary = true
    await onChange(next)
  }

  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const next = [...photos]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    setDragIndex(null)
    await onChange(next.map((p, i) => ({ ...p, sortOrder: i })))
  }

  return (
    <div>
      {(photos.length > 0 || tasks.length > 0) && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <div
              key={photo.path}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="group relative overflow-hidden rounded-md border border-gray-200"
            >
              <img src={photo.url} alt="" className="h-28 w-full object-cover" />
              {photo.isPrimary && (
                <span className="absolute left-1 top-1 rounded bg-regal px-1.5 py-0.5 text-sm font-medium text-white">
                  Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/50">
                <button
                  type="button"
                  onClick={() => setPrimary(index)}
                  aria-label="Set as primary"
                  className="flex h-11 w-11 items-center justify-center text-lg text-white"
                >
                  {photo.isPrimary ? '★' : '☆'}
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  aria-label="Remove photo"
                  className="flex h-11 w-11 items-center justify-center text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex min-h-[96px] flex-col justify-between rounded-md border border-gray-200 bg-surface p-2"
            >
              <div className="text-sm text-gray-600">
                {task.status === 'compressing' && 'Compressing…'}
                {task.status === 'uploading' && `Uploading ${task.progress}%`}
                {task.status === 'error' && <span className="text-red-600">Upload failed</span>}
              </div>
              {task.status === 'uploading' && (
                <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                  <div className="h-1.5 rounded-full bg-regal" style={{ width: `${task.progress}%` }} />
                </div>
              )}
              {task.compressedSize != null && (
                <div className="mt-1 text-sm text-gray-500">
                  {formatBytes(task.originalSize)} → {formatBytes(task.compressedSize)}
                </div>
              )}
              {task.status === 'error' && (
                <div className="mt-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleRetry(task)}
                    className="min-h-[44px] text-base font-medium text-regal hover:underline"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTask(task.id)}
                    className="min-h-[44px] text-base font-medium text-red-600 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={(e) => {
          handleFiles(e.target.files, 'camera')
          e.target.value = ''
        }}
        className="hidden"
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          handleFiles(e.target.files, 'library')
          e.target.value = ''
        }}
        className="hidden"
      />

      <div className="flex flex-wrap gap-2">
        {hasCamera && (
          <Button type="button" variant="secondary" onClick={() => cameraInputRef.current?.click()}>
            Take Photo
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={() => libraryInputRef.current?.click()}>
          Choose from Library
        </Button>
      </div>
      {cameraNotice && <p className="mt-2 text-base text-amber-700">{cameraNotice}</p>}
    </div>
  )
}
