import { canMobileWorkOnTruck } from '@lures-dcs/domain';
import { nativeTheme } from '@lures-dcs/design-tokens/native';
import type { Tables } from '@lures-dcs/data-access';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { formatWeightKg, truckStatusLabel } from '../../lib/format';
import { saveBagVerification } from '../../lib/operations';
import { getSupabaseClient } from '../../lib/supabase';

type Bag = Tables<'bags'>;
type Truck = Tables<'trucks'>;

export default function BagDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bag, setBag] = useState<Bag | null>(null);
  const [truck, setTruck] = useState<Truck | null>(null);
  const [weight, setWeight] = useState('');
  const [seal, setSeal] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    const supabase = getSupabaseClient();
    const { data, error: bagError } = await supabase.from('bags').select('*').eq('id', id).maybeSingle();
    if (bagError) {
      setError(bagError.message);
      return;
    }
    setBag(data);
    if (data) {
      setWeight(String(data.net_weight_kg));
      setSeal(data.seal_number ?? '');
      const { data: truckData, error: truckError } = await supabase
        .from('trucks')
        .select('*')
        .eq('id', data.truck_id)
        .maybeSingle();
      if (truckError) {
        setError(truckError.message);
        return;
      }
      setTruck(truckData);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const canWork = truck != null && canMobileWorkOnTruck(truck.status);

  async function save(markVerified: boolean) {
    if (!bag || !profile) return;
    if (!canWork) {
      Alert.alert('Read-only', 'This truck is not available for loading yet.');
      return;
    }
    const netWeightKg = Number(weight);
    if (!Number.isFinite(netWeightKg) || netWeightKg < 0) {
      Alert.alert('Invalid weight', 'Enter a valid net weight in kg.');
      return;
    }

    setSaving(true);
    try {
      await saveBagVerification({
        bag,
        profile,
        netWeightKg,
        sealNumber: seal,
        reason,
        markVerified,
      });
      await load();
      setReason('');
      Alert.alert('Saved', markVerified ? 'Bag verified.' : 'Bag updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Could not save bag', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  const weightChanged = bag ? Number(bag.net_weight_kg) !== Number(weight) : false;
  const sealChanged = bag ? (bag.seal_number ?? '') !== seal.trim() : false;
  const needsReason = weightChanged || sealChanged;

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: bag?.bag_number ?? 'Bag' }} />
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? <ActivityIndicator color={nativeTheme.colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {bag ? (
          <>
            <Text style={styles.heading}>{bag.bag_number}</Text>
            <Text style={styles.meta}>Current: {formatWeightKg(Number(bag.net_weight_kg))}</Text>
            <Text style={styles.meta}>Status: {bag.verification_status}</Text>
            {truck ? (
              <Text style={styles.meta}>Truck: {truckStatusLabel(truck.status)}</Text>
            ) : null}

            {!canWork ? (
              <Text style={styles.error}>
                Read-only — wait for management to mark the truck Available.
              </Text>
            ) : null}

            <Text style={styles.label}>Net weight (kg)</Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              style={styles.input}
              editable={canWork}
            />

            <Text style={styles.label}>Seal number</Text>
            <TextInput
              value={seal}
              onChangeText={setSeal}
              style={styles.input}
              autoCapitalize="characters"
              editable={canWork}
            />

            <Text style={styles.label}>
              Reason {needsReason ? '(required for changes)' : '(optional)'}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              style={[styles.input, styles.reason]}
              multiline
              editable={canWork}
              placeholder="e.g. Correction after physical verification"
              placeholderTextColor={nativeTheme.colors.textSecondary}
            />

            <Pressable
              onPress={() => void save(true)}
              disabled={saving || !canWork}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || saving || !canWork) && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Saving…' : 'Verify bag'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void save(false)}
              disabled={saving || !canWork}
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || saving || !canWork) && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Save changes only</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: nativeTheme.colors.background,
  },
  content: {
    padding: nativeTheme.spacing.lg,
    gap: nativeTheme.spacing.sm,
  },
  heading: {
    color: nativeTheme.colors.textPrimary,
    fontSize: nativeTheme.typography.fontSize.xl,
    fontWeight: nativeTheme.typography.fontWeight.semibold,
  },
  meta: {
    color: nativeTheme.colors.textSecondary,
    fontSize: nativeTheme.typography.fontSize.sm,
  },
  label: {
    marginTop: nativeTheme.spacing.sm,
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
  reason: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: nativeTheme.spacing.md,
    backgroundColor: nativeTheme.colors.primary,
    borderRadius: nativeTheme.radii.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: nativeTheme.colors.primaryForeground,
    fontSize: nativeTheme.typography.fontSize.md,
    fontWeight: nativeTheme.typography.fontWeight.medium,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: nativeTheme.colors.border,
    backgroundColor: nativeTheme.colors.surface,
    borderRadius: nativeTheme.radii.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: nativeTheme.colors.textPrimary,
    fontSize: nativeTheme.typography.fontSize.md,
    fontWeight: nativeTheme.typography.fontWeight.medium,
  },
  pressed: {
    opacity: 0.85,
  },
  error: {
    color: nativeTheme.colors.destructive,
  },
});
