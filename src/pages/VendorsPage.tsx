import { useMemo, useState } from 'react'
import { useVendors } from '../hooks/useVendors'
import { VendorForm, type VendorFormValues } from '../components/vendors/VendorForm'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import { FormRow, Select } from '../components/ui/Field'
import { VENDOR_TYPES, VENDOR_TYPE_LABELS } from '../constants/vendors'
import type { VendorDoc } from '../types'

export function VendorsPage() {
  const { vendors, loading, error, createVendor, updateVendor, deleteVendor, findAssignedAgendaItems } = useVendors()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VendorDoc | undefined>(undefined)

  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [reassignVendor, setReassignVendor] = useState<VendorDoc | null>(null)
  const [assignedCount, setAssignedCount] = useState(0)
  const [reassignToId, setReassignToId] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [typeFilter, setTypeFilter] = useState('')
  const [preferredOnly, setPreferredOnly] = useState(false)

  const filteredVendors = useMemo(() => {
    const filtered = vendors.filter((v) => {
      if (typeFilter && v.vendorType !== typeFilter) return false
      if (preferredOnly && !v.preferred) return false
      return true
    })
    // Preferred vendors stand out first — useful once a large vendor list is imported later.
    return [...filtered].sort((a, b) => {
      if (Boolean(a.preferred) !== Boolean(b.preferred)) return a.preferred ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [vendors, typeFilter, preferredOnly])

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const openEdit = (vendor: VendorDoc) => {
    setEditing(vendor)
    setModalOpen(true)
  }

  const handleSubmit = async (values: VendorFormValues) => {
    if (editing) {
      await updateVendor(editing.id, values)
    } else {
      await createVendor(values)
    }
  }

  const handleDeleteClick = async (vendor: VendorDoc) => {
    setCheckingId(vendor.id)
    try {
      const assigned = await findAssignedAgendaItems(vendor.id)
      if (assigned.length === 0) {
        if (confirm(`Remove "${vendor.name}"? This cannot be undone.`)) {
          await deleteVendor(vendor.id, null)
        }
      } else {
        setAssignedCount(assigned.length)
        setReassignToId('')
        setReassignVendor(vendor)
      }
    } finally {
      setCheckingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!reassignVendor) return
    setDeleting(true)
    try {
      await deleteVendor(reassignVendor.id, reassignToId || null)
      setReassignVendor(null)
    } finally {
      setDeleting(false)
    }
  }

  const otherVendors = vendors.filter((v) => v.id !== reassignVendor?.id)

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-charcoal">Vendors</h1>
        <Button onClick={openCreate}>+ Add vendor</Button>
      </div>

      <ErrorNotice message={error} />

      {vendors.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-56">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {VENDOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {VENDOR_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-base text-charcoal">
            <input
              type="checkbox"
              checked={preferredOnly}
              onChange={(e) => setPreferredOnly(e.target.checked)}
              className="h-5 w-5"
            />
            Preferred only
          </label>
        </div>
      )}

      {loading ? (
        <p className="text-base text-gray-500">Loading…</p>
      ) : vendors.length === 0 ? (
        <p className="text-base text-gray-500">No vendors yet. Add outside contractors so you can assign agenda items to them.</p>
      ) : filteredVendors.length === 0 ? (
        <p className="text-base text-gray-500">No vendors match.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-base">
            <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Contact</th>
                <th className="px-4 py-2.5">Phone / email</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td className="px-4 py-3 font-medium text-charcoal">
                    {vendor.preferred && (
                      <span title="Preferred vendor" aria-label="Preferred vendor" className="mr-1 text-amber-500">
                        ★
                      </span>
                    )}
                    {vendor.name}
                  </td>
                  <td className="px-4 py-3">
                    {vendor.vendorType ? (
                      <Badge tone="regal">{VENDOR_TYPE_LABELS[vendor.vendorType as keyof typeof VENDOR_TYPE_LABELS] ?? vendor.vendorType}</Badge>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{vendor.contact || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {vendor.phone || '—'}
                    {vendor.email ? ` · ${vendor.email}` : ''}
                    {vendor.website ? (
                      <>
                        {' · '}
                        <a
                          href={vendor.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-regal hover:underline"
                        >
                          Website
                        </a>
                      </>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(vendor)}
                      className="mr-1 min-h-[44px] px-2 text-base font-medium text-regal hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(vendor)}
                      disabled={checkingId === vendor.id}
                      className="min-h-[44px] px-2 text-base font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      {checkingId === vendor.id ? 'Checking…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit vendor' : 'Add vendor'}>
        <VendorForm initial={editing} onCancel={() => setModalOpen(false)} onSubmit={handleSubmit} />
      </Modal>

      <Modal open={reassignVendor !== null} onClose={() => setReassignVendor(null)} title="Reassign agenda items">
        <div className="flex flex-col gap-4">
          <p className="text-base text-gray-700">
            {assignedCount} agenda item{assignedCount === 1 ? ' is' : 's are'} currently assigned to{' '}
            <span className="font-medium text-charcoal">{reassignVendor?.name}</span>. Reassign{' '}
            {assignedCount === 1 ? 'it' : 'them'} to another vendor, or clear the assignment, before deleting.
          </p>
          <FormRow label="Reassign to">
            <Select value={reassignToId} onChange={(e) => setReassignToId(e.target.value)}>
              <option value="">Clear assignment (no vendor)</option>
              {otherVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </FormRow>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setReassignVendor(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={deleting} onClick={handleConfirmDelete}>
              {deleting ? 'Deleting…' : 'Reassign and delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
