import * as SecureStore from 'expo-secure-store';
import { DEFAULT_CARD_THEME_ID } from '../constants/cardThemes';

function keyFor(accountId: string): string {
  return `quipupay.cardTheme.${accountId}`;
}

export async function getCardThemeId(accountId: string): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(keyFor(accountId))) ?? DEFAULT_CARD_THEME_ID;
  } catch {
    return DEFAULT_CARD_THEME_ID;
  }
}

export async function setCardThemeId(accountId: string, themeId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(keyFor(accountId), themeId);
  } catch {
    // Preferencia no crítica: si no se puede guardar, se usa el tema por defecto.
  }
}
