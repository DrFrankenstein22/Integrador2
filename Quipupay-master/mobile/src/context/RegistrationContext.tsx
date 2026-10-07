import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { applyKeypadInput } from '@/src/utils/keypad';
import type { KycChallenge, KycOutcome } from '@/src/services/kycApi';
import type { Account } from '@/src/services/accountsApi';

export type DocShot = 'frontStraight' | 'frontTilt' | 'backStraight' | 'backTilt';

type RegistrationState = {
  dni: string;
  acceptedTerms: boolean;
  docShots: Partial<Record<DocShot, string>>;
  selfieUri: string | null;
  fullName: string;
  /** Nombres y apellidos por separado (misma consulta RENIEC de fullName),
   * para poder crear el perfil del usuario al registrarse. */
  firstName: string;
  lastName: string;
  identityVerified: boolean;
  email: string;
  emailVerified: boolean;
  emailOtpChallengeId: string | null;
  phone: string;
  phoneVerified: boolean;
  otpChallengeId: string | null;
  kycSessionKey: string | null;
  challenge: KycChallenge | null;
  kycOutcome: KycOutcome | null;
  pin: string;
  /** La cuenta de ahorros real que se abre automáticamente al terminar el registro. */
  createdAccount: Account | null;
};

const initialState: RegistrationState = {
  dni: '',
  acceptedTerms: false,
  docShots: {},
  selfieUri: null,
  fullName: '',
  firstName: '',
  lastName: '',
  identityVerified: false,
  email: '',
  emailVerified: false,
  emailOtpChallengeId: null,
  phone: '',
  phoneVerified: false,
  otpChallengeId: null,
  kycSessionKey: null,
  challenge: null,
  kycOutcome: null,
  pin: '',
  createdAccount: null,
};

type RegistrationContextValue = {
  state: RegistrationState;
  pressDniKey: (key: string) => void;
  toggleAcceptedTerms: () => void;
  setDocShot: (shot: DocShot, uri: string) => void;
  captureSelfie: (uri: string) => void;
  setIdentity: (identity: { fullName: string; firstName: string; lastName: string }) => void;
  clearIdentity: () => void;
  setEmail: (email: string) => void;
  setEmailOtpChallenge: (challengeId: string) => void;
  markEmailVerified: () => void;
  setPhone: (phone: string) => void;
  setOtpChallenge: (challengeId: string) => void;
  markPhoneVerified: () => void;
  setKycSession: (sessionKey: string) => void;
  setChallenge: (challenge: KycChallenge) => void;
  setKycOutcome: (outcome: KycOutcome) => void;
  setCreatedAccount: (account: Account) => void;
  pressPinKey: (key: string) => void;
  clearPin: () => void;
  reset: () => void;
  retryKyc: () => void;
};

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

export function RegistrationProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<RegistrationState>(initialState);

  const value: RegistrationContextValue = {
    state,
    pressDniKey: (key) =>
      setState((prev) => ({
        ...prev,
        dni: applyKeypadInput(prev.dni, key, 8),
        fullName: '',
        firstName: '',
        lastName: '',
        identityVerified: false,
      })),
    toggleAcceptedTerms: () =>
      setState((prev) => ({ ...prev, acceptedTerms: !prev.acceptedTerms })),
    setDocShot: (shot, uri) =>
      setState((prev) => ({ ...prev, docShots: { ...prev.docShots, [shot]: uri } })),
    captureSelfie: (uri) => setState((prev) => ({ ...prev, selfieUri: uri })),
    setIdentity: ({ fullName, firstName, lastName }) =>
      setState((prev) => ({ ...prev, fullName, firstName, lastName, identityVerified: true })),
    clearIdentity: () =>
      setState((prev) => ({
        ...prev,
        fullName: '',
        firstName: '',
        lastName: '',
        identityVerified: false,
      })),
    setEmail: (email) =>
      setState((prev) => ({
        ...prev,
        email,
        emailVerified: false,
        emailOtpChallengeId: null,
      })),
    setEmailOtpChallenge: (emailOtpChallengeId) =>
      setState((prev) => ({ ...prev, emailOtpChallengeId })),
    markEmailVerified: () => setState((prev) => ({ ...prev, emailVerified: true })),
    setPhone: (phone) =>
      setState((prev) => ({
        ...prev,
        phone,
        phoneVerified: false,
        otpChallengeId: null,
      })),
    setOtpChallenge: (otpChallengeId) =>
      setState((prev) => ({ ...prev, otpChallengeId })),
    markPhoneVerified: () => setState((prev) => ({ ...prev, phoneVerified: true })),
    setKycSession: (kycSessionKey) => setState((prev) => ({ ...prev, kycSessionKey })),
    setChallenge: (challenge) => setState((prev) => ({ ...prev, challenge })),
    setKycOutcome: (kycOutcome) => setState((prev) => ({ ...prev, kycOutcome })),
    setCreatedAccount: (createdAccount) => setState((prev) => ({ ...prev, createdAccount })),
    pressPinKey: (key) =>
      setState((prev) => ({ ...prev, pin: applyKeypadInput(prev.pin, key, 6) })),
    clearPin: () => setState((prev) => ({ ...prev, pin: '' })),
    reset: () => setState(initialState),
    // Al reintentar una verificación rechazada: mantiene la misma sesión KYC
    // (el DNI ya quedó validado contra RENIEC, no hace falta repetir esa
    // consulta) pero limpia las fotos, el reto de vida y el resultado
    // anteriores. El reto de liveness es de un solo uso — si se reutiliza el
    // viejo, el backend lo rechaza por "ya consumido" en cuanto se reintenta
    // la selfie.
    retryKyc: () =>
      setState((prev) => ({
        ...prev,
        docShots: {},
        selfieUri: null,
        challenge: null,
        kycOutcome: null,
      })),
  };

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistration(): RegistrationContextValue {
  const context = useContext(RegistrationContext);

  if (!context) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }

  return context;
}
