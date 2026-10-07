import { createContext } from 'react'

import type { AdminIdentity } from '../api/types'

export type AuthStatus = 'anonymous' | 'authenticating' | 'authenticated'

export type AuthContextValue = {
  status: AuthStatus
  admin: AdminIdentity | null
  error: string | null
  login: (dni: string, pin: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
