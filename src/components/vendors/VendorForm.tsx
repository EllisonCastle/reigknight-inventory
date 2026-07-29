import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, TextArea } from '../ui/Field'
import type { VendorDoc } from '../../types'

export interface VendorFormValues {
  name: string
  contact: string
  phone: string
  email: string
  notes: string
}

interface VendorFormProps {
  initial?: VendorDoc
  onCancel: () => void
  onSubmit: (values: VendorFormValues) => Promise<void>
}

export function VendorForm({ initial, onCancel, onSubmit }: VendorFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [contact, setContact] = useState(initial?.contact ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Vendor name is required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        contact: contact.trim(),
        phone: phone.trim(),
        email: email.trim(),
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
      <FormRow label="Vendor name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </FormRow>
      <FormRow label="Contact person">
        <Input value={contact} onChange={(e) => setContact(e.target.value)} />
      </FormRow>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Phone">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormRow>
        <FormRow label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormRow>
      </div>
      <FormRow label="Notes">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormRow>

      {error && <p className="text-base text-red-600">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save vendor'}
        </Button>
      </div>
    </form>
  )
}
