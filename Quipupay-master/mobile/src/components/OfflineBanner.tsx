import { Text, View, StyleSheet } from 'react-native';
import { useOnline } from '@/src/hooks/useOnline';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';

export function OfflineBanner({ lastCheck }: { lastCheck?: string }) {
  const online = useOnline();

  if (online) {
    return null;
  }

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.dot}>
        <Text style={styles.dotLabel}>!</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>Sin conexión</Text>
        <Text style={styles.body}>
          Mostramos el último saldo consultado{lastCheck ? ` a las ${lastCheck}` : ''}. Desliza para
          reintentar.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLabel: {
    color: colors.white,
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
