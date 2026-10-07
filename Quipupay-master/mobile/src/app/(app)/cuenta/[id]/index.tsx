import { useMemo, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/src/components/Screen';
import { TopBar } from '@/src/components/TopBar';
import { MovementRow } from '@/src/components/MovementRow';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { useAccount, useMovements } from '@/src/hooks/useAccounts';
import type { Movement } from '@/src/services/accountsApi';
import { formatMoney, groupLabel } from '@/src/utils/format';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

type Filter = 'all' | 'in' | 'out';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'in', label: 'Ingresos' },
  { key: 'out', label: 'Egresos' },
];

export default function AccountDetailScreen() {
  const { id, tab: requestedTab, unlocked } = useLocalSearchParams<{
    id: string;
    tab?: string;
    unlocked?: string;
  }>();
  const [tab, setTab] = useState<'movimientos' | 'datos'>(
    requestedTab === 'datos' ? 'datos' : 'movimientos',
  );
  const [unlockedAccountId, setUnlockedAccountId] = useState<string | null>(
    unlocked === '1' ? id : null,
  );
  const [sensitiveVisible, setSensitiveVisible] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const insets = useSafeAreaInsets();

  const { data: account } = useAccount(id);
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMovements(id, { type: filter });

  const sections = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items) ?? [];
    const groups: { title: string; data: Movement[] }[] = [];
    items.forEach((movement) => {
      const label = groupLabel(movement.date);
      const group = groups.find((g) => g.title === label);
      if (group) {
        group.data.push(movement);
      } else {
        groups.push({ title: label, data: [movement] });
      }
    });
    return groups;
  }, [data]);

  const last4 = account?.accountNumber.replace(/\D/g, '').slice(-4) ?? '—';
  const datosUnlocked = unlocked === '1' || unlockedAccountId === id;

  async function unlockDatos() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        'Activa el bloqueo del celular',
        'Para ver los datos completos de tu tarjeta, primero configura PIN, Face ID o huella en tu teléfono.',
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirma tu identidad',
      fallbackLabel: 'Usar PIN',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });

    if (result.success) {
      setUnlockedAccountId(id);
    }
  }

  return (
    <Screen style={styles.screen} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TopBar
          onBack={() => router.back()}
          title={account?.alias ?? account?.productName ?? 'Cuenta'}
        />
        <Text style={styles.balanceLabel}>SALDO DISPONIBLE</Text>
        <Text style={styles.balance}>
          {account ? formatMoney(account.availableBalance, account.currency) : '—'}
        </Text>
        {account ? (
          <Text style={styles.meta}>
            {account.accountNumber} · CCI {account.cci.slice(0, 11)}…{account.cci.slice(-2)}
          </Text>
        ) : null}
      </View>

      <OfflineBanner />

      <View style={styles.tabs}>
        {(['movimientos', 'datos'] as const).map((key) => (
          <Pressable
            key={key}
            style={styles.tab}
            onPress={() => {
              setTab(key);
              if (key === 'datos' && !datosUnlocked) {
                void unlockDatos();
              }
            }}
          >
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>
              {key === 'movimientos' ? 'Movimientos' : 'Datos'}
            </Text>
            {tab === key ? <View style={styles.tabUnderline} /> : null}
          </Pressable>
        ))}
      </View>

      {tab === 'datos' && !datosUnlocked ? (
        <View style={styles.lockedBox}>
          <Text style={styles.lockedTitle}>Datos protegidos</Text>
          <Text style={styles.lockedText}>
            Confirma el PIN, Face ID o huella de tu celular para ver los datos de la tarjeta.
          </Text>
          <Pressable style={styles.unlockButton} onPress={() => void unlockDatos()} accessibilityRole="button">
            <Text style={styles.unlockButtonText}>Ver datos seguros</Text>
          </Pressable>
        </View>
      ) : tab === 'datos' ? (
        <SecureCardData
          account={account}
          last4={last4}
          sensitiveVisible={sensitiveVisible}
          onToggleSensitive={() => setSensitiveVisible((current) => !current)}
        />
      ) : (
        <>
          <View style={styles.filters}>
            {FILTERS.map((item) => (
              <Pressable
                key={item.key}
                style={[styles.chip, filter === item.key && styles.chipActive]}
                onPress={() => setFilter(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === item.key }}
              >
                <Text style={[styles.chipLabel, filter === item.key && styles.chipLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.searchChip}
              onPress={() => router.push(`/(app)/cuenta/${id}/buscar`)}
              accessibilityRole="button"
              accessibilityLabel="Buscar movimientos"
            >
              <Text style={styles.searchIcon}>⌕</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : sections.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aún no tienes movimientos</Text>
              <Text style={styles.emptyText}>Cuando recibas o envíes dinero, lo verás aquí.</Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              stickySectionHeadersEnabled={false}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
              }
              renderSectionHeader={({ section }) => (
                <Text style={styles.groupHeader}>{section.title}</Text>
              )}
              renderItem={({ item }) => (
                <MovementRow
                  movement={item}
                  onPress={() => router.push(`/(app)/movimiento/${item.id}`)}
                />
              )}
              onEndReachedThreshold={0.4}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  void fetchNextPage();
                }
              }}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <ActivityIndicator color={colors.primary} style={styles.footer} />
                ) : null
              }
            />
          )}
        </>
      )}
    </Screen>
  );
}

function SecureCardData({
  account,
  last4,
  sensitiveVisible,
  onToggleSensitive,
}: {
  account: ReturnType<typeof useAccount>['data'];
  last4: string;
  sensitiveVisible: boolean;
  onToggleSensitive: () => void;
}) {
  const virtualNumber = `4557 20${last4.padStart(4, '0')} 8842 ${last4.padStart(4, '0')}`;
  const maskedNumber = `•••• •••• •••• ${last4}`;
  const expiry = '09/31';
  const cvv = '742';

  return (
    <View style={styles.datosBox}>
      <View style={styles.secureHero}>
        <View style={styles.secureHeroGlow} />
        <View style={styles.secureHeroTop}>
          <View>
            <Text style={styles.secureEyebrow}>TARJETA VIRTUAL</Text>
            <Text style={styles.secureBrand}>QuipuPay</Text>
          </View>
          <View style={styles.secureStatus}>
            <Text style={styles.secureStatusText}>
              {account?.status === 'ACTIVE' ? 'Activa' : 'Pendiente'}
            </Text>
          </View>
        </View>
        <Text style={styles.secureNumber}>{sensitiveVisible ? virtualNumber : maskedNumber}</Text>
        <View style={styles.secureHeroBottom}>
          <View>
            <Text style={styles.secureLabel}>VENCE</Text>
            <Text style={styles.secureValue}>{sensitiveVisible ? expiry : '••/••'}</Text>
          </View>
          <View>
            <Text style={styles.secureLabel}>CVV</Text>
            <Text style={styles.secureValue}>{sensitiveVisible ? cvv : '•••'}</Text>
          </View>
          <Text style={styles.secureNetwork}>QP</Text>
        </View>
      </View>

      <Pressable style={styles.revealButton} onPress={onToggleSensitive} accessibilityRole="button">
        <Text style={styles.revealButtonText}>
          {sensitiveVisible ? 'Ocultar datos de tarjeta' : 'Mostrar datos de tarjeta'}
        </Text>
      </Pressable>

      <View style={styles.infoPanel}>
        <Text style={styles.panelTitle}>Datos para operar</Text>
        <DataRow label="Número de cuenta" value={account?.accountNumber ?? '—'} />
        <DataRow label="CCI interbancario" value={account?.cci ?? '—'} />
        <DataRow label="Moneda" value={account?.currency === 'USD' ? 'Dólares' : 'Soles'} />
        <DataRow label="Producto" value={account?.productName ?? '—'} />
        <DataRow
          label="Saldo contable"
          value={account ? formatMoney(account.accountingBalance, account.currency) : '—'}
        />
      </View>

      <View style={styles.securityNote}>
        <Text style={styles.securityNoteTitle}>Sesión segura</Text>
        <Text style={styles.securityNoteText}>
          Estos datos se muestran solo después de validar el bloqueo del celular.
        </Text>
      </View>
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
  },
  balance: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    color: colors.white,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
    marginTop: spacing.xs,
  },
  meta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  tabLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    width: '60%',
    backgroundColor: colors.primary,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: colors.primaryDark,
  },
  chipLabel: {
    fontSize: 12.5,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.white,
  },
  searchChip: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#9CA3AF',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  footer: {
    marginVertical: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  datosBox: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  secureHero: {
    minHeight: 188,
    borderRadius: 24,
    backgroundColor: '#071B33',
    padding: spacing.xl,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  secureHeroGlow: {
    position: 'absolute',
    right: -40,
    top: -36,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(37,99,235,0.42)',
  },
  secureHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  secureEyebrow: {
    fontSize: 10.5,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
    color: 'rgba(125,211,252,0.88)',
  },
  secureBrand: {
    fontSize: 21,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginTop: 2,
  },
  secureStatus: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  secureStatusText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#86EFAC',
  },
  secureNumber: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: typography.weights.bold,
    color: colors.white,
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
  },
  secureHeroBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xl,
  },
  secureLabel: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.5)',
  },
  secureValue: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  secureNetwork: {
    marginLeft: 'auto',
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: 'rgba(255,255,255,0.82)',
  },
  revealButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  infoPanel: {
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.lg,
    gap: spacing.md,
  },
  panelTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  securityNote: {
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: spacing.lg,
  },
  securityNoteTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#047857',
  },
  securityNoteText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#047857',
    marginTop: 3,
  },
  lockedBox: {
    margin: spacing.xl,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.xl,
    gap: spacing.md,
  },
  lockedTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  lockedText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  unlockButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dataLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  dataValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
});
