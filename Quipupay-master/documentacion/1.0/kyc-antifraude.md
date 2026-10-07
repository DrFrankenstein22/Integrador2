# KYC biométrico antifraude

Sistema de verificación de identidad para el onboarding de Quipupay. Diseñado como
**defensa en capas**: ~8 controles independientes que deben fallar a la vez para
engañar al sistema. La lógica de IA vive en el **backend**, desacoplada por
interfaces para cambiar de proveedor sin tocar la app.

> Es un MVP académico. No sustituye una certificación **ISO/IEC 30107-3** (PAD),
> que se hace en laboratorio externo. "Sin fallos" no existe ni en las soluciones
> comerciales (iProov, Onfido, Incode): el objetivo es subir el costo del ataque.

## Modelo de amenazas

| Ataque | Capa que lo frena |
| --- | --- |
| Foto impresa del DNI de otra persona | `documentAuthenticity` (textura/entropía, parallax entre toma recta e inclinada) + `faceMatch` |
| Foto del DNI mostrada en una pantalla | `documentAuthenticity` (histograma plano, glare en bandas, moiré) |
| Selfie robada (foto) frente a la cámara | `activeChallenge` (instrucciones aleatorias) + `passiveLiveness` (movimiento entre frames) |
| Video pregrabado | `activeChallenge` (el guion es distinto cada vez) + `timingPlausibility` |
| Deepfake | `deepfakeScore` (consistencia de textura/entropía entre frames) — **REAL con proveedor** |
| Máscara 3D / sustituto facial | `passiveLiveness` + `deepfakeScore` — **requiere PAD real (EAS)** |
| Emulador / cámara virtual | `deviceTrust` (`expo-device.isDevice`) + integridad nativa — **parcial en Expo Go** |

## Flujo

```
App (Expo Go)                         Backend (NestJS)
────────────                          ────────────────
POST /kyc/session {dni}          →    crea kyc_session
POST /kyc/challenge {sessionKey} →    guion aleatorio de 4 pasos + nonce (un solo uso, 5 min)
captura 4 tomas del DNI          →    POST /kyc/document (multipart)
  recto + inclinado × 2 lados         · heurísticas de imagen (sharp)
                                      · cross-check OCR ↔ apis.net.pe (RENIEC)
challenge activo:                →    POST /kyc/selfie (multipart: frames + timings + device)
  sigue instrucciones, snapshots      · LivenessProvider + DeepfakeProvider + FaceProvider
  por paso                            · RiskEngine → decisión
                                 ←    { decision, riskScore, trustScore, signals, reasonCodes }
POST /register {..., kycSessionKey}  → materializa a identity_profiles / liveness_checks /
                                       biometric_verification_attempts / risk_scores / audit_events
```

## Motor de riesgo

Cada señal 0..1 (alto = seguro). `trustScore = Σ(peso·señal)·100`, `riskScore = 100 − trustScore`.

| Señal | Peso | Fuente | Estado |
| --- | --- | --- | --- |
| `identityMatch` | 0.15 | nombre OCR ↔ apis.net.pe | **REAL** |
| `documentQuality` | 0.10 | nitidez, resolución, iluminación, glare (`sharp`) | HEURÍSTICA |
| `documentAuthenticity` | 0.15 | entropía/textura, uniformidad, parallax recto↔inclinado | HEURÍSTICA |
| `activeChallenge` | 0.15 | % pasos con timestamp válido + monotonía | **REAL** (server-driven) |
| `passiveLiveness` | 0.15 | movimiento entre frames + duración vs esperada | HEURÍSTICA · REAL con proveedor |
| `deepfakeScore` | 0.10 | `DeepfakeProvider` | MOCK · REAL con proveedor |
| `faceMatch` | 0.15 | `FaceProvider.compareFaces(DNI, selfie)` | MOCK · REAL con AWS Rekognition |
| `deviceTrust` | 0.05 | `expo-device` (real vs emulador), OS | HEURÍSTICA · REAL con Play Integrity/DeviceCheck |

**Bandas**: `riskScore ≤ 15` → APPROVED · `≤ 40` → REVIEW · `> 40` → REJECTED.
**Hard-fails** (→ REJECTED forzado): `faceMatch < 0.4`, `activeChallenge < 0.5`,
`documentAuthenticity < 0.35`, `deepfakeScore < 0.3`, `deviceTrust` = emulador.

Reglas configurables en `risk.risk_rules` (seed en Flyway `V4`).

## Interfaces de proveedor (`backend/src/kyc/providers/`)

`FaceProvider`, `LivenessProvider`, `DocumentProvider`, `DeepfakeProvider`.
`KYC_PROVIDER=mock` (default, heurísticas locales sin costo) · `KYC_PROVIDER=aws`
(AWS Rekognition — `npm i @aws-sdk/client-rekognition` + credenciales; import
perezoso, fallback a mock si falta el SDK). La app móvil nunca cambia.

## Persistencia

- `identity.kyc_sessions` — estado durante el onboarding (sin usuario).
- `identity.liveness_challenges` — guion del challenge, nonce, expiración.
- Al registrarse: `identity.identity_profiles`, `identity.document_captures`,
  `identity.liveness_checks`, `identity.biometric_verification_attempts`,
  `risk.risk_scores`, `risk.risk_events`, `audit.audit_events`.
- Media cruda: cifrada **AES-256-GCM** en `backend/storage/kyc/<sessionKey>/`
  (gitignored), **purgada** tras la decisión — solo quedan scores + checksum en
  `files.stored_objects`.

## Ruta a producción (fuera de este MVP)

1. **Development build (EAS)** — `mobile/eas.json` ya está. `eas build --profile development`.
2. **`react-native-vision-camera` + frame processors** — face mesh / landmarks on-device (MediaPipe), captura de mejor calidad, detección de "pantalla" en vivo.
3. **PAD real**: AWS Rekognition **Face Liveness** (sesión de streaming desde el cliente) o modelo propio (Silent-Face-Anti-Spoofing / MiniFASNet) servido en la nube.
4. **Deepfake**: EfficientNet / Xception / ViT servido como microservicio; `DeepfakeProvider` lo consume.
5. **OCR Transformer** (PaddleOCR / TrOCR) + verificación de hologramas del DNI.
6. **Integridad nativa**: Google Play Integrity API / Apple DeviceCheck + detección de root/jailbreak (módulo nativo).
7. **Biometría multimodal**: pedir "di el número 43" y validar que audio y labios coinciden.

## Referencias

- ISO/IEC 30107-3 — Presentation Attack Detection.
- M3FAS: An Accurate and Robust MultiModal Mobile Face Anti-Spoofing System — arXiv:2301.12831.
- AWS Rekognition Face Liveness / CompareFaces.
