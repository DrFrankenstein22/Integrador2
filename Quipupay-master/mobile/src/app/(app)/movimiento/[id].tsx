import { Text, View, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { TopBar } from '@/src/components/TopBar';
import { useMovement } from '@/src/hooks/useAccounts';
import type { MovementReceipt } from '@/src/services/accountsApi';
import { formatMoney } from '@/src/utils/format';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

function receiptHtml(receipt: MovementReceipt): string {
  const rows = [
    ['Comercio / contraparte', receipt.counterparty],
    ['Fecha y hora', new Date(receipt.date).toLocaleString('es-PE')],
    ['Medio', receipt.medium],
    ['Cuenta cargada', receipt.accountMasked],
    ['N° de operación', receipt.operationNumber],
    ['Estado', receipt.status],
  ];
  return `<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:32px">
    <h1 style="color:#0B1F3A">Quipupay · Comprobante</h1>
    <p style="font-size:28px;font-weight:700">${formatMoney(receipt.amount, receipt.currency)}</p>
    <table style="width:100%;border-collapse:collapse">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px 0;color:#6B7280">${k}</td><td style="padding:8px 0;text-align:right;font-weight:600">${v}</td></tr>`,
        )
        .join('')}
    </table>
    <p style="color:#9CA3AF;font-size:12px;margin-top:24px">Comprobante generado por la app académica Quipupay. No representa una operación bancaria real.</p>
  </body></html>`;
}

export default function MovementReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: receipt, isLoading, isError } = useMovement(id);

  async function download() {
    if (!receipt) {
      return;
    }
    try {
      const { uri } = await Print.printToFileAsync({ html: receiptHtml(receipt) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('Quipupay', 'Comprobante guardado.');
      }
    } catch {
      Alert.alert('Quipupay', 'No se pudo generar el comprobante.');
    }
  }

  return (
    <Screen style={styles.screen}>
      <TopBar onBack={() => router.back()} title="Detalle del movimiento" />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : isError || !receipt ? (
        <Text style={styles.error}>No pudimos cargar este movimiento.</Text>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={[styles.icon, receipt.direction === 'in' && styles.iconIn]}>
              <Text style={styles.iconLabel}>{receipt.direction === 'in' ? '↓' : '▣'}</Text>
            </View>
            <Text style={styles.amount}>{formatMoney(receipt.amount, receipt.currency)}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusLabel}>
                {receipt.status === 'COMPLETED' ? 'OPERACIÓN EXITOSA' : receipt.status}
              </Text>
            </View>

            <View style={styles.card}>
              <Row label="Comercio" value={receipt.counterparty} />
              <Row label="Fecha y hora" value={new Date(receipt.date).toLocaleString('es-PE')} />
              <Row label="Medio" value={receipt.medium} />
              <Row label="Cuenta cargada" value={receipt.accountMasked} />
              <Row label="N° de operación" value={receipt.operationNumber} />
            </View>
          </ScrollView>

          <View style={styles.actionsRow}>
            <Button label="Descargar" variant="secondary" style={styles.half} onPress={() => void download()} />
            <Button label="Compartir" variant="secondary" style={styles.half} onPress={() => void download()} />
          </View>
          <Text
            style={styles.reportLink}
            accessibilityRole="link"
            onPress={() => Alert.alert('Quipupay', 'Reporte enviado al equipo de soporte (simulado).')}
          >
            Reportar este movimiento
          </Text>
        </>
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  loader: { marginTop: spacing.xxl },
  error: { fontSize: typography.sizes.sm, color: colors.error, marginTop: spacing.lg },
  body: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconIn: {
    backgroundColor: '#ECFDF5',
  },
  iconLabel: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  amount: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: spacing.lg,
  },
  statusBadge: {
    marginTop: spacing.md,
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  card: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  half: {
    flex: 1,
  },
  reportLink: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
