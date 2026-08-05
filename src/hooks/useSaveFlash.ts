import { useEffect, useRef, useState } from 'react'

/**
 * Shows a brief "Saved ✓" confirmation on a Save button before an optional
 * follow-up (e.g. closing a modal) runs, instead of an instant silent close.
 */
export function useSaveFlash(durationMs = 1500) {
  const [saved, setSaved] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const flash = (onDone?: () => void) => {
    setSaved(true)
    timeoutRef.current = setTimeout(() => {
      setSaved(false)
      onDone?.()
    }, durationMs)
  }

  return { saved, flash }
}
