# Gestion Git, Ramas y Commits

## Ramas

- `master` o `main`: rama principal protegida. Solo el Scrum Master integra cambios aprobados.
- `develop`: rama de integracion del equipo.
- `feature/nombre-funcionalidad`: nuevas funcionalidades.
- `fix/nombre-error`: correcciones.
- `docs/nombre-documento`: documentacion.
- `test/nombre-prueba`: mejoras de pruebas.

## Flujo recomendado

1. Crear una rama desde `develop`.
2. Implementar una mejora pequena.
3. Agregar o actualizar pruebas unitarias.
4. Ejecutar pruebas localmente.
5. Hacer commit atomico.
6. Abrir pull request hacia `develop`.
7. El Scrum Master revisa e integra.

## Commits atomicos

Un commit atomico debe contener una sola intencion clara. Ejemplos:

- `feat: crear estructura inicial del backend`
- `test: agregar pruebas unitarias de transferencias`
- `docs: documentar paleta y accesibilidad`
- `fix: corregir validacion de monto negativo`

Evitar commits como:

- `cambios`
- `avance`
- `todo junto`
- `arreglos varios`

## Reglas de calidad

- No subir secretos, claves ni contrasenas.
- No subir datos reales de usuarios.
- No hacer commits directos a la rama principal.
- Cada historia critica debe tener criterios de aceptacion.
- Cada modulo backend debe tener pruebas unitarias cuando contenga logica de negocio.

