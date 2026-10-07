import { Stack } from 'expo-router';
import { RegistrationProvider } from '@/src/context/RegistrationContext';

export default function RegisterLayout() {
  return (
    <RegistrationProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RegistrationProvider>
  );
}
