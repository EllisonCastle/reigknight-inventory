import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentPerson } from '../../hooks/useCurrentPerson'
import { BottomSheet } from '../ui/BottomSheet'
import { NotificationBell } from './NotificationBell'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/venues', label: 'Venues' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/events', label: 'Events' },
  { to: '/my-tasks', label: 'My Tasks' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/people', label: 'People', adminOnly: true },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { person } = useCurrentPerson()
  const [menuOpen, setMenuOpen] = useState(false)
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || person?.role === 'admin')

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white sm:block">
        <div className="px-5 py-5">
          <span className="text-lg font-semibold tracking-tight text-charcoal">Reigknight</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-regal-light text-regal' : 'text-charcoal hover:bg-surface'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex h-11 w-11 items-center justify-center rounded-md text-charcoal sm:hidden"
          >
            <span className="text-2xl leading-none">☰</span>
          </button>
          <span className="text-base font-semibold text-charcoal sm:hidden">Reigknight</span>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <span className="hidden text-sm text-gray-500 sm:inline">{user?.email}</span>
            <button
              onClick={() => logout()}
              className="min-h-[44px] rounded-md border border-gray-300 px-3 text-base font-medium text-charcoal hover:bg-surface"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <nav className="flex flex-col gap-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex min-h-[44px] items-center rounded-md px-3 text-base font-medium ${
                  isActive ? 'bg-regal-light text-regal' : 'text-charcoal hover:bg-surface'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="mt-2 border-t border-gray-200 pt-2 text-sm text-gray-500">{user?.email}</div>
        </nav>
      </BottomSheet>
    </div>
  )
}
