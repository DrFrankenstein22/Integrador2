import type { ReactNode } from 'react';
import { Text, View, Image, StyleSheet, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingScreen, ONBOARDING_CHROME_HEIGHT, type OnboardingSlideConfig } from '@/src/components/OnboardingScreen';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

type IconName = 'shield' | 'check' | 'face';

const ONBOARDING_IMAGES = {
  secureBanking: require('@/assets/images/onboarding/digital-wallet-pay-full-v1.jpg'),
  bankingHub: require('@/assets/images/onboarding/digital-wallet-pay-full-v2.jpg'),
  identityCheck: require('@/assets/images/onboarding/identity-check-full-v3.jpg'),
} as const;

function Slide1() {
  return (
    <FullBleedSlide
      image={ONBOARDING_IMAGES.secureBanking}
      alt="Persona pagando con celular desde una billetera digital QuipuPay"
      copyPlacement="top"
      imageFrame={{ widthScale: 1.16, heightScale: 1.02, xOffset: -0.09, yOffset: -0.01 }}
      pill={{ icon: 'shield', label: 'Banco 100% digital' }}
      title={
        <>
          Tu banco vive en <Text style={styles.titleAccent}>tu celular</Text>
        </>
      }
      subtitle="Paga sin efectivo ni plásticos. Controla tu dinero con una billetera segura de QuipuPay."
    />
  );
}

function Slide2() {
  return (
    <FullBleedSlide
      image={ONBOARDING_IMAGES.bankingHub}
      alt="Celular mostrando pago aprobado y tarjeta virtual QuipuPay"
      copyPlacement="top"
      imageFrame={{ widthScale: 1.14, heightScale: 1.02, xOffset: -0.08, yOffset: -0.01 }}
      pill={{ icon: 'check', label: 'Pagos contactless al instante' }}
      title={
        <>
          Paga con tarjeta <Text style={styles.titleAccent}>virtual</Text>
        </>
      }
      subtitle="Una experiencia digital, rápida y trazable para mover tu dinero sin depender de una tarjeta física."
    />
  );
}

function Slide3() {
  return (
    <FullBleedSlide
      image={ONBOARDING_IMAGES.identityCheck}
      alt="Persona validando su rostro con reconocimiento facial para crear su cuenta"
      copyPlacement="bottom"
      imageFrame={{ widthScale: 1.16, heightScale: 1.02, xOffset: -0.13, yOffset: -0.01 }}
      pill={{ icon: 'face', label: 'Verificación facial guiada' }}
      title={
        <>
          Crea tu cuenta <Text style={styles.titleAccent}>sin estrés</Text>
        </>
      }
      subtitle="Escanea tu DNI y confirma tu rostro en minutos, desde tu celular."
    />
  );
}

const SLIDES: OnboardingSlideConfig[] = [
  {
    key: 'bienvenida',
    content: <Slide1 />,
    primaryLabel: 'Comenzar',
    secondary: {
      label: 'Ya tengo una cuenta',
      onPress: () => router.push('/(auth)/login/dni'),
      variant: 'link',
    },
  },
  {
    key: 'beneficios',
    content: <Slide2 />,
    primaryLabel: 'Siguiente',
  },
  {
    key: 'registro',
    content: <Slide3 />,
    primaryLabel: 'Crear mi cuenta',
    onPrimaryPress: () => router.push('/(auth)/register/dni'),
    secondary: {
      label: 'Ya tengo cuenta',
      onPress: () => router.push('/(auth)/login/dni'),
      variant: 'outline',
    },
  },
];

export default function WelcomeScreen() {
  return <OnboardingScreen slides={SLIDES} />;
}

type ImageFrame = {
  widthScale?: number;
  heightScale?: number;
  xOffset?: number;
  yOffset?: number;
};

type CopyPlacement = 'top' | 'bottom';

/**
 * Cada foto tiene un encuadre propio (imageFrame) para mantener visible el
 * objetivo visual en pantallas angostas: celular, tarjeta o escaneo facial.
 * copyPlacement decide si el título va arriba o abajo — arriba cuando el
 * sujeto principal de la foto (el celular) ocupa la mitad inferior, para
 * que el texto no quede tapando justo lo que se quiere mostrar.
 */
function FullBleedSlide({
  image,
  alt,
  imageFrame,
  copyPlacement = 'bottom',
  pill,
  title,
  subtitle,
}: {
  image: ImageSourcePropType;
  alt: string;
  imageFrame?: ImageFrame;
  copyPlacement?: CopyPlacement;
  pill: { icon: IconName; label: string };
  title: ReactNode;
  subtitle: string;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const frame = {
    widthScale: imageFrame?.widthScale ?? 1,
    heightScale: imageFrame?.heightScale ?? 1,
    xOffset: imageFrame?.xOffset ?? 0,
    yOffset: imageFrame?.yOffset ?? 0,
  };
  const textBlockStyle =
    copyPlacement === 'top'
      ? [styles.textBlock, styles.textBlockTop, { top: insets.top + 62 }]
      : [styles.textBlock, { bottom: insets.bottom + ONBOARDING_CHROME_HEIGHT + spacing.lg }];

  return (
    <View style={styles.slide}>
      <Image
        source={image}
        style={[
          styles.backgroundImage,
          {
            width: width * frame.widthScale,
            height: height * frame.heightScale,
            left: width * frame.xOffset,
            top: height * frame.yOffset,
          },
        ]}
        resizeMode="cover"
        accessibilityLabel={alt}
      />

      <Svg width="100%" height="100%" preserveAspectRatio="none" style={styles.scrim}>
        <Defs>
          <LinearGradient id="topScrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#050B1A" stopOpacity={0.9} />
            <Stop offset="0.58" stopColor="#050B1A" stopOpacity={0.42} />
            <Stop offset="1" stopColor="#050B1A" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="bottomScrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0B1F3A" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#0B1F3A" stopOpacity={0.72} />
            <Stop offset="1" stopColor="#050B1A" stopOpacity={0.98} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="42%" fill="url(#topScrim)" />
        <Rect x="0" y="52%" width="100%" height="48%" fill="url(#bottomScrim)" />
      </Svg>

      <View style={[styles.brandRow, { top: insets.top + spacing.md }]}>
        <Image
          source={require('@/assets/images/quipupay-icon.png')}
          style={styles.brandIcon}
          accessibilityLabel="QuipuPay"
        />
        <Text style={styles.brandName}>QuipuPay</Text>
      </View>

      <View style={textBlockStyle}>
        <View style={styles.pill}>
          <IconGlyph name={pill.icon} size={14} color="#BBF7D0" />
          <Text style={styles.pillText}>{pill.label}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function IconGlyph({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  const strokeProps = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  switch (name) {
    case 'shield':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...strokeProps} d="M12 3.5 19 6v5.2c0 4.7-2.8 8-7 9.4-4.2-1.4-7-4.7-7-9.4V6l7-2.5Z" />
          <Path {...strokeProps} d="m8.8 12.2 2 2 4.5-5" />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...strokeProps} cx="12" cy="12" r="8.5" />
          <Path {...strokeProps} d="m8.3 12.1 2.5 2.5 5.4-5.2" />
        </Svg>
      );
    case 'face':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...strokeProps} d="M8 4H6.2A2.2 2.2 0 0 0 4 6.2V8" />
          <Path {...strokeProps} d="M16 4h1.8A2.2 2.2 0 0 1 20 6.2V8" />
          <Path {...strokeProps} d="M20 16v1.8a2.2 2.2 0 0 1-2.2 2.2H16" />
          <Path {...strokeProps} d="M8 20H6.2A2.2 2.2 0 0 1 4 17.8V16" />
          <Circle cx="9" cy="10" r="1" fill={color} />
          <Circle cx="15" cy="10" r="1" fill={color} />
          <Path {...strokeProps} d="M8.8 15c1.8 1.5 4.6 1.5 6.4 0" />
        </Svg>
      );
  }
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  backgroundImage: {
    position: 'absolute',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
  brandRow: {
    position: 'absolute',
    left: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 4,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  brandName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: typography.weights.bold,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  textBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    zIndex: 4,
  },
  textBlockTop: {
    maxWidth: 390,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(187,247,208,0.45)',
    backgroundColor: 'rgba(6,22,41,0.7)',
    marginBottom: spacing.md,
  },
  pillText: {
    color: colors.white,
    fontSize: 11.5,
    fontWeight: typography.weights.semibold,
  },
  title: {
    color: colors.white,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: typography.weights.bold,
  },
  titleAccent: {
    color: '#93C5FD',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    marginTop: spacing.sm,
    maxWidth: 340,
  },
});
