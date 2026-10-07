import { Stack } from 'expo-router';
import { AccountOpeningProvider } from '@/src/context/AccountOpeningContext';

export default function AppStackLayout() {
  return (
    <AccountOpeningProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AccountOpeningProvider>
  );
}
