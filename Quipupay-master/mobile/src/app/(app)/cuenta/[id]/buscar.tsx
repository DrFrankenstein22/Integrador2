import { useMemo, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { TopBar } from '@/src/components/TopBar';
import { MovementRow } from '@/src/components/MovementRow';
import { useMovements } from '@/src/hooks/useAccounts';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

type Period = '30d' | '3m' | 'custom';
const PERIODS: { key: Period; label: string; days: number | null }[] = [
  { key: '30d', label: 'Últimos 30 días', days: 30 },
  { key: '3m', label: '3 meses', days: 90 },
  { key: 'custom', label: 'Personalizado', days: null },
];

function periodStart(period: Period): string | undefined {
  const days = PERIODS.find((p) => p.key === period)?.days ?? null;
  if (!days) {
    return undefined;
  }
  // Fecha sin hora para que la clave de react-query no cambie en cada render.
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

export default function SearchMovementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [term, setTerm] = useState('');
  const [period, setPeriod] = useState<Period>('30d');
  const [from, setFrom] = useState<string | undefined>(() => periodStart('30d'));
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  function choosePeriod(next: Period) {
    setPeriod(next);
    setFrom(periodStart(next));
  }

  const { data, isLoading } = useMovements(id, { q: term || undefined, from });

  const results = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items) ?? [];
    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;
    return items.filter((movement) => {
      const abs = Math.abs(movement.amount);
      if (min !== null && abs < min) {
        return false;
      }
      if (max !== null && abs > max) {
        return false;
      }
      return true;
    });
  }, [data, minAmount, maxAmount]);

  return (
    <Screen style={styles.screen}>
      <TopBar onBack={() => router.back()} title="Buscar movimientos" />

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Comercio, persona o referencia"
          placeholderTextColor="#9CA3AF"
          style={styles.search}
          accessibilityLabel="Texto de búsqueda"
        />

        <Text style={styles.sectionLabel}>PERIODO</Text>
        <View style={styles.chipRow}>
          {PERIODS.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.chip, period === item.key && styles.chipActive]}
              onPress={() => choosePeriod(item.key)}
            >
              <Text style={[styles.chipLabel, period === item.key && styles.chipLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>MONTO</Text>
        <View style={styles.amountRow}>
          <View style={styles.amountField}>
            <Text style={styles.amountLabel}>Desde</Text>
            <TextInput
              value={minAmount}
              onChangeText={(v) => setMinAmount(v.replace(/[^\d.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="S/ 0"
              placeholderTextColor="#9CA3AF"
              style={styles.amountInput}
            />
          </View>
          <View style={styles.amountField}>
            <Text style={styles.amountLabel}>Hasta</Text>
            <TextInput
              value={maxAmount}
              onChangeText={(v) => setMaxAmount(v.replace(/[^\d.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="S/ 500"
              placeholderTextColor="#9CA3AF"
              style={styles.amountInput}
            />
          </View>
        </View>

        <Text style={styles.resultCount}>
          {isLoading ? 'BUSCANDO…' : `${results.length} RESULTADO${results.length === 1 ? '' : 'S'}`}
        </Text>
        <View style={styles.divider} />

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          results.map((movement) => (
            <MovementRow
              key={movement.id}
              movement={movement}
              onPress={() => router.push(`/(app)/movimiento/${movement.id}`)}
            />
          ))
        )}
      </ScrollView>

      <Button label="Aplicar filtros" onPress={() => router.back()} />
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
  body: {
    paddingBottom: spacing.lg,
  },
  search: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#6B7280',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: colors.primaryDark,
  },
  chipLabel: {
    fontSize: 12.5,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.white,
  },
  amountRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  amountField: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: spacing.md,
  },
  amountLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  amountInput: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    padding: 0,
    marginTop: 2,
    minHeight: 24,
  },
  resultCount: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#6B7280',
    letterSpacing: 0.5,
    marginTop: spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: spacing.sm,
  },
  loader: {
    marginTop: spacing.lg,
  },
});
