import { useCallback, useEffect, useState } from 'react';
import { Text, View, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Keypad } from '@/src/components/Keypad';
import { PinDots } from '@/src/components/PinDots';
import { StepHeader } from '@/src/components/StepHeader';
import { useRegistration } from '@/src/context/RegistrationContext';
import { requestPhoneOtp, verifyPhoneOtp } from '@/src/services/identityApi';
import { applyKeypadInput } from '@/src/utils/keypad';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function VerifyPhoneScreen() {
  const { state, setOtpChallenge, markPhoneVerified } = useRegistration();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const masked = state.phone.replace(/^(\d{3})\d{4}(\d{2})$/, '$1 ••• $2');

  const sendCode = useCallback(async () => {
    setSending(true);
    setError(false);
    setMessage('Enviando código...');
    try {
      const result = await requestPhoneOtp(state.phone);
      setOtpChallenge(result.challengeId);
      setCode('');
      if (result.devCode) {
        setMessage(`Código de prueba: ${result.devCode}`);
        Alert.alert('Modo demo', `Tu código de verificación es ${result.devCode}`);
      } else {
        setMessage('Te enviamos un SMS con el código.');
      }
    } catch {
      setError(true);
      setMessage('No se pudo enviar el código. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  }, [state.phone, setOtpChallenge]);

  useEffect(() => {
    const timer = setTimeout(() => void sendCode(), 0);
    return () => clearTimeout(timer);
  }, [sendCode]);

  function handleKey(key: string) {
    if (verifying || sending) {
      return;
    }
    setError(false);
    const next = applyKeypadInput(code, key, 6);
    setCode(next);

    if (next.length === 6 && state.otpChallengeId) {
      setVerifying(true);
      setMessage('Verificando...');
      void (async () => {
        try {
          await verifyPhoneOtp(state.otpChallengeId as string, next);
          markPhoneVerified();
          router.push('/(auth)/register/document');
        } catch (err) {
          setError(true);
          setMessage(err instanceof Error ? err.message : 'Código incorrecto.');
          setCode('');
        } finally {
          setVerifying(false);
        }
      })();
    }
  }

  return (
    <Screen style={styles.screen}>
      <StepHeader onBack={() => router.back()} step={4} totalSteps={7} />

      <Text style={styles.title}>Verifica tu celular</Text>
      <Text style={styles.subtitle}>
        Ingresa el código de 6 dígitos que enviamos al {masked || 'número registrado'}.
      </Text>

      <View style={styles.dots}>
        <PinDots length={6} filled={code.length} />
      </View>
      <Text
        style={[styles.message, error ? styles.messageError : styles.messageMuted]}
        accessibilityRole={error ? 'alert' : 'text'}
      >
        {message || ' '}
      </Text>

      <Pressable
        onPress={() => void sendCode()}
        disabled={sending || verifying}
        accessibilityRole="button"
      >
        <Text style={styles.resend}>Reenviar código</Text>
      </Pressable>

      <View style={styles.spacer} />

      <Keypad onKeyPress={handleKey} disabled={sending || verifying} />
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
  dots: {
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
  resend: {
    fontSize: 12.5,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  spacer: {
    flex: 1,
  },
});
