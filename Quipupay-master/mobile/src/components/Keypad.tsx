import { useMemo } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { tapFeedback } from '../utils/haptics';

const ORDERED_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

function shuffledKeys(): string[] {
  const digits = [...DIGITS];
  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  // Mismo layout de 3x4, "borrar" y el hueco vacío siempre en el mismo
  // lugar (para no obligar a buscarlos) — solo los dígitos cambian de sitio.
  return [...digits.slice(0, 9), '', digits[9], 'delete'];
}

type KeypadProps = {
  onKeyPress: (key: string) => void;
  disabled?: boolean;
  /**
   * Mezcla la posición de los dígitos, para que alguien mirando por encima
   * del hombro no pueda memorizar la clave por dónde tocaste. Cambia
   * `shuffleSeed` para forzar un nuevo orden (p. ej. entre "crea tu clave"
   * y "confírmala", para que no sea el mismo mapa las dos veces).
   */
  randomize?: boolean;
  shuffleSeed?: string | number;
};

export function Keypad({ onKeyPress, disabled = false, randomize = false, shuffleSeed }: KeypadProps) {
  // `shuffleSeed` no se lee dentro del cálculo a propósito: solo está en las
  // dependencias para forzar un nuevo mezclado cuando cambia (p. ej. entre
  // "crea tu clave" y "confírmala").
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const keys = useMemo(() => (randomize ? shuffledKeys() : ORDERED_KEYS), [randomize, shuffleSeed]);

  return (
    <View style={styles.grid}>
      {keys.map((key, index) => {
        if (key === '') {
          return <View key={`empty-${index}`} style={styles.key} />;
        }

        return (
          <Pressable
            key={key}
            style={styles.key}
            onPress={() => {
              if (!disabled) {
                tapFeedback();
                onKeyPress(key);
              }
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={key === 'delete' ? 'Borrar' : key}
            accessibilityState={{ disabled }}
          >
            {({ pressed }) => (
              <View style={[styles.keyInner, pressed && !disabled && styles.keyPressed]}>
                <Text style={[styles.label, disabled && styles.labelDisabled]}>
                  {key === 'delete' ? '⌫' : key}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    width: '33.33%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyInner: {
    width: 56,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: {
    backgroundColor: '#EFF4FF',
  },
  label: {
    fontSize: 22,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  labelDisabled: {
    color: '#9CA3AF',
  },
});
