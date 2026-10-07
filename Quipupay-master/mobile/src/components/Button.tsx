import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { tapFeedback } from '../utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'outlineDark';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', disabled = false, style }: ButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      onPress={() => {
        if (!disabled) {
          tapFeedback();
          onPress();
        }
      }}
      disabled={disabled}
      android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.label, variantLabelStyles[variant], disabled && styles.disabledLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#E5E7EB',
  },
  disabledLabel: {
    color: '#6B7280',
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  outlineDark: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },
});

const variantLabelStyles = StyleSheet.create({
  primary: {
    color: colors.white,
  },
  secondary: {
    color: colors.textPrimary,
  },
  outlineDark: {
    color: 'rgba(255,255,255,0.85)',
  },
});
