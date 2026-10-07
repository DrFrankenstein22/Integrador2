import { Text, View, Pressable, StyleSheet, Alert } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

const SERVICES = [
  { id: 'luz', label: 'Luz', icon: '⚡', biller: 'Enel / Luz del Sur', bg: '#FEF3E8' },
  { id: 'agua', label: 'Agua', icon: '💧', biller: 'Sedapal', bg: '#EFF4FF' },
  { id: 'internet', label: 'Internet y cable', icon: '🌐', biller: 'Movistar / Claro', bg: '#ECFDF5' },
  { id: 'telefono', label: 'Telefonía móvil', icon: '📱', biller: 'Recargas y planes', bg: '#F3E8FF' },
  { id: 'gas', label: 'Gas natural', icon: '🔥', biller: 'Cálidda', bg: '#FEF2F2' },
];

export default function PagosScreen() {
  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Pagar servicios</Text>
      <Text style={styles.subtitle}>Paga tus recibos sin salir de casa.</Text>

      <View style={styles.list}>
        {SERVICES.map((service) => (
          <Pressable
            key={service.id}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`Pagar ${service.label}`}
            onPress={() =>
              Alert.alert('Quipupay', `El pago de ${service.label} estará disponible próximamente.`)
            }
          >
            <View style={[styles.icon, { backgroundColor: service.bg }]}>
              <Text style={styles.iconLabel}>{service.icon}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.rowLabel}>{service.label}</Text>
              <Text style={styles.rowBiller}>{service.biller}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteIcon}>ℹ</Text>
        <Text style={styles.noteText}>
          Módulo de pagos simulado para el MVP académico. No procesa dinero real.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 118,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  list: {
    marginTop: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  rowBiller: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: '#9CA3AF',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  noteIcon: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#6B7280',
  },
  noteText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    color: '#6B7280',
  },
});
