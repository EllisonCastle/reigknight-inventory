import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './datetime'
import type { PullListGroup } from './pullList'
import type { EventDoc } from '../types'

const CHARCOAL_RGB: [number, number, number] = [31, 35, 40]

/** Dense, printable 8.5x11 pull sheet for the moving team: grouped by storage location for efficient trips. */
export function exportPullListPdf(event: EventDoc, venueName: string, groups: PullListGroup[]) {
  const doc = new jsPDF()

  doc.setTextColor(...CHARCOAL_RGB)
  doc.setFontSize(18)
  doc.text(event.name, 14, 18)
  doc.setFontSize(11)
  doc.text(`Pull list · ${formatDate(event.startAt)} · ${venueName}`, 14, 26)

  let y = 34
  for (const group of groups) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(13)
    doc.setTextColor(...CHARCOAL_RGB)
    doc.text(group.location, 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Item', 'Qty to pull', 'Bin', 'Drop-off']],
      body: group.lines.map((line) => [line.itemName, String(line.quantity), line.bin || '—', line.dropOffLocation || '—']),
      headStyles: { fillColor: CHARCOAL_RGB, textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 1: { cellWidth: 24 }, 2: { cellWidth: 30 }, 3: { cellWidth: 40 } },
      margin: { left: 14, right: 14 },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  doc.save(`${event.name} - Pull List.pdf`)
}
