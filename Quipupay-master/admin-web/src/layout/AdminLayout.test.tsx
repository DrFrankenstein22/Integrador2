import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'

import { AuthContext } from '../auth/auth-context'
import { renderPage } from '../test/render'
import { AdminLayout } from './AdminLayout'

it('keeps an accessible logout action for the compact navigation', async () => {
  const logout = vi.fn()
  renderPage(
    <AuthContext.Provider
      value={{
        status: 'authenticated',
        admin: {
          id: 'admin-1',
          displayName: 'Ada Lovelace',
          maskedDni: '••••5678',
          roles: ['AUDITOR'],
          permissions: ['audit:read'],
        },
        error: null,
        login: vi.fn(),
        logout,
      }}
    >
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<p>Contenido</p>} />
        </Route>
      </Routes>
    </AuthContext.Provider>,
  )

  await userEvent.click(
    screen.getByRole('button', { name: 'Cerrar sesión en vista compacta' }),
  )
  expect(logout).toHaveBeenCalledOnce()
})
