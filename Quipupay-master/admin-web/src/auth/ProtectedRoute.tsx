import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'authenticating') {
    return (
      <p className="route-status" role="status">
        Validando acceso…
      </p>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
