import { Modal, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { CARD_THEMES, type CardTheme } from '../constants/cardThemes';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { tapFeedback } from '../utils/haptics';

export function CardThemePicker({
  visible,
  selectedThemeId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedThemeId: string;
  onSelect: (themeId: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Diseña tu tarjeta</Text>
              <Text style={styles.subtitle}>8 estilos virtuales para QuipuPay.</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button">
              <Text style={styles.closeGlyph}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {CARD_THEMES.map((theme) => {
              const selected = theme.id === selectedThemeId;
              return (
                <Pressable
                  key={theme.id}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    tapFeedback();
                    onSelect(theme.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Diseño ${theme.name}`}
                  accessibilityState={{ selected }}
                >
                  <MiniCard theme={theme} selected={selected} />
                  <Text style={styles.optionName}>{theme.name}</Text>
                  <Text style={styles.optionMeta}>{theme.tagline}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable style={styles.doneButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.doneLabel}>Aplicar diseño</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MiniCard({ theme, selected }: { theme: CardTheme; selected: boolean }) {
  return (
    <View style={styles.miniCard}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`theme-${theme.id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.gradient[0]} />
            <Stop offset="0.55" stopColor={theme.gradient[1]} />
            <Stop offset="1" stopColor={theme.gradient[2]} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" rx="14" fill={`url(#theme-${theme.id})`} />
        <MiniPattern theme={theme} />
      </Svg>
      <Text style={styles.miniBrand}>QuipuPay</Text>
      <Text style={styles.miniNumber}>•• 8427</Text>
      {selected ? (
        <View style={styles.checkBadge}>
          <Text style={styles.checkGlyph}>✓</Text>
        </View>
      ) : null}
    </View>
  );
}

function MiniPattern({ theme }: { theme: CardTheme }) {
  const stroke = theme.accent;

  switch (theme.pattern) {
    case 'orbit':
      return (
        <G opacity={0.58}>
          <Circle cx="112" cy="18" r="38" stroke={stroke} strokeOpacity={0.28} strokeWidth="1" fill="none" />
          <Path d="M62 8C92-3 121 4 143 29" stroke={stroke} strokeOpacity={0.34} strokeWidth="1.6" fill="none" />
        </G>
      );
    case 'grid':
      return (
        <G opacity={0.52}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Line
              key={index}
              x1={20 + index * 28}
              y1="0"
              x2={-6 + index * 28}
              y2="92"
              stroke={stroke}
              strokeOpacity={0.24}
            />
          ))}
        </G>
      );
    case 'pulse':
      return <Path d="M-8 66C30 34 52 82 86 48C112 22 131 31 158 11" stroke={stroke} strokeOpacity={0.42} strokeWidth="2" fill="none" />;
    case 'ribbon':
      return <Path d="M102 -10 158 13 44 102 6 88Z" fill="white" fillOpacity={0.12} />;
    case 'carbon':
      return (
        <G opacity={0.4}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Rect
              key={index}
              x={-40 + index * 34}
              y="-22"
              width="20"
              height="135"
              rx="10"
              transform="rotate(38)"
              fill={index % 2 ? 'white' : stroke}
              fillOpacity={0.12}
            />
          ))}
        </G>
      );
    case 'matrix':
      return (
        <G opacity={0.54}>
          <Path d="M-6 24H158M-6 54H158M-6 82H158" stroke={stroke} strokeOpacity={0.2} />
          <Path d="M18 72C44 28 76 88 108 38C124 12 142 15 160 27" stroke={stroke} strokeOpacity={0.42} strokeWidth="1.8" fill="none" />
          <Circle cx="50" cy="34" r="3" fill={stroke} fillOpacity={0.65} />
          <Circle cx="122" cy="62" r="2.5" fill={stroke} fillOpacity={0.46} />
        </G>
      );
    case 'copper':
      return (
        <G opacity={0.52}>
          <Circle cx="122" cy="22" r="46" fill={stroke} fillOpacity={0.16} />
          <Circle cx="122" cy="22" r="28" stroke="white" strokeOpacity={0.16} fill="none" />
          <Path d="M-6 76C30 54 54 86 88 62C116 42 136 50 160 32" stroke="white" strokeOpacity={0.18} strokeWidth="8" fill="none" />
        </G>
      );
    case 'ice':
      return (
        <G opacity={0.52}>
          <Path d="M94 -8 160 38 118 110 50 76Z" fill="white" fillOpacity={0.12} />
          <Path d="M112 12 148 40 112 90 78 64Z" stroke={stroke} strokeOpacity={0.34} fill="none" />
        </G>
      );
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.56)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    maxHeight: '82%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  option: {
    width: '47.8%',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    padding: spacing.sm,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  miniCard: {
    height: 88,
    borderRadius: 14,
    overflow: 'hidden',
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  miniBrand: {
    color: colors.white,
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
  },
  miniNumber: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 15,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  optionName: {
    fontSize: 12.5,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  optionMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  doneButton: {
    marginTop: spacing.xl,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
});
