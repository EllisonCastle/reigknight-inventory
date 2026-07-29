import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Timestamp } from 'firebase/firestore'
import { formatDate } from './datetime'
import type { AgendaItemDoc, EventDoc, Person, VendorDoc } from '../types'

const REGAL_RGB: [number, number, number] = [91, 42, 74]
const CHARCOAL_RGB: [number, number, number] = [31, 35, 40]

function formatTimeOnly(ts: Timestamp): string {
  return ts.toDate().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function timeRange(item: AgendaItemDoc): string {
  return item.endAt ? `${formatTimeOnly(item.startAt)} – ${formatTimeOnly(item.endAt)}` : formatTimeOnly(item.startAt)
}

function sortAgenda(items: AgendaItemDoc[]): AgendaItemDoc[] {
  return [...items].sort((a, b) => {
    const diff = a.startAt.toMillis() - b.startAt.toMillis()
    return diff !== 0 ? diff : a.sortOrder - b.sortOrder
  })
}

function drawHeader(doc: jsPDF, title: string, event: EventDoc, venueName: string, accent: [number, number, number]) {
  doc.setTextColor(...accent)
  doc.setFontSize(18)
  doc.text(event.name, 14, 18)

  doc.setTextColor(...CHARCOAL_RGB)
  doc.setFontSize(11)
  doc.text(`${title} · ${formatDate(event.startAt)} · ${venueName}`, 14, 26)
}

/** Clean, client-facing table: time / item / location only — no assignees, no notes, no working-only items. */
export function exportGuestAgendaPdf(event: EventDoc, venueName: string, items: AgendaItemDoc[]) {
  const doc = new jsPDF()
  drawHeader(doc, 'Guest agenda', event, venueName, REGAL_RGB)

  const publicItems = sortAgenda(items.filter((i) => i.isPublic))

  autoTable(doc, {
    startY: 34,
    head: [['Time', 'Item', 'Location']],
    body: publicItems.map((item) => [timeRange(item), item.title, item.location || '—']),
    headStyles: { fillColor: REGAL_RGB, textColor: 255 },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 40 } },
  })

  doc.save(`${event.name} - Guest Agenda.pdf`)
}

function assigneeLabel(item: AgendaItemDoc, peopleById: Map<string, Person>, vendorsById: Map<string, VendorDoc>): string {
  if (item.assigneeType === 'person' && item.assigneePersonId) {
    const person = peopleById.get(item.assigneePersonId)
    return person ? `${person.fullName}${person.phone ? ` (${person.phone})` : ''}` : 'Unknown person'
  }
  if (item.assigneeType === 'vendor' && item.assigneeVendorId) {
    const vendor = vendorsById.get(item.assigneeVendorId)
    return vendor ? `${vendor.name}${vendor.phone ? ` (${vendor.phone})` : ''}` : 'Unknown vendor'
  }
  return '—'
}

/** Dense, printable clipboard doc: every item, times, assignees, location, notes — isPublic items flagged in the Guest column. */
export function exportWorkingAgendaPdf(
  event: EventDoc,
  venueName: string,
  items: AgendaItemDoc[],
  peopleById: Map<string, Person>,
  vendorsById: Map<string, VendorDoc>,
) {
  const doc = new jsPDF()
  drawHeader(doc, 'Working agenda', event, venueName, CHARCOAL_RGB)

  const sorted = sortAgenda(items)

  autoTable(doc, {
    startY: 34,
    head: [['Time', 'Item', 'Assignee', 'Location', 'Notes', 'Guest']],
    body: sorted.map((item) => [
      timeRange(item),
      item.title,
      assigneeLabel(item, peopleById, vendorsById),
      item.location || '—',
      item.notes || '—',
      item.isPublic ? 'Yes' : '',
    ]),
    headStyles: { fillColor: CHARCOAL_RGB, textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 28 }, 5: { cellWidth: 16 } },
  })

  doc.save(`${event.name} - Working Agenda.pdf`)
}
