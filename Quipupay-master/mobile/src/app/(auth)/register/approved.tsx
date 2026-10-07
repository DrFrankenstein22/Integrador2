import { Text, View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { useAuth } from '@/src/context/AuthContext';
import { useRegistration } from '@/src/context/RegistrationContext';
import { formatMoney } from '@/src/utils/format';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function ApprovedScreen() {
  const { signIn } = useAuth();
  const { state } = useRegistration();
  const account = state.createdAccount;
  const pendingActivation = account?.status === 'PENDING_ACTIVATION';

  function goHome() {
    signIn();
    router.replace('/(tabs)');
  }

  function goActivate() {
    signIn();
    if (account) {
      router.replace({ pathname: '/(app)/activar-cuenta/[id]', params: { id: account.id } });
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.iconOuter}>
        <View style={styles.iconInner}>
          <Text style={styles.iconLabel}>✓</Text>
        </View>
      </View>

      <Text style={styles.title}>Identidad verificada</Text>
      <Text style={styles.subtitle}>
        {state.fullName ? `${state.fullName.split(' ')[0]}, tu` : 'Tu'} cuenta de ahorros Quipupay
        ya se creó.
        {state.email ? ` Te enviamos el comprobante a ${state.email}.` : ''}
      </Text>

      {account ? (
        <View style={styles.accountCard}>
          <Text style={styles.accountLabel}>CUENTA DE AHORROS · {account.currency}</Text>
          <Text style={styles.accountNumber}>{account.accountNumber}</Text>
          <Text style={styles.accountCci}>CCI {account.cci}</Text>
          {pendingActivation ? (
            <View style={styles.activationNotice}>
              <Text style={styles.activationNoticeText}>
                Falta un paso: deposita{' '}
                <Text style={styles.activationAmount}>
                  {formatMoney(account.activationDeposit || 50, account.currency)}
                </Text>{' '}
                para activarla.
              </Text>
            </View>
          ) : (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Saldo disponible</Text>
              <Text style={styles.balanceValue}>
                {formatMoney(account.availableBalance, account.currency)}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.accountCard}>
          <Text style={styles.accountLabel}>CUENTA DE AHORROS</Text>
          <Text style={styles.accountPending}>
            Tu cuenta se está creando. La verás lista al entrar al inicio.
          </Text>
        </View>
      )}

      <View style={styles.deviceNotice}>
        <Text style={styles.deviceNoticeIcon}>🔒</Text>
        <Text style={styles.deviceNoticeText}>
          Vinculamos este teléfono a tu cuenta. La próxima vez que ingreses desde aquí, lo
          reconoceremos.
        </Text>
      </View>

      {pendingActivation ? (
        <>
          <Button
            label={`Depositar ${formatMoney(account.activationDeposit || 50, account.currency)} y activar`}
            onPress={goActivate}
            style={styles.startButton}
          />
          <Pressable onPress={goHome} accessibilityRole="link" style={styles.laterLink}>
            <Text style={styles.laterLinkText}>Lo hago más tarde</Text>
          </Pressable>
        </>
      ) : (
        <Button label="Empezar a usar Quipupay" onPress={goHome} style={styles.startButton} />
      )}
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
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondary,
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
  accountCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  accountLabel: {
    fontSize: 10.5,
    fontWeight: typography.weights.semibold,
    color: '#6B7280',
  },
  accountNumber: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  accountCci: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginTop: 6,
  },
  accountPending: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 6,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  balanceLabel: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.secondary,
  },
  activationNotice: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  activationNoticeText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  activationAmount: {
    fontWeight: typography.weights.bold,
    color: colors.warning,
  },
  laterLink: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  laterLinkText: {
    fontSize: 12.5,
    fontWeight: typography.weights.bold,
    color: '#6B7280',
    textAlign: 'center',
  },
  deviceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  deviceNoticeIcon: {
    fontSize: 16,
  },
  deviceNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#1E40AF',
    fontWeight: typography.weights.medium,
  },
  startButton: {
    width: '100%',
    marginTop: spacing.xl,
  },
});
