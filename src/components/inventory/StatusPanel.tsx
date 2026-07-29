import { useState } from 'react'
import { FormRow, Input } from '../ui/Field'
import { Button } from '../ui/Button'
import { markRepaired, markReplaced, validateStatusCounts } from '../../lib/inventoryStatus'
import type { StatusBreakdown } from '../../types'

interface StatusPanelProps {
  totalQuantity: number
  statusBreakdown: StatusBreakdown
  onChange: (next: StatusBreakdown, totalQuantityDelta?: number) => void
}

export function StatusPanel({ totalQuantity, statusBreakdown, onChange }: StatusPanelProps) {
  const [replaceChoice, setReplaceChoice] = useState<'replaced' | 'removed' | null>(null)

  const validation = validateStatusCounts(totalQuantity, statusBreakdown.needsRepair, statusBreakdown.needsReplacement)

  const handleNeedsRepairChange = (raw: string) => {
    const n = Math.max(0, Number(raw) || 0)
    onChange({ ...statusBreakdown, needsRepair: n })
  }

  const handleNeedsReplacementChange = (raw: string) => {
    const n = Math.max(0, Number(raw) || 0)
    onChange({ ...statusBreakdown, needsReplacement: n })
  }

  const handleMarkRepaired = () => {
    onChange(markRepaired(statusBreakdown))
  }

  const handleMarkReplaced = (addBackToGood: boolean) => {
    const result = markReplaced(statusBreakdown, addBackToGood)
    onChange(result.statusBreakdown, result.totalQuantityDelta)
    setReplaceChoice(null)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-surface p-4">
      <p className="mb-3 text-base font-medium text-charcoal">Status</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormRow label="Needs Repair">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={statusBreakdown.needsRepair}
            onChange={(e) => handleNeedsRepairChange(e.target.value)}
          />
        </FormRow>
        <FormRow label="Needs Replacement">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={statusBreakdown.needsReplacement}
            onChange={(e) => handleNeedsReplacementChange(e.target.value)}
          />
        </FormRow>
        <FormRow label="Good (auto-calculated)">
          <Input type="number" value={Math.max(validation.good, 0)} disabled className="bg-surface text-gray-600" />
        </FormRow>
      </div>

      {!validation.valid && <p className="mt-2 text-base text-red-600">{validation.error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {statusBreakdown.needsRepair > 0 && (
          <Button type="button" variant="secondary" onClick={handleMarkRepaired}>
            Mark {statusBreakdown.needsRepair} repaired
          </Button>
        )}
        {statusBreakdown.needsReplacement > 0 && replaceChoice === null && (
          <Button type="button" variant="secondary" onClick={() => setReplaceChoice('replaced')}>
            Mark {statusBreakdown.needsReplacement} replaced
          </Button>
        )}
      </div>

      {replaceChoice === 'replaced' && (
        <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
          <p className="mb-2 text-base text-charcoal">
            Were the {statusBreakdown.needsReplacement} replaced with new units, or removed from inventory?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => handleMarkReplaced(true)}>
              Replaced with new units
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleMarkReplaced(false)}>
              Removed, not replaced
            </Button>
            <Button type="button" variant="ghost" onClick={() => setReplaceChoice(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
