import { useCallback, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/src/components/Screen';
import { Keypad } from '@/src/components/Keypad';
import { PinDots } from '@/src/components/PinDots';
import { StepHeader } from '@/src/components/StepHeader';
import { useRegistration } from '@/src/context/RegistrationContext';
import { useAuth } from '@/src/context/AuthContext';
import { accountKeys } from '@/src/hooks/useAccounts';
import { loginUser, registerUser } from '@/src/services/authApi';
import { openAccount } from '@/src/services/accountsApi';
import { isWeakPin } from '@/src/utils/pinStrength';
import { applyKeypadInput } from '@/src/utils/keypad';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

type Stage = 'create' | 'confirm';

export default function CreatePinScreen() {
  const { state, pressPinKey, clearPin, setCreatedAccount } = useRegistration();
  const { signIn } = useAuth();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>('create');
  // Cambia cada vez que se reinicia desde cero, para que el teclado se
  // vuelva a mezclar en vez de repetir el mismo mapa de dígitos.
  const [attempt, setAttempt] = useState(0);
  const [confirmPin, setConfirmPin] = useState('');
  const [mismatchError, setMismatchError] = useState(false);
  const [weakPinError, setWeakPinError] = useState(false);
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (pin: string) => {
      setSubmitting(true);
      setApiError('');

      try {
        await registerUser({
          dni: state.dni,
          phone: state.phone,
          email: state.email || undefined,
          password: pin,
          firstName: state.firstName,
          lastName: state.lastName,
          kycSessionKey: state.kycSessionKey ?? undefined,
        });

        const session = await loginUser({ dni: state.dni, password: pin });
        signIn({ accessToken: session.accessToken, user: session.user });

        // Abre de una vez la cuenta de ahorros real — es justo lo que la
        // pantalla de bienvenida promete ("abre tu cuenta en minutos"). Si
        // esto no se hiciera, la pantalla de éxito no tendría un número de
        // cuenta real que mostrar. Se reintenta una vez: a esta altura el
        // usuario y el PIN ya son válidos (se acaban de usar para loguear),
        // así que un fallo acá suele ser de red, no de datos.
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const account = await openAccount({
              productCode: 'AHORROS',
              currency: 'PEN',
              acceptedContract: state.acceptedTerms,
              pin,
            });
            setCreatedAccount(account);
            await queryClient.invalidateQueries({ queryKey: accountKeys.all });
            break;
          } catch {
            // Si fallan los dos intentos, el usuario ya tiene su cuenta de
            // acceso creada y puede abrir la de ahorros manualmente desde
            // el inicio — no lo dejamos atrapado en el registro por esto.
          }
        }

        router.replace('/(auth)/register/approved');
      } catch (error) {
        setApiError(error instanceof Error ? error.message : 'No se pudo crear tu cuenta.');
        clearPin();
        setConfirmPin('');
        setStage('create');
        setAttempt((a) => a + 1);
        setSubmitting(false);
      }
    },
    [
      clearPin,
      signIn,
      setCreatedAccount,
      state.acceptedTerms,
      state.dni,
      state.email,
      state.phone,
      state.firstName,
      state.lastName,
      state.kycSessionKey,
      queryClient,
    ],
  );

  function restartFromScratch() {
    clearPin();
    setConfirmPin('');
    setStage('create');
    setAttempt((a) => a + 1);
  }

  function handleKeyPress(key: string) {
    if (submitting) {
      return;
    }
    setApiError('');

    if (stage === 'create') {
      setWeakPinError(false);
      pressPinKey(key);

      const next = applyKeypadInput(state.pin, key, 6);
      if (next.length !== 6) {
        return;
      }

      if (isWeakPin(next)) {
        setWeakPinError(true);
        clearPin();
        return;
      }

      // No se envía todavía: primero hay que repetirla para confirmar que
      // no fue un error de dedo al escribirla la primera vez.
      setStage('confirm');
      return;
    }

    // stage === 'confirm'
    setMismatchError(false);
    const next = applyKeypadInput(confirmPin, key, 6);
    setConfirmPin(next);
    if (next.length !== 6) {
      return;
    }

    if (next !== state.pin) {
      setMismatchError(true);
      restartFromScratch();
      return;
    }

    void submit(state.pin);
  }

  function handleBack() {
    if (stage === 'confirm') {
      setConfirmPin('');
      setMismatchError(false);
      setStage('create');
      return;
    }
    router.back();
  }

  const activePin = stage === 'create' ? state.pin : confirmPin;

  const hint =
    stage === 'create'
      ? activePin.length === 0
        ? 'Evita 123456 o dígitos repetidos'
        : `Faltan ${6 - activePin.length} dígitos`
      : activePin.length === 0
        ? 'Vuelve a escribir la misma clave'
        : `Faltan ${6 - activePin.length} dígitos`;

  const message = apiError
    ? apiError
    : mismatchError
      ? 'Las claves no coinciden. Empecemos de nuevo.'
      : weakPinError
        ? 'Evita 123456 o dígitos repetidos. Intenta con otra clave.'
        : submitting
          ? 'Creando tu cuenta de forma segura...'
          : hint;

  return (
    <Screen style={styles.screen}>
      <StepHeader onBack={handleBack} step={7} totalSteps={7} />

      <Text style={styles.title}>
        {stage === 'create' ? 'Crea tu clave de 6 dígitos' : 'Confirma tu clave'}
      </Text>
      <Text style={styles.subtitle}>
        {stage === 'create'
          ? 'La usarás para ingresar y autorizar operaciones. No uses fechas ni números seguidos.'
          : 'Ingrésala una vez más para estar seguros de que la escribiste bien.'}
      </Text>

      <View style={styles.dotsWrap}>
        <PinDots length={6} filled={activePin.length} />
      </View>
      <Text
        style={[styles.hint, (weakPinError || mismatchError || apiError) && styles.hintError]}
        accessibilityRole={weakPinError || mismatchError || apiError ? 'alert' : 'text'}
      >
        {message}
      </Text>

      <View style={styles.spacer} />

      <Keypad
        onKeyPress={handleKeyPress}
        disabled={submitting}
        randomize
        shuffleSeed={`${stage}-${attempt}`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  dotsWrap: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: '#6B7280',
    textAlign: 'center',
  },
  hintError: {
    color: colors.error,
  },
  spacer: {
    flex: 1,
  },
});
