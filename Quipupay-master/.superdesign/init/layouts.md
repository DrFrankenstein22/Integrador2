# Shared layouts

## `mobile/src/app/_layout.tsx`

Root providers and authenticated/unauthenticated route boundary.

```tsx
import { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { queryClient } from '@/src/api/queryClient';
import { colors } from '@/src/constants/colors';

void SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><AuthProvider><RootNavigator /></AuthProvider></QueryClientProvider></SafeAreaProvider>;
}
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  useEffect(() => { if (!isLoading) void SplashScreen.hideAsync(); }, [isLoading]);
  return <><Stack screenOptions={{ headerShown: false }}><Stack.Protected guard={isAuthenticated}><Stack.Screen name="(tabs)" /><Stack.Screen name="(app)" /></Stack.Protected><Stack.Protected guard={!isAuthenticated}><Stack.Screen name="(auth)" /></Stack.Protected></Stack>{isLoading ? <View style={styles.loader}><Image source={require('@/assets/images/quipupay-icon.png')} style={styles.loaderLogo} accessibilityLabel="Quipupay" /><ActivityIndicator color={colors.white} size="large" style={styles.loaderSpinner} /></View> : null}</>;
}
const styles = StyleSheet.create({ loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark }, loaderLogo: { width: 88, height: 88, borderRadius: 24 }, loaderSpinner: { marginTop: 28 } });
```

## `mobile/src/app/(tabs)/_layout.tsx`

Authenticated bottom navigation with Inicio, QR, Pagos, and Más.

```tsx
import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '@/src/constants/colors';
function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) { return <Text style={{ fontSize: 16, fontWeight: '700', color }}>{glyph}</Text>; }
export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: '#6B7280' }}>
    <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color }) => <TabIcon glyph="◆" color={color} /> }} />
    <Tabs.Screen name="qr" options={{ title: 'QR', tabBarIcon: ({ color }) => <TabIcon glyph="▣" color={color} /> }} />
    <Tabs.Screen name="pagos" options={{ title: 'Pagos', tabBarIcon: ({ color }) => <TabIcon glyph="≡" color={color} /> }} />
    <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: ({ color }) => <TabIcon glyph="☰" color={color} /> }} />
  </Tabs>;
}
```
