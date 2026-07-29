import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, Select } from '../ui/Field'
import { PEOPLE_ROLES, PEOPLE_ROLE_LABELS } from '../../constants/people'
import type { Person } from '../../types'

export interface PersonFormValues {
  fullName: string
  email: string
  phone: string
  role: Person['role']
  active: boolean
}

interface PersonFormProps {
  initial?: Person
  onCancel: () => void
  onSubmit: (values: PersonFormValues) => Promise<void>
}

export function PersonForm({ initial, onCancel, onSubmit }: PersonFormProps) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [role, setRole] = useState<Person['role']>(initial?.role ?? 'contractor')
  const [active, setActive] = useState(initial?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setError('Name is required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSubmit({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), role, active })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormRow label="Full name">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </FormRow>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormRow>
        <FormRow label="Phone">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormRow>
      </div>
      <FormRow label="Role">
        <Select value={role} onChange={(e) => setRole(e.target.value as Person['role'])}>
          {PEOPLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {PEOPLE_ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </FormRow>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-base text-charcoal">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5" />
        Active
      </label>

      {error && <p className="text-base text-red-600">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save person'}
        </Button>
      </div>
    </form>
  )
}
