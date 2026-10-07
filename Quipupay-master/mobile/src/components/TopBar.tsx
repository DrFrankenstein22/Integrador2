import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';

type TopBarProps = {
  onBack: () => void;
  title?: string;
  step?: number;
  totalSteps?: number;
};

export function TopBar({ onBack, title, step, totalSteps }: TopBarProps) {
  const showProgress = typeof step === 'number' && typeof totalSteps === 'number';

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        style={styles.back}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Text style={styles.backLabel}>←</Text>
      </Pressable>

      {showProgress ? (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(step / totalSteps) * 100}%` }]} />
          </View>
          <Text style={styles.stepLabel}>{`${step}/${totalSteps}`}</Text>
        </>
      ) : (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  back: {
    width: 40,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backLabel: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#6B7280',
  },
});
