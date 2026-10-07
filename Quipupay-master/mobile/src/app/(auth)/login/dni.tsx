import { useState } from 'react';
import { Text, TextInput, View, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScreen } from '@/src/components/KeyboardAwareScreen';
import { Button } from '@/src/components/Button';
import { StepHeader } from '@/src/components/StepHeader';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function LoginIdentificationScreen() {
  const { lastDni, setLoginDni } = useAuth();
  const [dni, setDni] = useState(lastDni);
  const [error, setError] = useState('');

  function handleContinue() {
    const normalizedDni = dni.trim();

    if (!/^\d{8}$/.test(normalizedDni)) {
      setError('Ingresa un DNI válido de 8 dígitos.');
      return;
    }

    setLoginDni(normalizedDni);
    router.push('/(auth)/login/pin');
  }

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.screen}>
      <StepHeader onBack={() => router.back()} step={1} totalSteps={2} />

      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Image
            source={require('@/assets/images/quipupay-icon.png')}
            style={styles.iconImage}
            accessibilityLabel="Quipupay"
          />
        </View>
        <Text style={styles.title}>Ingresa a Quipupay</Text>
        <Text style={styles.subtitle}>Primero necesitamos identificarte con tu DNI.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>DNI</Text>
        <TextInput
          value={dni}
          onChangeText={(value) => {
            setDni(value.replace(/\D/g, '').slice(0, 8));
            setError('');
          }}
          keyboardType="number-pad"
          maxLength={8}
          placeholder="12345678"
          placeholderTextColor="#6B7280"
          style={[styles.input, Boolean(error) && styles.inputError]}
          accessibilityLabel="Número de DNI"
          accessibilityHint="Ingresa los 8 dígitos de tu DNI"
        />
        {error ? (
          <Text style={styles.errorText} accessibilityRole="alert">
            {error}
          </Text>
        ) : (
          <Text style={styles.helperText}>Usaremos este DNI para validar tu cuenta.</Text>
        )}
      </View>

      <View style={styles.spacer} />

      <Button label="Continuar" onPress={handleContinue} />
      <Text
        style={styles.forgotLink}
        onPress={() => router.push('/(auth)/login/recover')}
        accessibilityRole="link"
      >
        ¿Olvidaste tu clave?
      </Text>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconImage: {
    width: 64,
    height: 64,
    borderRadius: 20,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  form: {
    marginTop: spacing.xxl,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    letterSpacing: 2,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  forgotLink: {
    fontSize: 12.5,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
