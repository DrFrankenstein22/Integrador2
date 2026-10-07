import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { Movement } from '@/src/services/accountsApi';
import { formatSignedAmount, timeLabel } from '@/src/utils/format';
import { pressableStyle } from '@/src/utils/pressed';
import { tapFeedback } from '@/src/utils/haptics';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';

const ICONS: Record<string, string> = {
  INITIAL_DEPOSIT: '★',
  QR_PAYMENT: '▣',
  TRANSFER_IN: '↓',
  TRANSFER_OUT: '↗',
  SERVICE_PAYMENT: '≡',
  TOP_UP: '↺',
};

export function MovementRow({
  movement,
  onPress,
}: {
  movement: Movement;
  onPress?: () => void;
}) {
  const isIn = movement.direction === 'in';

  return (
    <Pressable
      style={pressableStyle(styles.row)}
      onPress={
        onPress
          ? () => {
              tapFeedback();
              onPress();
            }
          : undefined
      }
      accessibilityRole="button"
      accessibilityLabel={`${movement.title}, ${formatSignedAmount(movement.amount)}`}
    >
      <View style={[styles.icon, isIn && styles.iconIn]}>
        <Text style={[styles.iconLabel, isIn && styles.iconLabelIn]}>
          {ICONS[movement.typeCode] ?? '•'}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {movement.title}
        </Text>
        <Text style={styles.subtitle}>
          {movement.subtitle || timeLabel(movement.date)}
        </Text>
      </View>
      <Text style={[styles.amount, isIn && styles.amountIn]}>
        {formatSignedAmount(movement.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconIn: {
    backgroundColor: '#ECFDF5',
  },
  iconLabel: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  iconLabelIn: {
    color: colors.secondary,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  amountIn: {
    color: colors.secondary,
  },
});
