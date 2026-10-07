import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../constants/colors';

export type TabIconName = 'home' | 'qr' | 'receipt' | 'menu';

/**
 * Iconos vectoriales propios para el tab bar, con una "burbuja" azul sólida
 * detrás del icono activo (blanco sobre azul) — antes eran glifos de texto
 * sueltos (◆ ▣ ≡ ☰) sin ningún tratamiento visual, así que la barra se veía
 * sin terminar.
 */
export function TabBarIcon({ name, focused }: { name: TabIconName; focused: boolean }) {
  const activeIsQr = focused && name === 'qr';

  return (
    <View style={[styles.bubble, focused && styles.bubbleActive, activeIsQr && styles.qrActive]}>
      <IconGlyph name={name} color={activeIsQr ? '#A3E635' : focused ? colors.white : '#94A3B8'} />
    </View>
  );
}

function IconGlyph({ name, color }: { name: TabIconName; color: string }) {
  const strokeProps = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  const size = 20;

  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...strokeProps} d="m4 11 8-6.5L20 11" />
          <Path {...strokeProps} d="M6 9.8V19a1 1 0 0 0 1 1h3v-5.2h4V20h3a1 1 0 0 0 1-1V9.8" />
        </Svg>
      );
    case 'qr':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...strokeProps} x="4" y="4" width="6" height="6" rx="1.2" />
          <Rect {...strokeProps} x="14" y="4" width="6" height="6" rx="1.2" />
          <Rect {...strokeProps} x="4" y="14" width="6" height="6" rx="1.2" />
          <Path {...strokeProps} d="M14 15h2.8v-2.2H20V20h-2.8" />
          <Path {...strokeProps} d="M14 20h.1" />
        </Svg>
      );
    case 'receipt':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...strokeProps} d="M6.5 3.5h11v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-1-.6Z" />
          <Path {...strokeProps} d="M9 8h6" />
          <Path {...strokeProps} d="M9 12h6" />
          <Path {...strokeProps} d="M9 16h3.5" />
        </Svg>
      );
    case 'menu':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...strokeProps} cx="12" cy="7" r="3" />
          <Path {...strokeProps} d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" />
        </Svg>
      );
  }
}

const styles = StyleSheet.create({
  bubble: {
    width: 46,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleActive: {
    backgroundColor: '#1D4ED8',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  qrActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#A3E635',
  },
});
