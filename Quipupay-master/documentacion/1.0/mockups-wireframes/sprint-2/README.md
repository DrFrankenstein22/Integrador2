# Sprint 2 — Mockups y Wireframes

HU03 Apertura de cuenta · HU04 Saldo y movimientos
Android · 360×800 dp · misma paleta y tipografía del Sprint 1

Estado: ✅ implementado en la app (`mobile/src/app/(app)` y `(tabs)`), conectado al backend real.

| # | Pantalla | HU | Criterio | Estado |
| --- | --- | --- | --- | --- |
| 01 | Catálogo de productos | HU03 | Solo productos habilitados para usuario verificado | ✅ `abrir-cuenta/index.tsx` · `GET /products` |
| 02 | Detalle del producto | HU03 | Tarifario y TREA visibles antes de contratar | ✅ `abrir-cuenta/[code].tsx` |
| 03 | Configuración y contrato | HU03 | Sin aceptar el contrato no avanza | ✅ `abrir-cuenta/configurar.tsx` |
| 04 | Autorización con clave | HU03 | Reutiliza el componente de clave de HU02 | ✅ `abrir-cuenta/autorizar.tsx` · `POST /accounts` verifica el PIN |
| 05 | Cuenta creada | HU03 | Bloqueo si ya tiene 3 cuentas del mismo tipo | ✅ `abrir-cuenta/lista.tsx` · el backend responde 409 a la 4ª |
| 06 | Home con saldo | HU04 | Disponible vs contable; el saldo se puede ocultar | ✅ `(tabs)/index.tsx` · toggle persistido |
| 07 | Detalle de cuenta y movimientos | HU04 | Agrupado por fecha, scroll de 20 en 20 | ✅ `cuenta/[id]/index.tsx` · `useInfiniteQuery` |
| 08 | Búsqueda y filtros | HU04 | Historial de hasta 12 meses | ✅ `cuenta/[id]/buscar.tsx` |
| 09 | Detalle / comprobante | HU04 | Comprobante descargable y compartible | ✅ `movimiento/[id].tsx` · PDF con expo-print |
| 10 | Estado vacío y sin conexión | HU04 | Dos estados en una vista | ✅ estado vacío + `OfflineBanner` (NetInfo) |

Pendiente: HU05 transferencia entre cuentas propias.
