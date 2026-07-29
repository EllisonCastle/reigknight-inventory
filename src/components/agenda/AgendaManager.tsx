import { useMemo, useState } from 'react'
import { useAgendaItemsForEvent } from '../../hooks/useAgendaItems'
import { AgendaItemForm, type AgendaItemFormValues } from './AgendaItemForm'
import { AgendaTimeline } from './AgendaTimeline'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ErrorNotice } from '../ui/ErrorNotice'
import { exportGuestAgendaPdf, exportWorkingAgendaPdf } from '../../lib/agendaPdf'
import type { AgendaItemDoc, EventDoc, Person, VendorDoc } from '../../types'

interface AgendaManagerProps {
  event: EventDoc
  venueName: string
  people: Person[]
  vendors: VendorDoc[]
}

type Tab = 'guest' | 'working'

export function AgendaManager({ event, venueName, people, vendors }: AgendaManagerProps) {
  const { agendaItems, loading, error, createAgendaItem, updateAgendaItem, deleteAgendaItem, moveUp, moveDown } =
    useAgendaItemsForEvent(event.id)
  const [tab, setTab] = useState<Tab>('working')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AgendaItemDoc | undefined>(undefined)

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const vendorsById = useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors])

  const guestItems = useMemo(() => agendaItems.filter((a) => a.isPublic), [agendaItems])

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const openEdit = (item: AgendaItemDoc) => {
    setEditing(item)
    setModalOpen(true)
  }

  const handleSubmit = async (values: AgendaItemFormValues) => {
    if (editing) {
      await updateAgendaItem(editing.id, values)
    } else {
      await createAgendaItem({ ...values, eventId: event.id })
    }
    setModalOpen(false)
  }

  const handleDelete = async (item: AgendaItemDoc) => {
    if (!confirm(`Delete agenda item "${item.title}"? This cannot be undone.`)) return
    await deleteAgendaItem(item.id)
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-charcoal">Agendas</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => exportGuestAgendaPdf(event, venueName, agendaItems)}
            disabled={guestItems.length === 0}
          >
            Guest PDF
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportWorkingAgendaPdf(event, venueName, agendaItems, peopleById, vendorsById)}
            disabled={agendaItems.length === 0}
          >
            Working PDF
          </Button>
          <Button onClick={openCreate}>+ Add item</Button>
        </div>
      </div>

      <ErrorNotice message={error} />

      <div className="mb-4 flex border-b border-gray-200">
        <button
          onClick={() => setTab('guest')}
          className={`min-h-[44px] flex-1 border-b-2 text-base font-medium ${
            tab === 'guest' ? 'border-regal text-regal' : 'border-transparent text-gray-500'
          }`}
        >
          Guest agenda
        </button>
        <button
          onClick={() => setTab('working')}
          className={`min-h-[44px] flex-1 border-b-2 text-base font-medium ${
            tab === 'working' ? 'border-regal text-regal' : 'border-transparent text-gray-500'
          }`}
        >
          Working agenda
        </button>
      </div>

      {loading ? (
        <p className="text-base text-gray-500">Loading…</p>
      ) : tab === 'guest' ? (
        <AgendaTimeline
          items={guestItems}
          peopleById={peopleById}
          vendorsById={vendorsById}
          showGuestBadge={false}
          grouped={false}
          onEdit={openEdit}
          onDelete={handleDelete}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
        />
      ) : (
        <AgendaTimeline
          items={agendaItems}
          peopleById={peopleById}
          vendorsById={vendorsById}
          showGuestBadge
          grouped
          onEdit={openEdit}
          onDelete={handleDelete}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit agenda item' : 'Add agenda item'} wide>
        <AgendaItemForm
          initial={editing}
          people={people}
          vendors={vendors}
          defaultIsPublic={tab === 'guest'}
          showNotes={tab === 'working'}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  )
}
