import { useState } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { Keypad } from '@/src/components/Keypad';
import { StepHeader } from '@/src/components/StepHeader';
import { useRegistration } from '@/src/context/RegistrationContext';
import { lookupDni } from '@/src/services/identityApi';
import { isValidDni } from '@/src/utils/validation';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function DniScreen() {
  const {
    state,
    pressDniKey,
    toggleAcceptedTerms,
    setIdentity,
    clearIdentity,
  } = useRegistration();
  const [dniError, setDniError] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [loading, setLoading] = useState(false);

  const dniValid = isValidDni(state.dni);

  function handleKeyPress(key: string) {
    pressDniKey(key);
    clearIdentity();
    setDniError(false);
    setLookupError('');
  }

  async function handleContinue() {
    if (!dniValid) {
      setDniError(true);
      return;
    }

    if (!state.acceptedTerms) {
      setTermsError(true);
      return;
    }

    setLoading(true);
    setLookupError('');

    try {
      const identity = await lookupDni(state.dni);
      setIdentity({
        fullName: identity.fullName,
        firstName: identity.names,
        lastName: [identity.paternalSurname, identity.maternalSurname].filter(Boolean).join(' '),
      });
      router.push('/(auth)/register/confirm');
    } catch (error) {
      clearIdentity();
      setLookupError(
        error instanceof Error
          ? error.message
          : 'No fue posible validar el DNI. Intenta nuevamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <StepHeader onBack={() => router.back()} step={1} totalSteps={7} />

      <Text style={styles.title}>Ingresa tu número de DNI</Text>
      <Text style={styles.subtitle}>
        Validaremos tu identidad usando fuentes públicas disponibles para el entorno de demostración.
      </Text>

      <View
        style={[
          styles.dniBox,
          dniError && styles.dniBoxError,
          !dniError && state.dni.length > 0 && styles.dniBoxFilled,
        ]}
      >
        <Text style={[styles.dniLabel, dniError && styles.dniLabelError]}>
          Número de DNI
        </Text>
        <Text style={styles.dniValue}>{state.dni.split('').join(' ')}</Text>
      </View>
      {dniError && (
        <Text style={styles.errorText} accessibilityRole="alert">
          El DNI debe tener 8 dígitos. Revisa el número e inténtalo de nuevo.
        </Text>
      )}
      {!!lookupError && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {lookupError}
        </Text>
      )}

      <Pressable
        style={styles.termsRow}
        onPress={() => {
          toggleAcceptedTerms();
          setTermsError(false);
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state.acceptedTerms }}
      >
        <View style={[styles.checkbox, state.acceptedTerms && styles.checkboxChecked]}>
          {state.acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.termsText}>
          Acepto los <Text style={styles.termsLink}>Términos y Condiciones</Text> y la Política de Privacidad de datos.
        </Text>
      </Pressable>
      {termsError && (
        <Text style={styles.errorText} accessibilityRole="alert">
          Debes aceptar los Términos y Condiciones para continuar.
        </Text>
      )}

      <View style={styles.spacer} />

      <Button
        label={loading ? 'Validando DNI...' : 'Continuar'}
        onPress={() => void handleContinue()}
        disabled={loading}
      />
      <Keypad onKeyPress={handleKeyPress} disabled={loading} />
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
    marginBottom: spacing.xl,
  },
  dniBox: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dniBoxFilled: {
    borderColor: colors.primary,
  },
  dniBoxError: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  dniLabel: {
    fontSize: 10.5,
    fontWeight: typography.weights.semibold,
    color: '#6B7280',
  },
  dniLabelError: {
    color: colors.error,
  },
  dniValue: {
    fontSize: 20,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
    minHeight: 26,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    marginTop: spacing.sm,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    minHeight: 48,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
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
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  termsText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  termsLink: {
    color: '#1E40AF',
    fontWeight: typography.weights.bold,
  },
  spacer: {
    flex: 1,
  },
});
