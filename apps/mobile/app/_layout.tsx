import 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { nativeTheme } from '@lures-dcs/design-tokens/native';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { LocaleProvider, useLocale } from '../lib/locale';

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

function LocalizedStack() {
  const { t } = useLocale();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: nativeTheme.colors.surface },
        headerTintColor: nativeTheme.colors.textPrimary,
        contentStyle: { backgroundColor: nativeTheme.colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: t('mobile.todayTitle') }} />
      <Stack.Screen name="login" options={{ title: t('common.signIn'), headerShown: false }} />
      <Stack.Screen name="truck/[id]" options={{ title: t('mobile.truckTitle') }} />
      <Stack.Screen name="bag/[id]" options={{ title: t('mobile.bagTitle') }} />
      <Stack.Screen name="settings" options={{ title: t('mobile.settingsTitle') }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocaleProvider>
          <AuthGate>
            <LocalizedStack />
          </AuthGate>
        </LocaleProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
