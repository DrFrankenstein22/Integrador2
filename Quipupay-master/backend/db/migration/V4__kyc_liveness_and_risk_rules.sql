-- KYC antifraude: challenge de liveness activo + reglas del motor de riesgo.

CREATE TABLE identity.liveness_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users.users(id),
  session_key varchar(64) NOT NULL,
  script jsonb NOT NULL,
  nonce varchar(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_liveness_challenges_session ON identity.liveness_challenges(session_key, created_at);

INSERT INTO risk.risk_rules (code, description, severity, enabled, config) VALUES
  ('FACE_MATCH_LOW',      'La cara de la selfie no coincide con la del DNI', 'HIGH',   true, '{"threshold": 0.4, "signal": "faceMatch"}'),
  ('LIVENESS_FAIL',       'No se detectó una persona viva',                  'HIGH',   true, '{"threshold": 0.45, "signal": "passiveLiveness"}'),
  ('CHALLENGE_INCOMPLETE','No completó las instrucciones del challenge',     'HIGH',   true, '{"threshold": 0.5, "signal": "activeChallenge"}'),
  ('DOC_SCREEN_CAPTURE',  'La foto del DNI parece una pantalla o impresión', 'HIGH',   true, '{"threshold": 0.35, "signal": "documentAuthenticity"}'),
  ('DEEPFAKE_SUSPECTED',  'La selfie muestra señales de deepfake',           'HIGH',   true, '{"threshold": 0.3, "signal": "deepfakeScore"}'),
  ('EMULATOR_DETECTED',   'La app corre en un emulador o dispositivo no confiable', 'MEDIUM', true, '{"signal": "deviceTrust", "threshold": 0.3}'),
  ('VELOCITY_ABUSE',      'Demasiados intentos de verificación en poco tiempo', 'MEDIUM', true, '{"maxPerHour": 5}')
ON CONFLICT (code) DO NOTHING;
