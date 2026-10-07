import { useCallback, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/src/components/Screen';
import { Keypad } from '@/src/components/Keypad';
import { PinDots } from '@/src/components/PinDots';
import { TopBar } from '@/src/components/TopBar';
import { useAccount, accountKeys } from '@/src/hooks/useAccounts';
import { activateAccount } from '@/src/services/accountsApi';
import { applyKeypadInput } from '@/src/utils/keypad';
import { formatMoney } from '@/src/utils/format';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function ActivateAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: account } = useAccount(id);
  const queryClient = useQueryClient();
  const [pin, setPin] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = useCallback(
    async (fullPin: string) => {
      setSubmitting(true);
      setError('');

      try {
        await activateAccount(id, fullPin);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: accountKeys.all }),
          queryClient.invalidateQueries({ queryKey: accountKeys.detail(id) }),
        ]);
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo activar tu cuenta.');
        setPin('');
        setSubmitting(false);
        setAttempt((a) => a + 1);
      }
    },
    [id, queryClient],
  );

  function handleKey(key: string) {
    if (submitting) {
      return;
    }
    setError('');
    const next = applyKeypadInput(pin, key, 6);
    setPin(next);
    if (next.length === 6) {
      void submit(next);
    }
  }

  const depositAmount = account
    ? formatMoney(account.activationDeposit || 50, account.currency)
    : '';

  if (done) {
    return (
      <Screen style={styles.doneScreen}>
        <View style={styles.doneIconOuter}>
          <View style={styles.doneIconInner}>
            <Text style={styles.doneIconLabel}>✓</Text>
          </View>
        </View>
        <Text style={styles.doneTitle}>¡Cuenta activada!</Text>
        <Text style={styles.doneSubtitle}>
          Depositamos {depositAmount} en tu cuenta. Ya puedes usarla para todo.
        </Text>
        <View style={styles.spacer} />
        <Text
          style={styles.doneLink}
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="link"
        >
          Ir al inicio →
        </Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <TopBar onBack={() => router.back()} title="Activar cuenta" />

      <Text style={styles.title}>Deposita {depositAmount || 'S/ 50.00'} para activarla</Text>
      <Text style={styles.subtitle}>
        Toda cuenta de ahorros Quipupay necesita un primer depósito para quedar habilitada.
        Ingresa tu clave de 6 dígitos para confirmarlo.
      </Text>

      {account ? (
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cuenta</Text>
            <Text style={styles.summaryValue}>{account.accountNumber}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Depósito de activación</Text>
            <Text style={styles.summaryValue}>{depositAmount}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.dots}>
        <PinDots length={6} filled={pin.length} />
      </View>
      <Text
        style={[styles.hint, error ? styles.hintError : null]}
        accessibilityRole={error ? 'alert' : 'text'}
      >
        {error || (submitting ? 'Activando tu cuenta...' : 'Ingresa tu clave de 6 dígitos')}
      </Text>

      <View style={styles.spacer} />

      <Keypad onKeyPress={handleKey} disabled={submitting} randomize shuffleSeed={attempt} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xxl,
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
  summary: {
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  dots: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 12.5,
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
  doneScreen: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
    alignItems: 'center',
  },
  doneIconOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  doneIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneIconLabel: {
    color: colors.white,
    fontSize: 28,
    fontWeight: typography.weights.bold,
  },
  doneTitle: {
    fontSize: 25,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  doneSubtitle: {
    fontSize: 14.5,
    lineHeight: 23,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  doneLink: {
    fontSize: 13.5,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.xl,
  },
});
