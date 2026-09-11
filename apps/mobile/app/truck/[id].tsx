import {
  calculateTruckTotalWeightKg,
  canMobileWorkOnTruck,
  canTransitionTruckStatus,
  TruckStatus,
} from '@lures-dcs/domain';
import { nativeTheme } from '@lures-dcs/design-tokens/native';
import type { Tables } from '@lures-dcs/data-access';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../lib/auth';
import { useLocale } from '../../lib/locale';
import { formatWeightKg, truckStatusLabel } from '../../lib/format';
import { completeTruck } from '../../lib/operations';
import { getSupabaseClient } from '../../lib/supabase';

type Truck = Tables<'trucks'>;
type Bag = Tables<'bags'>;

export default function TruckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truck, setTruck] = useState<Truck | null>(null);
  const [bags, setBags] = useState<Bag[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    const supabase = getSupabaseClient();
    const [truckResult, bagsResult] = await Promise.all([
      supabase.from('trucks').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('bags')
        .select('*')
        .eq('truck_id', id)
        .order('sort_order', { ascending: true })
        .order('bag_number', { ascending: true }),
    ]);

    if (truckResult.error || bagsResult.error) {
      setError(truckResult.error?.message ?? bagsResult.error?.message ?? 'Failed to load truck');
      return;
    }

    setTruck(truckResult.data);
    setBags(bagsResult.data ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onComplete() {
    if (!truck || !profile) return;
    setSaving(true);
    try {
      await completeTruck(truck, profile);
      await load();
      Alert.alert('Truck completed', `${truck.vehicle_registration} marked as completed.`);
    } catch (err) {
      Alert.alert('Could not complete truck', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  const total = calculateTruckTotalWeightKg(bags.map((bag) => Number(bag.net_weight_kg)));
  const verifiedCount = bags.filter((bag) => bag.verification_status !== 'pending').length;
  const canWork = truck != null && canMobileWorkOnTruck(truck.status);
  const canComplete =
    truck != null && canTransitionTruckStatus(truck.status, TruckStatus.Completed);

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: truck?.vehicle_registration ?? 'Truck' }} />
      <StatusBar style="dark" />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={nativeTheme.colors.primary} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {truck ? (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            {truckStatusLabel(truck.status, locale)} · {verifiedCount}/{bags.length} bags ·{' '}
            {formatWeightKg(total)}
          </Text>
          <Text style={styles.meta}>{truck.driver_name ?? 'No driver listed'}</Text>
          <Text style={styles.meta}>{truck.transporter_name ?? 'No transporter listed'}</Text>

          {canComplete ? (
            <Pressable
              onPress={() => void onComplete()}
              disabled={saving}
              style={({ pressed }) => [
                styles.completeButton,
                (pressed || saving) && styles.pressed,
              ]}
            >
              <Text style={styles.completeButtonText}>
                {saving ? t('common.loading') : t('mobile.completeTruck')}
              </Text>
            </Pressable>
          ) : null}

          {truck.status === TruckStatus.Waiting ? (
            <Text style={styles.meta}>
              Read-only until management marks this truck as Available.
            </Text>
          ) : null}
          {truck.status === TruckStatus.Available ? (
            <Text style={styles.meta}>{t('mobile.availableHint')}</Text>
          ) : null}
          {truck.status === TruckStatus.OnHold ? (
            <Text style={styles.meta}>{t('mobile.onHoldHint')}</Text>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={bags}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => {
              if (!canWork) {
                Alert.alert(
                  'Read-only',
                  'This truck is not available for loading yet. Wait for management to mark it Available.',
                );
                return;
              }
              router.push(`/bag/${item.id}`);
            }}
            style={({ pressed }) => [styles.card, pressed && canWork && styles.pressed]}
          >
            <Text style={styles.bagTitle}>
              {index + 1}. {item.bag_number}
            </Text>
            <Text style={styles.meta}>
              {formatWeightKg(Number(item.net_weight_kg))} · Seal {item.seal_number ?? '—'}
            </Text>
            <Text style={styles.meta}>Status: {item.verification_status}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: nativeTheme.colors.background,
  },
  centered: {
    padding: nativeTheme.spacing.lg,
  },
  error: {
    color: nativeTheme.colors.destructive,
    paddingHorizontal: nativeTheme.spacing.lg,
  },
  summary: {
    paddingHorizontal: nativeTheme.spacing.lg,
    paddingTop: nativeTheme.spacing.md,
    gap: nativeTheme.spacing.xs,
  },
  summaryTitle: {
    color: nativeTheme.colors.textPrimary,
    fontSize: nativeTheme.typography.fontSize.md,
    fontWeight: nativeTheme.typography.fontWeight.semibold,
  },
  meta: {
    color: nativeTheme.colors.textSecondary,
    fontSize: nativeTheme.typography.fontSize.sm,
  },
  completeButton: {
    marginTop: nativeTheme.spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: nativeTheme.colors.primary,
    borderRadius: nativeTheme.radii.md,
    paddingHorizontal: nativeTheme.spacing.md,
    paddingVertical: nativeTheme.spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  completeButtonText: {
    color: nativeTheme.colors.primaryForeground,
    fontWeight: nativeTheme.typography.fontWeight.medium,
  },
  list: {
    padding: nativeTheme.spacing.lg,
    gap: nativeTheme.spacing.sm,
  },
  card: {
    backgroundColor: nativeTheme.colors.surface,
    borderColor: nativeTheme.colors.border,
    borderWidth: 1,
    borderRadius: nativeTheme.radii.md,
    padding: nativeTheme.spacing.md,
    gap: nativeTheme.spacing.xs,
    minHeight: 84,
  },
  bagTitle: {
    color: nativeTheme.colors.textPrimary,
    fontSize: nativeTheme.typography.fontSize.md,
    fontWeight: nativeTheme.typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.85,
  },
});
