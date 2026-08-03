import { Button } from '../ui/Button'
import { downloadTextFile, exportInventoryCsv } from '../../lib/csv'
import { useLocations } from '../../hooks/useLocations'
import type { InventoryItem } from '../../types'

export function CsvExportButton({ items }: { items: InventoryItem[] }) {
  const { locations } = useLocations()

  const handleExport = () => {
    const csv = exportInventoryCsv(items, locations)
    const date = new Date().toISOString().slice(0, 10)
    downloadTextFile(`reigknight-inventory-${date}.csv`, csv)
  }

  return (
    <Button variant="secondary" onClick={handleExport}>
      Export CSV
    </Button>
  )
}
