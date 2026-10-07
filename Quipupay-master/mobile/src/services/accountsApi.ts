import { authFetch } from './http';

export type Account = {
  id: string;
  accountNumber: string;
  cci: string;
  alias: string | null;
  currency: 'PEN' | 'USD';
  productCode: string;
  productName: string;
  status: string;
  availableBalance: number;
  accountingBalance: number;
  /** Cuánto falta depositar para activarla — 0 si ya está ACTIVE. */
  activationDeposit: number;
  openedAt: string;
};

export type OpenAccountPayload = {
  productCode: string;
  currency: 'PEN' | 'USD';
  alias?: string;
  acceptedContract: boolean;
  pin: string;
};

export type Movement = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  amount: number;
  direction: 'in' | 'out';
  typeCode: string;
  status: string;
};

export type MovementPage = {
  items: Movement[];
  nextCursor: string | null;
};

export type MovementReceipt = {
  id: string;
  title: string;
  counterparty: string;
  amount: number;
  direction: 'in' | 'out';
  status: string;
  typeCode: string;
  medium: string;
  accountMasked: string;
  operationNumber: string;
  date: string;
  balanceAfter: number | null;
  currency: string;
};

export type MovementQuery = {
  type?: 'all' | 'in' | 'out';
  from?: string;
  to?: string;
  q?: string;
  cursor?: string;
  limit?: number;
};

export function openAccount(payload: OpenAccountPayload): Promise<Account> {
  return authFetch<Account>('/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function activateAccount(accountId: string, pin: string): Promise<Account> {
  return authFetch<Account>(`/accounts/${accountId}/activate`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export function listAccounts(): Promise<Account[]> {
  return authFetch<Account[]>('/accounts');
}

export function getAccount(id: string): Promise<Account> {
  return authFetch<Account>(`/accounts/${id}`);
}

export function listMovements(
  accountId: string,
  query: MovementQuery = {},
): Promise<MovementPage> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return authFetch<MovementPage>(`/accounts/${accountId}/movements${suffix}`);
}

export function getMovement(id: string): Promise<MovementReceipt> {
  return authFetch<MovementReceipt>(`/movements/${id}`);
}

export function seedDemoMovements(accountId: string): Promise<{ seeded: number; balance: number }> {
  return authFetch(`/accounts/${accountId}/demo-movements`, { method: 'POST' });
}
