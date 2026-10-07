import { useState } from 'react';
import { Text, View, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScreen } from '@/src/components/KeyboardAwareScreen';
import { Button } from '@/src/components/Button';
import { StepHeader } from '@/src/components/StepHeader';
import { useRegistration } from '@/src/context/RegistrationContext';
import { isValidEmail, isValidPeruPhone } from '@/src/utils/validation';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function ConfirmScreen() {
  const { state, setEmail, setPhone } = useRegistration();
  const [emailError, setEmailError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  function handleContinue() {
    const emailValid = isValidEmail(state.email);
    const phoneValid = isValidPeruPhone(state.phone);

    setEmailError(!emailValid);
    setPhoneError(!phoneValid);

    if (emailValid && phoneValid && state.identityVerified) {
      router.push('/(auth)/register/verify-email');
    }
  }

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.screen}>
      <StepHeader onBack={() => router.back()} step={2} totalSteps={7} />

      <Text style={styles.title}>Confirma tus datos</Text>
      <Text style={styles.subtitle}>
        La identidad fue validada con la fuente pública configurada. Solo correo y celular son editables.
      </Text>

      <View style={styles.fields}>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>Nombre completo</Text>
          <Text style={styles.readOnlyValue}>
            {state.fullName || 'Identidad no validada'}
          </Text>
        </View>

        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>DNI</Text>
          <Text style={styles.readOnlyValue}>{state.dni}</Text>
        </View>

        <View>
          <View style={[styles.editableField, emailError && styles.editableFieldError]}>
            <Text style={[styles.editableLabel, emailError && styles.editableLabelError]}>
              Correo electrónico
            </Text>
            <TextInput
              value={state.email}
              onChangeText={(value) => {
                setEmail(value);
                setEmailError(false);
              }}
              style={styles.editableInput}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              importantForAutofill="yes"
              placeholder="tu@correo.com"
              accessibilityLabel="Correo electrónico"
            />
          </View>
          {emailError && (
            <Text style={styles.errorText} accessibilityRole="alert">
              Ingresa un correo electrónico válido.
            </Text>
          )}
        </View>

        <View>
          <View style={[styles.editableField, phoneError && styles.editableFieldError]}>
            <Text style={[styles.editableLabel, phoneError && styles.editableLabelError]}>
              Celular
            </Text>
            <TextInput
              value={state.phone}
              onChangeText={(value) => {
                // El autocompletado del teléfono a veces trae el +51 delante
                // (viene de la libreta de contactos) — se normaliza igual
                // que `isValidPeruPhone` para no terminar mandando 11
                // dígitos al backend, que solo acepta 9.
                let digits = value.replace(/\D/g, '');
                if (digits.length > 9 && digits.startsWith('51')) {
                  digits = digits.slice(2);
                }
                setPhone(digits.slice(0, 9));
                setPhoneError(false);
              }}
              style={styles.editableInput}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              importantForAutofill="yes"
              maxLength={11}
              placeholder="987654321"
              accessibilityLabel="Celular"
            />
          </View>
          {phoneError && (
            <Text style={styles.errorText} accessibilityRole="alert">
              El celular debe tener 9 dígitos y empezar en 9.
            </Text>
          )}
        </View>
      </View>

      <View style={styles.spacer} />

      <Button label="Continuar" onPress={handleContinue} disabled={!state.identityVerified} />
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
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
    marginBottom: spacing.lg,
  },
  fields: {
    gap: spacing.md,
  },
  readOnlyField: {
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    padding: spacing.md,
  },
  readOnlyLabel: {
    fontSize: 10.5,
    fontWeight: typography.weights.semibold,
    color: '#6B7280',
  },
  readOnlyValue: {
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  editableField: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
  },
  editableFieldError: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  editableLabel: {
    fontSize: 10.5,
    fontWeight: typography.weights.semibold,
    color: '#1E40AF',
  },
  editableLabelError: {
    color: colors.error,
  },
  editableInput: {
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: 2,
    padding: 0,
    minHeight: 24,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    marginTop: spacing.xs,
  },
  spacer: {
    flex: 1,
  },
});
