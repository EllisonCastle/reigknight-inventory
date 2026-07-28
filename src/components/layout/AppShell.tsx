import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/venues', label: 'Venues' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/events', label: 'Events' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white sm:block">
        <div className="px-5 py-5">
          <span className="text-lg font-semibold tracking-tight text-charcoal">Reigknight</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
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
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <span className="text-sm font-semibold text-charcoal sm:hidden">Reigknight</span>
          <nav className="flex gap-1 sm:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-md px-2 py-1 text-xs font-medium ${
                    isActive ? 'bg-regal-light text-regal' : 'text-charcoal'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">{user?.email}</span>
            <button
              onClick={() => logout()}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-charcoal hover:bg-surface"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  )
}
