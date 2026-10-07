import { useEffect, useMemo, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { AccountCard, getAccountCardWidth } from '@/src/components/AccountCard';
import { CardThemePicker } from '@/src/components/CardThemePicker';
import { useAuth } from '@/src/context/AuthContext';
import { useAccounts, useMovements } from '@/src/hooks/useAccounts';
import { getHideBalance, setHideBalance } from '@/src/services/preferences';
import { getCardThemeId, setCardThemeId } from '@/src/services/cardTheme';
import { DEFAULT_CARD_THEME_ID } from '@/src/constants/cardThemes';
import { formatMoney } from '@/src/utils/format';
import { pressableStyle } from '@/src/utils/pressed';
import { tapFeedback } from '@/src/utils/haptics';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

function EyeIcon({ open }: { open: boolean }) {
  const stroke = 'rgba(255,255,255,0.85)';
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke={stroke}
        strokeWidth={1.9}
        strokeLinejoin="round"
        fill="none"
      />
      {open ? (
        <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke={stroke} strokeWidth={1.9} fill="none" />
      ) : (
        <Path d="m4 4 16 16" stroke={stroke} strokeWidth={1.9} strokeLinecap="round" />
      )}
    </Svg>
  );
}

type QuickActionIconName = 'send' | 'qr' | 'topup' | 'receipt';
type CardControlIconName = 'pause' | 'eye' | 'limits' | 'palette';

const QUICK_ACTIONS: {
  icon: QuickActionIconName;
  label: string;
  caption: string;
  href?: '/(tabs)/qr' | '/(tabs)/pagos';
  bg: string;
  fg: string;
}[] = [
  { icon: 'send', label: 'Transferir', caption: 'A otro banco', bg: '#EAF1FF', fg: '#1D4ED8' },
  { icon: 'qr', label: 'Pagar QR', caption: 'Escanear', href: '/(tabs)/qr', bg: '#E9FBF4', fg: '#047857' },
  { icon: 'topup', label: 'Recargar', caption: 'Celular', bg: '#FFF3E6', fg: '#B45309' },
  { icon: 'receipt', label: 'Recibos', caption: 'Servicios', href: '/(tabs)/pagos', bg: '#F2EAFF', fg: '#7C3AED' },
];

export default function HomeScreen() {
  const { userName } = useAuth();
  const {
    data: accounts,
    error: accountsError,
    isError: accountsFailed,
    isLoading,
    isRefetching,
    refetch,
  } = useAccounts();
  const [hidden, setHidden] = useState(false);
  const [cardThemes, setCardThemes] = useState<Record<string, string>>({});
  const [customizingId, setCustomizingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = getAccountCardWidth(screenWidth);
  const primary = accounts?.[0];
  const { data: movementData } = useMovements(primary?.id ?? '', { limit: 8 });
  const recentMovements = useMemo(
    () => movementData?.pages.flatMap((page) => page.items) ?? [],
    [movementData],
  );
  const monthlyInsights = useMemo(() => {
    const now = new Date();
    const monthItems = recentMovements.filter((movement) => {
      const date = new Date(movement.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
    const spent = monthItems
      .filter((movement) => movement.direction === 'out')
      .reduce((total, movement) => total + Math.abs(movement.amount), 0);
    const income = monthItems
      .filter((movement) => movement.direction === 'in')
      .reduce((total, movement) => total + Math.abs(movement.amount), 0);

    return { spent, income, count: monthItems.length };
  }, [recentMovements]);

  useEffect(() => {
    void getHideBalance().then(setHidden);
  }, []);

  useEffect(() => {
    if (!accounts?.length) {
      return;
    }
    void Promise.all(accounts.map((account) => getCardThemeId(account.id))).then((themeIds) => {
      setCardThemes((prev) => {
        const next = { ...prev };
        accounts.forEach((account, index) => {
          next[account.id] = themeIds[index];
        });
        return next;
      });
    });
  }, [accounts]);

  function handleSelectTheme(accountId: string, themeId: string) {
    setCardThemes((prev) => ({ ...prev, [accountId]: themeId }));
    void setCardThemeId(accountId, themeId);
  }

  function toggleHidden() {
    setHidden((prev) => {
      void setHideBalance(!prev);
      return !prev;
    });
  }

  async function openCardData(accountId: string) {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        'Activa el bloqueo del celular',
        'Para ver los datos de tu tarjeta, primero configura PIN, Face ID o huella en tu teléfono.',
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
      router.push({
        pathname: '/(app)/cuenta/[id]',
        params: { id: accountId, tab: 'datos', unlocked: '1' },
      });
    }
  }

  const pendingActivation = primary?.status === 'PENDING_ACTIVATION';

  return (
    <Screen style={styles.screen} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      >
        {/* El header lleva su propio padding superior (useSafeAreaInsets) en
            vez de dejar que el SafeAreaView recorte antes de este punto —
            así el azul oscuro llega hasta el borde real de la pantalla, detrás
            de la hora/batería, en vez de dejar un corte con el fondo claro
            por defecto justo ahí (que es lo que se veía "mal encuadrado"). */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
          <Svg style={styles.headerGlow}>
            <Defs>
              <RadialGradient id="homeGlow" cx="85%" cy="0%" r="90%">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.4} />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#homeGlow)" />
          </Svg>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greetingEyebrow}>Cuenta verificada</Text>
              <Text style={styles.greeting}>Hola, {userName}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarLabel}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
          </View>

          {primary ? (
            <>
              <View style={styles.accountLabelRow}>
                <Text style={styles.accountLabel}>
                  {primary.productName.toUpperCase()} · {primary.accountNumber.replace(/\D/g, '').slice(-4)}
                </Text>
                <Pressable
                  style={pressableStyle(styles.hideToggle)}
                  onPress={toggleHidden}
                  accessibilityRole="button"
                  accessibilityLabel={hidden ? 'Mostrar saldo' : 'Ocultar saldo'}
                  hitSlop={8}
                >
                  <EyeIcon open={!hidden} />
                  <Text style={styles.hideToggleText}>{hidden ? 'Mostrar' : 'Ocultar'}</Text>
                </Pressable>
              </View>
              <Text style={styles.balance}>
                {hidden ? 'S/ ••••••' : formatMoney(primary.availableBalance, primary.currency)}
              </Text>
              {pendingActivation ? (
                <View style={styles.pendingPill}>
                  <Text style={styles.pendingPillText}>● Pendiente de activación</Text>
                </View>
              ) : (
                <Text style={styles.accountingBalance}>
                  Saldo contable {hidden ? '••••' : formatMoney(primary.accountingBalance, primary.currency)}
                </Text>
              )}
            </>
          ) : null}
        </View>

        <OfflineBanner />

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : accountsFailed ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No pudimos cargar tus cuentas</Text>
            <Text style={styles.emptyText}>
              {accountsError instanceof Error
                ? accountsError.message
                : 'Revisa tu conexión e inténtalo otra vez.'}
            </Text>
            <Button label="Reintentar" onPress={() => void refetch()} />
          </View>
        ) : primary && pendingActivation ? (
          <View style={styles.activateCard}>
            <Text style={styles.activateIcon}>🔓</Text>
            <View style={styles.activateTextWrap}>
              <Text style={styles.activateTitle}>Activa tu cuenta</Text>
              <Text style={styles.activateText}>
                Deposita {formatMoney(primary.activationDeposit || 50, primary.currency)} para
                empezar a usarla — transferencias, QR y todo lo demás.
              </Text>
            </View>
            <Button
              label={`Depositar ${formatMoney(primary.activationDeposit || 50, primary.currency)}`}
              onPress={() =>
                router.push({ pathname: '/(app)/activar-cuenta/[id]', params: { id: primary.id } })
              }
              style={styles.activateButton}
            />
          </View>
        ) : !primary ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aún no tienes cuentas</Text>
            <Text style={styles.emptyText}>Abre tu primera cuenta digital en minutos.</Text>
            <Button label="Abrir un producto" onPress={() => router.push('/(app)/abrir-cuenta')} />
          </View>
        ) : (
          <>
            <View style={styles.quickActionsCard}>
              {QUICK_ACTIONS.map((action) => (
                <Pressable
                  key={action.label}
                  style={pressableStyle(styles.quickAction)}
                  onPress={() => {
                    tapFeedback();
                    if (action.href) {
                      router.push(action.href);
                    } else {
                      Alert.alert('Quipupay', `${action.label} estará disponible próximamente.`);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.bg }]}>
                    <QuickActionIcon name={action.icon} color={action.fg} />
                  </View>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                  <Text style={styles.quickActionCaption}>{action.caption}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Tus tarjetas</Text>
                  <Text style={styles.sectionSubtitle}>Virtuales, seguras y personalizables.</Text>
                </View>
                <Pressable
                  style={pressableStyle(styles.headerAction)}
                  onPress={() => {
                    tapFeedback();
                    router.push('/(app)/abrir-cuenta');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir otro producto"
                >
                  <Text style={styles.headerActionText}>+ Crear</Text>
                </Pressable>
              </View>
              <ScrollView
                style={styles.cardsViewport}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={cardWidth + spacing.md}
                decelerationRate="fast"
                contentContainerStyle={[
                  styles.cardsScroll,
                  { paddingHorizontal: Math.max(spacing.xl, (screenWidth - cardWidth) / 2) },
                ]}
              >
                {accounts?.map((account) => (
                  <View key={account.id} style={[styles.cardStack, { width: cardWidth }]}>
                    <Pressable
                      style={pressableStyle(styles.cardWrap)}
                      onPress={() => {
                        tapFeedback();
                        router.push(`/(app)/cuenta/${account.id}`);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${account.alias ?? account.productName}, saldo ${formatMoney(account.availableBalance, account.currency)}`}
                    >
                      <AccountCard
                        account={account}
                        ownerName={userName}
                        hidden={hidden}
                        themeId={cardThemes[account.id]}
                        onCustomize={() => setCustomizingId(account.id)}
                      />
                    </Pressable>
                    <View style={styles.cardControls}>
                      <CardControl
                        icon="palette"
                        label="Diseñar"
                        onPress={() => {
                          tapFeedback();
                          setCustomizingId(account.id);
                        }}
                      />
                      <CardControl
                        icon="pause"
                        label="Pausar"
                        onPress={() => Alert.alert('QuipuPay', 'Pausa de tarjeta virtual estará disponible próximamente.')}
                      />
                      <CardControl
                        icon="eye"
                        label="Ver datos"
                        onPress={() => void openCardData(account.id)}
                      />
                      <CardControl
                        icon="limits"
                        label="Límites"
                        onPress={() => Alert.alert('QuipuPay', 'Configuración de límites estará disponible próximamente.')}
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Análisis</Text>
                  <Text style={styles.sectionSubtitle}>Resumen del mes con tus movimientos.</Text>
                </View>
                <Pressable
                  style={pressableStyle(styles.linkAction)}
                  onPress={() => router.push(`/(app)/cuenta/${primary.id}`)}
                  accessibilityRole="button"
                >
                  <Text style={styles.linkActionText}>Ver todo</Text>
                </Pressable>
              </View>
              <View style={styles.analyticsGrid}>
                <InsightCard
                  title="Gastos del mes"
                  value={formatMoney(monthlyInsights.spent, primary.currency)}
                  detail={`${monthlyInsights.count} movimientos analizados`}
                  tone="red"
                />
                <InsightCard
                  title="Ingresos"
                  value={formatMoney(monthlyInsights.income, primary.currency)}
                  detail="Flujo recibido"
                  tone="green"
                />
              </View>
              <View style={styles.securityStrip}>
                <View style={styles.securityIcon}>
                  <QuickActionIcon name="qr" color="#22C55E" />
                </View>
                <View style={styles.securityCopy}>
                  <Text style={styles.securityTitle}>Datos protegidos</Text>
                  <Text style={styles.securityText}>Tus datos de tarjeta se muestran solo dentro de sesión segura.</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <CardThemePicker
        visible={customizingId !== null}
        selectedThemeId={(customizingId && cardThemes[customizingId]) || DEFAULT_CARD_THEME_ID}
        onSelect={(themeId) => customizingId && handleSelectTheme(customizingId, themeId)}
        onClose={() => setCustomizingId(null)}
      />
    </Screen>
  );
}

function QuickActionIcon({ name, color, size = 22 }: { name: QuickActionIconName; color: string; size?: number }) {
  const strokeProps = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  switch (name) {
    case 'send':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...strokeProps} d="M5 12h13" />
          <Path {...strokeProps} d="m13 6 6 6-6 6" />
        </Svg>
      );
    case 'qr':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...strokeProps} x="4" y="4" width="6" height="6" rx="1.2" />
          <Rect {...strokeProps} x="14" y="4" width="6" height="6" rx="1.2" />
          <Rect {...strokeProps} x="4" y="14" width="6" height="6" rx="1.2" />
          <Path {...strokeProps} d="M14 14h2.5v2.5H20V20h-6Z" />
        </Svg>
      );
    case 'topup':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...strokeProps} x="7" y="3.5" width="10" height="17" rx="2.4" />
          <Path {...strokeProps} d="M12 7v7" />
          <Path {...strokeProps} d="m9.5 11.5 2.5 2.5 2.5-2.5" />
        </Svg>
      );
    case 'receipt':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...strokeProps} d="M6.5 3.5h11v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-1-.6Z" />
          <Path {...strokeProps} d="M9 8h6M9 12h6M9 16h3.5" />
        </Svg>
      );
  }
}

function CardControl({ icon, label, onPress }: { icon: CardControlIconName; label: string; onPress: () => void }) {
  return (
    <Pressable style={pressableStyle(styles.cardControl)} onPress={onPress} accessibilityRole="button">
      <View style={styles.cardControlIcon}>
        <CardControlIcon name={icon} />
      </View>
      <Text style={styles.cardControlLabel}>{label}</Text>
    </Pressable>
  );
}

function CardControlIcon({ name }: { name: CardControlIconName }) {
  const strokeProps = {
    stroke: colors.textPrimary,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  switch (name) {
    case 'palette':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path
            {...strokeProps}
            d="M12 3.5c-4.7 0-8.5 3.6-8.5 8 0 3 2.2 4.3 3.9 4.3.9 0 1.2-.5 1.2-1s-.3-.9-.3-1.6c0-1.4 1.2-2.5 2.7-2.5h2.4c2.6 0 4.6-1.8 4.6-4.3 0-3.3-3-6.9-6-6.9Z"
          />
          <Path d="M8 10.2h.01M11 7.5h.01M14.5 8.3h.01" stroke={colors.textPrimary} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'pause':
      return (
        <Svg width={19} height={19} viewBox="0 0 24 24">
          <Path {...strokeProps} d="M8 6v12M16 6v12" />
        </Svg>
      );
    case 'eye':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path {...strokeProps} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <Circle cx="12" cy="12" r="2.8" stroke={colors.textPrimary} strokeWidth={1.9} fill="none" />
        </Svg>
      );
    case 'limits':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path {...strokeProps} d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h10M18 17h2" />
          <Circle cx="15" cy="7" r="2" fill={colors.textPrimary} />
          <Circle cx="9" cy="12" r="2" fill={colors.textPrimary} />
          <Circle cx="16" cy="17" r="2" fill={colors.textPrimary} />
        </Svg>
      );
  }
}

function InsightCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: 'green' | 'red';
}) {
  const color = tone === 'green' ? '#047857' : '#BE123C';
  const bg = tone === 'green' ? '#ECFDF5' : '#FFF1F2';

  return (
    <View style={styles.insightCard}>
      <View style={[styles.insightDot, { backgroundColor: bg }]}>
        <View style={[styles.insightDotInner, { backgroundColor: color }]} />
      </View>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={[styles.insightValue, { color }]}>{value}</Text>
      <Text style={styles.insightDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.backgroundLight,
  },
  scrollContent: {
    paddingBottom: 118,
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerGlow: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingEyebrow: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: 'rgba(125,211,252,0.92)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  greeting: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginTop: 3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  accountLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  accountLabel: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.6,
  },
  hideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 26,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  hideToggleText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: 'rgba(255,255,255,0.85)',
  },
  balance: {
    fontSize: 36,
    fontWeight: typography.weights.bold,
    color: colors.white,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
    marginTop: spacing.xs,
  },
  accountingBalance: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: spacing.xs,
  },
  pendingPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.16)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.xs,
  },
  pendingPillText: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: '#FBBF24',
  },
  loader: {
    marginTop: spacing.xxl,
  },
  activateCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    marginTop: -spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  activateIcon: {
    fontSize: 32,
  },
  activateTextWrap: {
    alignItems: 'center',
    gap: 4,
  },
  activateTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  activateText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activateButton: {
    width: '100%',
    marginTop: spacing.sm,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    marginTop: -spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  quickActionsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.xl,
    marginTop: -spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
  },
  quickActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#EFF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  quickActionCaption: {
    fontSize: 9.5,
    fontWeight: typography.weights.medium,
    color: '#94A3B8',
    marginTop: 1,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm + 0.5,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  headerAction: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  linkAction: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  linkActionText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  cardsScroll: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
    alignItems: 'flex-start',
  },
  cardsViewport: {
    marginHorizontal: -spacing.xl,
  },
  cardStack: {
    gap: spacing.md,
  },
  cardWrap: {
    borderRadius: 22,
  },
  cardControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  cardControl: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardControlIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardControlLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#64748B',
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  insightCard: {
    flex: 1,
    minHeight: 124,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  insightDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  insightDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#64748B',
  },
  insightValue: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    marginTop: 5,
    fontVariant: ['tabular-nums'],
  },
  insightDetail: {
    fontSize: 11,
    lineHeight: 15,
    color: '#94A3B8',
    marginTop: 3,
  },
  securityStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  securityIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCopy: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  securityText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#64748B',
    marginTop: 2,
  },
});
