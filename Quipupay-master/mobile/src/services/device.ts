import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export type DeviceSignals = {
  isDevice: boolean;
  brand: string | null;
  modelName: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceType: string | null;
  collectedAt: number;
};

const DEVICE_TYPE_LABELS: Record<number, string> = {
  1: 'PHONE',
  2: 'TABLET',
  3: 'DESKTOP',
  4: 'TV',
};

/** Señales del dispositivo para el motor de riesgo (real vs emulador, marca, OS). */
export async function collectDeviceSignals(): Promise<DeviceSignals> {
  let deviceType: number | null = null;
  try {
    deviceType = await Device.getDeviceTypeAsync();
  } catch {
    deviceType = null;
  }

  return {
    isDevice: Device.isDevice,
    brand: Device.brand ?? null,
    modelName: Device.modelName ?? null,
    osName: Device.osName ?? null,
    osVersion: Device.osVersion ?? null,
    deviceType: deviceType !== null ? (DEVICE_TYPE_LABELS[deviceType] ?? String(deviceType)) : null,
    collectedAt: Date.now(),
  };
}

const DEVICE_ID_KEY = 'quipupay_device_id';

function randomId(): string {
  const chunk = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${chunk()}-${chunk()}`;
}

/**
 * Identificador estable de esta instalación de la app: se genera una sola
 * vez y queda guardado en el almacén seguro del teléfono (sobrevive
 * reinicios de la app, no a una desinstalación). No es una credencial ni
 * viaja como secreto — el backend solo lo usa, ya con hash, para reconocer
 * "este es el mismo celular de antes" en próximos inicios de sesión.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const id = randomId();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}

export type DeviceInfo = {
  deviceId: string;
  platform: string;
  osVersion?: string;
  appVersion?: string;
};

/** Info que se manda al backend en cada registro/login para reconocer el dispositivo. */
export async function collectDeviceInfo(): Promise<DeviceInfo> {
  const deviceId = await getOrCreateDeviceId();
  return {
    deviceId,
    platform: Platform.OS,
    osVersion: Device.osVersion ?? undefined,
    appVersion: Constants.expoConfig?.version ?? undefined,
  };
}
