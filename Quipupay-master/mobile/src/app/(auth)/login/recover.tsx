import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { mockAccount } from '@/src/constants/mockAccount';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

const STEPS = [
  { number: '1', title: 'Confirma tu DNI', detail: mockAccount.dni },
  { number: '2', title: 'Verificación facial', detail: 'Una selfie para confirmar que eres tú.' },
  { number: '3', title: 'Código enviado por SMS', detail: 'Al +51 ••• ••• 321' },
];

export default function RecoverAccessScreen() {
  return (
    <Screen style={styles.screen}>
      <Text style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver">
        {'←'}
      </Text>

      <Text style={styles.title}>Recuperar acceso</Text>
      <Text style={styles.subtitle}>Verificaremos tu identidad y podrás crear una nueva clave de 6 dígitos.</Text>

      <View style={styles.steps}>
        {STEPS.map((step, index) => (
          <View key={step.number} style={[styles.step, index === 0 && styles.stepActive]}>
            <View style={[styles.stepBadge, index === 0 && styles.stepBadgeActive]}>
              <Text style={[styles.stepBadgeLabel, index === 0 && styles.stepBadgeLabelActive]}>{step.number}</Text>
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDetail}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>Por seguridad, tu clave anterior se desactiva al iniciar este proceso.</Text>
      </View>

      <View style={styles.spacer} />

      <Button label="Comenzar verificación" onPress={() => router.replace('/(auth)/login/dni')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  back: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    height: 44,
    lineHeight: 44,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  steps: {
    gap: spacing.md,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  stepActive: {
    borderColor: colors.primary,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeActive: {
    backgroundColor: colors.primary,
  },
  stepBadgeLabel: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#6B7280',
  },
  stepBadgeLabelActive: {
    color: colors.white,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  stepDetail: {
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 3,
  },
  notice: {
    marginTop: spacing.lg,
    backgroundColor: '#EFF4FF',
    borderRadius: 12,
    padding: spacing.md,
  },
  noticeText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#92400E',
  },
  spacer: {
    flex: 1,
  },
});
