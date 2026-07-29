import { useState, type KeyboardEvent } from 'react'
import { Badge } from '../ui/Badge'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const tag = draft.trim()
    if (tag && !value.includes(tag)) {
      onChange([...value, tag])
    }
    setDraft('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 focus-within:border-regal focus-within:ring-1 focus-within:ring-regal">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1">
          <Badge>{tag}</Badge>
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`Remove tag ${tag}`}
            className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-surface hover:text-charcoal"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={value.length === 0 ? (placeholder ?? 'Add a tag and press Enter…') : ''}
        className="min-w-[100px] flex-1 border-none py-1 text-base outline-none"
      />
    </div>
  )
}
