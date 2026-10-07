import { AlertCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { BrandMark } from '../components/Brand'

export function LoginPage() {
  const { error, login, status } = useAuth()
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')

  if (status === 'authenticated') return <Navigate to="/" replace />

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void login(dni, pin)
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="Quipupay Control">
        <BrandMark size={64} />
        <p className="login-wordmark">
          Quipu<span className="brand-accent">Pay</span>{' '}
          <span className="brand-suffix">Control</span>
        </p>
        <h1>La actividad de Quipupay, lista para revisar.</h1>
        <p>Consulta eventos funcionales y accesos con trazabilidad operacional.</p>
      </section>
      <section className="login-form-panel">
        <form className="login-form" onSubmit={submit}>
          <div>
            <p className="eyebrow">Acceso administrativo</p>
            <h2>Inicia sesión</h2>
            <p>Usa tu DNI y clave actual de Quipupay.</p>
          </div>
          <label htmlFor="dni">DNI</label>
          <input
            id="dni"
            name="dni"
            autoComplete="username"
            inputMode="numeric"
            pattern="[0-9]{8}"
            maxLength={8}
            placeholder="00000000"
            required
            value={dni}
            onChange={(event) => setDni(event.target.value.replace(/\D/g, ''))}
          />
          <label htmlFor="pin">Clave de 6 dígitos</label>
          <input
            id="pin"
            name="pin"
            type="password"
            autoComplete="current-password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="••••••"
            required
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
          />
          {error ? (
            <p className="form-error" role="alert">
              <AlertCircle size={15} aria-hidden="true" />
              <span>{error}</span>
            </p>
          ) : null}
          <button type="submit" disabled={status === 'authenticating'}>
            {status === 'authenticating' ? 'Verificando credenciales…' : 'Ingresar al panel'}
          </button>
          <p className="session-note">
            La sesión se conserva en este navegador hasta que cierres sesión.
          </p>
        </form>
      </section>
    </main>
  )
}
