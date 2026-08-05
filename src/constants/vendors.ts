export const VENDOR_TYPES = [
  'catering',
  'floral',
  'entertainment',
  'photography',
  'rentals',
  'lighting_av',
  'bar_beverage',
  'bakery',
  'decor_design',
  'transportation',
  'staffing',
  'officiant',
  'hair_makeup',
  'venue',
  'other',
] as const

export type VendorType = (typeof VENDOR_TYPES)[number]

export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  catering: 'Catering/Food',
  floral: 'Floral',
  entertainment: 'Entertainment/DJ',
  photography: 'Photography/Video',
  rentals: 'Rentals',
  lighting_av: 'Lighting/AV',
  bar_beverage: 'Bar/Beverage',
  bakery: 'Bakery',
  decor_design: 'Décor/Design',
  transportation: 'Transportation',
  staffing: 'Staffing',
  officiant: 'Officiant',
  hair_makeup: 'Hair/Makeup',
  venue: 'Venue',
  other: 'Other',
}
