import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Tables } from '@lures-dcs/data-access';
import { getSupabaseClient } from './supabase';

export type Profile = Tables<'profiles'>;

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabaseClient();
    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    if (!current?.user) {
      setProfile(null);
      return;
    }
    const nextProfile = await fetchProfile(current.user.id);
    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;

    async function init() {
      try {
        const {
          data: { session: current },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (cancelled) return;

        setSession(current);
        if (current?.user) {
          const nextProfile = await fetchProfile(current.user.id);
          if (!cancelled) setProfile(nextProfile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to restore session');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        return;
      }
      void fetchProfile(nextSession.user.id)
        .then((nextProfile) => setProfile(nextProfile))
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load profile');
        });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const supabase = getSupabaseClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      throw signInError;
    }

    setSession(data.session);
    if (data.user) {
      const nextProfile = await fetchProfile(data.user.id);
      if (!nextProfile) {
        const message = 'Signed in, but no profile was found for this user.';
        setError(message);
        throw new Error(message);
      }
      if (nextProfile.role !== 'management') {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        const message = 'This account is not authorized for the management desktop app.';
        setError(message);
        throw new Error(message);
      }
      setProfile(nextProfile);
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    setSession(null);
    setProfile(null);
    setError(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      error,
      signIn,
      signOut,
      refreshProfile,
    }),
    [loading, session, profile, error, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
