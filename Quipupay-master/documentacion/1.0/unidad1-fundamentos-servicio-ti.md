# Unidad 1 — Fundamentos, Métricas, Servicio y Aplicación (caso Quipupay)

Este documento desarrolla el temario de la Unidad 1 (Fundamentos → Métricas → Servicio → Aplicación) usando **Quipupay como caso real**: cada concepto se explica y luego se ancla a algo concreto que ya existe en este repositorio (código, arquitectura, despliegue o una incidencia real que se resolvió durante el desarrollo).

## Índice

- [Parte I: Fundamentos](#parte-i-fundamentos)
  - [1. Estructura de la Unidad 1](#1-estructura-de-la-unidad-1)
  - [2. Análisis Empresarial y Planificación](#2-análisis-empresarial-y-planificación)
  - [3. Infraestructura](#3-infraestructura)
- [Parte II: Métricas](#parte-ii-métricas)
  - [4. UX / Prototipado](#4-ux--prototipado)
  - [5. Gestión de Riesgos](#5-gestión-de-riesgos)
  - [6. Observabilidad](#6-observabilidad)
- [Parte III: Servicio](#parte-iii-servicio)
  - [7. Niveles de Servicio (Tiers)](#7-niveles-de-servicio-tiers)
  - [8. Front-End y WPO](#8-front-end-y-wpo)
  - [9. Gestión de Incidentes](#9-gestión-de-incidentes)
- [Parte IV: Aplicación](#parte-iv-aplicación)
  - [10. Taller: Auditoría APF1 aplicada a Quipupay](#10-taller-auditoría-apf1-aplicada-a-quipupay)
  - [11. Cierre y Metacognición](#11-cierre-y-metacognición)

---

## Parte I: Fundamentos

### 1. Estructura de la Unidad 1

La unidad sigue el ciclo de vida completo de un servicio de TI, de punta a punta:

```
Análisis del negocio → Planificación → Infraestructura → Métricas (UX, riesgo, observabilidad)
→ Operación como servicio (tiers, rendimiento, incidentes) → Auditoría y cierre
```

Quipupay es un ejemplo funcional de todo ese recorrido dentro de un solo repositorio: nació de un análisis de requerimientos (mockups de Sprint 1 y 2), se planificó por historias de usuario, se construyó sobre infraestructura real en AWS, se midió y se corrigió con datos reales de uso (los bugs de cámara, del proveedor de DNI y del face-match descritos más abajo), y ya se opera como un servicio con niveles definidos (aunque sea a escala académica).

### 2. Análisis Empresarial y Planificación

**Qué es:** identificar el problema de negocio, los interesados (*stakeholders*), los objetivos y traducir eso en requerimientos funcionales y no funcionales, organizados en un plan (alcance, hitos, sprints).

**Aplicado a Quipupay:**

- **Problema de negocio:** un "banco integrador académico" que necesita onboarding digital seguro (KYC) y operaciones bancarias básicas (cuentas, movimientos) sin fricción.
- **Stakeholders:** el equipo de desarrollo (varios integrantes trabajando en ramas paralelas), el docente/evaluador, y el "usuario final" simulado (estudiante que se registra con su DNI real).
- **Requerimientos → historias de usuario:** los 22 mockups de Sprint 1 y 2 (`documentacion/1.0/mockups-wireframes/`) se convirtieron en pantallas reales con backend funcional (no mocks): registro, verificación de identidad, cuentas, movimientos.
- **Planificación real ejecutada:** el proyecto se organizó en fases entregables (reconciliación de esquema → app Sprint 1+2 → KYC antifraude → despliegue en AWS), cada una cerrada con un Pull Request revisado y con CI en verde antes de integrarse a `master`.
- **Gestión de conflictos de alcance:** cuando dos ramas de equipo propusieron esquemas de base de datos incompatibles (uno simple de 6 tablas, otro de 47 tablas con Flyway), se hizo un análisis comparativo explícito para decidir cuál conservar — un ejercicio real de negociación de alcance entre stakeholders técnicos.

### 3. Infraestructura

**Qué es:** el conjunto de servidores, redes, bases de datos y servicios en la nube que sostienen la aplicación.

**Aplicado a Quipupay:**

| Componente | Elección real | Por qué |
| --- | --- | --- |
| Cómputo | AWS Lightsail, plan `nano_2_0` (Ubuntu 22.04, 453 MB RAM) | Costo mínimo (~$5/mes) dentro de un crédito de $100 USD |
| Base de datos | PostgreSQL 16 en Docker, escuchando solo en `127.0.0.1:5432` | No exponer la BD a internet; el backend corre en la misma instancia |
| Backend | NestJS corriendo nativo (no Dockerizado) vía `systemd` | Ahorrar RAM — el motor mismo casi no cabe con Docker + Postgres + Node en 453 MB reales |
| Migraciones | Flyway como fuente de verdad del DDL (`backend/db/migration/V1..V5`) | Prisma solo se usa como cliente tipado (`prisma db pull`), nunca como owner del esquema |
| Memoria | Swapfile de 2 GB + `NODE_OPTIONS=--max-old-space-size=1536` en el build | La instancia se quedaba sin memoria (`OOM`) al compilar NestJS sin esa ayuda |
| IA / biometría | AWS Rekognition (credenciales de un usuario IAM dedicado, con permiso *solo* de Rekognition) | Principio de mínimo privilegio: nunca se usó una credencial administrativa de AWS para desarrollo |

Esto es infraestructura real con restricciones reales (RAM, costo, seguridad), no un diagrama teórico.

---

## Parte II: Métricas

### 4. UX / Prototipado

**Qué es:** diseñar la experiencia de usuario de forma iterativa — wireframe de baja fidelidad → prototipo funcional → prueba con usuarios reales → ajuste según lo observado.

**Aplicado a Quipupay:** el ciclo se dio de verdad, no en teoría, en la pantalla de captura del DNI:

1. **Wireframe → implementación:** el mockup original solo pedía "tomar 4 fotos del DNI".
2. **Prueba real:** al usar la app en un iPhone real, las fotos salían borrosas — la cámara de `expo-camera` no enfocaba igual que la app nativa de cámara.
3. **Iteración 1:** se agregó espera de cámara lista, enfoque continuo y un pequeño retardo antes de disparar.
4. **Iteración 2 (con más evidencia del usuario):** el problema real era la distancia mínima de enfoque del lente — se ajustó la captura a pantalla completa, la guía visual para no acercar demasiado el DNI y un modo "Cerca" opcional en iPhone cuando hay lente ultra gran angular disponible.
5. **Iteración 3:** se agregó **autodisparo con cuenta regresiva** (para que soltar el dedo del botón no genere vibración) y una **pantalla de previsualización con botón "Repetir"** antes de aceptar cada foto — UX que evita que una sola foto mala obligue a rehacer las cuatro.

Esa secuencia (mockup → build → test con usuario real → detectar fricción → rediseñar → volver a probar) **es** el método de prototipado iterativo, documentado con commits reales (PR #8 y #9 del repositorio).

### 5. Gestión de Riesgos

**Qué es:** identificar riesgos, evaluar su probabilidad/impacto, mitigarlos y monitorearlos continuamente.

**Aplicado a Quipupay, en dos niveles:**

**a) Como funcionalidad del producto** — el motor de riesgo de KYC (`backend/src/kyc/risk-engine.service.ts`) es literalmente un sistema de gestión de riesgo: combina 8 señales independientes (coincidencia de identidad, calidad del documento, autenticidad, reto de movimiento, "persona viva", ausencia de deepfake, coincidencia facial, confianza del dispositivo), cada una ponderada, para producir un `riskScore` y decidir `APPROVED` / `REVIEW` / `REJECTED`. Además define **reglas de corte** ("hard-fails"): si una señal crítica (p. ej. `faceMatch`) cae bajo un umbral, se rechaza sin importar qué tan bien salga el resto — exactamente el principio de "un riesgo crítico no se promedia con los demás".

**b) Como gestión de proyecto** — riesgos reales que se identificaron y mitigaron durante el desarrollo:

| Riesgo | Mitigación aplicada |
| --- | --- |
| Activar servicios de AWS sin conocer el costo | Se pidió y calculó una proyección mensual **antes** de activar nada, respetando un presupuesto de $100 |
| Quedarse sin memoria al compilar en una instancia de 453 MB | Swap de 2 GB + límite de memoria en el build |
| Depender de un proveedor externo (apis.net.pe) con plan gratuito muy limitado (1 IP, pocas consultas) | Se detectó el bloqueo por IP, se re-autorizó la IP correcta del servidor y se documentó el límite de frecuencia |
| Conflicto de esquemas de base de datos entre dos ramas de equipo | Comparación explícita de ambas propuestas antes de fusionar, en vez de forzar un merge a ciegas |

### 6. Observabilidad

**Qué es:** la capacidad de entender el estado interno de un sistema a partir de sus señales externas — logs, métricas y trazas — sin tener que adivinar qué está pasando.

**Aplicado a Quipupay:**

- **Logs estructurados de NestJS** vía `journalctl -u quipupay-backend` en el servidor: cada ruta registrada al arrancar (`[RouterExplorer] Mapped {...}`) y cada excepción con su *stack trace* completo.
- **Caso real de uso:** el error "Internal server error" al reintentar una verificación se diagnosticó **leyendo el log del servidor**, no adivinando — el stack trace apuntaba exactamente a `StorageService.save` y al mensaje de Prisma `Unique constraint failed on the fields: (bucket, object_key)`, lo que llevó directo a la causa y a la corrección (`upsert` en vez de `create`).
- **Auditoría como observabilidad de negocio:** la tabla `audit.audit_events` registra eventos críticos (`KYC_SUBMITTED`, `KYC_DECISION`) para poder reconstruir qué pasó con una verificación después de los hechos.
- **Brecha reconocida (no resuelta aún):** no hay métricas ni *dashboards* (tipo Prometheus/CloudWatch) ni *alerting* automático — hoy la observabilidad depende de revisar logs manualmente por SSH. Es el siguiente paso lógico si el proyecto creciera a producción real.

---

## Parte III: Servicio

### 7. Niveles de Servicio (Tiers)

**Qué es:** los acuerdos y capas que definen qué tan disponible, rápido o robusto es un servicio (SLA), y la separación en capas (*tiers*) de una arquitectura: presentación, lógica y datos.

**Aplicado a Quipupay:**

- **Arquitectura en 3 capas clásica:** app móvil (Expo/React Native, presentación) → API REST NestJS (lógica de negocio, `/api/v1`) → PostgreSQL (datos), cada una desplegable y escalable por separado.
- **Ejemplo real de "tier" de un proveedor externo:** apis.net.pe (RENIEC) se usa en su **plan FREE**, que impone tiers muy concretos: 1 IP autorizada y un límite de frecuencia agresivo. El equipo lo vivió en carne propia cuando el servidor de AWS reemplazó a una laptop de desarrollo como origen de las peticiones — hubo que re-autorizar la IP del backend en el panel del proveedor.
- **Nivel de servicio actual de Quipupay (honesto):** una sola instancia, sin redundancia ni balanceo de carga, sin SLA formal — apropiado para un **Tier de demo/académico**, no para un Tier de producción bancaria real (que exigiría alta disponibilidad, backups automáticos y múltiples zonas).

### 8. Front-End y WPO (Web Performance Optimization)

**Qué es:** técnicas para que la interfaz cargue y responda rápido — reducir peso de payloads, minimizar peticiones de red, priorizar la percepción de velocidad para el usuario.

**Aplicado a Quipupay** (los principios de WPO aplican igual a una app móvil, aunque no sea web):

- **Reducción de payload:** las fotos de la selfie se capturan con `quality: 0.6` (JPEG comprimido) para no subir video pesado innecesariamente; las 4 fotos del DNI se envían en **una sola petición multipart** en vez de 4 peticiones separadas.
- **Percepción de velocidad:** *feedback* háptico instantáneo al tocar cualquier botón, cuenta regresiva visual antes de disparar la cámara, indicadores de progreso — el usuario nunca se queda "sin saber si tocó algo".
- **Confiabilidad de la capa de red como parte del rendimiento:** un bug real de compatibilidad (`fetch` de Expo SDK 57 no soportaba el formato de archivo `{uri, name, type}` de React Native) causaba que la subida fallara con `Unsupported FormDataPart implementation`. Se diagnosticó leyendo el código fuente de `expo`/`react-native` y se resolvió fijando `EXPO_PUBLIC_USE_RN_FETCH=1` — un ejemplo real de que "rendimiento y confiabilidad del front-end" no es solo velocidad, también es que la petición **llegue**.

### 9. Gestión de Incidentes

**Qué es:** el proceso formal para manejar una falla en producción: **detectar → clasificar/priorizar → diagnosticar → resolver → verificar → documentar (post-mortem)**.

**Aplicado a Quipupay — tres incidentes reales resueltos con ese ciclo exacto:**

| Incidente | Detección | Diagnóstico | Resolución | Verificación |
| --- | --- | --- | --- | --- |
| El código OTP de demo no se veía en producción | Prueba manual en el servidor de AWS | El gate `NODE_ENV === 'production'` ocultaba el código aunque no hubiera SMS real configurado | Se cambió el gate a `SMS_PROVIDER` configurado o no | `curl` contra el endpoint en vivo confirmando `devCode` en la respuesta |
| `Unsupported FormDataPart implementation` al subir el DNI | Captura de pantalla del usuario | Lectura del código fuente de `expo`/`react-native` hasta encontrar el `throw` exacto | Variable de entorno `EXPO_PUBLIC_USE_RN_FETCH=1` | Reinicio de Metro y prueba de subida real |
| `Internal server error` al reintentar una verificación | Captura de pantalla del usuario | Lectura de `journalctl` → `Unique constraint failed (bucket, object_key)` en Prisma | `upsert` en vez de `create` en `StorageService.save` + limpieza del reto de liveness en el contexto de React | Build, tests, despliegue manual y confirmación de que el proceso siguió sirviendo peticiones |

En los tres casos se siguió el mismo patrón: **no se adivinó la causa, se leyó evidencia real** (logs del servidor o código fuente de la librería) antes de aplicar el fix, y cada corrección se verificó después de desplegarla, no se asumió que funcionaría.

---

## Parte IV: Aplicación

### 10. Taller: Auditoría APF1 aplicada a Quipupay

**Qué es APF (Análisis de Puntos de Función):** una metodología (estándar IFPUG) para medir el **tamaño funcional** de un software desde la perspectiva del usuario, independiente de la tecnología usada para construirlo. Sirve para estimar esfuerzo, costo y productividad.

**Pasos del método:**

1. Definir el **límite de la aplicación** (qué es interno, qué es externo).
2. Contar **funciones de datos**: Archivos Lógicos Internos (**ILF**) y Archivos de Interfaz Externa (**EIF**).
3. Contar **funciones transaccionales**: Entradas Externas (**EI**), Salidas Externas (**EO**) y Consultas Externas (**EQ**).
4. Clasificar cada función por complejidad (Baja / Media / Alta) y asignarle su peso estándar.
5. Sumar los **Puntos de Función Sin Ajustar (PFSA)**.
6. Calcular el **Factor de Ajuste de Valor (FAV)** a partir de 14 Características Generales del Sistema (CGS), cada una calificada de 0 a 5.
7. Obtener los **Puntos de Función Ajustados (PFA)** = PFSA × FAV.

> **Límite de la aplicación en este ejercicio:** todo lo que está dentro del repositorio (`backend/` + `mobile/` + base de datos propia). RENIEC (vía apis.net.pe) y AWS Rekognition quedan **fuera** del límite: Quipupay los consulta, pero no los mantiene.

#### Funciones de datos

| Tipo | Función | Complejidad | Puntos |
| --- | --- | --- | --- |
| ILF | Usuarios y credenciales (login, PIN) | Media | 10 |
| ILF | Cuentas y movimientos (ledger) | Alta | 15 |
| ILF | Identidad y verificación KYC (documentos, liveness, biometría) | Alta | 15 |
| ILF | Motor de riesgo (scores, eventos, reglas) | Media | 10 |
| ILF | Dispositivos y sesiones | Baja | 7 |
| ILF | Auditoría | Baja | 7 |
| EIF | Identidad nacional (RENIEC / apis.net.pe) | Media | 7 |
| EIF | Comparación facial (AWS Rekognition) | Baja | 5 |
| **Subtotal datos** | | | **76** |

#### Funciones transaccionales

| Tipo | Función | Complejidad | Puntos |
| --- | --- | --- | --- |
| EI | Iniciar sesión KYC con DNI | Media | 4 |
| EI | Subir las 4 fotos del documento | Alta | 6 |
| EI | Subir selfie + reto de vida (liveness) | Alta | 6 |
| EI | Configurar PIN de acceso | Baja | 3 |
| EI | Solicitar código OTP | Baja | 3 |
| EI | Verificar código OTP | Baja | 3 |
| EI | Crear cuenta | Media | 4 |
| EI | Registrar movimiento/transferencia | Media | 4 |
| EO | Resultado de verificación KYC (desglose de riesgo) | Alta | 7 |
| EO | Estado de cuenta (movimientos agrupados) | Media | 5 |
| EQ | Consultar saldo/detalle de cuenta | Baja | 3 |
| EQ | Consultar catálogo de productos | Baja | 3 |
| EQ | Consultar estado de una sesión KYC | Baja | 3 |
| **Subtotal transaccional** | | | **54** |

**PFSA (Puntos de Función Sin Ajustar) = 76 + 54 = 130**

> Nota metodológica: estos pesos y complejidades son una estimación razonada para el taller (no un conteo campo-por-campo de cada DET/RET). Una auditoría APF formal exigiría revisar cada pantalla y tabla en detalle contra las tablas de complejidad de IFPUG.

#### Factor de Ajuste de Valor (FAV)

| # | Característica General del Sistema | Grado de influencia (0–5) | Justificación |
| --- | --- | --- | --- |
| 1 | Comunicación de datos | 4 | Cliente-servidor sobre HTTP/HTTPS, app móvil ↔ API |
| 2 | Procesamiento distribuido | 4 | Móvil + backend + BD + 2 servicios externos (RENIEC, Rekognition) |
| 3 | Rendimiento | 2 | Sin SLA de tiempo de respuesta formal |
| 4 | Configuración muy utilizada | 1 | Instancia única, sin balanceo |
| 5 | Tasa de transacciones | 1 | Volumen académico, bajo |
| 6 | Entrada de datos en línea | 5 | Registro, fotos, PIN, transferencias — todo en línea |
| 7 | Eficiencia para el usuario final | 4 | Háptica, autoenfoque, autodisparo, previsualización |
| 8 | Actualización en línea | 4 | Los ILF se actualizan en tiempo real (no por lotes) |
| 9 | Procesamiento complejo | 5 | Motor de riesgo multiseñal + heurísticas de imagen + reglas de corte |
| 10 | Reusabilidad | 4 | Interfaces de proveedor (`FaceProvider`, `LivenessProvider`) intercambiables |
| 11 | Facilidad de instalación | 1 | Despliegue manual por SSH, no automatizado |
| 12 | Facilidad de operación | 1 | Logs manuales vía `journalctl`, sin monitoreo activo |
| 13 | Múltiples sitios | 0 | Una sola instancia, una sola región (us-east-1) |
| 14 | Facilidad de cambios | 4 | Arquitectura modular por dominio (NestJS) |
| | **Suma de grados de influencia (ΣGI)** | **40** | |

**FAV = 0.65 + (0.01 × ΣGI) = 0.65 + 0.40 = 1.05**

**PFA (Puntos de Función Ajustados) = PFSA × FAV = 130 × 1.05 ≈ 137 puntos de función**

**Uso práctico del resultado:** con una productividad de referencia (por ejemplo, ~8–10 horas-persona por punto de función para software a medida con este nivel de complejidad), el esfuerzo estimado rondaría **1,100–1,400 horas-persona** — una cifra coherente con lo que realmente tomó construir Quipupay de punta a punta (esquema de BD, backend, app móvil, KYC biométrico y despliegue en la nube).

### 11. Cierre y Metacognición

**Qué funcionó bien:**

- Resolver conflictos de diseño (esquema de base de datos) **comparando evidencia**, no por preferencia — se llegó a una decisión defendible.
- Tratar cada bug reportado por el usuario como una **incidencia real**: reproducir, leer logs o código fuente, encontrar la causa raíz antes de "probar cosas a ver si funciona".
- No activar infraestructura de nube sin antes conocer el costo — la disciplina de presupuesto evitó sorpresas con el crédito de $100.
- Diseñar el KYC con **proveedores intercambiables** (mock ↔ AWS) desde el principio, lo que permitió activar IA real (Rekognition) sin reescribir nada del flujo.

**Qué costó más de lo esperado:**

- El enfoque de la cámara: parecía un bug de software, pero terminó siendo una combinación de límites físicos del lente, temblor al tocar el botón y, más adelante, un bug propio (recorte de rostro "a ciegas" que no correspondía a dónde está la foto en un DNI peruano). Tres causas distintas detrás de un mismo síntoma ("se ve borroso" / "no coincide el rostro").
- Depender de servicios externos gratuitos (apis.net.pe) introduce restricciones que no están bajo control del equipo (límite de IPs, límite de frecuencia) y que solo se descubren probando en condiciones reales.

**Lección principal:** en un sistema con varias capas (app, backend, base de datos, proveedores externos, infraestructura), la mayoría de los "bugs raros" no están en la lógica de negocio sino en los **bordes de integración** entre capas — el formato exacto de un `FormData`, la clave única de un archivo almacenado, la posición de una foto dentro de un documento. La forma más rápida de resolverlos fue siempre la misma: **leer la evidencia real (logs, stack traces, código fuente de la librería) antes de suponer la causa.**
