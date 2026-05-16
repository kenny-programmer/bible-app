"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase-client';
import { Profile } from './supabase';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  /** Ignore stale profile responses when multiple fetches overlap (e.g. refresh + token refresh). */
  const profileFetchGeneration = useRef(0);

  const fetchProfile = useCallback(async (userId: string) => {
    const generation = ++profileFetchGeneration.current;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (generation !== profileFetchGeneration.current) {
      return;
    }
    if (error) {
      console.error('Failed to load profile:', error);
    }
    setProfile(data);
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          profileFetchGeneration.current += 1;
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
      profileFetchGeneration.current += 1;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    const uid = user?.id;
    profileFetchGeneration.current += 1;
    await supabase.auth.signOut();
    if (typeof window !== 'undefined' && uid) {
      sessionStorage.removeItem(`ssb_bible_version:${uid}`);
    }
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
