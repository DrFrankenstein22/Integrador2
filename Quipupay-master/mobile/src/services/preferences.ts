import * as SecureStore from 'expo-secure-store';

const HIDE_BALANCE_KEY = 'quipupay.hideBalance';

export async function getHideBalance(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(HIDE_BALANCE_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setHideBalance(hidden: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(HIDE_BALANCE_KEY, hidden ? '1' : '0');
  } catch {
    // Preferencia no crítica: si no se puede guardar, se usa el valor por defecto.
  }
}
