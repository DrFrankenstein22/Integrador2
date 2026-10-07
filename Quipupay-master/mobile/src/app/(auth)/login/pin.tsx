import { useCallback, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Keypad } from '@/src/components/Keypad';
import { PinDots } from '@/src/components/PinDots';
import { StepHeader } from '@/src/components/StepHeader';
import { useAuth } from '@/src/context/AuthContext';
import { loginUser } from '@/src/services/authApi';
import { applyKeypadInput } from '@/src/utils/keypad';
import { LOGIN_PIN_LENGTH } from '@/src/utils/loginPin';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function LoginPinScreen() {
  const { userName, signIn, signOut, lastDni } = useAuth();
  const [pin, setPin] = useState('');
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [message, setMessage] = useState('');
  const [locked, setLocked] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const verify = useCallback(
    async (fullPin: string) => {
      setVerifying(true);
      setMessage('Validando tu clave...');

      try {
        const session = await loginUser({ dni: lastDni, password: fullPin });

        signIn({ accessToken: session.accessToken, user: session.user });
        router.replace('/(tabs)');
      } catch (error) {
        const nextAttempts = attemptsUsed + 1;
        setAttemptsUsed(nextAttempts);
        setPin('');
        setVerifying(false);

        if (nextAttempts >= 3) {
          setLocked(true);
          setMessage('Cuenta bloqueada por 15 minutos. Intenta más tarde.');
          return;
        }

        const backendMessage = error instanceof Error ? error.message : 'Credenciales incorrectas';
        setMessage(`${backendMessage}. Te quedan ${3 - nextAttempts} intentos.`);
      }
    },
    [attemptsUsed, lastDni, signIn],
  );

  function handleKeyPress(key: string) {
    if (locked || verifying) {
      return;
    }
    setMessage('');
    const next = applyKeypadInput(pin, key, LOGIN_PIN_LENGTH);
    setPin(next);
    if (next.length === LOGIN_PIN_LENGTH) {
      void verify(next);
    }
  }

  return (
    <Screen style={styles.screen}>
      <StepHeader onBack={() => router.back()} step={1} totalSteps={1} />

      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{userName.charAt(0)}</Text>
        </View>
        <Text style={styles.title}>Ingresa tu clave</Text>
        <Text style={styles.subtitle}>6 dígitos</Text>
      </View>

      <View style={styles.dotsWrap}>
        <PinDots length={LOGIN_PIN_LENGTH} filled={pin.length} />
      </View>
      <Text
        style={[styles.message, message ? styles.messageError : styles.messageMuted]}
        accessibilityRole={message ? 'alert' : 'text'}
      >
        {message || (pin.length ? `Faltan ${LOGIN_PIN_LENGTH - pin.length} dígitos` : ' ')}
      </Text>

      <View style={styles.spacer} />

      <Keypad
        onKeyPress={handleKeyPress}
        disabled={locked || verifying}
        randomize
        shuffleSeed={attemptsUsed}
      />

      <Text
        style={styles.forgotLink}
        onPress={() => {
          // Este mismo componente se reutiliza desde la pantalla de bloqueo
          // (sesión guardada, ver `(locked)/pin`) — hay que cerrar sesión
          // antes de navegar a "olvidaste tu clave", si no la ruta de
          // (auth) queda bloqueada por el guard de la sesión bloqueada.
          signOut();
          router.push('/(auth)/login/recover');
        }}
        accessibilityRole="link"
      >
        ¿Olvidaste tu clave?
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 21,
    fontWeight: typography.weights.bold,
    color: '#1E40AF',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  dotsWrap: {
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 12.5,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
    minHeight: 18,
  },
  messageError: {
    color: colors.error,
  },
  messageMuted: {
    color: '#6B7280',
  },
  spacer: {
    flex: 1,
  },
  forgotLink: {
    fontSize: 12.5,
    fontWeight: typography.weights.bold,
    color: '#1E40AF',
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});
