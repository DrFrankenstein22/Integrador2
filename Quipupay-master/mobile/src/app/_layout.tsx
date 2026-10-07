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
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLocked, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        {/* Ya hay sesión guardada de un login anterior, pero falta confirmar
            con huella/Face ID o la clave en esta apertura de la app. */}
        <Stack.Protected guard={!isAuthenticated && isLocked}>
          <Stack.Screen name="(locked)" />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated && !isLocked}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      {isLoading ? (
        <View style={styles.loader}>
          <Image
            source={require('@/assets/images/quipupay-icon.png')}
            style={styles.loaderLogo}
            accessibilityLabel="Quipupay"
          />
          <ActivityIndicator color={colors.white} size="large" style={styles.loaderSpinner} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },
  loaderLogo: {
    width: 88,
    height: 88,
    borderRadius: 24,
  },
  loaderSpinner: {
    marginTop: 28,
  },
});
