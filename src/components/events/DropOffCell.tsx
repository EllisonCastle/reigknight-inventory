import { useEffect, useState } from 'react'

/** Inline-editable drop-off location — saves on blur, only when changed. */
export function DropOffCell({ value, onSave }: { value: string; onSave: (next: string) => void }) {
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(value)
  }, [value, focused])

  const handleBlur = () => {
    setFocused(false)
    const trimmed = draft.trim()
    if (trimmed !== value) onSave(trimmed)
  }

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      placeholder="—"
      className="min-h-[36px] w-full min-w-[120px] rounded-md border border-transparent bg-transparent px-1.5 text-sm text-gray-600 hover:border-gray-300 focus:border-regal focus:bg-white focus:outline-none focus:ring-1 focus:ring-regal"
    />
  )
}
