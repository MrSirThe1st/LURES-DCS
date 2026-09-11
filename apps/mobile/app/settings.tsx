import { nativeTheme } from '@lures-dcs/design-tokens/native';
import type { AppLocale, MessageKey } from '@lures-dcs/i18n';
import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useLocale } from '../lib/locale';

function localeLabelKey(code: AppLocale): MessageKey {
  if (code === 'fr') return 'settings.locale.fr';
  if (code === 'zh') return 'settings.locale.zh';
  return 'settings.locale.en';
}

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const { locale, locales, t, setLocale, saving, notice } = useLocale();

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: t('mobile.settingsTitle') }} />
      <Text style={styles.heading}>{t('settings.title')}</Text>
      <Text style={styles.sub}>{t('settings.subtitle')}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t('settings.signedInAs')}</Text>
        <Text style={styles.name}>{profile?.display_name ?? '—'}</Text>
        <Text style={styles.meta}>{profile?.role ?? ''}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
          <Text style={styles.secondaryButtonText}>{t('common.signOut')}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.headingSmall}>{t('settings.language')}</Text>
        <Text style={styles.sub}>{t('settings.languageHelp')}</Text>
        <View style={styles.row}>
          {locales.map((code) => {
            const active = locale === code;
            return (
              <Pressable
                key={code}
                disabled={saving}
                onPress={() => void setLocale(code)}
                style={[styles.langBtn, active ? styles.langBtnActive : null]}
              >
                <Text style={[styles.langBtnText, active ? styles.langBtnTextActive : null]}>
                  {t(localeLabelKey(code))}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {saving ? <Text style={styles.meta}>{t('settings.savingLanguage')}</Text> : null}
        {notice ? <Text style={styles.meta}>{notice}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: nativeTheme.colors.background,
    padding: nativeTheme.spacing.lg,
    gap: nativeTheme.spacing.md,
  },
  heading: {
    fontSize: nativeTheme.typography.fontSize.xl,
    fontWeight: nativeTheme.typography.fontWeight.bold,
    color: nativeTheme.colors.textPrimary,
  },
  headingSmall: {
    fontSize: nativeTheme.typography.fontSize.lg,
    fontWeight: nativeTheme.typography.fontWeight.semibold,
    color: nativeTheme.colors.textPrimary,
  },
  sub: {
    fontSize: nativeTheme.typography.fontSize.sm,
    color: nativeTheme.colors.textSecondary,
  },
  card: {
    borderWidth: 1,
    borderColor: nativeTheme.colors.border,
    backgroundColor: nativeTheme.colors.surface,
    borderRadius: nativeTheme.radii.md,
    padding: nativeTheme.spacing.md,
    gap: nativeTheme.spacing.sm,
  },
  label: {
    fontSize: nativeTheme.typography.fontSize.sm,
    color: nativeTheme.colors.textSecondary,
  },
  name: {
    fontSize: nativeTheme.typography.fontSize.md,
    fontWeight: nativeTheme.typography.fontWeight.semibold,
    color: nativeTheme.colors.textPrimary,
  },
  meta: {
    fontSize: nativeTheme.typography.fontSize.sm,
    color: nativeTheme.colors.textSecondary,
  },
  secondaryButton: {
    marginTop: nativeTheme.spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: nativeTheme.colors.border,
    borderRadius: nativeTheme.radii.md,
    paddingHorizontal: nativeTheme.spacing.md,
    paddingVertical: nativeTheme.spacing.sm,
    backgroundColor: nativeTheme.colors.background,
  },
  secondaryButtonText: {
    color: nativeTheme.colors.textPrimary,
    fontWeight: nativeTheme.typography.fontWeight.semibold,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nativeTheme.spacing.sm,
  },
  langBtn: {
    borderWidth: 1,
    borderColor: nativeTheme.colors.border,
    borderRadius: nativeTheme.radii.md,
    paddingHorizontal: nativeTheme.spacing.md,
    paddingVertical: nativeTheme.spacing.sm,
    backgroundColor: nativeTheme.colors.background,
  },
  langBtnActive: {
    backgroundColor: nativeTheme.colors.primary,
    borderColor: nativeTheme.colors.primary,
  },
  langBtnText: {
    color: nativeTheme.colors.textPrimary,
    fontWeight: nativeTheme.typography.fontWeight.semibold,
  },
  langBtnTextActive: {
    color: nativeTheme.colors.primaryForeground,
  },
});
