import { Text, View, Pressable, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScreen } from '@/src/components/KeyboardAwareScreen';
import { Button } from '@/src/components/Button';
import { TopBar } from '@/src/components/TopBar';
import { useProducts } from '@/src/hooks/useAccounts';
import { useAccountOpening } from '@/src/context/AccountOpeningContext';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

const CURRENCY_LABEL: Record<'PEN' | 'USD', string> = {
  PEN: 'Soles (S/)',
  USD: 'Dólares (US$)',
};

export default function ConfigureAccountScreen() {
  const { data: products } = useProducts();
  const { state, setCurrency, setAlias, toggleContract, toggleMarketing } = useAccountOpening();
  const product = products?.find((item) => item.code === state.productCode);
  const currencies = product?.currencies ?? ['PEN'];

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.screen}>
      <TopBar onBack={() => router.back()} step={1} totalSteps={2} />

      <Text style={styles.title}>Configura tu cuenta</Text>

      <Text style={styles.sectionLabel}>MONEDA</Text>
      <View style={styles.currencyRow}>
        {currencies.map((currency) => {
          const active = state.currency === currency;
          return (
            <Pressable
              key={currency}
              style={[styles.currencyChip, active && styles.currencyChipActive]}
              onPress={() => setCurrency(currency)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.currencyLabel, active && styles.currencyLabelActive]}>
                {CURRENCY_LABEL[currency]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.aliasField}>
        <Text style={styles.aliasLabel}>Alias de la cuenta (opcional)</Text>
        <TextInput
          value={state.alias}
          onChangeText={setAlias}
          placeholder="Mi cuenta de ahorros"
          placeholderTextColor="#9CA3AF"
          style={styles.aliasInput}
          maxLength={120}
          accessibilityLabel="Alias de la cuenta"
        />
      </View>

      <Pressable
        style={[styles.checkboxRow, state.acceptedContract && styles.checkboxRowActive]}
        onPress={toggleContract}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state.acceptedContract }}
      >
        <View style={[styles.checkbox, state.acceptedContract && styles.checkboxChecked]}>
          {state.acceptedContract ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.checkboxText}>
          Acepto el <Text style={styles.link}>contrato de la cuenta</Text>, el tarifario y la cláusula
          de datos personales.
        </Text>
      </Pressable>

      <Pressable
        style={styles.checkboxRow}
        onPress={toggleMarketing}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state.acceptedMarketing }}
      >
        <View style={[styles.checkbox, state.acceptedMarketing && styles.checkboxChecked]}>
          {state.acceptedMarketing ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.checkboxText}>
          Autorizo el uso de mis datos para ofertas comerciales (opcional).
        </Text>
      </Pressable>

      <View style={styles.spacer} />

      <Button
        label="Continuar"
        disabled={!state.acceptedContract}
        onPress={() => router.push('/(app)/abrir-cuenta/autorizar')}
      />
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#6B7280',
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  currencyChip: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#F5F8FF',
  },
  currencyLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  currencyLabelActive: {
    color: colors.primary,
  },
  aliasField: {
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: spacing.md,
  },
  aliasLabel: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: '#6B7280',
  },
  aliasInput: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: 4,
    padding: 0,
    minHeight: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  checkboxRowActive: {
    backgroundColor: colors.backgroundLight,
    borderColor: colors.backgroundLight,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  checkboxText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  link: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  spacer: {
    flex: 1,
  },
});
