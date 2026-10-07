import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';

type ScreenProps = ViewProps & {
  /**
   * Lados donde respetar el área segura (notch, barra de estado, home
   * indicator). Por defecto los 4. Una pantalla con un header de color
   * que debe llegar hasta el borde superior (detrás de la hora/batería)
   * debe excluir 'top' acá y manejar ese espacio ella misma con
   * `useSafeAreaInsets`, si no la barra de estado queda flotando sobre el
   * fondo por defecto (claro) en vez del color del header.
   */
  edges?: readonly Edge[];
};

export function Screen({ children, style, edges, ...rest }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.container, style]} edges={edges} {...rest}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
});
