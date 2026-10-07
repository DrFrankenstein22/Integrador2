import { Text, View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { useRegistration } from '@/src/context/RegistrationContext';
import type { RiskSignals } from '@/src/services/kycApi';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

const SIGNAL_LABELS: Record<keyof RiskSignals, string> = {
  identityMatch: 'Identidad (RENIEC)',
  documentQuality: 'Calidad del documento',
  documentAuthenticity: 'Autenticidad del documento',
  activeChallenge: 'Reto de movimiento',
  passiveLiveness: 'Persona viva',
  deepfakeScore: 'Sin deepfake',
  faceMatch: 'Rostro coincide con el DNI',
  deviceTrust: 'Dispositivo confiable',
};

const REASON_LABELS: Record<string, string> = {
  FACE_MATCH_LOW: 'El rostro no coincide con la foto del DNI',
  CHALLENGE_INCOMPLETE: 'No se completaron las instrucciones',
  DOC_SCREEN_CAPTURE: 'La foto del DNI parece una pantalla o impresión',
  DEEPFAKE_SUSPECTED: 'Se detectaron señales de manipulación de video',
  EMULATOR_DETECTED: 'La app corre en un emulador',
  NO_LIVENESS_MOTION: 'No se detectó movimiento facial real',
  DOC_BLURRY: 'La foto del DNI está borrosa',
  DOC_LOW_RESOLUTION: 'La foto del DNI tiene poca resolución',
  FACE_NOT_DETECTED_IN_DOCUMENT: 'No se pudo ubicar tu foto dentro del DNI',
  DOC_FACE_LOW_QUALITY: 'Tu foto dentro del DNI se ve poco nítida',
  DNI_EXPIRED: 'El DNI figura como vencido',
  DNI_NAME_MISMATCH: 'El nombre del DNI no coincide con el de la foto',
};

const DECISION_META = {
  APPROVED: { color: colors.secondary, title: 'Identidad verificada', bg: '#ECFDF5' },
  REVIEW: { color: colors.warning, title: 'En revisión manual', bg: '#FFFBEB' },
  REJECTED: { color: colors.error, title: 'No pudimos verificarte', bg: '#FEF2F2' },
} as const;

export default function KycResultScreen() {
  const { state, retryKyc } = useRegistration();
  const outcome = state.kycOutcome;

  if (!outcome) {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>Sin resultado de verificación</Text>
        <Button label="Volver" onPress={() => router.replace('/(auth)/register/selfie')} />
      </Screen>
    );
  }

  const meta = DECISION_META[outcome.decision];

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.badgeLabel, { color: meta.color }]}>{meta.title}</Text>
        </View>

        <View style={styles.scoreRow}>
          <View>
            <Text style={styles.scoreValue}>{outcome.trustScore.toFixed(0)}</Text>
            <Text style={styles.scoreLabel}>Confianza / 100</Text>
          </View>
          <View>
            <Text style={[styles.scoreValue, { color: meta.color }]}>
              {outcome.riskScore.toFixed(0)}
            </Text>
            <Text style={styles.scoreLabel}>Riesgo / 100</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Controles antifraude</Text>
        <View style={styles.card}>
          {(Object.keys(SIGNAL_LABELS) as (keyof RiskSignals)[]).map((key) => {
            const value = outcome.signals[key] ?? 0;
            const pct = Math.round(value * 100);
            const good = value >= 0.7;
            return (
              <View key={key} style={styles.signalRow}>
                <View style={styles.signalInfo}>
                  <Text style={styles.signalLabel}>{SIGNAL_LABELS[key]}</Text>
                  <View style={styles.bar}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${pct}%`, backgroundColor: good ? colors.secondary : colors.warning },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.signalPct}>{pct}%</Text>
              </View>
            );
          })}
        </View>

        {outcome.reasonCodes.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Motivos</Text>
            <View style={styles.card}>
              {outcome.reasonCodes.map((code) => (
                <Text key={code} style={styles.reason}>
                  • {REASON_LABELS[code] ?? code}
                </Text>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.modelNote}>Motor de riesgo {outcome.modelVersion}</Text>
      </ScrollView>

      {outcome.decision === 'REJECTED' ? (
        <Button
          label="Reintentar verificación"
          onPress={() => {
            retryKyc();
            router.replace('/(auth)/register/document');
          }}
        />
      ) : (
        <Button
          label={outcome.decision === 'REVIEW' ? 'Continuar (revisión pendiente)' : 'Continuar'}
          onPress={() => router.replace('/(auth)/register/pin')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  content: { paddingBottom: spacing.lg },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.xxl,
    marginTop: spacing.lg,
  },
  scoreValue: {
    fontSize: 34,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  signalInfo: { flex: 1 },
  signalLabel: {
    fontSize: 12.5,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  signalPct: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    width: 40,
    textAlign: 'right',
  },
  reason: {
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  modelNote: {
    fontSize: 10.5,
    color: '#9CA3AF',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
