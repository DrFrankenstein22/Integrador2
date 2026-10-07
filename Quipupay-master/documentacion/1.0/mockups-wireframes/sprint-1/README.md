# Sprint 1 — Mockups y Wireframes

HU01 Registro y verificación de identidad (KYC) · HU02 Login seguro
Android · 360×800 dp · paleta de `documentacion/1.0/paleta-wcag.md`

`mockups/` = baja fidelidad, sin color. `wireframes/` = alta fidelidad con paleta.
Mismo número de archivo = misma pantalla en ambas versiones.

Estado: ✅ implementado en la app (`mobile/src/app/(auth)`), conectado al backend real.

| # | Pantalla | HU | Criterio | Estado |
| --- | --- | --- | --- | --- |
| 01 | Bienvenida | HU01 | Dos salidas: registro nuevo o login | ✅ `welcome.tsx` |
| 02 | Registro con DNI + T&C | HU01 | AC1 — validación automática con fuente pública | ✅ `register/dni.tsx` · `GET /identity/dni/:dni` (ApiPeru) |
| 03 | Captura de DNI (frontal / posterior) | HU01 | AC2 — se valida legibilidad antes de avanzar | ✅ `register/document.tsx` · `expo-camera` real |
| 04 | Captura facial (selfie) | HU01 | AC3 — reconocimiento facial contra la foto del DNI | ✅ `register/selfie.tsx` · `expo-camera` real |
| 05 | Confirmación de datos personales | HU01 | Solo correo y celular editables | ✅ `register/confirm.tsx` |
| 06 | Creación de clave de 6 dígitos | HU01 | AC4 — segundo factor para autorizar operaciones | ✅ `register/pin.tsx` · `POST /register` + `POST /login` |
| 07 | KYC aprobado · cuenta creada | HU01 | AC4 — flujo completo en menos de 5 minutos | ✅ `register/approved.tsx` |
| 08 | KYC rechazado (error) | HU01 | Ruta alterna del AC3 | ✅ `register/rejected.tsx` |
| 09 | Login con huella digital | HU02 | 3 intentos y se fuerza la clave | ✅ `login/index.tsx` · `expo-local-authentication` |
| 10 | Login con clave (PIN) | HU02 | Al tercer fallo, bloqueo de 15 minutos | ✅ `login/pin.tsx` · `POST /login` |
| 11 | Recuperar acceso | HU02 | Código SMS con vigencia de 5 minutos | ✅ `login/recover.tsx` (simulado) |
| 12 | Home (destino del login) | HU02 | Enlaza con HU04, Sprint 2 | ✅ `(tabs)/index.tsx` (ver Sprint 2) |

## Accesibilidad aplicada

- Contraste mínimo 4.5:1 en texto normal, 3:1 en texto grande e iconos.
- Los estados nunca se comunican solo con color: siempre icono o texto.
- Botones con estado normal, hover, focus, disabled y error.
- Errores de formulario con mensaje en línea junto al campo.
- Áreas táctiles de 48×48 dp con 8 dp de separación.
