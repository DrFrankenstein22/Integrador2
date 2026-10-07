import { Text, View, Pressable, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function RejectedScreen() {
  return (
    <Screen style={styles.screen}>
      <View style={styles.iconOuter}>
        <View style={styles.iconInner}>
          <Text style={styles.iconLabel}>!</Text>
        </View>
      </View>

      <Text style={styles.title}>No pudimos verificar tu identidad</Text>
      <Text style={styles.subtitle}>Tu selfie no coincide con la foto del DNI. Puedes intentarlo otra vez o continuar con un asesor.</Text>

      <View style={styles.errorBox}>
        <Text style={styles.errorText}>
          Código de error <Text style={styles.errorCode}>KYC-402</Text> · Intento 1 de 3. Tras el tercer intento el
          registro se bloquea por 24 horas.
        </Text>
      </View>

      <Button
        label="Volver a intentar"
        onPress={() => router.replace('/(auth)/register/selfie')}
        style={styles.retryButton}
      />
      <Pressable
        style={styles.advisorButton}
        onPress={() => Alert.alert('Quipupay', 'Comunícate con nuestro equipo de soporte.')}
        accessibilityRole="button"
      >
        <Text style={styles.advisorLabel}>Hablar con un asesor</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    color: colors.white,
    fontSize: 28,
    fontWeight: typography.weights.bold,
  },
  title: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 23,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  errorBox: {
    width: '100%',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  errorText: {
    fontSize: 12.5,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  errorCode: {
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  retryButton: {
    width: '100%',
    marginTop: spacing.xl,
  },
  advisorButton: {
    width: '100%',
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  advisorLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
});
