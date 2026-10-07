import { Image, Pressable, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { Account } from '../services/accountsApi';
import { getCardTheme, type CardTheme } from '../constants/cardThemes';
import { formatMoney } from '../utils/format';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';

// El diseño base usa coordenadas fijas, pero el ancho real se calcula con
// la pantalla. La tarjeta debe llegar hasta el espacio visible, no dejar una
// franja externa que parezca sombra o glow.
const DESIGN_WIDTH = 318;
const DESIGN_HEIGHT = 240;
const CARD_HEIGHT = 252;
const CARD_MAX_WIDTH = 430;

/** Mismo cálculo lo usan AccountCard y la pantalla de Inicio (para el
 * carrusel y el snap del scroll), así nunca quedan desalineados. */
export function getAccountCardWidth(screenWidth: number): number {
  return Math.min(screenWidth - spacing.xl * 2, CARD_MAX_WIDTH);
}

export function AccountCard({
  account,
  ownerName,
  hidden,
  themeId,
  onCustomize,
}: {
  account: Account;
  ownerName: string;
  hidden: boolean;
  themeId?: string;
  onCustomize?: () => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = getAccountCardWidth(screenWidth);
  const theme = getCardTheme(themeId);
  const last4 = account.accountNumber.replace(/\D/g, '').slice(-4);
  const isActive = account.status === 'ACTIVE';
  const svgId = `${theme.id}-${account.id.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View style={[styles.card, { width: cardWidth, backgroundColor: theme.gradient[1] }]}>
      <Svg
        width={cardWidth}
        height={CARD_HEIGHT}
        viewBox={`0 0 ${cardWidth} ${CARD_HEIGHT}`}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id={`cardBg-${svgId}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.gradient[0]} />
            <Stop offset="0.56" stopColor={theme.gradient[1]} />
            <Stop offset="1" stopColor={theme.gradient[2]} />
          </LinearGradient>
          <RadialGradient id={`cardGlow-${svgId}`} cx="78%" cy="22%" r="65%">
            <Stop offset="0" stopColor={theme.accent} stopOpacity={0.44} />
            <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={cardWidth} height={CARD_HEIGHT} rx="22" fill={`url(#cardBg-${svgId})`} />
        <Rect x="0" y="0" width={cardWidth} height={CARD_HEIGHT} rx="22" fill={`url(#cardGlow-${svgId})`} />
        <ThemeArtwork theme={theme} cardWidth={cardWidth} />
      </Svg>

      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image
            source={require('@/assets/images/quipupay-icon.png')}
            style={styles.brandIcon}
            accessibilityLabel="QuipuPay"
          />
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>QuipuPay</Text>
            <Text style={styles.brandMeta}>Tarjeta virtual</Text>
          </View>
        </View>

        <View style={styles.topRowActions}>
          <View style={[styles.statusPill, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.statusPillText, { color: theme.accent }]}>
              {isActive ? 'Activa' : 'Pendiente'}
            </Text>
          </View>
          {onCustomize ? (
            <Pressable
              onPress={onCustomize}
              hitSlop={8}
              style={styles.customizeButton}
              accessibilityRole="button"
              accessibilityLabel="Personalizar diseño de la tarjeta"
            >
              <PaletteIcon />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.middleRow}>
        <View style={styles.virtualMark}>
          <Text style={styles.virtualLabel}>VIRTUAL</Text>
          <Text style={styles.virtualMeta}>{theme.tagline}</Text>
        </View>
        <ContactlessIcon />
      </View>

      <View style={styles.numberRow}>
        <Text style={styles.number}>•• {last4}</Text>
        <Text style={styles.network}>QP</Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.ownerWrap}>
          <Text style={styles.label}>TITULAR</Text>
          <Text style={styles.ownerName} numberOfLines={1}>
            {ownerName.toUpperCase()}
          </Text>
        </View>
        <View style={styles.balanceWrap}>
          <Text style={styles.label}>DISPONIBLE</Text>
          <Text style={styles.balance}>
            {hidden ? '••••••' : formatMoney(account.availableBalance, account.currency)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function artworkTransform(cardWidth: number) {
  const scaleX = cardWidth / DESIGN_WIDTH;
  const scaleY = CARD_HEIGHT / DESIGN_HEIGHT;
  return `scale(${scaleX} ${scaleY})`;
}

function ThemeArtwork({ theme, cardWidth }: { theme: CardTheme; cardWidth: number }) {
  const stroke = theme.accent;
  const transform = artworkTransform(cardWidth);

  switch (theme.pattern) {
    case 'orbit':
      return (
        <G opacity={0.65} transform={transform}>
          <Circle cx="248" cy="58" r="74" stroke={stroke} strokeOpacity={0.24} strokeWidth="1.2" fill="none" />
          <Circle cx="248" cy="58" r="47" stroke={stroke} strokeOpacity={0.22} strokeWidth="1" fill="none" />
          <Path d="M155 34C210 12 272 23 309 69" stroke={stroke} strokeOpacity={0.28} strokeWidth="2" fill="none" />
          <Path d="M185 183C239 154 292 141 336 151" stroke="white" strokeOpacity={0.11} strokeWidth="20" fill="none" />
        </G>
      );
    case 'grid':
      return (
        <G opacity={0.5} transform={transform}>
          {Array.from({ length: 7 }).map((_, index) => (
            <Line
              key={`v-${index}`}
              x1={48 + index * 34}
              y1="0"
              x2={20 + index * 34}
              y2={CARD_HEIGHT}
              stroke={stroke}
              strokeOpacity={0.16}
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 5 }).map((_, index) => (
            <Line
              key={`h-${index}`}
              x1="0"
              y1={38 + index * 32}
              x2="318"
              y2={20 + index * 32}
              stroke="white"
              strokeOpacity={0.08}
              strokeWidth="1"
            />
          ))}
          <Circle cx="250" cy="55" r="4" fill={stroke} fillOpacity={0.7} />
          <Circle cx="278" cy="91" r="3" fill={stroke} fillOpacity={0.45} />
        </G>
      );
    case 'pulse':
      return (
        <G opacity={0.62} transform={transform}>
          <Path
            d="M-8 138C42 92 85 172 132 126C182 78 216 119 250 86C284 54 306 72 334 42"
            stroke={stroke}
            strokeOpacity={0.36}
            strokeWidth="3"
            fill="none"
          />
          <Path
            d="M-4 161C44 119 94 183 142 142C197 95 232 139 278 105C302 87 317 84 338 87"
            stroke="white"
            strokeOpacity={0.16}
            strokeWidth="14"
            fill="none"
          />
          <Circle cx="258" cy="61" r="52" fill={stroke} fillOpacity={0.1} />
        </G>
      );
    case 'ribbon':
      return (
        <G opacity={0.58} transform={transform}>
          <Path d="M232 -24 340 20 104 226 26 198Z" fill="white" fillOpacity={0.08} />
          <Path d="M284 -2 338 18 124 206 90 196Z" fill={stroke} fillOpacity={0.18} />
          <Path d="M38 30 185 4 348 151" stroke={stroke} strokeOpacity={0.28} strokeWidth="2" fill="none" />
        </G>
      );
    case 'carbon':
      return (
        <G opacity={0.52} transform={transform}>
          {Array.from({ length: 9 }).map((_, index) => (
            <Rect
              key={index}
              x={-60 + index * 48}
              y="-35"
              width="30"
              height="285"
              rx="15"
              transform="rotate(38)"
              fill={index % 2 ? 'white' : stroke}
              fillOpacity={index % 2 ? 0.06 : 0.09}
            />
          ))}
          <Circle cx="256" cy="54" r="62" stroke={stroke} strokeOpacity={0.22} strokeWidth="1" fill="none" />
        </G>
      );
    case 'matrix':
      return (
        <G opacity={0.62} transform={transform}>
          <Path d="M-12 54H330M-12 112H330M-12 170H330" stroke={stroke} strokeOpacity={0.13} strokeWidth="1" />
          {Array.from({ length: 8 }).map((_, index) => (
            <Circle
              key={index}
              cx={52 + index * 38}
              cy={index % 2 ? 146 : 88}
              r={index % 3 === 0 ? 4 : 2.6}
              fill={stroke}
              fillOpacity={index % 2 ? 0.42 : 0.24}
            />
          ))}
          <Path d="M42 146C92 72 166 188 232 83C260 39 297 38 336 66" stroke={stroke} strokeOpacity={0.36} strokeWidth="2.4" fill="none" />
        </G>
      );
    case 'copper':
      return (
        <G opacity={0.58} transform={transform}>
          <Circle cx="274" cy="54" r="86" fill={stroke} fillOpacity={0.12} />
          <Circle cx="274" cy="54" r="54" stroke="white" strokeOpacity={0.16} strokeWidth="1.2" fill="none" />
          <Path d="M-10 190C56 152 96 206 158 162C214 122 260 144 334 104" stroke="white" strokeOpacity={0.14} strokeWidth="18" fill="none" />
          <Path d="M-4 36C84 16 155 22 232 58" stroke={stroke} strokeOpacity={0.28} strokeWidth="2" fill="none" />
        </G>
      );
    case 'ice':
      return (
        <G opacity={0.6} transform={transform}>
          <Path d="M210 -20 342 76 246 260 112 178Z" fill="white" fillOpacity={0.08} />
          <Path d="M246 20 314 76 236 214 164 162Z" stroke={stroke} strokeOpacity={0.26} strokeWidth="1.4" fill="none" />
          <Path d="M34 38 122 18M42 78 152 50M55 119 130 104" stroke="white" strokeOpacity={0.13} strokeWidth="2" fill="none" />
        </G>
      );
  }
}

function PaletteIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Path
        d="M12 3.5c-4.7 0-8.5 3.6-8.5 8 0 3 2.2 4.3 3.9 4.3.9 0 1.2-.5 1.2-1s-.3-.9-.3-1.6c0-1.4 1.2-2.5 2.7-2.5h2.4c2.6 0 4.6-1.8 4.6-4.3 0-3.3-3-6.9-6-6.9Z"
        stroke="#fff"
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M8 10.2h.01M11 7.5h.01M14.5 8.3h.01" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ContactlessIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" accessibilityLabel="">
      <Path
        d="M9.5 15.5a7.8 7.8 0 0 1 0-7"
        stroke="rgba(255,255,255,0.82)"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M13 17.7a11.4 11.4 0 0 1 0-11.4"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M16.5 20a15 15 0 0 1 0-16"
        stroke="rgba(255,255,255,0.38)"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export const ACCOUNT_CARD_HEIGHT = CARD_HEIGHT + 72;

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  brandName: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: typography.weights.bold,
  },
  brandMeta: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: typography.weights.medium,
  },
  topRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: typography.weights.bold,
  },
  customizeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  virtualMark: {
    gap: 2,
  },
  virtualLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.6,
  },
  virtualMeta: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: typography.weights.medium,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  number: {
    color: colors.white,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  network: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  ownerWrap: {
    maxWidth: 166,
    minWidth: 0,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.7,
  },
  ownerName: {
    color: colors.white,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  balanceWrap: {
    alignItems: 'flex-end',
    maxWidth: 128,
  },
  balance: {
    color: colors.white,
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: typography.weights.bold,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
