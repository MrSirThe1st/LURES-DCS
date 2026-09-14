import { registerYardArrival } from '@lures-dcs/data-access';
import { nativeTheme } from '@lures-dcs/design-tokens/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth';
import { useLocale } from '../lib/locale';
import { getSupabaseClient } from '../lib/supabase';

export default function YardRegisterScreen() {
  const { profile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [vehicle, setVehicle] = useState('');
  const [trailer, setTrailer] = useState('');
  const [driver, setDriver] = useState('');
  const [phone, setPhone] = useState('');
  const [transporter, setTransporter] = useState('');
  const [client, setClient] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!profile || busy) return;
    setBusy(true);
    setError(null);
    try {
      await registerYardArrival({
        client: getSupabaseClient(),
        actor: { id: profile.id, display_name: profile.display_name },
        payload: {
          vehicle_registration: vehicle,
          trailer_registration: trailer,
          driver_name: driver,
          driver_phone: phone,
          driver_passport_reference: null,
          transporter_name: transporter,
          client_name: client,
          notes,
        },
      });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: t('yard.register') }} />
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.help}>{t('yard.unplannedBadge')}</Text>
        <Text style={styles.help}>{t('yard.subtitlePhone')}</Text>
        <Field label={t('yard.vehicle')} value={vehicle} onChangeText={setVehicle} autoCapitalize="characters" />
        <Field label={t('yard.trailer')} value={trailer} onChangeText={setTrailer} autoCapitalize="characters" />
        <Field label={t('yard.driver')} value={driver} onChangeText={setDriver} />
        <Field
          label={t('yard.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Field label={t('yard.transporter')} value={transporter} onChangeText={setTransporter} />
        <Field label={t('yard.client')} value={client} onChangeText={setClient} />
        <Field label={t('yard.notes')} value={notes} onChangeText={setNotes} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          onPress={() => void onSubmit()}
          disabled={busy || vehicle.trim().length === 0}
          style={({ pressed }) => [
            styles.button,
            (pressed || busy || vehicle.trim().length === 0) && styles.buttonPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={nativeTheme.colors.primaryForeground} />
          ) : (
            <Text style={styles.buttonText}>{t('yard.submit')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'characters' | 'words';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholderTextColor={nativeTheme.colors.textSecondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: nativeTheme.colors.background,
  },
  form: {
    padding: nativeTheme.spacing.lg,
    gap: nativeTheme.spacing.md,
  },
  help: {
    color: nativeTheme.colors.textSecondary,
    fontSize: nativeTheme.typography.fontSize.sm,
  },
  field: {
    gap: nativeTheme.spacing.xs,
  },
  label: {
    color: nativeTheme.colors.textSecondary,
    fontSize: nativeTheme.typography.fontSize.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: nativeTheme.colors.border,
    backgroundColor: nativeTheme.colors.surface,
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
    backgroundColor: nativeTheme.colors.primary,
    borderRadius: nativeTheme.radii.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: nativeTheme.spacing.sm,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: nativeTheme.colors.primaryForeground,
    fontSize: nativeTheme.typography.fontSize.md,
    fontWeight: nativeTheme.typography.fontWeight.medium,
  },
});
