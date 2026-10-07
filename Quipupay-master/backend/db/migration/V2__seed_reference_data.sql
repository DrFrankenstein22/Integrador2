INSERT INTO config.currencies (code, name, decimal_places, status_code)
VALUES
  ('PEN', 'Sol peruano', 2, 'ACTIVE'),
  ('USD', 'Dolar estadounidense', 2, 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

INSERT INTO config.status_catalog (domain, code, description, is_terminal, sort_order)
VALUES
  ('USER', 'PENDING_VERIFICATION', 'Usuario pendiente de verificacion', false, 10),
  ('USER', 'ACTIVE', 'Usuario activo', false, 20),
  ('USER', 'TEMPORARILY_LOCKED', 'Usuario bloqueado temporalmente', false, 30),
  ('USER', 'BLOCKED', 'Usuario bloqueado', true, 40),
  ('USER', 'CLOSED', 'Usuario cerrado', true, 50),

  ('IDENTITY', 'PENDING', 'Identidad pendiente', false, 10),
  ('IDENTITY', 'VERIFIED', 'Identidad verificada', false, 20),
  ('IDENTITY', 'REJECTED', 'Identidad rechazada', true, 30),
  ('IDENTITY', 'REVIEW_REQUIRED', 'Identidad requiere revision', false, 40),

  ('DOCUMENT_CAPTURE', 'PENDING', 'Documento pendiente', false, 10),
  ('DOCUMENT_CAPTURE', 'APPROVED', 'Documento aprobado', false, 20),
  ('DOCUMENT_CAPTURE', 'REJECTED', 'Documento rechazado', true, 30),

  ('BIOMETRIC_ENROLLMENT', 'ACTIVE', 'Enrolamiento biometrico activo', false, 10),
  ('BIOMETRIC_ENROLLMENT', 'REVOKED', 'Enrolamiento biometrico revocado', true, 20),

  ('DEVICE', 'ACTIVE', 'Dispositivo activo', false, 10),
  ('DEVICE', 'REVOKED', 'Dispositivo revocado', true, 20),
  ('DEVICE', 'LOST', 'Dispositivo reportado perdido', true, 30),

  ('DEVICE_CREDENTIAL', 'ACTIVE', 'Credencial activa', false, 10),
  ('DEVICE_CREDENTIAL', 'REVOKED', 'Credencial revocada', true, 20),

  ('ACCOUNT', 'PENDING_ACTIVATION', 'Cuenta pendiente de activacion', false, 10),
  ('ACCOUNT', 'ACTIVE', 'Cuenta activa', false, 20),
  ('ACCOUNT', 'TEMPORARILY_LOCKED', 'Cuenta bloqueada temporalmente', false, 30),
  ('ACCOUNT', 'BLOCKED', 'Cuenta bloqueada', true, 40),
  ('ACCOUNT', 'CLOSED', 'Cuenta cerrada', true, 50),

  ('TRANSACTION', 'PENDING', 'Transaccion pendiente', false, 10),
  ('TRANSACTION', 'PROCESSING', 'Transaccion en proceso', false, 20),
  ('TRANSACTION', 'COMPLETED', 'Transaccion completada', true, 30),
  ('TRANSACTION', 'FAILED', 'Transaccion fallida', true, 40),
  ('TRANSACTION', 'CANCELLED', 'Transaccion cancelada', true, 50),
  ('TRANSACTION', 'REVERSED', 'Transaccion reversada', true, 60),
  ('TRANSACTION', 'REFUNDED', 'Transaccion reembolsada', true, 70),

  ('BENEFICIARY', 'ACTIVE', 'Beneficiario activo', false, 10),
  ('BENEFICIARY', 'BLOCKED', 'Beneficiario bloqueado', true, 20),

  ('VIRTUAL_CARD', 'ACTIVE', 'Tarjeta virtual activa', false, 10),
  ('VIRTUAL_CARD', 'LOCKED', 'Tarjeta virtual bloqueada', false, 20),
  ('VIRTUAL_CARD', 'CANCELLED', 'Tarjeta virtual cancelada', true, 30),

  ('QR_PAYMENT', 'PENDING', 'Pago QR pendiente', false, 10),
  ('QR_PAYMENT', 'APPROVED', 'Pago QR aprobado', true, 20),
  ('QR_PAYMENT', 'REJECTED', 'Pago QR rechazado', true, 30),
  ('QR_PAYMENT', 'EXPIRED', 'Pago QR expirado', true, 40),

  ('NOTIFICATION', 'PENDING', 'Notificacion pendiente', false, 10),
  ('NOTIFICATION', 'SENT', 'Notificacion enviada', true, 20),
  ('NOTIFICATION', 'FAILED', 'Notificacion fallida', true, 30),

  ('STORED_OBJECT', 'ACTIVE', 'Objeto almacenado activo', false, 10),
  ('STORED_OBJECT', 'DELETED', 'Objeto eliminado o revocado', true, 20),

  ('MFA_METHOD', 'ACTIVE', 'Metodo MFA activo', false, 10),
  ('MFA_METHOD', 'DISABLED', 'Metodo MFA deshabilitado', true, 20)
ON CONFLICT (domain, code) DO NOTHING;

INSERT INTO auth.roles (code, name, description)
VALUES
  ('USER', 'Usuario', 'Usuario final de Quipupay'),
  ('ADMIN', 'Administrador', 'Gestiona usuarios, cuentas y operaciones'),
  ('AUDITOR', 'Auditor', 'Consulta auditoria y trazabilidad')
ON CONFLICT (code) DO NOTHING;

INSERT INTO auth.permissions (code, name, description)
VALUES
  ('users:read', 'Leer usuarios', 'Permite consultar usuarios'),
  ('accounts:read', 'Leer cuentas', 'Permite consultar cuentas'),
  ('transactions:read', 'Leer transacciones', 'Permite consultar transacciones'),
  ('audit:read', 'Leer auditoria', 'Permite consultar eventos de auditoria'),
  ('admin:write', 'Administrar plataforma', 'Permite ejecutar acciones administrativas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r
JOIN auth.permissions p ON p.code IN ('users:read', 'accounts:read', 'transactions:read')
WHERE r.code = 'USER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r
JOIN auth.permissions p ON p.code IN ('users:read', 'accounts:read', 'transactions:read', 'audit:read', 'admin:write')
WHERE r.code = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r
JOIN auth.permissions p ON p.code IN ('users:read', 'accounts:read', 'transactions:read', 'audit:read')
WHERE r.code = 'AUDITOR'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO config.system_parameters (parameter_key, parameter_value, description, is_sensitive)
VALUES
  ('initial_deposit_amount_pen', '50.00', 'Abono inicial simulado para activar cuenta Quipupay', false),
  ('pin_max_failed_attempts', '3', 'Intentos fallidos maximos antes de bloqueo temporal', false),
  ('otp_default_ttl_seconds', '300', 'Tiempo de vida por defecto para OTP', false),
  ('biometric_default_liveness_threshold', '0.80', 'Umbral academico inicial para prueba de vida', false),
  ('biometric_default_match_threshold', '0.85', 'Umbral academico inicial para verificacion facial', false)
ON CONFLICT (parameter_key) DO NOTHING;
