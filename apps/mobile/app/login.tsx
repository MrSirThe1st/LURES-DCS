import { nativeTheme } from '@lures-dcs/design-tokens/native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth';

export default function LoginScreen() {
  const { signIn, error } = useAuth();
  const [email, setEmail] = useState('loading@lures.local');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit() {
    setLocalError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  const message = localError ?? error;

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text style={styles.title}>LURES-DCS</Text>
        <Text style={styles.subtitle}>Loading operations — sign in to verify today’s trucks.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="loading@lures.local"
            placeholderTextColor={nativeTheme.colors.textSecondary}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={nativeTheme.colors.textSecondary}
          />

          {message ? <Text style={styles.error}>{message}</Text> : null}

          <Pressable
            onPress={() => void onSubmit()}
            disabled={submitting}
            style={({ pressed }) => [
              styles.button,
              (pressed || submitting) && styles.buttonPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={nativeTheme.colors.primaryForeground} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: nativeTheme.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: nativeTheme.spacing.lg,
    gap: nativeTheme.spacing.md,
  },
  title: {
    color: nativeTheme.colors.textPrimary,
    fontSize: nativeTheme.typography.fontSize['2xl'],
    fontWeight: nativeTheme.typography.fontWeight.semibold,
  },
  subtitle: {
    color: nativeTheme.colors.textSecondary,
    fontSize: nativeTheme.typography.fontSize.md,
    lineHeight: nativeTheme.typography.fontSize.md * nativeTheme.typography.lineHeight.normal,
  },
  form: {
    backgroundColor: nativeTheme.colors.surface,
    borderColor: nativeTheme.colors.border,
    borderWidth: 1,
    borderRadius: nativeTheme.radii.md,
    padding: nativeTheme.spacing.lg,
    gap: nativeTheme.spacing.sm,
  },
  label: {
    color: nativeTheme.colors.textSecondary,
    fontSize: nativeTheme.typography.fontSize.sm,
    marginTop: nativeTheme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: nativeTheme.colors.border,
    backgroundColor: nativeTheme.colors.background,
    borderRadius: nativeTheme.radii.md,
    paddingHorizontal: nativeTheme.spacing.md,
    paddingVertical: nativeTheme.spacing.sm + 4,
    color: nativeTheme.colors.textPrimary,
    fontSize: nativeTheme.typography.fontSize.md,
    minHeight: 48,
  },
  error: {
    color: nativeTheme.colors.destructive,
    fontSize: nativeTheme.typography.fontSize.sm,
  },
  button: {
    marginTop: nativeTheme.spacing.sm,
    backgroundColor: nativeTheme.colors.primary,
    borderRadius: nativeTheme.radii.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: nativeTheme.colors.primaryForeground,
    fontSize: nativeTheme.typography.fontSize.md,
    fontWeight: nativeTheme.typography.fontWeight.medium,
  },
});
