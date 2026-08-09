"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase-client';
import { Profile } from './supabase';
import { handleLogOut } from '../app/actions';

type AuthContextType = {
  user: any | null; // WorkOS user
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

export function AuthProvider({ children, initialUser }: { children: React.ReactNode, initialUser?: any }) {
  const [user, setUser] = useState<any | null>(initialUser ?? null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  /** Ignore stale profile responses when multiple fetches overlap. */
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
    if (user) {
      void fetchProfile(user.id);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, [user, fetchProfile]);

  const signOut = async () => {
    const uid = user?.id;
    profileFetchGeneration.current += 1;
    
    if (typeof window !== 'undefined' && uid) {
      sessionStorage.removeItem(`ssb_bible_version:${uid}`);
    }
    setProfile(null);
    setUser(null);
    
    await handleLogOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
