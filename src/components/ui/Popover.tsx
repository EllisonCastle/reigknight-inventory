import { useEffect, useRef, type ReactNode } from 'react'

interface PopoverProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

/** Anchored dropdown panel — closes on outside click or Escape. Render inside a `relative` wrapper next to its trigger. */
export function Popover({ open, onClose, children, className = '' }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={`absolute right-0 top-full z-40 mt-2 w-80 max-w-[90vw] rounded-lg border border-gray-200 bg-white p-4 shadow-xl ${className}`}
    >
      {children}
    </div>
  )
}
