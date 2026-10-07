import { useCallback, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/src/components/Screen';
import { Keypad } from '@/src/components/Keypad';
import { PinDots } from '@/src/components/PinDots';
import { TopBar } from '@/src/components/TopBar';
import { useProducts, accountKeys } from '@/src/hooks/useAccounts';
import { useAccountOpening } from '@/src/context/AccountOpeningContext';
import { openAccount } from '@/src/services/accountsApi';
import { applyKeypadInput } from '@/src/utils/keypad';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function AuthorizeAccountScreen() {
  const { data: products } = useProducts();
  const { state, setCreatedAccount } = useAccountOpening();
  const queryClient = useQueryClient();
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const product = products?.find((item) => item.code === state.productCode);

  const submit = useCallback(
    async (fullPin: string) => {
      setSubmitting(true);
      setError('');

      try {
        const account = await openAccount({
          productCode: state.productCode ?? '',
          currency: state.currency,
          alias: state.alias.trim() || undefined,
          acceptedContract: state.acceptedContract,
          pin: fullPin,
        });

        setCreatedAccount(account);
        await queryClient.invalidateQueries({ queryKey: accountKeys.all });
        router.replace('/(app)/abrir-cuenta/lista');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo abrir la cuenta.');
        setPin('');
        setSubmitting(false);
        setAttempt((a) => a + 1);
      }
    },
    [
      state.productCode,
      state.currency,
      state.alias,
      state.acceptedContract,
      setCreatedAccount,
      queryClient,
    ],
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

  return (
    <Screen style={styles.screen}>
      <TopBar onBack={() => router.back()} step={2} totalSteps={2} />

      <Text style={styles.title}>Autoriza la apertura</Text>
      <Text style={styles.subtitle}>Ingresa tu clave de 6 dígitos para firmar el contrato.</Text>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Producto</Text>
          <Text style={styles.summaryValue}>{product?.name ?? '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Moneda</Text>
          <Text style={styles.summaryValue}>{state.currency === 'PEN' ? 'Soles' : 'Dólares'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Mantenimiento</Text>
          <Text style={styles.summaryValue}>
            {state.currency === 'PEN' ? 'S/ ' : 'US$ '}
            {(product?.maintenanceFee ?? 0).toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.dots}>
        <PinDots length={6} filled={pin.length} />
      </View>
      <Text style={[styles.hint, error ? styles.hintError : null]} accessibilityRole={error ? 'alert' : 'text'}>
        {error || (submitting ? 'Abriendo tu cuenta...' : 'O usa tu huella digital')}
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
});
