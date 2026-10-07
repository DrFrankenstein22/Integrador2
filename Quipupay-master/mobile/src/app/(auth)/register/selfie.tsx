import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { StepHeader } from '@/src/components/StepHeader';
import { useRegistration } from '@/src/context/RegistrationContext';
import { getKycChallenge, uploadKycSelfie } from '@/src/services/kycApi';
import { collectDeviceSignals } from '@/src/services/device';
import { tapFeedback, successFeedback, errorFeedback } from '@/src/utils/haptics';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase = 'loading' | 'ready' | 'running' | 'uploading' | 'error';

export default function SelfieScreen() {
  const { state, setChallenge, setKycOutcome } = useRegistration();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<Phase>(state.challenge ? 'ready' : 'loading');
  const [cameraReady, setCameraReady] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (state.challenge || !state.kycSessionKey) {
      return;
    }
    let active = true;
    void getKycChallenge(state.kycSessionKey)
      .then((c) => {
        if (!active) {
          return;
        }
        setChallenge(c);
        setPhase('ready');
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setMessage('No se pudo cargar el reto de verificación.');
        setPhase('error');
      });
    return () => {
      active = false;
    };
  }, [state.challenge, state.kycSessionKey, setChallenge]);

  const run = useCallback(async () => {
    const challenge = state.challenge;
    if (!challenge || !state.kycSessionKey || !cameraRef.current || !cameraReady) {
      return;
    }
    setPhase('running');
    const frames: string[] = [];
    const timings: number[] = [];

    // Foto de referencia mirando al frente, ANTES de la primera instrucción
    // (girar la cabeza, mirar arriba, etc.). Las fotos del reto se toman a
    // propósito mientras la persona se mueve — perfectas para probar que es
    // una persona real, pero un insumo malo para comparar contra el DNI.
    let neutralUri: string | undefined;
    try {
      await sleep(500);
      const neutral = await cameraRef.current.takePictureAsync({
        quality: 0.82,
        shutterSound: false,
      });
      neutralUri = neutral?.uri;
    } catch {
      /* si falla, el backend cae de vuelta a elegir el mejor frame del reto */
    }

    const start = Date.now();

    for (let i = 0; i < challenge.steps.length; i += 1) {
      setStepIdx(i);
      tapFeedback();
      const stepMs = challenge.steps[i].seconds * 1000;
      await sleep(stepMs / 2);
      try {
        const mid = await cameraRef.current.takePictureAsync({ quality: 0.6 });
        if (mid?.uri) {
          frames.push(mid.uri);
        }
      } catch {
        /* ignore */
      }
      await sleep(stepMs / 2);
      try {
        const endShot = await cameraRef.current.takePictureAsync({ quality: 0.6 });
        if (endShot?.uri) {
          frames.push(endShot.uri);
        }
      } catch {
        /* ignore */
      }
      timings.push(Date.now() - start);
    }

    setStepIdx(challenge.steps.length);
    setPhase('uploading');
    setMessage('Analizando tu verificación...');

    try {
      const device = await collectDeviceSignals();
      const outcome = await uploadKycSelfie({
        sessionKey: state.kycSessionKey,
        challengeId: challenge.challengeId,
        nonce: challenge.nonce,
        frameUris: frames,
        neutralFrameUri: neutralUri,
        videoDurationMs: Date.now() - start,
        stepTimingsMs: timings,
        device,
      });
      setKycOutcome(outcome);
      if (outcome.decision === 'REJECTED') {
        errorFeedback();
      } else {
        successFeedback();
      }
      router.replace('/(auth)/register/kyc-result');
    } catch (err) {
      errorFeedback();
      setMessage(err instanceof Error ? err.message : 'No se pudo completar la verificación.');
      setPhase('error');
      setStepIdx(-1);
    }
  }, [cameraReady, state.challenge, state.kycSessionKey, setKycOutcome]);

  const currentStep =
    state.challenge && stepIdx >= 0 && stepIdx < state.challenge.steps.length
      ? state.challenge.steps[stepIdx]
      : null;

  return (
    <Screen style={styles.screen}>
      <StatusBar style="light" />
      <StepHeader onBack={() => router.back()} step={6} totalSteps={7} dark />

      <Text style={styles.title}>Verificación facial</Text>
      <Text style={styles.subtitle}>
        Sigue las instrucciones en pantalla. Esto confirma que eres una persona real y no una foto.
      </Text>

      <View style={styles.circle}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            active
            mode="picture"
            facing="front"
            autofocus="on"
            mirror
            onCameraReady={() => setCameraReady(true)}
          />
        ) : (
          <Text style={styles.circleHint}>Necesitamos permiso{'\n'}de la cámara frontal</Text>
        )}
      </View>

      {/* Fuera del círculo: dentro tapaba justo la parte de abajo de la cara,
          que es donde suele estar la instrucción más importante de leer
          (p. ej. "sonríe"). */}
      <View style={styles.instructionSlot}>
        {currentStep ? (
          <View style={styles.instructionPill}>
            <Text style={styles.instructionText}>{currentStep.label}</Text>
          </View>
        ) : null}
      </View>

      {state.challenge ? (
        <View style={styles.stepsRow}>
          {state.challenge.steps.map((s, i) => (
            <View
              key={s.code}
              style={[styles.dot, i < stepIdx && styles.dotDone, i === stepIdx && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}

      {message ? (
        <Text style={styles.message} accessibilityRole={phase === 'error' ? 'alert' : 'text'}>
          {message}
        </Text>
      ) : null}

      <View style={styles.spacer} />

      {!permission?.granted ? (
        <Button label="Permitir cámara" onPress={() => void requestPermission()} />
      ) : phase === 'loading' ? (
        <ActivityIndicator color={colors.white} />
      ) : phase === 'running' || phase === 'uploading' ? (
        <View style={styles.workingRow}>
          <ActivityIndicator color={colors.white} />
          <Text style={styles.workingText}>
            {phase === 'uploading' ? 'Analizando...' : 'Mantén tu rostro en el círculo'}
          </Text>
        </View>
      ) : (
        <Button
          label={
            phase === 'error'
              ? 'Reintentar'
              : cameraReady
                ? 'Comenzar verificación'
                : 'Preparando cámara...'
          }
          disabled={!cameraReady}
          onPress={() => {
            setMessage('');
            void run();
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  circle: {
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#16324F',
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circleHint: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  instructionSlot: {
    minHeight: 44,
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionPill: {
    backgroundColor: 'rgba(11,31,58,0.85)',
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: '#34D399' },
  message: {
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  spacer: { flex: 1 },
  workingRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  workingText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: 'rgba(255,255,255,0.7)',
  },
});
