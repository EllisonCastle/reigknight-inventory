import type { ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AdminOnly } from './components/layout/AdminOnly'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { VenuesPage } from './pages/VenuesPage'
import { InventoryPage } from './pages/InventoryPage'
import { EventsPage } from './pages/EventsPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { PeoplePage } from './pages/PeoplePage'
import { MyTasksPage } from './pages/MyTasksPage'

function Protected({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/venues" element={<Protected><VenuesPage /></Protected>} />
          <Route path="/inventory" element={<Protected><InventoryPage /></Protected>} />
          <Route path="/events" element={<Protected><EventsPage /></Protected>} />
          <Route path="/events/:eventId" element={<Protected><EventDetailPage /></Protected>} />
          <Route
            path="/people"
            element={
              <Protected>
                <AdminOnly>
                  <PeoplePage />
                </AdminOnly>
              </Protected>
            }
          />
          <Route path="/my-tasks" element={<Protected><MyTasksPage /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
