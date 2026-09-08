import 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { nativeTheme } from '@lures-dcs/design-tokens/native';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';

function AuthGate({ children }: { children: ReactNode }) {
  const { loading, session, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onLogin = segments[0] === 'login';
    const signedIn = Boolean(session && profile);

    if (!signedIn && !onLogin) {
      router.replace('/login');
      return;
    }
    if (signedIn && onLogin) {
      router.replace('/');
    }
  }, [loading, session, profile, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: nativeTheme.colors.background,
        }}
      >
        <ActivityIndicator color={nativeTheme.colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: nativeTheme.colors.surface },
              headerTintColor: nativeTheme.colors.textPrimary,
              contentStyle: { backgroundColor: nativeTheme.colors.background },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="index" options={{ title: "Today's trucks" }} />
            <Stack.Screen name="login" options={{ title: 'Sign in', headerShown: false }} />
            <Stack.Screen name="truck/[id]" options={{ title: 'Truck' }} />
            <Stack.Screen name="bag/[id]" options={{ title: 'Bag' }} />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
