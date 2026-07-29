import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, Label, Select, TextArea } from '../ui/Field'
import { ASSIGNEE_TYPES, ASSIGNEE_TYPE_LABELS } from '../../constants/agenda'
import { localInputToTimestamp, timestampToLocalInput } from '../../lib/datetime'
import type { AgendaItemDoc, Person, VendorDoc } from '../../types'
import type { AssigneeType } from '../../constants/agenda'

export interface AgendaItemFormValues {
  title: string
  description: string
  startAt: ReturnType<typeof localInputToTimestamp>
  endAt: ReturnType<typeof localInputToTimestamp> | null
  location: string
  assigneeType: AssigneeType
  assigneePersonId: string | null
  assigneeVendorId: string | null
  isPublic: boolean
  notes: string
}

interface AgendaItemFormProps {
  initial?: AgendaItemDoc
  people: Person[]
  vendors: VendorDoc[]
  defaultIsPublic: boolean
  showNotes: boolean
  onCancel: () => void
  onSubmit: (values: AgendaItemFormValues) => Promise<void>
}

export function AgendaItemForm({ initial, people, vendors, defaultIsPublic, showNotes, onCancel, onSubmit }: AgendaItemFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [startAt, setStartAt] = useState(initial ? timestampToLocalInput(initial.startAt) : '')
  const [hasEndAt, setHasEndAt] = useState(Boolean(initial?.endAt))
  const [endAt, setEndAt] = useState(initial?.endAt ? timestampToLocalInput(initial.endAt) : '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [assigneeType, setAssigneeType] = useState<AssigneeType>(initial?.assigneeType ?? 'none')
  const [assigneePersonId, setAssigneePersonId] = useState(initial?.assigneePersonId ?? people[0]?.id ?? '')
  const [assigneeVendorId, setAssigneeVendorId] = useState(initial?.assigneeVendorId ?? vendors[0]?.id ?? '')
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? defaultIsPublic)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activePeople = people.filter((p) => p.active)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!startAt) {
      setError('Start time is required.')
      return
    }
    if (hasEndAt && endAt) {
      const startTs = localInputToTimestamp(startAt)
      const endTs = localInputToTimestamp(endAt)
      if (endTs.toMillis() <= startTs.toMillis()) {
        setError('End must be after start.')
        return
      }
    }
    if (assigneeType === 'person' && !assigneePersonId) {
      setError('Choose a person.')
      return
    }
    if (assigneeType === 'vendor' && !assigneeVendorId) {
      setError('Choose a vendor.')
      return
    }

    setError('')
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        startAt: localInputToTimestamp(startAt),
        endAt: hasEndAt && endAt ? localInputToTimestamp(endAt) : null,
        location: location.trim(),
        assigneeType,
        assigneePersonId: assigneeType === 'person' ? assigneePersonId : null,
        assigneeVendorId: assigneeType === 'vendor' ? assigneeVendorId : null,
        isPublic,
        notes: notes.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormRow label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </FormRow>

      <FormRow label="Description">
        <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormRow>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Start">
          <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
        </FormRow>
        <div>
          <Label>End (optional)</Label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasEndAt}
              onChange={(e) => setHasEndAt(e.target.checked)}
              className="h-5 w-5 shrink-0"
              aria-label="Has an end time"
            />
            <Input
              type="datetime-local"
              value={endAt}
              disabled={!hasEndAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={!hasEndAt ? 'opacity-50' : ''}
            />
          </div>
        </div>
      </div>

      <FormRow label="Location">
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Loading dock, Great Hall…" />
      </FormRow>

      <div>
        <Label>Assignee</Label>
        <div className="flex flex-wrap gap-4">
          {ASSIGNEE_TYPES.map((t) => (
            <label key={t} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-base text-charcoal">
              <input
                type="radio"
                name="assigneeType"
                checked={assigneeType === t}
                onChange={() => setAssigneeType(t)}
                className="h-5 w-5"
              />
              {ASSIGNEE_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
        {assigneeType === 'person' && (
          <div className="mt-2">
            {activePeople.length === 0 ? (
              <p className="text-base text-gray-500">No active people yet — add some on the People page.</p>
            ) : (
              <Select value={assigneePersonId} onChange={(e) => setAssigneePersonId(e.target.value)}>
                {activePeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}
        {assigneeType === 'vendor' && (
          <div className="mt-2">
            {vendors.length === 0 ? (
              <p className="text-base text-gray-500">No vendors yet — add some on the Vendors page.</p>
            ) : (
              <Select value={assigneeVendorId} onChange={(e) => setAssigneeVendorId(e.target.value)}>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-base text-charcoal">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-5 w-5" />
        Show on guest agenda
      </label>

      {showNotes && (
        <FormRow label="Notes (private — never shown to guests)">
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormRow>
      )}

      {error && <p className="text-base text-red-600">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add item'}
        </Button>
      </div>
    </form>
  )
}
