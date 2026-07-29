import { useState } from 'react'
import { usePeople } from '../hooks/usePeople'
import { PersonForm, type PersonFormValues } from '../components/people/PersonForm'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import { PEOPLE_ROLE_LABELS } from '../constants/people'
import type { Person } from '../types'

export function PeoplePage() {
  const { people, loading, error, createPerson, updatePerson, deletePerson } = usePeople()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Person | undefined>(undefined)

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const openEdit = (person: Person) => {
    setEditing(person)
    setModalOpen(true)
  }

  const handleSubmit = async (values: PersonFormValues) => {
    if (editing) {
      const { authUid: _authUid, ...rest } = values
      await updatePerson(editing.id, rest)
    } else {
      await createPerson({ ...values, authUid: values.authUid ?? '' })
    }
    setModalOpen(false)
  }

  const handleDelete = async (person: Person) => {
    if (!confirm(`Remove "${person.fullName}" from People? This cannot be undone.`)) return
    await deletePerson(person.id)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-charcoal">People</h1>
        <Button onClick={openCreate}>+ Add person</Button>
      </div>

      <ErrorNotice message={error} />

      {loading ? (
        <p className="text-base text-gray-500">Loading…</p>
      ) : people.length === 0 ? (
        <p className="text-base text-gray-500">No one added yet. Add staff and contractors so you can assign tasks to them.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-base">
            <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Contact</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {people.map((person) => (
                <tr key={person.id}>
                  <td className="px-4 py-3 font-medium text-charcoal">{person.fullName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {person.email || '—'}
                    {person.phone ? ` · ${person.phone}` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{PEOPLE_ROLE_LABELS[person.role] ?? person.role}</td>
                  <td className="px-4 py-3">
                    <Badge tone={person.active ? 'green' : 'neutral'}>{person.active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(person)}
                      className="mr-1 min-h-[44px] px-2 text-base font-medium text-regal hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(person)}
                      className="min-h-[44px] px-2 text-base font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit person' : 'Add person'}>
        <PersonForm initial={editing} onCancel={() => setModalOpen(false)} onSubmit={handleSubmit} />
      </Modal>
    </div>
  )
}
