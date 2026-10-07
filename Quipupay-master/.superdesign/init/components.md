# Shared UI components

## `mobile/src/components/Button.tsx`

Reusable primary, secondary, and dark-outline button with disabled and pressed states.

```tsx
import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { tapFeedback } from '../utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'outlineDark';
type ButtonProps = { label: string; onPress: () => void; variant?: ButtonVariant; disabled?: boolean; style?: StyleProp<ViewStyle> };

export function Button({ label, onPress, variant = 'primary', disabled = false, style }: ButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, variantStyles[variant], pressed && !disabled && styles.pressed, disabled && styles.disabled, style]}
      onPress={() => { if (!disabled) { tapFeedback(); onPress(); } }}
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
  button: { minHeight: 52, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  disabled: { backgroundColor: '#E5E7EB', borderColor: '#E5E7EB' },
  disabledLabel: { color: '#6B7280' },
});
const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  secondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: '#E5E7EB' },
  outlineDark: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)' },
});
const variantLabelStyles = StyleSheet.create({
  primary: { color: colors.white }, secondary: { color: colors.textPrimary }, outlineDark: { color: 'rgba(255,255,255,0.85)' },
});
```

## `mobile/src/components/Screen.tsx`

Safe-area screen primitive with the default light background.

```tsx
import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';

export function Screen({ children, style, ...rest }: ViewProps) {
  return <SafeAreaView style={[styles.container, style]} {...rest}>{children}</SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.backgroundLight } });
```

## `mobile/src/components/TopBar.tsx`

Back navigation with either a title or step progress.

```tsx
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';

type TopBarProps = { onBack: () => void; title?: string; step?: number; totalSteps?: number };
export function TopBar({ onBack, title, step, totalSteps }: TopBarProps) {
  const showProgress = typeof step === 'number' && typeof totalSteps === 'number';
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} style={styles.back} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver"><Text style={styles.backLabel}>←</Text></Pressable>
      {showProgress ? <><View style={styles.track}><View style={[styles.fill, { width: `${(step / totalSteps) * 100}%` }]} /></View><Text style={styles.stepLabel}>{`${step}/${totalSteps}`}</Text></> : <Text style={styles.title} numberOfLines={1}>{title}</Text>}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  back: { width: 40, height: 48, alignItems: 'flex-start', justifyContent: 'center' },
  backLabel: { fontSize: 22, fontWeight: typography.weights.bold, color: colors.textPrimary },
  title: { flex: 1, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.textPrimary },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  stepLabel: { fontSize: 12, fontWeight: typography.weights.bold, color: '#6B7280' },
});
```
