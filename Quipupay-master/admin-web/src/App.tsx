import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminLayout } from './layout/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventsPage } from './pages/EventsPage'
import { LoginPage } from './pages/LoginPage'
import { UserActivityPage } from './pages/UserActivityPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:source/:id" element={<EventDetailPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id/activity" element={<UserActivityPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
