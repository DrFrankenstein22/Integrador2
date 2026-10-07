import { Text, View, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { TopBar } from '@/src/components/TopBar';
import { useProducts } from '@/src/hooks/useAccounts';
import { useAccountOpening } from '@/src/context/AccountOpeningContext';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function ProductCatalogScreen() {
  const { data: products, isLoading, isError } = useProducts();
  const { state, selectProduct } = useAccountOpening();

  return (
    <Screen style={styles.screen}>
      <TopBar onBack={() => router.back()} title="Abrir un producto" />

      <Text style={styles.subtitle}>Elige el producto que quieres abrir. La apertura es 100% digital.</Text>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
        {isError ? <Text style={styles.error}>No pudimos cargar el catálogo. Intenta más tarde.</Text> : null}

        {products?.map((product) => {
          const selected = state.productCode === product.code;
          return (
            <Pressable
              key={product.code}
              style={({ pressed }) => [
                styles.card,
                selected && styles.cardSelected,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => selectProduct(product.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={product.name}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{product.name}</Text>
                {product.recommended ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>RECOMENDADA</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardDescription}>
                {product.requirement ?? product.shortDescription}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Button
        label="Continuar"
        disabled={!state.productCode}
        onPress={() => router.push(`/(app)/abrir-cuenta/${state.productCode}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    lineHeight: 23,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  loader: {
    marginTop: spacing.xl,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    marginTop: spacing.lg,
  },
  card: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: spacing.lg,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F5F8FF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
