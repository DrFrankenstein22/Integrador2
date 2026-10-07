import * as Haptics from 'expo-haptics';

/** Pequeña vibración de confirmación al tocar un control. */
export function tapFeedback() {
  void Haptics.selectionAsync().catch(() => undefined);
}

/** Vibración de éxito (fin de un flujo, confirmación importante). */
export function successFeedback() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => undefined,
  );
}

/** Vibración de error. */
export function errorFeedback() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
    () => undefined,
  );
}
