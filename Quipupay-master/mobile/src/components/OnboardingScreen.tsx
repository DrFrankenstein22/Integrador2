import { useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from './Screen';
import { Button } from './Button';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { tapFeedback } from '../utils/haptics';

export type OnboardingSlideConfig = {
  key: string;
  content: ReactNode;
  primaryLabel: string;
  /**
   * Solo hace falta en la última pantalla: qué hacer al presionar el botón
   * principal en vez del comportamiento por defecto (avanzar a la
   * siguiente pantalla del carrusel).
   */
  onPrimaryPress?: () => void;
  secondary?: {
    label: string;
    onPress: () => void;
    variant?: 'link' | 'outline';
  };
};

type OnboardingScreenProps = {
  slides: OnboardingSlideConfig[];
};

const PRIMARY_ROW_HEIGHT = 52; // alto del botón principal (y del botón secundario "outline")
const SECONDARY_SLOT_HEIGHT = 52; // reservado siempre, tenga o no contenido esta pantalla
const DOT_SIZE = 7;

// Cuánto ocupa la barra inferior (puntos + botones), sin contar el propio
// safe-area del borde de abajo del teléfono — quien dibuje contenido de
// fondo a pantalla completa (ver welcome.tsx) debe sumarle `insets.bottom`
// para saber a partir de dónde puede empezar su texto sin quedar tapado.
export const ONBOARDING_CHROME_HEIGHT =
  PRIMARY_ROW_HEIGHT + spacing.md + SECONDARY_SLOT_HEIGHT + spacing.md + DOT_SIZE;

/**
 * Carrusel de bienvenida genérico: pantallas navegables por swipe
 * horizontal, con indicador de puntos y controles inferiores (botón
 * principal + secundario opcional) que se adaptan según la posición
 * — primera, intermedia o última — de cada pantalla. El contenido de
 * cada pantalla lo define quien use el componente.
 */
export function OnboardingScreen({ slides }: OnboardingScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const slide = slides[index];

  function goToIndex(next: number) {
    const clamped = Math.max(0, Math.min(next, slides.length - 1));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  }

  function handleMomentumScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(nextIndex, slides.length - 1)));
  }

  function handlePrimaryPress() {
    tapFeedback();
    if (slide.onPrimaryPress) {
      slide.onPrimaryPress();
      return;
    }
    goToIndex(index + 1);
  }

  return (
    <Screen style={styles.screen} edges={[]}>
      <StatusBar style="light" />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {slides.map((item) => (
          <View key={item.key} style={[styles.page, { width }]}>
            {item.content}
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.dots,
          { bottom: insets.bottom + PRIMARY_ROW_HEIGHT + spacing.md + SECONDARY_SLOT_HEIGHT + spacing.md },
        ]}
        accessibilityRole="tablist"
      >
        {slides.map((item, i) => (
          <View key={item.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      {/*
        La fila principal y el "slot" secundario de abajo tienen SIEMPRE la
        misma altura en las 3 posiciones, aunque una pantalla no tenga
        botón/link secundario — así la barra inferior no cambia de tamaño al
        deslizar entre pantallas y el contenido de arriba no salta de lugar.
      */}
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.primaryRow}>
          <Button label={slide.primaryLabel} onPress={handlePrimaryPress} style={styles.primaryButton} />
        </View>

        <View style={styles.secondarySlot}>
          {slide.secondary?.variant === 'outline' ? (
            <Button label={slide.secondary.label} variant="outlineDark" onPress={slide.secondary.onPress} />
          ) : slide.secondary ? (
            <Text style={styles.link} onPress={slide.secondary.onPress} accessibilityRole="link">
              {slide.secondary.label}
            </Text>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.primaryDark,
  },
  scroll: {
    ...StyleSheet.absoluteFill,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    // Si algún elemento de una pantalla llegara a medir más de lo previsto,
    // que se recorte dentro de su propia página en vez de asomarse a la de
    // al lado — el ScrollView horizontal no recorta a sus hijos por defecto.
    height: '100%',
    overflow: 'hidden',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    zIndex: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.white,
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    zIndex: 3,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  primaryButton: {
    flex: 1,
  },
  link: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  // Reservado siempre, tenga o no contenido esta pantalla, para que la
  // barra inferior mida lo mismo en las 3 posiciones del carrusel.
  secondarySlot: {
    minHeight: 52,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
});
