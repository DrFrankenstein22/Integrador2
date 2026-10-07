# Quipupay Mobile

App movil academica para Quipupay construida con Expo (React Native + TypeScript).
Implementa las 22 pantallas de `../documentacion/1.0/mockups-wireframes/` (Sprint 1 y Sprint 2)
conectadas al backend NestJS real.

## Stack

- React Native + Expo / Expo Router
- TypeScript
- TanStack Query (datos de servidor, scroll infinito, estados de carga/error)
- expo-secure-store (sesion persistente), expo-camera, expo-local-authentication
- expo-print / expo-sharing / expo-clipboard, react-native-qrcode-svg, @react-native-community/netinfo
- Jest / jest-expo / React Native Testing Library

## Ejecutar

```bash
# 1. Backend (en otra terminal)
cd backend && npm run start:dev

# 2. App
cd mobile
npm install
npx expo start   # abrir en Expo Go
```

Copia `.env.example` a `.env` y ajusta `EXPO_PUBLIC_API_URL`. Para probar en un telefono
fisico usa la IP LAN de tu maquina, no `localhost`:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/v1
```

## Probar

```bash
npm test          # jest
npm run lint      # expo lint
npx tsc --noEmit  # typecheck
```

## Pantallas

| Flujo | Pantallas |
| --- | --- |
| Onboarding / KYC (HU01) | bienvenida, registro DNI + T&C, captura de DNI (camara real), selfie (camara real), confirmacion de datos, creacion de clave, KYC aprobado / rechazado |
| Login (HU02) | huella digital (W1-09), identificacion por DNI, clave de 6 digitos (3 intentos), recuperar acceso |
| Apertura de cuenta (HU03) | catalogo de productos (W2-01), detalle con tarifario/TREA (W2-02), configuracion + contrato (W2-03), autorizacion con clave (W2-04), cuenta creada con N° + CCI (W2-05) |
| Saldo y movimientos (HU04) | home con saldo y "mis cuentas" (W2-06), detalle de cuenta + movimientos agrupados (W2-07), busqueda y filtros (W2-08), comprobante PDF (W2-09), estados vacio / sin conexion (W2-10) |
| Otros | Recibir con QR, Pagar servicios, Centro de seguridad |

## Estructura

```text
src/
  app/
    (auth)/          # welcome, register/*, login/*
    (tabs)/          # inicio (W2-06), qr, pagos, mas
    (app)/           # abrir-cuenta/*, cuenta/[id]/*, movimiento/[id]
  components/         # Screen, Button, Keypad, PinDots, StepHeader, TopBar, MovementRow, OfflineBanner
  context/           # AuthContext (sesion persistente), RegistrationContext, AccountOpeningContext
  hooks/             # useAccounts / useAccount / useMovements / useMovement / useProducts / useOnline
  services/          # http (fetch autenticado), authApi, identityApi, accountsApi, productsApi, session, preferences
  utils/             # validaciones y formato (montos, agrupacion por fecha)
```

Ver `../PRODUCT.md` para el detalle de pantallas, paleta y reglas de negocio.
