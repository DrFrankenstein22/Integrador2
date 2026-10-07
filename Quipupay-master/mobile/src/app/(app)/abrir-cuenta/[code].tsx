import { Text, View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { TopBar } from '@/src/components/TopBar';
import { useProducts } from '@/src/hooks/useAccounts';
import { useAccountOpening } from '@/src/context/AccountOpeningContext';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

export default function ProductDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { data: products, isLoading } = useProducts();
  const { selectProduct, setCurrency } = useAccountOpening();
  const product = products?.find((item) => item.code === code);

  function handleOpen() {
    if (!product) {
      return;
    }
    selectProduct(product.code);
    setCurrency(product.currencies[0]);
    router.push('/(app)/abrir-cuenta/configurar');
  }

  return (
    <Screen style={styles.screen}>
      <TopBar onBack={() => router.back()} title={product?.name ?? 'Producto'} />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : !product ? (
        <Text style={styles.error}>Este producto no está disponible.</Text>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.headline}>{product.shortDescription}</Text>
            <Text style={styles.description}>
              Recibe transferencias, paga con QR y administra tus ahorros desde la app.
            </Text>

            <View style={styles.features}>
              {product.features.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <View style={styles.check}>
                    <Text style={styles.checkLabel}>✓</Text>
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <View style={styles.tariffCard}>
              <View style={styles.tariffRow}>
                <Text style={styles.tariffLabel}>TREA</Text>
                <Text style={styles.tariffValue}>{product.trea.toFixed(2)}%</Text>
              </View>
              <View style={styles.tariffRow}>
                <Text style={styles.tariffLabel}>Mantenimiento</Text>
                <Text style={styles.tariffValue}>S/ {product.maintenanceFee.toFixed(2)}</Text>
              </View>
              <Text
                style={styles.tariffLink}
                onPress={() => Alert.alert('Tarifario', 'Tarifario completo disponible próximamente.')}
              >
                Ver tarifario completo →
              </Text>
            </View>

            {product.requirement ? (
              <Text style={styles.requirement}>Requisito: {product.requirement}</Text>
            ) : null}
          </ScrollView>

          <Button label="Abrir esta cuenta" onPress={handleOpen} />
        </>
      )}
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
  loader: { marginTop: spacing.xl },
  error: { fontSize: typography.sizes.sm, color: colors.error, marginTop: spacing.lg },
  body: { paddingBottom: spacing.lg },
  headline: {
    fontSize: typography.sizes.xxl,
    lineHeight: 34,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: spacing.lg,
  },
  description: {
    fontSize: typography.sizes.md,
    lineHeight: 23,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  features: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EFF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  featureText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  tariffCard: {
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  tariffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tariffLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  tariffValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  tariffLink: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  requirement: {
    marginTop: spacing.lg,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.warning,
  },
});
