import { useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  getAccount,
  getMovement,
  listAccounts,
  listMovements,
  type MovementQuery,
} from '@/src/services/accountsApi';
import { ApiError } from '@/src/services/http';
import { listProducts } from '@/src/services/productsApi';
import { useAuth } from '@/src/context/AuthContext';

export const accountKeys = {
  all: ['accounts'] as const,
  list: (userId?: string | null) => ['accounts', 'list', userId ?? 'anonymous'] as const,
  detail: (id: string) => ['accounts', id] as const,
  movements: (id: string, query: MovementQuery) =>
    ['accounts', id, 'movements', query] as const,
  movement: (id: string) => ['movements', id] as const,
};

export function useProducts() {
  return useQuery({ queryKey: ['products'], queryFn: listProducts });
}

export function useAccounts() {
  const { isAuthenticated, user, requirePinUnlock } = useAuth();
  const query = useQuery({
    queryKey: accountKeys.list(user?.id),
    queryFn: listAccounts,
    enabled: isAuthenticated && Boolean(user?.id),
  });

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      requirePinUnlock();
    }
  }, [query.error, requirePinUnlock]);

  return query;
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: () => getAccount(id),
    enabled: Boolean(id),
  });
}

export function useMovements(id: string, query: MovementQuery = {}) {
  return useInfiniteQuery({
    queryKey: accountKeys.movements(id, query),
    queryFn: ({ pageParam }) =>
      listMovements(id, { ...query, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(id),
  });
}

export function useMovement(id: string) {
  return useQuery({
    queryKey: accountKeys.movement(id),
    queryFn: () => getMovement(id),
    enabled: Boolean(id),
  });
}
