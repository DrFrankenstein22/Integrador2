import type { PropsWithChildren } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

/**
 * Pantalla para formularios: mantiene los campos visibles sobre el teclado,
 * cierra el teclado al tocar fuera o al desplazar, y deja pasar los toques
 * a botones y enlaces.
 */
export function KeyboardAwareScreen({ children, style, contentContainerStyle }: Props) {
  return (
    <SafeAreaView style={[styles.safe, style]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
