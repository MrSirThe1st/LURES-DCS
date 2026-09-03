import { nativeTheme } from '@lures-dcs/design-tokens/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

/**
 * Foundation shell only — no product screens yet.
 * Loading UI will be implemented against docs/blueprint.
 */
export default function IndexScreen() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.container}>
          <Text style={styles.title}>Truck Loading & Dispatch Control System</Text>
          <Text style={styles.body}>
            Mobile loading foundation is ready. Product features are intentionally not implemented
            yet.
          </Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: nativeTheme.colors.background,
  },
  container: {
    flex: 1,
    padding: nativeTheme.spacing.lg,
    gap: nativeTheme.spacing.md,
    justifyContent: 'center',
  },
  title: {
    color: nativeTheme.colors.textPrimary,
    fontSize: nativeTheme.typography.fontSize['2xl'],
    fontWeight: nativeTheme.typography.fontWeight.semibold,
  },
  body: {
    color: nativeTheme.colors.textSecondary,
    fontSize: nativeTheme.typography.fontSize.md,
    lineHeight: nativeTheme.typography.fontSize.md * nativeTheme.typography.lineHeight.normal,
  },
});
