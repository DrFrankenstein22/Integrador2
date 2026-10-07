import { Text, View, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

const SECURITY_ITEMS = [
  { id: 'pin', label: 'Cambiar clave de 6 dígitos', hint: 'Última actualización: hoy', icon: '🔑', bg: '#FEF3E8' },
  { id: 'biometria', label: 'Ingreso con huella digital', hint: 'Activado', icon: '👆', bg: '#ECFDF5' },
  { id: 'dispositivos', label: 'Dispositivos con acceso', hint: '1 dispositivo', icon: '📱', bg: '#EFF4FF' },
  { id: 'alertas', label: 'Alertas de seguridad', hint: 'Por notificación y correo', icon: '🔔', bg: '#F3E8FF' },
];

export default function MasScreen() {
  const { user, userName, signOut } = useAuth();

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Más</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileMeta}>DNI {user?.dni ?? '—'}</Text>
            {user?.phone ? <Text style={styles.profileMeta}>Cel. {user.phone}</Text> : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Centro de seguridad</Text>
        <View style={styles.list}>
          {SECURITY_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() =>
                Alert.alert('Quipupay', `"${item.label}" estará disponible próximamente.`)
              }
            >
              <View style={[styles.rowIcon, { backgroundColor: item.bg }]}>
                <Text style={styles.rowIconLabel}>{item.icon}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowHint}>{item.hint}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.spacer} />
        <Button label="Cerrar sesión" variant="secondary" onPress={signOut} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.backgroundLight,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 118,
    flexGrow: 1,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF4FF',
    borderWidth: 1.5,
    borderColor: '#DCE6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  profileName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  profileMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  list: {
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
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconLabel: {
    fontSize: 15,
  },
  info: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  rowHint: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: '#9CA3AF',
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xl,
  },
});
