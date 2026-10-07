import { LayoutDashboard, ListTree, LogOut, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { Brand } from '../components/Brand'
import { initials } from '../lib/initials'

const navigation = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/events', label: 'Eventos', icon: ListTree },
  { to: '/users', label: 'Usuarios', icon: Users },
]

export function AdminLayout() {
  const { admin, logout } = useAuth()
  const role = admin?.roles.includes('ADMIN') ? 'Administrador' : 'Auditor'

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <Brand size={26} />
          <span className="brand-short" aria-hidden="true">
            Control
          </span>
          <div className="compact-session">
            <span className="compact-name">{admin?.displayName}</span>
            <button
              type="button"
              className="compact-logout"
              aria-label="Cerrar sesión en vista compacta"
              title="Cerrar sesión"
              onClick={logout}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Navegación principal">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="session-block">
          <div className="session-identity">
            <span className="avatar" aria-hidden="true">
              {initials(admin?.displayName ?? '')}
            </span>
            <span>
              <strong>{admin?.displayName}</strong>
              <small>{role}</small>
            </span>
          </div>
          <button type="button" onClick={logout}>
            <LogOut size={18} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  )
}
