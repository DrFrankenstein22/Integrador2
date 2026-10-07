import { useMemo } from 'react';
import { Text, View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { useAccounts } from '@/src/hooks/useAccounts';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function QrScreen() {
  const { data: accounts, isLoading } = useAccounts();
  const account = accounts?.[0];

  const payload = useMemo(() => {
    if (!account) {
      return '';
    }
    return JSON.stringify({
      cci: account.cci.replace(/\s/g, ''),
      account: account.accountNumber,
      currency: account.currency,
      holder: account.alias ?? account.productName,
    });
  }, [account]);

  async function copyCci() {
    if (!account) {
      return;
    }
    await Clipboard.setStringAsync(account.cci);
    Alert.alert('Quipupay', 'CCI copiado al portapapeles');
  }

  async function share() {
    if (!account) {
      return;
    }
    if (await Sharing.isAvailableAsync()) {
      await Clipboard.setStringAsync(
        `Te comparto mi CCI de Quipupay: ${account.cci} (${account.accountNumber})`,
      );
      Alert.alert('Quipupay', 'Datos copiados para compartir');
    }
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Recibir dinero con mi QR</Text>
      <Text style={styles.subtitle}>
        Muestra este código o comparte tu CCI para recibir transferencias.
      </Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : account ? (
        <View style={styles.card}>
          <View style={styles.qrBox}>
            <QRCode
              value={payload || account.accountNumber}
              size={196}
              logo={require('@/assets/images/quipupay-icon.png')}
              logoSize={40}
              logoBorderRadius={10}
              logoBackgroundColor={colors.white}
              logoMargin={3}
            />
          </View>
          <Text style={styles.holder}>{account.alias ?? account.productName}</Text>
          <Text style={styles.accountNumber}>{account.accountNumber}</Text>
          <View style={styles.cciPill}>
            <Text style={styles.cci}>CCI {account.cci}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>▣</Text>
          <Text style={styles.emptyTitle}>Aún no tienes un QR</Text>
          <Text style={styles.empty}>Abre una cuenta para generar tu QR de cobro.</Text>
        </View>
      )}

      <View style={styles.spacer} />

      {account ? (
        <View style={styles.actions}>
          <Button label="Copiar CCI" variant="secondary" onPress={() => void copyCci()} />
          <Button label="Compartir" onPress={() => void share()} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 118,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  loader: {
    marginTop: spacing.xxl * 2,
  },
  card: {
    marginTop: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  qrBox: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  holder: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  accountNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  cciPill: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  cci: {
    fontSize: 12,
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
  },
  emptyCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyIcon: {
    fontSize: 32,
    color: '#9CA3AF',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  empty: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  actions: {
    gap: spacing.md,
  },
});
