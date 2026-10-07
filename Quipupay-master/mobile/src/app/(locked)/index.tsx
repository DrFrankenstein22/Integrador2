import { useCallback, useEffect, useState } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Screen } from '@/src/components/Screen';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

const MAX_ATTEMPTS = 3;

/**
 * Pantalla de bloqueo: se muestra cuando ya hay una sesión guardada en este
 * teléfono de un login anterior, para confirmar rápido con huella/Face ID
 * que sigues siendo tú, en vez de pedir DNI + clave de nuevo cada vez que
 * se abre la app. Solo es alcanzable cuando `isLocked` es true (ver
 * AuthContext/_layout raíz), así que ya sabemos que hay una sesión real
 * cargada en memoria — no hace falta volver a leerla.
 */
export default function LockScreen() {
  const { userName, signIn, signOut, accessToken } = useAuth();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('Toca el sensor para continuar');

  useEffect(() => {
    if (!accessToken) {
      router.replace('/(locked)/pin');
      return;
    }

    let active = true;
    void (async () => {
      const [hasHardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (active) {
        setSupported(hasHardware && enrolled);
      }
    })();
    return () => {
      active = false;
    };
  }, [accessToken]);

  const authenticate = useCallback(async () => {
    if (attempts >= MAX_ATTEMPTS) {
      return;
    }

    if (!accessToken) {
      router.replace('/(locked)/pin');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Ingresa a Quipupay',
      fallbackLabel: 'Usar mi clave',
    });

    if (result.success) {
      // El token/usuario ya están cargados en el contexto desde que se
      // restauró la sesión guardada — esto solo confirma el desbloqueo.
      signIn();
      router.replace('/(tabs)');
      return;
    }

    const used = attempts + 1;
    setAttempts(used);

    if (used >= MAX_ATTEMPTS) {
      setMessage('Demasiados intentos. Ingresa con tu clave de 6 dígitos.');
      router.replace('/(locked)/pin');
    } else {
      setMessage(`No pudimos verificarte. Te quedan ${MAX_ATTEMPTS - used} intentos.`);
    }
  }, [accessToken, attempts, signIn]);

  useEffect(() => {
    if (supported === false) {
      router.replace('/(locked)/pin');
    }
  }, [supported]);

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{userName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>Hola, {userName}</Text>
        <Text style={styles.subtitle}>Ingresa con tu huella digital</Text>
      </View>

      <Pressable
        style={styles.fingerprintWrap}
        onPress={() => void authenticate()}
        accessibilityRole="button"
        accessibilityLabel="Ingresar con huella digital"
      >
        <Text style={styles.fingerprintGlyph}>❋</Text>
      </Pressable>

      <Text style={styles.message} accessibilityRole="text">
        {message}
      </Text>

      <View style={styles.spacer} />

      <Pressable
        style={styles.pinButton}
        onPress={() => router.replace('/(locked)/pin')}
        accessibilityRole="button"
      >
        <Text style={styles.pinButtonLabel}>Usar mi clave de 6 dígitos</Text>
      </Pressable>
      <Text style={styles.forgotLink} onPress={signOut} accessibilityRole="link">
        ¿No eres tú? Cerrar sesión
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF4FF',
    borderWidth: 1.5,
    borderColor: '#DCE6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  fingerprintWrap: {
    alignSelf: 'center',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl * 2,
  },
  fingerprintGlyph: {
    fontSize: 54,
    color: colors.primary,
  },
  message: {
    fontSize: 12.5,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  spacer: {
    flex: 1,
  },
  pinButton: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinButtonLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  forgotLink: {
    fontSize: 12.5,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
