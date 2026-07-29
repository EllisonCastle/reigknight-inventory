export const PEOPLE_ROLES = ['admin', 'staff', 'viewer', 'contractor'] as const

export const PEOPLE_ROLE_LABELS: Record<(typeof PEOPLE_ROLES)[number], string> = {
  admin: 'Admin',
  staff: 'Staff',
  viewer: 'Viewer',
  contractor: 'Contractor',
}

export type PersonRole = (typeof PEOPLE_ROLES)[number]
