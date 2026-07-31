import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import type { Person } from '../../types'

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  mentionedIds: string[]
  onMentionedIdsChange: (ids: string[]) => void
  people: Person[]
  placeholder?: string
  rows?: number
  maxLength?: number
  className?: string
  /** Called on Enter-without-Shift, but only when no mention suggestion list is open. */
  onSubmitShortcut?: () => void
}

interface ActiveMention {
  start: number
  query: string
}

function findActiveMention(text: string, cursor: number): ActiveMention | null {
  const upToCursor = text.slice(0, cursor)
  const at = upToCursor.lastIndexOf('@')
  if (at === -1) return null
  if (at > 0 && !/\s/.test(upToCursor[at - 1])) return null
  const query = upToCursor.slice(at + 1)
  if (/\s/.test(query)) return null
  return { start: at, query }
}

/** Textarea with @-mention autocomplete over admin/staff users (people with logins). */
export function MentionTextarea({
  value,
  onChange,
  mentionedIds,
  onMentionedIdsChange,
  people,
  placeholder,
  rows = 1,
  maxLength,
  className,
  onSubmitShortcut,
}: MentionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [activeMention, setActiveMention] = useState<ActiveMention | null>(null)
  const [highlighted, setHighlighted] = useState(0)

  const suggestions = useMemo(() => {
    if (!activeMention) return []
    const q = activeMention.query.toLowerCase()
    return people.filter((p) => p.fullName.toLowerCase().includes(q)).slice(0, 6)
  }, [activeMention, people])

  const updateMentionState = (text: string, cursor: number) => {
    setActiveMention(findActiveMention(text, cursor))
    setHighlighted(0)
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value
    onChange(next)
    updateMentionState(next, e.target.selectionStart ?? next.length)

    const stillPresent = mentionedIds.filter((id) => {
      const person = people.find((p) => p.id === id)
      return person && next.includes(`@${person.fullName}`)
    })
    if (stillPresent.length !== mentionedIds.length) onMentionedIdsChange(stillPresent)
  }

  const selectPerson = (person: Person) => {
    if (!activeMention || !ref.current) return
    const cursor = ref.current.selectionStart ?? value.length
    const before = value.slice(0, activeMention.start)
    const after = value.slice(cursor)
    const inserted = `@${person.fullName} `
    const next = `${before}${inserted}${after}`
    onChange(next)
    onMentionedIdsChange([...new Set([...mentionedIds, person.id])])
    setActiveMention(null)
    const pos = before.length + inserted.length
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.selectionStart = ref.current.selectionEnd = pos
        ref.current.focus()
      }
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (activeMention && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlighted((h) => (h + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlighted((h) => (h - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        selectPerson(suggestions[highlighted])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setActiveMention(null)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && onSubmitShortcut) {
      e.preventDefault()
      onSubmitShortcut()
    }
  }

  return (
    <div className="relative flex-1">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => updateMentionState(value, e.currentTarget.selectionStart ?? value.length)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={className}
      />
      {activeMention && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-56 max-w-[90vw] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {suggestions.map((person, i) => (
            <button
              key={person.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                selectPerson(person)
              }}
              className={`block min-h-[44px] w-full px-3 py-2 text-left text-base ${
                i === highlighted ? 'bg-regal-light text-regal' : 'text-charcoal hover:bg-surface'
              }`}
            >
              {person.fullName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
