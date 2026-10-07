import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Account } from '@/src/services/accountsApi';

type OpeningState = {
  productCode: string | null;
  currency: 'PEN' | 'USD';
  alias: string;
  acceptedContract: boolean;
  acceptedMarketing: boolean;
  createdAccount: Account | null;
};

const initialState: OpeningState = {
  productCode: null,
  currency: 'PEN',
  alias: '',
  acceptedContract: false,
  acceptedMarketing: false,
  createdAccount: null,
};

type AccountOpeningContextValue = {
  state: OpeningState;
  selectProduct: (code: string) => void;
  setCurrency: (currency: 'PEN' | 'USD') => void;
  setAlias: (alias: string) => void;
  toggleContract: () => void;
  toggleMarketing: () => void;
  setCreatedAccount: (account: Account) => void;
  reset: () => void;
};

const AccountOpeningContext = createContext<AccountOpeningContextValue | null>(null);

export function AccountOpeningProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<OpeningState>(initialState);

  const value = useMemo<AccountOpeningContextValue>(
    () => ({
      state,
      selectProduct: (productCode) => setState((prev) => ({ ...prev, productCode })),
      setCurrency: (currency) => setState((prev) => ({ ...prev, currency })),
      setAlias: (alias) => setState((prev) => ({ ...prev, alias })),
      toggleContract: () =>
        setState((prev) => ({ ...prev, acceptedContract: !prev.acceptedContract })),
      toggleMarketing: () =>
        setState((prev) => ({ ...prev, acceptedMarketing: !prev.acceptedMarketing })),
      setCreatedAccount: (createdAccount) =>
        setState((prev) => ({ ...prev, createdAccount })),
      reset: () => setState(initialState),
    }),
    [state],
  );

  return (
    <AccountOpeningContext.Provider value={value}>
      {children}
    </AccountOpeningContext.Provider>
  );
}

export function useAccountOpening(): AccountOpeningContextValue {
  const context = useContext(AccountOpeningContext);

  if (!context) {
    throw new Error('useAccountOpening must be used within an AccountOpeningProvider');
  }

  return context;
}
