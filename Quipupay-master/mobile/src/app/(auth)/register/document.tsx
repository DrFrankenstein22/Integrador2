import { useEffect, useRef, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { StepHeader } from '@/src/components/StepHeader';
import { useRegistration } from '@/src/context/RegistrationContext';
import type { DocShot } from '@/src/context/RegistrationContext';
import { createKycSession, uploadKycDocument } from '@/src/services/kycApi';
import { tapFeedback, errorFeedback } from '@/src/utils/haptics';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

type Step = { shot: DocShot; title: string; hint: string };

// Expo Camera 57 maps "off" to continuous autofocus on iOS; "on" focuses once and locks.
const CONTINUOUS_FOCUS = 'off' as const;
const FOCUS_TIP = 'No lo pegues al lente; aléjalo hasta que las letras se vean nítidas.';

const STEPS: Step[] = [
  {
    shot: 'frontStraight',
    title: 'Frente del DNI',
    hint: `Coloca el documento dentro del marco, de frente. ${FOCUS_TIP}`,
  },
  {
    shot: 'frontTilt',
    title: 'Frente, inclinado',
    hint: `Inclina ligeramente el DNI para comprobar que es físico. ${FOCUS_TIP}`,
  },
  {
    shot: 'backStraight',
    title: 'Reverso del DNI',
    hint: `Da vuelta el documento y colócalo de frente. ${FOCUS_TIP}`,
  },
  {
    shot: 'backTilt',
    title: 'Reverso, inclinado',
    hint: `Inclina ligeramente el DNI de nuevo. ${FOCUS_TIP}`,
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function DocumentScreen() {
  const { state, setDocShot, setKycSession } = useRegistration();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [index, setIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [availableLenses, setAvailableLenses] = useState<string[]>([]);
  const [selectedLens, setSelectedLens] = useState<string | undefined>();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [needsRetake, setNeedsRetake] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state.kycSessionKey && state.dni) {
      void createKycSession(state.dni)
        .then((r) => setKycSession(r.sessionKey))
        .catch(() => setError('No se pudo iniciar la verificación. Revisa tu conexión.'));
    }
  }, [state.kycSessionKey, state.dni, setKycSession]);

  const done = index >= STEPS.length;
  const step = STEPS[Math.min(index, STEPS.length - 1)];
  const closeLens = availableLenses.find((lens) => lens.toLowerCase().includes('ultra'));
  const usingCloseLens = Boolean(closeLens && selectedLens === closeLens);

  function handleAvailableLensesChanged({ lenses }: { lenses: string[] }) {
    setAvailableLenses(lenses);
    setSelectedLens((current) => (current && !lenses.includes(current) ? undefined : current));
  }

  function toggleCloseLens() {
    if (!closeLens) {
      return;
    }
    setCameraReady(false);
    setSelectedLens((current) => (current === closeLens ? undefined : closeLens));
  }

  async function capture() {
    if (capturing || !cameraRef.current || !cameraReady) {
      return;
    }
    setCapturing(true);
    setError('');
    try {
      // Autodisparo: sueltas el teléfono con las dos manos y la cámara toma
      // la foto sola, sin que toques nada en el momento del disparo. Evita
      // el temblor de tocar el botón (causa muy común de fotos borrosas) y
      // de paso le da tiempo al lente a asentar el enfoque continuo — la
      // cámara nativa hace lo mismo, solo que no lo ves.
      for (const secondsLeft of [2, 1] as const) {
        setCountdown(secondsLeft);
        tapFeedback();
        await sleep(700);
      }
      setCountdown(0);
      await sleep(500);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        exif: true,
        shutterSound: false,
      });
      if (photo?.uri) {
        setPreviewUri(photo.uri);
      }
    } finally {
      setCountdown(null);
      setCapturing(false);
    }
  }

  function acceptPreview() {
    if (!previewUri) {
      return;
    }
    tapFeedback();
    setDocShot(step.shot, previewUri);
    setPreviewUri(null);
    setCameraReady(false);
    setIndex((i) => i + 1);
  }

  function retakePreview() {
    setCameraReady(false);
    setPreviewUri(null);
  }

  function restartCapture() {
    setError('');
    setNeedsRetake(false);
    setPreviewUri(null);
    setCameraReady(false);
    setIndex(0);
  }

  function blockForRetake(message: string) {
    errorFeedback();
    setError(message);
    setNeedsRetake(true);
    setUploading(false);
  }

  async function submit() {
    if (!state.kycSessionKey) {
      setError('La verificación no está lista, espera un momento.');
      return;
    }
    const s = state.docShots;
    if (!s.frontStraight || !s.frontTilt || !s.backStraight || !s.backTilt) {
      setError('Faltan tomas del documento.');
      return;
    }
    setUploading(true);
    setNeedsRetake(false);
    setError('');
    try {
      const result = await uploadKycDocument(state.kycSessionKey, {
        frontStraight: s.frontStraight,
        frontTilt: s.frontTilt,
        backStraight: s.backStraight,
        backTilt: s.backTilt,
      });

      if (result.warnings.includes('DNI_EXPIRED')) {
        errorFeedback();
        const when = result.expiryDate
          ? ` (venció el ${new Date(result.expiryDate).toLocaleDateString('es-PE')})`
          : '';
        setError(
          `Tu DNI figura como vencido${when}. No podemos completar la verificación con un documento caducado — trámitalo en RENIEC y vuelve a intentarlo. Si crees que es un error de lectura, vuelve a tomar la foto del frente con mejor luz.`,
        );
        setNeedsRetake(true);
        setUploading(false);
        return;
      }

      if (result.warnings.includes('DNI_NAME_MISMATCH')) {
        blockForRetake(
          'El nombre registrado para este DNI no coincide con el que aparece en la foto del documento. Verifica que estás fotografiando tu propio DNI físico, no el de otra persona.',
        );
        return;
      }

      if (result.warnings.includes('FACE_NOT_DETECTED_IN_DOCUMENT')) {
        blockForRetake(
          'No pudimos ubicar tu foto dentro del DNI. Vuelve a tomar el frente asegurándote de que se vea completo y sin reflejos sobre la fotografía.',
        );
        return;
      }

      if (result.warnings.includes('DOC_FACE_LOW_QUALITY')) {
        blockForRetake(
          'Tu foto dentro del DNI se ve poco nítida y puede fallar la verificación facial más adelante. Vuelve a tomar el frente con buena luz, sin reflejos y bien enfocado.',
        );
        return;
      }

      if (result.documentQuality < 0.3 || result.warnings.includes('DOC_SCREEN_CAPTURE')) {
        blockForRetake(
          'La foto del DNI no pasó el control de calidad (parece una pantalla o está borrosa). Vuelve a tomarla con el documento físico y buena luz.',
        );
        return;
      }

      router.push('/(auth)/register/selfie');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el documento.');
      setUploading(false);
    }
  }

  if (permission?.granted && !done) {
    const liveHint = usingCloseLens
      ? 'Modo cerca activo. Úsalo solo si de verdad necesitas acercarte.'
      : `Mantén el DNI completo dentro del marco. ${FOCUS_TIP}`;

    return (
      <View style={styles.cameraScreen}>
        <StatusBar style="light" />
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.camera} resizeMode="contain" />
        ) : (
          <CameraView
            key={`${step.shot}-${selectedLens ?? 'default'}`}
            ref={cameraRef}
            style={styles.camera}
            active
            mode="picture"
            facing="back"
            autofocus={CONTINUOUS_FOCUS}
            selectedLens={Platform.OS === 'ios' ? selectedLens : undefined}
            zoom={0}
            animateShutter={false}
            onAvailableLensesChanged={
              Platform.OS === 'ios' ? handleAvailableLensesChanged : undefined
            }
            onCameraReady={() => setCameraReady(true)}
          />
        )}

        <View style={styles.cameraHeader}>
          <StepHeader onBack={() => router.back()} step={5} totalSteps={7} dark />
        </View>

        <View pointerEvents="none" style={styles.cameraShade}>
          <View style={styles.cameraTop}>
            <Text style={styles.cameraTitle}>{previewUri ? '¿Se lee claro?' : step.title}</Text>
            <Text style={styles.cameraHint}>
              {previewUri ? 'Acepta solo si los datos y la foto del DNI se ven nítidos.' : liveHint}
            </Text>
          </View>

          {!previewUri ? (
            <View style={styles.frameWrap}>
              <View style={styles.dniFrame}>
                <View style={[styles.cameraCorner, styles.cameraCornerTopLeft]} />
                <View style={[styles.cameraCorner, styles.cameraCornerTopRight]} />
                <View style={[styles.cameraCorner, styles.cameraCornerBottomLeft]} />
                <View style={[styles.cameraCorner, styles.cameraCornerBottomRight]} />
                <Text style={styles.frameText}>DNI completo</Text>
              </View>
              <View style={styles.cameraProgressRow}>
                {STEPS.map((s, i) => (
                  <View
                    key={s.shot}
                    style={[
                      styles.cameraDot,
                      i < index && styles.dotDone,
                      i === index && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {countdown !== null && (
          <View style={[StyleSheet.absoluteFill, styles.countdownOverlay]} pointerEvents="none">
            <Text style={styles.countdownText}>{countdown === 0 ? '📸' : countdown}</Text>
          </View>
        )}

        {previewUri ? (
          <View style={styles.cameraPreviewActions}>
            <Button
              label="↺ Repetir"
              variant="secondary"
              style={styles.half}
              onPress={retakePreview}
            />
            <Button label="✓ Usar esta foto" style={styles.half} onPress={acceptPreview} />
          </View>
        ) : (
          <>
            <View style={styles.cameraActions}>
              {closeLens ? (
                <Pressable
                  disabled={capturing}
                  onPress={toggleCloseLens}
                  style={[styles.lensButton, usingCloseLens && styles.lensButtonActive]}
                  accessibilityRole="button"
                  accessibilityLabel={usingCloseLens ? 'Usar lente normal' : 'Usar modo cerca'}
                >
                  <Text
                    style={[styles.lensButtonText, usingCloseLens && styles.lensButtonTextActive]}
                  >
                    {usingCloseLens ? 'Normal' : 'Cerca'}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.cameraActionPlaceholder} />
              )}

              <Pressable
                style={[styles.shutter, capturing && styles.shutterBusy]}
                onPress={() => void capture()}
                disabled={capturing || !cameraReady}
                accessibilityRole="button"
                accessibilityLabel="Capturar"
              >
                {!cameraReady || (capturing && countdown === null) ? (
                  <ActivityIndicator color={colors.primaryDark} />
                ) : null}
              </Pressable>

              <View style={styles.cameraActionPlaceholder} />
            </View>

            <Text style={styles.cameraMessage}>
              {!cameraReady
                ? 'Preparando enfoque...'
                : capturing
                  ? 'Suelta el teléfono, se toma sola...'
                  : `Toma ${index + 1} de ${STEPS.length}. No acerques más si empieza a verse borroso.`}
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <Screen style={styles.screen}>
      <StatusBar style="light" />
      <StepHeader onBack={() => router.back()} step={5} totalSteps={7} dark />

      <Text style={styles.title}>
        {done ? 'Revisión del documento' : previewUri ? '¿Se ve nítido?' : step.title}
      </Text>
      <Text style={styles.subtitle}>
        {done ? 'Vamos a verificar las 4 tomas de tu DNI.' : step.hint}
      </Text>

      <View style={styles.frame}>
        <Text style={styles.frameHint}>
          {done ? '4 / 4 tomas listas' : 'Necesitamos permiso de cámara'}
        </Text>
      </View>

      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View
            key={s.shot}
            style={[
              styles.dot,
              i < index && styles.dotDone,
              i === index && !done && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <View style={styles.spacer} />

      {!permission?.granted ? (
        <Button label="Permitir cámara" onPress={() => void requestPermission()} />
      ) : needsRetake ? (
        <Button label="Repetir fotos del DNI" onPress={restartCapture} />
      ) : (
        <Button
          label={uploading ? 'Verificando documento...' : 'Enviar y continuar'}
          onPress={() => void submit()}
          disabled={uploading}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraScreen: {
    flex: 1,
    backgroundColor: '#020617',
  },
  camera: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  cameraHeader: {
    position: 'absolute',
    top: 44,
    left: 18,
    right: 18,
    zIndex: 4,
  },
  cameraShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  cameraTop: {
    position: 'absolute',
    top: 118,
    left: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
  },
  cameraTitle: {
    color: colors.white,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  cameraHint: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  frameWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dniFrame: {
    width: '82%',
    maxWidth: 420,
    aspectRatio: 1.58,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCorner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: colors.primary,
  },
  cameraCornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 5,
    borderLeftWidth: 5,
  },
  cameraCornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 5,
    borderRightWidth: 5,
  },
  cameraCornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
  },
  cameraCornerBottomRight: {
    right: -2,
    bottom: -2,
    borderRightWidth: 5,
    borderBottomWidth: 5,
  },
  frameText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  cameraProgressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    justifyContent: 'center',
  },
  cameraDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  cameraActions: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraPreviewActions: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 36,
    flexDirection: 'row',
    gap: spacing.md,
  },
  lensButton: {
    width: 86,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensButtonActive: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  lensButtonText: {
    color: colors.white,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: typography.weights.bold,
  },
  lensButtonTextActive: {
    color: colors.primaryDark,
  },
  cameraActionPlaceholder: {
    width: 86,
  },
  cameraMessage: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 122,
    color: colors.white,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
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
  frame: {
    width: '100%',
    aspectRatio: 1.58,
    maxHeight: 248,
    borderRadius: 14,
    backgroundColor: '#16324F',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frameHint: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  countdownOverlay: {
    backgroundColor: 'rgba(11,31,58,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 56,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: '#34D399' },
  error: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#FCA5A5',
    marginTop: spacing.md,
  },
  spacer: { flex: 1 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterBusy: { opacity: 0.7 },
  half: { flex: 1 },
});
