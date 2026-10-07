import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';

type StepHeaderProps = {
  onBack: () => void;
  step: number;
  totalSteps: number;
  dark?: boolean;
};

export function StepHeader({ onBack, step, totalSteps, dark = false }: StepHeaderProps) {
  const progress = step / totalSteps;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        style={styles.back}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Text style={[styles.backLabel, dark && styles.backLabelDark]}>{'←'}</Text>
      </Pressable>
      <View style={[styles.track, dark && styles.trackDark]}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Text
        style={[styles.stepLabel, dark && styles.stepLabelDark]}
        accessibilityRole="text"
      >{`${step} de ${totalSteps}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 48,
  },
  back: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabel: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  backLabelDark: {
    color: colors.white,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  trackDark: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#6B7280',
  },
  stepLabelDark: {
    color: 'rgba(255,255,255,0.6)',
  },
});
