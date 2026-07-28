import { useRef, useState } from 'react'
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { buildImportPlan, parseCsvFile, type ImportPlanEntry } from '../../lib/csv'
import type { InventoryItem } from '../../types'

const BATCH_SIZE = 400

interface CsvImportModalProps {
  open: boolean
  onClose: () => void
  items: InventoryItem[]
}

export function CsvImportModal({ open, onClose, items }: CsvImportModalProps) {
  const [plan, setPlan] = useState<ImportPlanEntry[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [committing, setCommitting] = useState(false)
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setPlan(null)
    setFileName('')
    setError('')
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setFileName(file.name)
    try {
      const rows = await parseCsvFile(file)
      if (rows.length === 0) {
        setError('That file has no data rows.')
        return
      }
      setPlan(buildImportPlan(rows, items))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse that CSV.')
    }
  }

  const validEntries = plan?.filter((p) => p.errors.length === 0) ?? []
  const invalidEntries = plan?.filter((p) => p.errors.length > 0) ?? []
  const toCreate = validEntries.filter((p) => p.action === 'create')
  const toUpdate = validEntries.filter((p) => p.action === 'update')

  const handleCommit = async () => {
    if (!plan) return
    setCommitting(true)
    setError('')
    try {
      for (let i = 0; i < validEntries.length; i += BATCH_SIZE) {
        const chunk = validEntries.slice(i, i + BATCH_SIZE)
        const batch = writeBatch(db)
        for (const entry of chunk) {
          if (entry.action === 'update' && entry.matchedId) {
            batch.update(doc(db, 'inventoryItems', entry.matchedId), { ...entry.data })
          } else {
            const ref = doc(collection(db, 'inventoryItems'))
            batch.set(ref, { ...entry.data, photos: [], createdAt: serverTimestamp() })
          }
        }
        await batch.commit()
      }
      setResult({ created: toCreate.length, updated: toUpdate.length })
      setPlan(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed partway through — check Firestore before retrying.')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import inventory CSV" wide>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Upload a CSV exported from this app (or matching its columns). Rows with a matching{' '}
          <code className="rounded bg-surface px-1">id</code> or <code className="rounded bg-surface px-1">sku</code>{' '}
          update that item; everything else creates a new one. Photos aren&apos;t imported from CSV — add those in the
          app after import.
        </p>

        {result ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Import complete: {result.created} created, {result.updated} updated.
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}

            {plan && (
              <>
                <div className="flex gap-4 text-sm">
                  <span className="font-medium text-charcoal">{fileName}</span>
                  <span className="text-green-700">{toCreate.length} to create</span>
                  <span className="text-regal">{toUpdate.length} to update</span>
                  {invalidEntries.length > 0 && (
                    <span className="text-red-600">{invalidEntries.length} rows skipped (errors)</span>
                  )}
                </div>

                <div className="max-h-72 overflow-auto rounded-md border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-surface text-left uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Action</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {plan.map((entry) => (
                        <tr key={entry.rowNumber} className={entry.errors.length > 0 ? 'bg-red-50' : ''}>
                          <td className="px-3 py-1.5">{entry.rowNumber}</td>
                          <td className="px-3 py-1.5 capitalize">{entry.action}</td>
                          <td className="px-3 py-1.5">{entry.data.name || '—'}</td>
                          <td className="px-3 py-1.5">{entry.data.totalQuantity}</td>
                          <td className="px-3 py-1.5 text-red-600">{entry.errors.join('; ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {plan && !result && (
            <Button type="button" disabled={committing || validEntries.length === 0} onClick={handleCommit}>
              {committing ? 'Importing…' : `Confirm import (${validEntries.length} rows)`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
