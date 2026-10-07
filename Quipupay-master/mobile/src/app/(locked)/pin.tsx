// Desbloquear una sesión guardada con la clave es exactamente el mismo
// flujo que un login normal por clave (misma llamada real al backend, que
// de paso refresca el token si ya había vencido) — se reutiliza la pantalla
// tal cual en vez de duplicarla.
export { default } from '@/src/app/(auth)/login/pin';
