import { confirmExpectedArrival, getYardTruck, type YardQueueTruck } from '@lures-dcs/data-access';
import { isPreAlertYardMutable } from '@lures-dcs/domain';
import { nativeTheme } from '@lures-dcs/design-tokens/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
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
import { useAuth } from '../../lib/auth';
import { useLocale } from '../../lib/locale';
import { getSupabaseClient } from '../../lib/supabase';

export default function YardConfirmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [truck, setTruck] = useState<YardQueueTruck | null>(null);
  const [trailer, setTrailer] = useState('');
  const [trailer2, setTrailer2] = useState('');
  const [driver, setDriver] = useState('');
  const [phone, setPhone] = useState('');
  const [passport, setPassport] = useState('');
  const [transporter, setTransporter] = useState('');
  const [client, setClient] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void getYardTruck(getSupabaseClient(), id).then((row) => {
      setTruck(row);
      setTrailer(row?.trailer_registration ?? '');
      setTrailer2(row?.trailer_registration_2 ?? '');
      setDriver(row?.driver_name ?? '');
      setPhone(row?.driver_phone ?? '');
      setPassport(row?.driver_passport_reference ?? '');
      setTransporter(row?.transporter_name ?? '');
      setClient(row?.client_name ?? '');
      setNotes(row?.notes ?? '');
    });
  }, [id]);

  const paused = Boolean(truck?.pre_alert_id) && !isPreAlertYardMutable(truck?.pre_alert_status);

  async function onSubmit() {
    if (!profile || !truck || busy || paused) return;
    setBusy(true);
    setError(null);
    try {
      await confirmExpectedArrival({
        client: getSupabaseClient(),
        actor: { id: profile.id, display_name: profile.display_name },
        payload: {
          truck_id: truck.id,
          trailer_registration: trailer,
          trailer_registration_2: trailer2,
          driver_name: driver,
          driver_phone: phone,
          driver_passport_reference: passport,
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
      <Stack.Screen options={{ title: t('yard.confirm') }} />
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.help}>{t('yard.subtitlePhone')}</Text>
        {truck?.on_site ? <Text style={styles.help}>{t('yard.onSite')}</Text> : null}
        {paused ? <Text style={styles.error}>{t('yard.pausedHint')}</Text> : null}
        <Text style={styles.plate}>{truck?.vehicle_registration ?? '…'}</Text>
        <Field label={t('yard.trailer')} value={trailer} onChangeText={setTrailer} autoCapitalize="characters" editable={!paused} />
        <Field label={t('yard.trailer2')} value={trailer2} onChangeText={setTrailer2} autoCapitalize="characters" editable={!paused} />
        <Field label={t('yard.driver')} value={driver} onChangeText={setDriver} editable={!paused} />
        <Field label={t('yard.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!paused} />
        <Field label={t('yard.passport')} value={passport} onChangeText={setPassport} autoCapitalize="characters" editable={!paused} />
        <Field label={t('yard.transporter')} value={transporter} onChangeText={setTransporter} editable={!paused} />
        <Field label={t('yard.client')} value={client} onChangeText={setClient} editable={!paused} />
        <Field label={t('yard.notes')} value={notes} onChangeText={setNotes} editable={!paused} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {paused ? null : (
          <Pressable
            onPress={() => void onSubmit()}
            disabled={busy || !truck}
            style={({ pressed }) => [styles.button, (pressed || busy || !truck) && styles.buttonPressed]}
          >
            {busy ? (
              <ActivityIndicator color={nativeTheme.colors.primaryForeground} />
            ) : (
              <Text style={styles.buttonText}>
                {t('yard.confirmCta', { vehicle: truck?.vehicle_registration ?? '' })}
              </Text>
            )}
          </Pressable>
        )}
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
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'characters' | 'words';
  editable?: boolean;
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
        editable={editable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: nativeTheme.colors.background },
  form: { padding: nativeTheme.spacing.lg, gap: nativeTheme.spacing.md },
  help: { color: nativeTheme.colors.textSecondary, fontSize: nativeTheme.typography.fontSize.sm },
  plate: {
    color: nativeTheme.colors.textPrimary,
    fontSize: nativeTheme.typography.fontSize.xl,
    fontWeight: nativeTheme.typography.fontWeight.semibold,
  },
  field: { gap: nativeTheme.spacing.xs },
  label: { color: nativeTheme.colors.textSecondary, fontSize: nativeTheme.typography.fontSize.sm },
  input: {
    borderWidth: 1,
    borderColor: nativeTheme.colors.border,
    backgroundColor: nativeTheme.colors.surface,
    borderRadius: nativeTheme.radii.md,
    paddingHorizontal: nativeTheme.spacing.md,
    minHeight: 44,
    color: nativeTheme.colors.textPrimary,
  },
  error: { color: nativeTheme.colors.destructive },
  button: {
    backgroundColor: nativeTheme.colors.primary,
    borderRadius: nativeTheme.radii.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: {
    color: nativeTheme.colors.primaryForeground,
    fontSize: nativeTheme.typography.fontSize.md,
    fontWeight: nativeTheme.typography.fontWeight.medium,
  },
});
