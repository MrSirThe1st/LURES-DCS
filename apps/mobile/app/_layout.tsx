import { Stack } from 'expo-router';
import { nativeTheme } from '@lures-dcs/design-tokens/native';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: nativeTheme.colors.surface },
        headerTintColor: nativeTheme.colors.textPrimary,
        contentStyle: { backgroundColor: nativeTheme.colors.background },
        title: 'LURES-DCS',
      }}
    />
  );
}
