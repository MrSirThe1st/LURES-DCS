import { calculateTruckTotalWeightKg, type TruckStatus } from '@lures-dcs/domain';
import { nativeTheme } from '@lures-dcs/design-tokens/native';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth';
import { formatWeightKg, todayDateIso, truckStatusLabel } from '../lib/format';
import { getSupabaseClient } from '../lib/supabase';

type TruckListItem = {
  id: string;
  vehicle_registration: string;
  trailer_registration: string | null;
  driver_name: string | null;
  status: TruckStatus;
  bags: Array<{ id: string; net_weight_kg: number; verification_status: string }>;
};

export default function TodayTrucksScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trucks, setTrucks] = useState<TruckListItem[]>([]);

  const load = useCallback(async () => {
    setError(null);
    const supabase = getSupabaseClient();
    const dateIso = todayDateIso();

    const { data: lists, error: listError } = await supabase
      .from('loading_lists')
      .select('id')
      .eq('loading_date', dateIso);

    if (listError) {
      setError(listError.message);
      setTrucks([]);
      return;
    }

    if (!lists || lists.length === 0) {
      setTrucks([]);
      return;
    }

    const { data, error: truckError } = await supabase
      .from('trucks')
      .select(
        'id, vehicle_registration, trailer_registration, driver_name, status, bags(id, net_weight_kg, verification_status)',
      )
      .in(
        'loading_list_id',
        lists.map((list) => list.id),
      )
      .order('vehicle_registration', { ascending: true });

    if (truckError) {
      setError(truckError.message);
      setTrucks([]);
      return;
    }

    setTrucks((data ?? []) as TruckListItem[]);
  }, []);

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

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Today’s trucks</Text>
          <Text style={styles.meta}>{profile?.display_name ?? 'Loading staff'}</Text>
        </View>
        <Pressable onPress={() => void signOut()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={nativeTheme.colors.primary} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && trucks.length === 0 ? (
        <Text style={styles.empty}>No trucks scheduled for today.</Text>
      ) : null}

      <FlatList
        data={trucks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        renderItem={({ item }) => {
          const verifiedCount = item.bags.filter((bag) => bag.verification_status !== 'pending').length;
          const total = calculateTruckTotalWeightKg(item.bags.map((bag) => Number(bag.net_weight_kg)));
          return (
            <Pressable
              onPress={() => router.push(`/truck/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <Text style={styles.truckId}>{item.vehicle_registration}</Text>
              <Text style={styles.meta}>
                {truckStatusLabel(item.status)} · {verifiedCount}/{item.bags.length} verified ·{' '}
                {formatWeightKg(total)}
              </Text>
              <Text style={styles.meta}>{item.driver_name ?? 'No driver listed'}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: nativeTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nativeTheme.spacing.sm,
    paddingHorizontal: nativeTheme.spacing.lg,
    paddingTop: nativeTheme.spacing.md,
    paddingBottom: nativeTheme.spacing.sm,
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: nativeTheme.colors.border,
    backgroundColor: nativeTheme.colors.surface,
    borderRadius: nativeTheme.radii.md,
    paddingHorizontal: nativeTheme.spacing.md,
    paddingVertical: nativeTheme.spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: nativeTheme.colors.textPrimary,
    fontSize: nativeTheme.typography.fontSize.sm,
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
    minHeight: 88,
  },
  cardPressed: {
    backgroundColor: nativeTheme.colors.background,
  },
  truckId: {
    color: nativeTheme.colors.textPrimary,
    fontSize: nativeTheme.typography.fontSize.lg,
    fontWeight: nativeTheme.typography.fontWeight.semibold,
  },
  centered: {
    padding: nativeTheme.spacing.lg,
  },
  empty: {
    paddingHorizontal: nativeTheme.spacing.lg,
    color: nativeTheme.colors.textSecondary,
  },
  error: {
    paddingHorizontal: nativeTheme.spacing.lg,
    color: nativeTheme.colors.destructive,
  },
});
