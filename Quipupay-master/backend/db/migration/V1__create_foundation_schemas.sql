CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS config;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS devices;
CREATE SCHEMA IF NOT EXISTS banking;
CREATE SCHEMA IF NOT EXISTS ledger;
CREATE SCHEMA IF NOT EXISTS transactions;
CREATE SCHEMA IF NOT EXISTS cards;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS files;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS risk;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS admin;

CREATE OR REPLACE FUNCTION config.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE config.currencies (
  code char(3) PRIMARY KEY,
  name varchar(80) NOT NULL,
  decimal_places smallint NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 6),
  status_code varchar(40) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE config.status_catalog (
  domain varchar(60) NOT NULL,
  code varchar(60) NOT NULL,
  description varchar(200) NOT NULL,
  is_terminal boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (domain, code)
);

CREATE TABLE config.system_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_key varchar(120) NOT NULL UNIQUE,
  parameter_value text NOT NULL,
  description varchar(240),
  is_sensitive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_system_parameters_updated_at
BEFORE UPDATE ON config.system_parameters
FOR EACH ROW EXECUTE FUNCTION config.set_updated_at();

CREATE TABLE users.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dni varchar(12) NOT NULL UNIQUE,
  phone varchar(20) NOT NULL UNIQUE,
  email citext UNIQUE,
  status_domain varchar(60) NOT NULL DEFAULT 'USER',
  status_code varchar(60) NOT NULL DEFAULT 'PENDING_VERIFICATION',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_users_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_users_status_domain CHECK (status_domain = 'USER')
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users.users
FOR EACH ROW EXECUTE FUNCTION config.set_updated_at();

CREATE TABLE users.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users.users(id),
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  birth_date date,
  address_line varchar(240),
  district varchar(120),
  province varchar(120),
  country_code char(2) NOT NULL DEFAULT 'PE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON users.user_profiles
FOR EACH ROW EXECUTE FUNCTION config.set_updated_at();

CREATE TABLE users.user_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  contact_type varchar(40) NOT NULL,
  contact_value varchar(180) NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, contact_type, contact_value)
);

CREATE TABLE auth.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  description varchar(200),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  description varchar(240),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.role_permissions (
  role_id uuid NOT NULL REFERENCES auth.roles(id),
  permission_id uuid NOT NULL REFERENCES auth.permissions(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE auth.user_roles (
  user_id uuid NOT NULL REFERENCES users.users(id),
  role_id uuid NOT NULL REFERENCES auth.roles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES users.users(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE auth.refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  device_id uuid,
  token_hash varchar(255) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.pin_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users.users(id),
  pin_hash varchar(255) NOT NULL,
  hash_algorithm varchar(60) NOT NULL,
  failed_attempts smallint NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users.users(id),
  device_id uuid,
  channel varchar(40) NOT NULL,
  result varchar(40) NOT NULL,
  ip_address inet,
  user_agent text,
  failure_reason varchar(120),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.mfa_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  method_type varchar(40) NOT NULL,
  status_domain varchar(60) NOT NULL DEFAULT 'MFA_METHOD',
  status_code varchar(60) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_mfa_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_mfa_status_domain CHECK (status_domain = 'MFA_METHOD')
);

CREATE TRIGGER trg_mfa_methods_updated_at
BEFORE UPDATE ON auth.mfa_methods
FOR EACH ROW EXECUTE FUNCTION config.set_updated_at();

CREATE TABLE auth.password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  secret_hash varchar(255) NOT NULL,
  hash_algorithm varchar(60) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users.users(id),
  device_id uuid,
  event_type varchar(80) NOT NULL,
  severity varchar(20) NOT NULL,
  correlation_id uuid NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE files.stored_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES users.users(id),
  bucket varchar(120) NOT NULL,
  object_key varchar(500) NOT NULL,
  object_type varchar(80) NOT NULL,
  mime_type varchar(120) NOT NULL,
  byte_size bigint CHECK (byte_size IS NULL OR byte_size >= 0),
  checksum_sha256 varchar(64),
  status_domain varchar(60) NOT NULL DEFAULT 'STORED_OBJECT',
  status_code varchar(60) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_stored_objects_bucket_key UNIQUE (bucket, object_key),
  CONSTRAINT fk_stored_object_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_stored_object_status_domain CHECK (status_domain = 'STORED_OBJECT')
);

CREATE TABLE identity.identity_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users.users(id),
  verification_level varchar(40) NOT NULL DEFAULT 'BASIC',
  status_domain varchar(60) NOT NULL DEFAULT 'IDENTITY',
  status_code varchar(60) NOT NULL DEFAULT 'PENDING',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_identity_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_identity_status_domain CHECK (status_domain = 'IDENTITY')
);

CREATE TRIGGER trg_identity_profiles_updated_at
BEFORE UPDATE ON identity.identity_profiles
FOR EACH ROW EXECUTE FUNCTION config.set_updated_at();

CREATE TABLE identity.otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users.users(id),
  channel varchar(30) NOT NULL,
  destination varchar(180) NOT NULL,
  otp_hash varchar(255) NOT NULL,
  purpose varchar(60) NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts smallint NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.document_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_profile_id uuid NOT NULL REFERENCES identity.identity_profiles(id),
  front_object_id uuid REFERENCES files.stored_objects(id),
  back_object_id uuid REFERENCES files.stored_objects(id),
  document_type varchar(40) NOT NULL DEFAULT 'DNI',
  ocr_payload jsonb,
  quality_score numeric(5, 2),
  status_domain varchar(60) NOT NULL DEFAULT 'DOCUMENT_CAPTURE',
  status_code varchar(60) NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_document_capture_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_document_capture_status_domain CHECK (status_domain = 'DOCUMENT_CAPTURE')
);

CREATE TABLE identity.identity_provider_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_profile_id uuid NOT NULL REFERENCES identity.identity_profiles(id),
  provider_name varchar(120) NOT NULL,
  provider_reference varchar(180),
  request_hash varchar(64),
  response_summary jsonb,
  decision varchar(60) NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.biometric_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  consent_type varchar(80) NOT NULL,
  policy_version varchar(40) NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip_address inet,
  user_agent text
);

CREATE TABLE identity.biometric_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  consent_id uuid NOT NULL REFERENCES identity.biometric_consents(id),
  stored_object_id uuid REFERENCES files.stored_objects(id),
  model_version varchar(80) NOT NULL,
  template_reference varchar(180),
  quality_score numeric(5, 2),
  status_domain varchar(60) NOT NULL DEFAULT 'BIOMETRIC_ENROLLMENT',
  status_code varchar(60) NOT NULL DEFAULT 'ACTIVE',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_biometric_enrollment_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_biometric_enrollment_status_domain CHECK (status_domain = 'BIOMETRIC_ENROLLMENT')
);

CREATE TABLE identity.liveness_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  model_version varchar(80) NOT NULL,
  liveness_score numeric(5, 2) NOT NULL,
  threshold_used numeric(5, 2) NOT NULL,
  decision varchar(60) NOT NULL,
  reason_code varchar(120),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.biometric_verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  enrollment_id uuid REFERENCES identity.biometric_enrollments(id),
  liveness_check_id uuid REFERENCES identity.liveness_checks(id),
  stored_object_id uuid REFERENCES files.stored_objects(id),
  model_version varchar(80) NOT NULL,
  match_score numeric(5, 2),
  threshold_used numeric(5, 2),
  decision varchar(60) NOT NULL,
  purpose varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE devices.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  device_fingerprint_hash varchar(255) NOT NULL,
  platform varchar(40) NOT NULL,
  os_version varchar(80),
  app_version varchar(40),
  status_domain varchar(60) NOT NULL DEFAULT 'DEVICE',
  status_code varchar(60) NOT NULL DEFAULT 'ACTIVE',
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  CONSTRAINT uq_user_device_fingerprint UNIQUE (user_id, device_fingerprint_hash),
  CONSTRAINT fk_device_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_device_status_domain CHECK (status_domain = 'DEVICE')
);

CREATE TABLE devices.device_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices.devices(id),
  user_id uuid NOT NULL REFERENCES users.users(id),
  public_key text NOT NULL,
  algorithm varchar(80) NOT NULL,
  status_domain varchar(60) NOT NULL DEFAULT 'DEVICE_CREDENTIAL',
  status_code varchar(60) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT fk_device_credential_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_device_credential_status_domain CHECK (status_domain = 'DEVICE_CREDENTIAL')
);

CREATE TABLE devices.device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices.devices(id),
  user_id uuid NOT NULL REFERENCES users.users(id),
  refresh_token_id uuid REFERENCES auth.refresh_tokens(id),
  ip_address inet,
  user_agent text,
  app_version varchar(40),
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

ALTER TABLE auth.refresh_tokens
  ADD CONSTRAINT fk_refresh_tokens_device FOREIGN KEY (device_id)
  REFERENCES devices.devices(id);

ALTER TABLE auth.login_attempts
  ADD CONSTRAINT fk_login_attempts_device FOREIGN KEY (device_id)
  REFERENCES devices.devices(id);

ALTER TABLE auth.security_events
  ADD CONSTRAINT fk_security_events_device FOREIGN KEY (device_id)
  REFERENCES devices.devices(id);

CREATE TABLE banking.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  account_number varchar(40) NOT NULL UNIQUE,
  currency_code char(3) NOT NULL REFERENCES config.currencies(code),
  status_domain varchar(60) NOT NULL DEFAULT 'ACCOUNT',
  status_code varchar(60) NOT NULL DEFAULT 'PENDING_ACTIVATION',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_account_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_account_status_domain CHECK (status_domain = 'ACCOUNT')
);

CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON banking.accounts
FOR EACH ROW EXECUTE FUNCTION config.set_updated_at();

CREATE TABLE banking.account_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES banking.accounts(id),
  limit_type varchar(60) NOT NULL,
  amount numeric(18, 2) NOT NULL CHECK (amount >= 0),
  currency_code char(3) NOT NULL REFERENCES config.currencies(code),
  period varchar(30) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, limit_type, period)
);

CREATE TABLE banking.beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  alias varchar(120) NOT NULL,
  target_account_id uuid REFERENCES banking.accounts(id),
  target_identifier varchar(120),
  status_domain varchar(60) NOT NULL DEFAULT 'BENEFICIARY',
  status_code varchar(60) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_beneficiary_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_beneficiary_status_domain CHECK (status_domain = 'BENEFICIARY')
);

CREATE TABLE transactions.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users.users(id),
  type_code varchar(60) NOT NULL,
  status_domain varchar(60) NOT NULL DEFAULT 'TRANSACTION',
  status_code varchar(60) NOT NULL DEFAULT 'PENDING',
  amount numeric(18, 2) NOT NULL CHECK (amount > 0),
  currency_code char(3) NOT NULL REFERENCES config.currencies(code),
  reference varchar(240),
  idempotency_key varchar(120) UNIQUE,
  reversal_of_transaction_id uuid REFERENCES transactions.transactions(id),
  reversed_by_transaction_id uuid REFERENCES transactions.transactions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_transaction_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_transaction_status_domain CHECK (status_domain = 'TRANSACTION')
);

CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON transactions.transactions
FOR EACH ROW EXECUTE FUNCTION config.set_updated_at();

CREATE TABLE transactions.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES transactions.transactions(id),
  source_account_id uuid NOT NULL REFERENCES banking.accounts(id),
  target_account_id uuid NOT NULL REFERENCES banking.accounts(id),
  amount numeric(18, 2) NOT NULL CHECK (amount > 0),
  currency_code char(3) NOT NULL REFERENCES config.currencies(code),
  description varchar(240),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_transfer_different_accounts CHECK (source_account_id <> target_account_id)
);

CREATE TABLE transactions.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key varchar(120) NOT NULL UNIQUE,
  request_hash varchar(64) NOT NULL,
  response_hash varchar(64),
  transaction_id uuid REFERENCES transactions.transactions(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledger.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions.transactions(id),
  account_id uuid NOT NULL REFERENCES banking.accounts(id),
  direction varchar(10) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
  amount numeric(18, 2) NOT NULL CHECK (amount > 0),
  currency_code char(3) NOT NULL REFERENCES config.currencies(code),
  balance_after numeric(18, 2),
  entry_sequence integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, entry_sequence)
);

CREATE TABLE ledger.account_balance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES banking.accounts(id),
  available_balance numeric(18, 2) NOT NULL DEFAULT 0,
  accounting_balance numeric(18, 2) NOT NULL DEFAULT 0,
  currency_code char(3) NOT NULL REFERENCES config.currencies(code),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  ledger_entry_id uuid REFERENCES ledger.ledger_entries(id)
);

CREATE TABLE cards.virtual_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  account_id uuid NOT NULL REFERENCES banking.accounts(id),
  masked_number varchar(24) NOT NULL,
  card_token varchar(180) NOT NULL UNIQUE,
  status_domain varchar(60) NOT NULL DEFAULT 'VIRTUAL_CARD',
  status_code varchar(60) NOT NULL DEFAULT 'ACTIVE',
  spending_limit numeric(18, 2),
  currency_code char(3) REFERENCES config.currencies(code),
  issued_at timestamptz NOT NULL DEFAULT now(),
  blocked_at timestamptz,
  CONSTRAINT fk_virtual_card_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_virtual_card_status_domain CHECK (status_domain = 'VIRTUAL_CARD')
);

CREATE TABLE cards.card_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards.virtual_cards(id),
  event_type varchar(80) NOT NULL,
  reason varchar(180),
  created_by uuid REFERENCES users.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments.qr_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions.transactions(id),
  merchant_name varchar(160) NOT NULL,
  qr_payload_hash varchar(64) NOT NULL,
  amount numeric(18, 2) NOT NULL CHECK (amount > 0),
  currency_code char(3) NOT NULL REFERENCES config.currencies(code),
  status_domain varchar(60) NOT NULL DEFAULT 'QR_PAYMENT',
  status_code varchar(60) NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_qr_payment_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_qr_payment_status_domain CHECK (status_domain = 'QR_PAYMENT')
);

CREATE TABLE payments.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES transactions.transactions(id),
  receipt_number varchar(60) NOT NULL UNIQUE,
  stored_object_id uuid REFERENCES files.stored_objects(id),
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users.users(id),
  channel varchar(40) NOT NULL,
  template_code varchar(80) NOT NULL,
  subject varchar(180),
  payload jsonb,
  status_domain varchar(60) NOT NULL DEFAULT 'NOTIFICATION',
  status_code varchar(60) NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT fk_notification_status FOREIGN KEY (status_domain, status_code)
    REFERENCES config.status_catalog(domain, code),
  CONSTRAINT chk_notification_status_domain CHECK (status_domain = 'NOTIFICATION')
);

CREATE TABLE notifications.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_event_id uuid NOT NULL REFERENCES notifications.notification_events(id),
  provider varchar(80) NOT NULL DEFAULT 'RESEND',
  provider_message_id varchar(180),
  recipient citext NOT NULL,
  status_code varchar(60) NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE risk.risk_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  description varchar(240) NOT NULL,
  severity varchar(20) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_risk_rules_updated_at
BEFORE UPDATE ON risk.risk_rules
FOR EACH ROW EXECUTE FUNCTION config.set_updated_at();

CREATE TABLE risk.risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users.users(id),
  transaction_id uuid REFERENCES transactions.transactions(id),
  rule_id uuid REFERENCES risk.risk_rules(id),
  event_type varchar(80) NOT NULL,
  severity varchar(20) NOT NULL,
  decision varchar(60) NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE risk.risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users.users(id),
  transaction_id uuid REFERENCES transactions.transactions(id),
  score numeric(6, 2) NOT NULL CHECK (score >= 0),
  decision varchar(60) NOT NULL,
  model_version varchar(80),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users.users(id),
  event_type varchar(100) NOT NULL,
  entity_type varchar(80),
  entity_id uuid,
  correlation_id uuid NOT NULL,
  result varchar(40) NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES users.users(id),
  action_type varchar(100) NOT NULL,
  target_entity_type varchar(80),
  target_entity_id uuid,
  audit_event_id uuid REFERENCES audit.audit_events(id),
  reason varchar(240),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_status ON users.users(status_code, created_at);
CREATE INDEX idx_user_contacts_user ON users.user_contacts(user_id);
CREATE INDEX idx_login_attempts_user_created ON auth.login_attempts(user_id, created_at);
CREATE INDEX idx_security_events_user_created ON auth.security_events(user_id, created_at);
CREATE INDEX idx_otp_destination_created ON identity.otp_challenges(destination, created_at);
CREATE INDEX idx_identity_provider_checks_profile ON identity.identity_provider_checks(identity_profile_id, checked_at);
CREATE INDEX idx_biometric_attempts_user_created ON identity.biometric_verification_attempts(user_id, created_at);
CREATE INDEX idx_device_sessions_device_activity ON devices.device_sessions(device_id, last_activity_at);
CREATE INDEX idx_accounts_user_status ON banking.accounts(user_id, status_code);
CREATE INDEX idx_transactions_user_created ON transactions.transactions(user_id, created_at);
CREATE INDEX idx_transactions_status_created ON transactions.transactions(status_code, created_at);
CREATE INDEX idx_ledger_entries_account_created ON ledger.ledger_entries(account_id, created_at);
CREATE INDEX idx_audit_events_entity_created ON audit.audit_events(entity_type, entity_id, created_at);
CREATE INDEX idx_notifications_user_status_created ON notifications.notification_events(user_id, status_code, created_at);
CREATE INDEX idx_files_owner_created ON files.stored_objects(owner_user_id, created_at);
