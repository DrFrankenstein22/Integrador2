import { View, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

type PinDotsProps = {
  length: number;
  filled: number;
};

export function PinDots({ length, filled }: PinDotsProps) {
  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={`${filled} de ${length} digitos ingresados`}>
      {Array.from({ length }).map((_, index) => (
        <View key={index} style={[styles.dot, index < filled && styles.dotFilled]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  dot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: colors.white,
  },
  dotFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
});
