import { renderRouter, screen, fireEvent, waitFor } from 'expo-router/testing-library';
import { saveSession } from '../src/services/session';

test('cold start with no explicit route lands on the welcome screen', async () => {
  const rendered = renderRouter('./src/app', { initialUrl: '/' });

  await screen.findByText('Comenzar');
  expect(rendered.getPathname()).toBe('/');
});

test('unauthenticated user landing on /welcome sees the welcome screen', async () => {
  const rendered = renderRouter('./src/app', { initialUrl: '/welcome' });

  await screen.findByText('Comenzar');
  expect(rendered.getPathname()).toBe('/welcome');
});

test('a saved session locks the app behind Face ID instead of going straight in', async () => {
  await saveSession({
    accessToken: 'token-123',
    user: { id: 'u1', dni: '12345678', phone: '999999999', email: null, status: 'ACTIVE' },
  });

  renderRouter('./src/app', { initialUrl: '/' });

  // No entra directo a las pestañas solo por tener una sesión guardada:
  // primero pide confirmar con huella/Face ID.
  const fingerprintButton = await screen.findByLabelText('Ingresar con huella digital');
  expect(screen.getByText('Ingresa con tu huella digital')).toBeTruthy();

  fireEvent.press(fingerprintButton);

  await waitFor(() => {
    expect(screen.queryByText('Ingresa con tu huella digital')).toBeNull();
  });
});
