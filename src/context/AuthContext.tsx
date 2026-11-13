import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '../lib/supabase';
import { readableError } from '../lib/validation';

type AuthValue = { session: Session | null; loading: boolean; profile: Profile | null; profileLoading: boolean; profileError: string; reloadProfile: () => Promise<void>; signOut: () => Promise<void>; recovery: boolean; clearRecovery: () => void };
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const identity = useRef<string | null>(null);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      identity.current = nextSession?.user.id || null;
      setSession(nextSession); setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') { setProfile(null); setRecovery(false); }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (mounted) { identity.current = error ? null : data.session?.user.id || null; setSession(error ? null : data.session); setLoading(false); }
    }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  async function reloadProfile() {
    if (!supabase || !session) return;
    const requestedUser = session.user.id;
    setProfileLoading(true); setProfileError('');
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) throw error;
      if (identity.current === requestedUser) setProfile(data as Profile);
    } catch (error) { if (identity.current === requestedUser) setProfileError(readableError(error)); }
    finally { if (identity.current === requestedUser) setProfileLoading(false); }
  }
  useEffect(() => {
    setProfile(null);
    if (session?.user.id) void reloadProfile();
    else { setProfileError(''); setProfileLoading(false); }
    // Reload on identity changes, not each automatic access-token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);
  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  return <AuthContext.Provider value={{ session, loading, profile, profileLoading, profileError, reloadProfile, signOut, recovery, clearRecovery: () => setRecovery(false) }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider is required'); return value; }
