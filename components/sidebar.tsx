"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { CounselingSession } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CirclePlus as PlusCircle, MessageSquare, LogOut, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BIBLE_VERSIONS } from '@/lib/bible-data';

type SidebarProps = {
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string | null) => void;
};

export function Sidebar({ currentSessionId, onSessionSelect }: SidebarProps) {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [sessions, setSessions] = useState<CounselingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('counseling_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setSessions(data || []);
    setLoading(false);
  };

  const handleNewSession = () => {
    onSessionSelect(null);
  };

  const handleBibleVersionChange = async (version: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ preferred_bible_version: version.toLowerCase() })
      .eq('id', user.id);

    if (error) {
      console.error('[Sidebar] Failed to update preferred_bible_version:', error);
      return;
    }

    await refreshProfile();
  };

  return (
    <div className="w-80 bg-white border-r border-[#D4AF37]/20 flex flex-col">
      <div className="p-4 border-b border-[#D4AF37]/20">
        <h1 className="text-xl font-serif text-[#333333] mb-4">
          Spiritual Study Buddy
        </h1>
        <Button
          onClick={handleNewSession}
          className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>

      <div className="p-4 border-b border-[#D4AF37]/20">
        <label className="text-xs font-semibold text-[#333333] uppercase tracking-wide mb-2 block">
          Bible Version
        </label>
        <Select
          value={profile?.preferred_bible_version?.toLowerCase() || 'kjv'}
          onValueChange={handleBibleVersionChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BIBLE_VERSIONS.map((version) => (
              <SelectItem key={version.value} value={version.value}>
                {version.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {loading ? (
            <p className="text-sm text-[#333333]/60 text-center py-4">
              Loading sessions...
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-[#333333]/60 text-center py-4">
              No sessions yet. Start a new conversation!
            </p>
          ) : (
            sessions.map((session) => (
              <motion.button
                key={session.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSessionSelect(session.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  currentSessionId === session.id
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]'
                    : 'bg-white border-[#D4AF37]/20 hover:border-[#D4AF37]'
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#D4AF37]" />
                  <span className="text-sm font-medium text-[#333333] truncate">
                    {session.title}
                  </span>
                </div>
                <p className="text-xs text-[#333333]/60 mt-1">
                  {new Date(session.created_at).toLocaleDateString()}
                </p>
              </motion.button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-[#D4AF37]/20 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
            <span className="text-sm font-semibold text-[#D4AF37]">
              {profile?.display_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="text-sm text-[#333333] font-medium">
            {profile?.display_name || 'User'}
          </span>
        </div>
        <Button
          onClick={signOut}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
