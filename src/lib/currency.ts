const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })

export function formatCurrency(value: number): string {
  return formatter.format(value)
}

/** Gross profit = rentalPrice − costPrice per unit. Computed, never stored — null unless both are set. */
export function grossProfit(costPrice: number | null, rentalPrice: number | null): number | null {
  if (costPrice == null || rentalPrice == null) return null
  return rentalPrice - costPrice
}
