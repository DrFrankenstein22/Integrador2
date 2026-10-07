import { Text, View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { useAccountOpening } from '@/src/context/AccountOpeningContext';
import { formatMoney } from '@/src/utils/format';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function AccountReadyScreen() {
  const { state, reset } = useAccountOpening();
  const account = state.createdAccount;

  async function copy() {
    if (!account) {
      return;
    }
    await Clipboard.setStringAsync(`${account.accountNumber} · CCI ${account.cci}`);
    Alert.alert('Quipupay', 'Datos de la cuenta copiados');
  }

  async function share() {
    if (!account) {
      return;
    }
    const text = `Mi cuenta Quipupay: ${account.accountNumber} · CCI ${account.cci}`;
    if (await Sharing.isAvailableAsync()) {
      await Clipboard.setStringAsync(text);
    }
    Alert.alert('Quipupay', 'Listo para compartir');
  }

  const pendingActivation = account?.status === 'PENDING_ACTIVATION';

  function goToAccount() {
    reset();
    router.replace('/(tabs)');
  }

  function goActivate() {
    if (!account) {
      return;
    }
    reset();
    router.replace({ pathname: '/(app)/activar-cuenta/[id]', params: { id: account.id } });
  }

  if (!account) {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>No encontramos la cuenta</Text>
        <Button label="Volver al inicio" onPress={() => router.replace('/(tabs)')} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.body}>
        <View style={styles.badge}>
          <Text style={styles.badgeMark}>✓</Text>
        </View>
        <Text style={styles.title}>Tu cuenta está lista</Text>
        <Text style={styles.subtitle}>
          {pendingActivation
            ? `Falta un paso: deposita ${formatMoney(account.activationDeposit || 50, account.currency)} para activarla. El contrato quedó guardado en Documentos.`
            : 'Ya puedes recibir dinero. El contrato quedó guardado en Documentos.'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>NÚMERO DE CUENTA</Text>
          <Text style={styles.cardValue}>{account.accountNumber}</Text>
          <View style={styles.divider} />
          <Text style={styles.cardLabel}>CCI (interbancario)</Text>
          <Text style={styles.cardValue}>{account.cci}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Button label="Copiar" variant="secondary" style={styles.half} onPress={() => void copy()} />
        <Button label="Compartir" variant="secondary" style={styles.half} onPress={() => void share()} />
      </View>
      {pendingActivation ? (
        <Button
          label={`Depositar ${formatMoney(account.activationDeposit || 50, account.currency)} y activar`}
          onPress={goActivate}
        />
      ) : (
        <Button label="Ir a mi cuenta" onPress={goToAccount} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMark: {
    fontSize: 40,
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  card: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: spacing.lg,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  half: {
    flex: 1,
  },
});
