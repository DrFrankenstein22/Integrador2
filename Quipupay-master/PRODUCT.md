# Quipupay - Producto

Documento de producto de la app movil Quipupay. Describe que se construyo en los Sprints 1 y 2, con que diseno (paleta, tipografia, accesibilidad) y como esta organizado el codigo, siguiendo los lineamientos ya definidos en `documentacion/1.0/`.

## Alcance del Sprint 1

Historias de usuario implementadas, segun `documentacion/1.0/mockups-wireframes/sprint-1/README.md`:

- **HU01 - Registro y verificacion de identidad (KYC).** Ingreso de DNI, aceptacion de terminos, captura de DNI (frontal/posterior), verificacion facial (selfie), confirmacion de datos de RENIEC, creacion de clave de 6 digitos, y los dos estados finales: KYC aprobado y KYC rechazado.
- **HU02 - Login seguro con biometria / PIN.** Login con huella digital, login con clave de 6 digitos (con bloqueo tras 3 intentos), recuperacion de acceso, y el home destino del login con saldo y movimientos.

La app es una simulacion academica, pero ya no es un prototipo navegable: la captura de DNI y selfie usan la camara real (`expo-camera`), el login por huella usa el sensor real (`expo-local-authentication`), la sesion persiste en `expo-secure-store` y todas las pantallas consumen el backend NestJS real. Lo unico simulado es el resultado de las validaciones biometricas/KYC y los datos de demostracion de movimientos.

Fuente de diseno: proyecto `Mobile app design project` en claude.ai/design, archivo `Quipupay Sprint 1 - Wireframes con paleta.dc.html`.

## Paleta de colores y tipografia

Tomada de `documentacion/1.0/paleta-wcag.md` y aplicada 1:1 en `mobile/src/constants/colors.ts`.

| Uso | Color | Hex |
| --- | --- | --- |
| Primario oscuro | Azul noche | `#0B1F3A` |
| Primario | Azul financiero | `#1D4ED8` |
| Secundario | Verde confianza | `#0F766E` |
| Alerta | Ambar | `#B45309` |
| Error | Rojo | `#B91C1C` |
| Fondo claro | Gris suave | `#F3F4F6` |
| Texto principal | Gris casi negro | `#111827` |
| Texto secundario | Gris medio | `#374151` |
| Blanco | Blanco | `#FFFFFF` |

Tipografia: Plus Jakarta Sans (pesos 400/500/600/700/800), con `fontVariant: ['tabular-nums']` en montos y numeros de cuenta/DNI para alineacion numerica.

## Accesibilidad WCAG aplicada

Reglas de `documentacion/1.0/paleta-wcag.md`, verificadas en la implementacion:

- Contraste minimo 4.5:1 en texto normal y 3:1 en texto grande / iconos.
- Los estados nunca se comunican solo con color: los mensajes de error, exito y bloqueo siempre llevan icono/simbolo + texto explicito (por ejemplo `KYC-402`, "Cuenta bloqueada por 15 minutos").
- Botones con estados normal, disabled y error implementados en `mobile/src/components/Button.tsx`.
- Areas tactiles de al menos 48x48 dp: botones (`minHeight: 52`), teclado numerico (`height: 56` por tecla) y el boton de retroceso del `StepHeader`.
- Formularios con mensaje de error en linea junto al campo (DNI, correo, celular, clave).

## Mapa de pantallas

### Onboarding y registro (`mobile/src/app/(auth)/`)

| Pantalla | Ruta | Wireframe |
| --- | --- | --- |
| Bienvenida | `/welcome` | W-01 |
| DNI + Terminos y Condiciones | `/register/dni` | W-02 |
| Captura de DNI (frontal/posterior) | `/register/document` | W-03 |
| Verificacion facial | `/register/selfie` | W-04 |
| Confirmacion de datos | `/register/confirm` | W-05 |
| Creacion de clave de 6 digitos | `/register/pin` | W-06 |
| KYC aprobado | `/register/approved` | W-07 |
| KYC rechazado | `/register/rejected` | W-08 |
| Login con huella digital | `/login` | W-09 |
| Login con clave | `/login/pin` | W-10 |
| Recuperar acceso | `/login/recover` | W-11 |

### Post-login (`mobile/src/app/(tabs)/`)

| Pantalla | Ruta | Wireframe |
| --- | --- | --- |
| Home (saldo y movimientos) | `/(tabs)` (Inicio) | W-12 |
| Pagar QR, Pagos, Mas | `/(tabs)/qr`, `/(tabs)/pagos`, `/(tabs)/mas` | pendiente de implementar (fuera del Sprint 1) |

## Reglas de negocio simuladas

- **DNI:** exactamente 8 digitos (`isValidDni`).
- **Correo:** formato basico `usuario@dominio` (`isValidEmail`).
- **Celular:** 9 digitos, debe empezar en 9, con o sin prefijo `+51` (`isValidPeruPhone`).
- **Clave de 6 digitos:** rechaza secuencias `123456` / `654321` y digitos repetidos (`isWeakPin`).
- **Login con clave:** PIN de demo `123456`; cada intento fallido reduce los intentos restantes y el tercero bloquea la cuenta 15 minutos (`evaluatePinAttempt`).

Estas reglas viven en `mobile/src/utils/` como funciones puras con pruebas unitarias, siguiendo la regla del proyecto de que "las historias criticas deben incluir pruebas unitarias cuando tengan logica de negocio" (`README.md`).

## Arquitectura mobile

```text
mobile/src/
  app/
    (auth)/
      welcome.tsx
      register/        # wizard KYC, con RegistrationProvider propio
      login/            # biometria, PIN, recuperar acceso
    (tabs)/             # Inicio, QR, Pagos, Mas (post-login)
  components/           # Screen, Button, Keypad, PinDots, StepHeader
  constants/            # colors, spacing, typography, mockAccount
  context/              # AuthContext, RegistrationContext
  utils/                # validation, keypad, pinStrength, loginPin
```

- `AuthContext` controla el guard de navegacion entre `(auth)` y `(tabs)` (`mobile/src/app/_layout.tsx`) y expone el nombre del usuario simulado para los saludos ("Hola, Maria").
- `RegistrationContext` guarda el estado del wizard de registro (DNI, captura, correo/celular, clave) y vive solo dentro del stack `register/`.
- `AccountOpeningContext` guarda el estado del flujo de apertura (producto, moneda, alias, contrato) y vive dentro del stack `(app)/`.
- Los datos de cuentas y movimientos vienen de los endpoints reales (`/accounts`, `/accounts/:id/movements`, `/movements/:id`) via TanStack Query, con scroll infinito, estados de carga/vacio/error y banner "sin conexion".

## Sprint 2 (HU03 apertura de cuenta · HU04 saldo y movimientos)

- **HU03:** catalogo de productos, detalle con tarifario/TREA, configuracion + aceptacion de contrato, autorizacion con clave de 6 digitos (verificada contra `auth.pin_credentials`) y pantalla de cuenta creada con N° de cuenta + CCI. El backend bloquea la 4.ª cuenta del mismo producto (409).
- **HU04:** home con saldo disponible/contable y toggle para ocultarlo, "Mis cuentas", detalle de cuenta con movimientos agrupados por fecha y paginados de 20 en 20, busqueda con filtros de periodo y monto, y comprobante descargable/compartible en PDF (`expo-print` + `expo-sharing`).

## KYC biometrico antifraude

El registro incluye una verificacion de identidad en capas (ver `documentacion/1.0/kyc-antifraude.md`):
DNI -> confirmar datos -> verificar celular (OTP) -> captura del DNI en 4 tomas (recto + inclinado, frente y reverso) -> challenge de liveness activo (instrucciones aleatorias, snapshots por paso) -> pantalla de desglose de riesgo -> clave. El backend corre un motor de riesgo multi-senal (identidad RENIEC, calidad/autenticidad del documento, challenge activo, liveness pasivo, deepfake, face match, confianza del dispositivo) -> APROBADO / REVISION / RECHAZADO, persistido en `identity_profiles`, `liveness_checks`, `biometric_verification_attempts`, `risk_scores`, `audit_events`. La IA esta detras de interfaces (`FaceProvider`, ...) con mock por defecto y conector AWS Rekognition listo.

## Pendiente / fuera de alcance

- HU05: transferencia entre cuentas propias (el dominio `transfers` del backend existe, falta el controlador y la UI).
- Modelos de IA reales (face match, PAD/liveness, deepfake, OCR Transformer) y deteccion nativa de root/emulador -> requieren development build (EAS) + `react-native-vision-camera`. La ruta esta en `kyc-antifraude.md`.
- Persistencia permanente de la media KYC en Cloudflare R2 (hoy: local cifrada y se purga tras la decision).
- Recuperacion de acceso (`login/recover.tsx`) y "cambiar clave" del centro de seguridad siguen simulados.
