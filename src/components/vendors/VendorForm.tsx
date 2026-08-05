import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, Select, TextArea } from '../ui/Field'
import { useSaveFlash } from '../../hooks/useSaveFlash'
import { VENDOR_TYPES, VENDOR_TYPE_LABELS } from '../../constants/vendors'
import type { VendorDoc } from '../../types'

export interface VendorFormValues {
  name: string
  contact: string
  phone: string
  email: string
  notes: string
  website: string
  vendorType: string
  preferred: boolean
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
  const [website, setWebsite] = useState(initial?.website ?? '')
  const [vendorType, setVendorType] = useState(initial?.vendorType ?? '')
  const [preferred, setPreferred] = useState(initial?.preferred ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { saved, flash } = useSaveFlash()

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
        website: website.trim(),
        vendorType,
        preferred,
      })
      flash(onCancel)
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Type (optional)">
          <Select value={vendorType} onChange={(e) => setVendorType(e.target.value)}>
            <option value="">None</option>
            {VENDOR_TYPES.map((t) => (
              <option key={t} value={t}>
                {VENDOR_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Website (optional)">
          <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
        </FormRow>
      </div>
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

      <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-base text-charcoal">
        <input type="checkbox" checked={preferred} onChange={(e) => setPreferred(e.target.checked)} className="h-5 w-5" />
        <span aria-hidden="true">★</span> Preferred vendor
      </label>

      {error && <p className="text-base text-red-600">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || saved}>
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save vendor'}
        </Button>
      </div>
    </form>
  )
}
