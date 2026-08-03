import { useEffect, useState } from 'react'

/** Inline-editable quantity — saves on blur, only when changed. `onSave` can reject/throw to reject the edit (e.g. an availability conflict), in which case the field reverts and shows the error. */
export function QuantityCell({ value, onSave }: { value: number; onSave: (next: number) => Promise<void> }) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  const handleBlur = async () => {
    setFocused(false)
    const next = Math.max(0, Number(draft) || 0)
    if (next === value) return
    setSaving(true)
    setError('')
    try {
      await onSave(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
      setDraft(String(value))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        disabled={saving}
        className="min-h-[36px] w-20 rounded-md border border-transparent bg-transparent px-1.5 text-sm text-gray-600 hover:border-gray-300 focus:border-regal focus:bg-white focus:outline-none focus:ring-1 focus:ring-regal disabled:opacity-50"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
