-- Estado de una verificación KYC durante el onboarding, ANTES de que exista el
-- usuario. Al registrarse (POST /register con sessionKey) se materializa en
-- identity_profiles / liveness_checks / biometric_verification_attempts /
-- risk_scores / audit_events.

CREATE TABLE identity.kyc_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key varchar(64) NOT NULL UNIQUE,
  dni varchar(12),
  document_result jsonb,
  selfie_result jsonb,
  risk_result jsonb,
  decision varchar(30),
  status varchar(30) NOT NULL DEFAULT 'STARTED',
  materialized_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_kyc_sessions_updated_at
BEFORE UPDATE ON identity.kyc_sessions
FOR EACH ROW EXECUTE FUNCTION config.set_updated_at();
