"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { Message } from '@/lib/supabase';
import { sendMessage } from '@/app/actions/chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader as Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

type ChatInterfaceProps = {
  sessionId: string | null;
  onNewSession: (sessionId: string) => void;
};

export function ChatInterface({ sessionId, onNewSession }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadMessages = async () => {
    if (!sessionId) return;

    setLoadingMessages(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
    setLoadingMessages(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      let activeSessionId = sessionId;

      if (!activeSessionId) {
        const { data: newSession, error } = await supabase
          .from('counseling_sessions')
          .insert({
            user_id: user.id,
            title: userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : ''),
          })
          .select()
          .single();

        if (error || !newSession) {
          throw new Error('Failed to create session');
        }

        activeSessionId = newSession.id;
        onNewSession(newSession.id);
      }

      if (!activeSessionId) {
        throw new Error('No active session');
      }

      const { data: userMessageData, error: userMessageError } = await supabase
        .from('messages')
        .insert({
          session_id: activeSessionId,
          user_id: user.id,
          role: 'user',
          content: userMessage,
        })
        .select()
        .single();

      if (userMessageError || !userMessageData) {
        throw new Error('Failed to save message');
      }

      setMessages((prev) => [...prev, userMessageData]);

      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendMessage(conversationHistory, userMessage);

      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
        return;
      }

      const { data: assistantMessageData, error: assistantMessageError } = await supabase
        .from('messages')
        .insert({
          session_id: activeSessionId,
          user_id: user.id,
          role: 'assistant',
          content: response.content,
        })
        .select()
        .single();

      if (assistantMessageError || !assistantMessageData) {
        throw new Error('Failed to save response');
      }

      setMessages((prev) => [...prev, assistantMessageData]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <ScrollArea className="flex-1 px-4 py-4 md:px-6 md:py-6">
        <div className="max-w-3xl mx-auto space-y-3 md:space-y-4 pb-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 md:py-16 px-4"
            >
              <h2 className="text-2xl md:text-3xl font-serif text-[#333333] mb-3">
                Welcome, friend
              </h2>
              <p className="text-base md:text-lg text-[#333333]/70 max-w-md mx-auto">
                I'm here to support you on your spiritual journey. How can I help you today?
              </p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex w-full ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] md:max-w-[75%] rounded-2xl px-4 py-3 md:px-5 md:py-4 ${
                      message.role === 'user'
                        ? 'bg-[#D4AF37] text-white shadow-sm'
                        : 'bg-white border-2 border-[#D4AF37]/10 shadow-sm'
                    }`}
                  >
                    <div
                      className={`text-[15px] md:text-base leading-relaxed ${
                        message.role === 'user'
                          ? 'text-white'
                          : 'text-[#333333]'
                      }`}
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {message.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start w-full"
            >
              <div className="bg-white border-2 border-[#D4AF37]/10 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-[#333333]/60">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Reflecting...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t-2 border-[#D4AF37]/10 bg-white/80 backdrop-blur-sm px-4 py-3 md:px-6 md:py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Share what's on your heart..."
              className="flex-1 resize-none min-h-[52px] md:min-h-[56px] max-h-[120px] md:max-h-[160px] text-[15px] md:text-base rounded-xl border-2 border-[#D4AF37]/20 focus:border-[#D4AF37]/40 focus-visible:ring-[#D4AF37]/20 px-4 py-3"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 h-[52px] md:h-[56px] px-5 md:px-6 rounded-xl shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
