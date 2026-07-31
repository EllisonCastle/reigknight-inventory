import { useMemo, useState } from 'react'
import {
  buildMigrationPreview,
  runStorageEntriesMigration,
  type LocationMappingChoice,
  type MigrationResult,
} from '../../lib/migrateStorageEntries'
import { Button } from '../ui/Button'
import { Input, Select } from '../ui/Field'
import type { InventoryItem, LocationDoc } from '../../types'

interface MigrationToolProps {
  items: InventoryItem[]
  locations: LocationDoc[]
  createLocation: (data: { name: string; type: LocationDoc['type'] }) => Promise<{ id: string }>
}

function buildInitialMapping(distinctValues: { value: string }[]): Record<string, LocationMappingChoice> {
  const initial: Record<string, LocationMappingChoice> = {}
  for (const { value } of distinctValues) {
    initial[value] = { mode: 'new', newName: value }
  }
  return initial
}

export function MigrationTool({ items, locations, createLocation }: MigrationToolProps) {
  const preview = useMemo(() => buildMigrationPreview(items), [items])
  const [mapping, setMapping] = useState<Record<string, LocationMappingChoice>>(() =>
    buildInitialMapping(preview.distinctValues),
  )
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<MigrationResult | null>(null)
  const [error, setError] = useState('')

  const setChoice = (value: string, choice: LocationMappingChoice) => {
    setMapping((prev) => ({ ...prev, [value]: choice }))
  }

  const newLocationCount = preview.distinctValues.filter(({ value }) => mapping[value]?.mode === 'new').length
  const existingLocationCount = preview.distinctValues.filter(({ value }) => mapping[value]?.mode === 'existing').length
  const totalPendingItems =
    preview.distinctValues.reduce((sum, d) => sum + d.count, 0) + preview.vendorCount + preview.blankCount

  const handleRun = async () => {
    const confirmed = confirm(
      `Migrate ${totalPendingItems} item${totalPendingItems === 1 ? '' : 's'} into the new storage location model? ` +
        `Make sure you've exported a CSV backup from the Inventory page first.`,
    )
    if (!confirmed) return
    setRunning(true)
    setError('')
    try {
      const res = await runStorageEntriesMigration(items, locations, mapping, createLocation)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed partway through — check Firestore before retrying.')
    } finally {
      setRunning(false)
    }
  }

  if (totalPendingItems === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-base text-gray-600">
          Nothing to migrate — every item already has storage entries
          {preview.alreadyMigratedCount > 0 ? ` (${preview.alreadyMigratedCount} item${preview.alreadyMigratedCount === 1 ? '' : 's'})` : ''}.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="mb-1 text-base font-medium text-amber-900">Before you run this</p>
        <p className="text-base text-amber-800">
          Export a CSV backup of the current inventory from the Inventory page first. The old location, bin, and quantity
          fields stay on each item afterward — nothing is deleted — but a fresh export is cheap insurance regardless.
        </p>
      </div>

      {result ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-base text-green-800">
          Migrated {result.migratedCount} item{result.migratedCount === 1 ? '' : 's'}
          {result.newLocationsCreated > 0
            ? ` · ${result.newLocationsCreated} new location${result.newLocationsCreated === 1 ? '' : 's'} created`
            : ''}
          . Refresh this tab to see what (if anything) is still unmigrated.
        </div>
      ) : (
        <>
          {preview.distinctValues.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-base">
                <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5">Current location text</th>
                    <th className="px-4 py-2.5">Items</th>
                    <th className="px-4 py-2.5">Map to</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.distinctValues.map(({ value, count }) => {
                    const choice = mapping[value] ?? { mode: 'new', newName: value }
                    return (
                      <tr key={value}>
                        <td className="px-4 py-2.5 font-medium text-charcoal">{value}</td>
                        <td className="px-4 py-2.5 text-gray-600">{count}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              value={choice.mode === 'existing' ? choice.locationId ?? '' : '__new__'}
                              onChange={(e) => {
                                const v = e.target.value
                                if (v === '__new__') setChoice(value, { mode: 'new', newName: value })
                                else setChoice(value, { mode: 'existing', locationId: v })
                              }}
                              className="w-auto"
                            >
                              <option value="__new__">Create new location…</option>
                              {locations.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </Select>
                            {choice.mode === 'new' && (
                              <Input
                                value={choice.newName ?? ''}
                                onChange={(e) => setChoice(value, { mode: 'new', newName: e.target.value })}
                                className="w-auto"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
            {newLocationCount > 0 && <span>{newLocationCount} new location{newLocationCount === 1 ? '' : 's'} will be created</span>}
            {existingLocationCount > 0 && (
              <span>
                {existingLocationCount} raw value{existingLocationCount === 1 ? '' : 's'} mapped to existing locations
              </span>
            )}
            {preview.vendorCount > 0 && (
              <span>
                {preview.vendorCount} vendor-sourced item{preview.vendorCount === 1 ? '' : 's'} → Through Vendor (automatic)
              </span>
            )}
            {preview.blankCount > 0 && (
              <span>
                {preview.blankCount} item{preview.blankCount === 1 ? '' : 's'} with no location → Unassigned / Needs Sorting
                (automatic)
              </span>
            )}
          </div>

          {error && <p className="text-base text-red-600">{error}</p>}

          <div className="flex justify-end">
            <Button type="button" disabled={running} onClick={handleRun}>
              {running ? 'Migrating…' : `Run migration (${totalPendingItems} items)`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
