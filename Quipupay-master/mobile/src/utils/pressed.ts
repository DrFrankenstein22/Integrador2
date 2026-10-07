import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Helper para dar feedback visual al tocar un Pressable:
 * `style={pressableStyle(styles.row)}`.
 */
export function pressableStyle(base: StyleProp<ViewStyle>) {
  return ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => [
    base,
    pressed ? { opacity: 0.6 } : null,
  ];
}
