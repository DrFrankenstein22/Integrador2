import { useInfiniteQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getUsers } from '../api/audit-api'
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState'
import { UserStatusBadge } from '../components/StatusBadge'
import { initials } from '../lib/initials'

const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const usersQuery = useInfiniteQuery({
    queryKey: ['admin-users', query],
    queryFn: ({ pageParam }) => getUsers(query, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
  const users = usersQuery.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Identidades auditables</p>
          <h1>Usuarios</h1>
          <p>Busca una identidad y revisa su historial sin exponer datos sensibles.</p>
        </div>
      </header>
      <div className="page-content">
        <div className="user-search">
          <label htmlFor="user-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Buscar usuarios</span>
          </label>
          <input
            id="user-search"
            type="search"
            value={search}
            placeholder="Nombre o últimos dígitos del DNI"
            autoComplete="off"
            onChange={(event) => setSearch(event.target.value)}
          />
          {search.trim() !== query ? <span role="status">Buscando…</span> : null}
        </div>

        <p className="result-count">{users.length} usuarios cargados</p>
        <section className="ledger-section">
          {usersQuery.isPending ? (
            <LoadingState label="Buscando usuarios" />
          ) : usersQuery.isError ? (
            <ErrorState error={usersQuery.error} retry={() => void usersQuery.refetch()} />
          ) : users.length === 0 ? (
            <EmptyState
              title="No encontramos usuarios"
              description="Prueba otro nombre o verifica los últimos dígitos ingresados."
            />
          ) : (
            <>
              <div className="user-directory-head" aria-hidden="true">
                <span>Identidad</span>
                <span>DNI</span>
                <span>Estado</span>
                <span>Última actividad</span>
              </div>
              <ul className="user-directory" aria-label="Usuarios encontrados">
                {users.map((user) => (
                  <li key={user.id}>
                    <Link to={'/users/' + user.id + '/activity'}>
                      <span className="user-identity">
                        <span className="user-avatar" aria-hidden="true">
                          {initials(user.displayName)}
                        </span>
                        <span>
                          <strong>{user.displayName}</strong>
                          <small className="user-inline-dni">DNI {user.maskedDni}</small>
                        </span>
                      </span>
                      <span className="user-dni technical-id">{user.maskedDni}</span>
                      <span className="user-state">
                        <UserStatusBadge status={user.status} />
                      </span>
                      <span className="user-last-activity">
                        <small className="user-cell-label">Última actividad</small>
                        {user.lastActivityAt
                          ? dateFormatter.format(new Date(user.lastActivityAt))
                          : 'Sin actividad'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {usersQuery.hasNextPage ? (
                <div className="load-more">
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={usersQuery.isFetchingNextPage}
                    onClick={() => void usersQuery.fetchNextPage()}
                  >
                    {usersQuery.isFetchingNextPage ? 'Cargando…' : 'Cargar más usuarios'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </>
  )
}
