import { listExpectedTrucks, listYardQueue, type YardQueueTruck } from '@lures-dcs/data-access';
import { calculateTruckTotalWeightKg, isPreAlertYardMutable, type TruckStatus } from '@lures-dcs/domain';
import { nativeTheme } from '@lures-dcs/design-tokens/native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth';
import { useLocale } from '../lib/locale';
import { formatEtaDate, formatWeightKg, todayDateIso, truckStatusLabel } from '../lib/format';
import { getSupabaseClient } from '../lib/supabase';

type TruckListItem = {
  id: string;
  vehicle_registration: string;
  trailer_registration: string | null;
  driver_name: string | null;
  status: TruckStatus;
  bags: Array<{ id: string; net_weight_kg: number; verification_status: string }>;
};

export default function MobileHome() {
  const { profile } = useAuth();
  if (profile?.role === 'yard_agent') return <YardQueueScreen />;
  return <TodayTrucksScreen />;
}

function formatTrailers(trailer1: string | null | undefined, trailer2: string | null | undefined): string | null {
  const plates = [trailer1, trailer2].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  return plates.length > 0 ? plates.join(' · ') : null;
}

function formatArrival(value: string | null, locale: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
}

function YardQueueScreen() {
  const { profile, signOut } = useAuth();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expected, setExpected] = useState<YardQueueTruck[]>([]);
  const [arrived, setArrived] = useState<YardQueueTruck[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const client = getSupabaseClient();
      const [expectedRows, arrivedRows] = await Promise.all([
        listExpectedTrucks(client, query),
        listYardQueue(client),
      ]);
      setExpected(expectedRows);
      setArrived(arrivedRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
      setExpected([]);
      setArrived([]);
    }
  }, [query, t]);

  useFocusEffect(
    useCallback(() => {
      void load().finally(() => setLoading(false));
    }, [load]),
  );

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: t('yard.title') }} />
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>{t('yard.title')}</Text>
          <Text style={styles.meta}>{profile?.display_name ?? t('yard.agent')}</Text>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{t('mobile.openSettings')}</Text>
        </Pressable>
        <Pressable onPress={() => void signOut()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{t('mobile.signOut')}</Text>
        </Pressable>
      </View>

      <Text style={styles.help}>{t('yard.subtitlePhone')}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('yard.searchPlaceholder')}
        placeholderTextColor={nativeTheme.colors.textSecondary}
        autoCapitalize="characters"
        style={styles.search}
      />

      <Pressable
        onPress={() => router.push('/yard-register')}
        style={({ pressed }) => [styles.unplannedButton, pressed && styles.cardPressed]}
      >
        <Text style={styles.secondaryButtonText}>{t('yard.registerCta')}</Text>
      </Pressable>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={nativeTheme.colors.primary} />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.section}>{t('yard.expected')}</Text>
      {!loading && expected.length === 0 ? <Text style={styles.empty}>{t('yard.noMatch')}</Text> : null}
      <FlatList
        data={expected}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
          />
        }
        renderItem={({ item }) => {
          const paused = Boolean(item.pre_alert_id) && !isPreAlertYardMutable(item.pre_alert_status);
          const body = (
            <>
              <Text style={styles.truckId}>{item.vehicle_registration}</Text>
              {formatTrailers(item.trailer_registration, item.trailer_registration_2) ? (
                <Text style={styles.meta}>
                  {formatTrailers(item.trailer_registration, item.trailer_registration_2)}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {item.driver_name ?? '—'}
                {item.transporter_name ? ` · ${item.transporter_name}` : ''}
              </Text>
              <Text style={styles.meta}>{item.on_site ? t('yard.onSite') : formatEtaDate(item.eta_to_mine)}</Text>
              {paused ? (
                <Text style={styles.meta}>{t('yard.paused')}</Text>
              ) : (
                <Text style={styles.confirmLink}>{t('yard.confirm')}</Text>
              )}
            </>
          );
          if (paused) {
            return <View style={styles.card}>{body}</View>;
          }
          return (
            <Pressable
              onPress={() => router.push(`/yard-confirm/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              {body}
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View>
            <Text style={styles.section}>{t('yard.queue')}</Text>
            {arrived.length === 0 ? <Text style={styles.empty}>{t('yard.empty')}</Text> : null}
            {arrived.map((item, index) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.truckId}>
                  {index + 1}. {item.vehicle_registration}
                </Text>
                {formatTrailers(item.trailer_registration, item.trailer_registration_2) ? (
                  <Text style={styles.meta}>
                    {formatTrailers(item.trailer_registration, item.trailer_registration_2)}
                  </Text>
                ) : null}
                {item.unplanned ? <Text style={styles.error}>{t('yard.unplannedBadge')}</Text> : null}
                <Text style={styles.meta}>
                  {item.driver_name ?? '—'}
                  {item.driver_phone ? ` · ${item.driver_phone}` : ''}
                </Text>
                <Text style={styles.meta}>{formatArrival(item.arrived_at, locale)}</Text>
              </View>
            ))}
          </View>
        }
      />
    </View>
  );
}

function TodayTrucksScreen() {
  const { profile, signOut } = useAuth();
  const { t, locale } = useLocale();
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
          <Text style={styles.heading}>{t('mobile.todayTitle')}</Text>
          <Text style={styles.meta}>{profile?.display_name ?? 'Loading staff'}</Text>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{t('mobile.openSettings')}</Text>
        </Pressable>
        <Pressable onPress={() => void signOut()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{t('mobile.signOut')}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={nativeTheme.colors.primary} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && trucks.length === 0 ? (
        <Text style={styles.empty}>{t('mobile.noTrucks')}</Text>
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
                {truckStatusLabel(item.status, locale)} · {verifiedCount}/{item.bags.length} verified ·{' '}
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
  help: {
    paddingHorizontal: nativeTheme.spacing.lg,
    paddingBottom: nativeTheme.spacing.sm,
    color: nativeTheme.colors.textSecondary,
    fontSize: nativeTheme.typography.fontSize.sm,
  },
  search: {
    marginHorizontal: nativeTheme.spacing.lg,
    marginBottom: nativeTheme.spacing.sm,
    borderWidth: 1,
    borderColor: nativeTheme.colors.border,
    backgroundColor: nativeTheme.colors.surface,
    borderRadius: nativeTheme.radii.md,
    paddingHorizontal: nativeTheme.spacing.md,
    minHeight: 44,
    color: nativeTheme.colors.textPrimary,
  },
  section: {
    paddingTop: nativeTheme.spacing.md,
    paddingBottom: nativeTheme.spacing.xs,
    color: nativeTheme.colors.textPrimary,
    fontSize: nativeTheme.typography.fontSize.md,
    fontWeight: nativeTheme.typography.fontWeight.semibold,
  },
  confirmLink: {
    color: nativeTheme.colors.primary,
    fontSize: nativeTheme.typography.fontSize.sm,
    fontWeight: nativeTheme.typography.fontWeight.medium,
  },
  unplannedButton: {
    marginHorizontal: nativeTheme.spacing.lg,
    marginBottom: nativeTheme.spacing.sm,
    borderWidth: 1,
    borderColor: nativeTheme.colors.border,
    backgroundColor: nativeTheme.colors.surface,
    borderRadius: nativeTheme.radii.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  primaryButton: {
    marginHorizontal: nativeTheme.spacing.lg,
    marginTop: nativeTheme.spacing.sm,
    backgroundColor: nativeTheme.colors.primary,
    borderRadius: nativeTheme.radii.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: nativeTheme.colors.primaryForeground,
    fontSize: nativeTheme.typography.fontSize.md,
    fontWeight: nativeTheme.typography.fontWeight.medium,
  },
});
