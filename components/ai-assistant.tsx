"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { sendMessage } from "@/app/actions/chat";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Loader as Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AIAssistantProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AIAssistant({ open, onOpenChange }: AIAssistantProps) {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => setMounted(true), []);

  /** Mobile Safari: `fixed` + small `bottom` uses the *layout* viewport, which extends below the visible area—FAB gets clipped. Align to the visual viewport instead. */
  /** Smaller `bottom` = pill sits lower (closer to the home indicator). Floor kept minimal so it doesn’t hover mid-screen. */
  const [fabBottomPx, setFabBottomPx] = useState(40);

  useEffect(() => {
    const updateFabInset = () => {
      const vv = window.visualViewport;
      const margin = 8;
      const narrow = typeof window !== "undefined" && window.innerWidth < 1024;
      const floorPx = narrow ? 36 : 20;
      if (!vv) {
        setFabBottomPx(narrow ? 40 : 36);
        return;
      }
      const layoutH = window.innerHeight;
      const obscuredBelow = layoutH - vv.offsetTop - vv.height;
      const fromVisualBottom = Math.max(0, obscuredBelow) + margin;
      const raw = Math.max(floorPx, fromVisualBottom);
      /** Avoid runaway values that park the FAB too far up the screen on odd viewports. */
      const capped = narrow ? Math.min(raw, 72) : raw;
      setFabBottomPx(capped);
    };

    updateFabInset();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", updateFabInset);
    vv?.addEventListener("scroll", updateFabInset);
    window.addEventListener("resize", updateFabInset);
    return () => {
      vv?.removeEventListener("resize", updateFabInset);
      vv?.removeEventListener("scroll", updateFabInset);
      window.removeEventListener("resize", updateFabInset);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await sendMessage(messages, userMessage);

      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.content },
      ]);
    } catch {
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const panel = (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close AI assistant"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
              className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            />
            {/* Flex centers the panel. Framer `y` transform would override Tailwind -translate and clip the dialog on desktop. */}
            <div
              className="fixed inset-0 z-[201] flex items-center justify-center px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pointer-events-none"
              role="presentation"
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="ai-assistant-title"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="pointer-events-auto grid h-[min(44rem,85dvh,calc(100svh-3rem))] w-full min-h-0 max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border-2 border-[#D4AF37]/20 bg-[#FDFCF8] shadow-2xl"
              >
              <div className="flex flex-shrink-0 items-center justify-between border-b border-[#D4AF37]/20 bg-white/80 px-3 py-3 backdrop-blur-sm sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <MessageCircle
                    className="h-5 w-5 flex-shrink-0 text-[#D4AF37]"
                    aria-hidden
                  />
                  <h3
                    id="ai-assistant-title"
                    className="truncate font-serif text-base font-semibold text-[#333333] sm:text-lg"
                  >
                    AI Assistant
                  </h3>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {messages.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="h-8 px-2 text-sm text-[#333333]/70"
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="h-8 w-8 p-0 text-[#333333]/70"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto overscroll-y-contain px-3 py-3 [-webkit-overflow-scrolling:touch] sm:px-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-2 py-8 text-center sm:py-10">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#D4AF37]/10">
                      <MessageCircle className="h-6 w-6 text-[#D4AF37]" />
                    </div>
                    <h4 className="mb-2 font-serif text-lg text-[#333333]">
                      How can I help you?
                    </h4>
                    <p className="max-w-sm text-sm leading-relaxed text-[#333333]/65">
                      Ask me anything about the Bible, theology, or applying
                      Scripture to your life.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-2">
                    {messages.map((message, idx) => (
                      <motion.div
                        key={`${idx}-${message.content.slice(0, 24)}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[min(100%,20rem)] rounded-xl px-3.5 py-2.5 sm:max-w-[85%] sm:px-4 sm:py-3 ${
                            message.role === "user"
                              ? "bg-[#D4AF37] text-white shadow-sm"
                              : "border-2 border-[#D4AF37]/10 bg-white text-[#333333] shadow-sm"
                          }`}
                        >
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                    {loading && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex w-full justify-start"
                      >
                        <div className="rounded-xl border-2 border-[#D4AF37]/10 bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-2 text-[#333333]/60">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Thinking...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-[#D4AF37]/20 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask your question..."
                    className="min-w-0 flex-1 rounded-lg border border-[#D4AF37]/30 px-3 py-2.5 text-[15px] text-[#333333] placeholder:text-[#333333]/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/35"
                    disabled={loading}
                    enterKeyHint="send"
                    autoComplete="off"
                  />
                  <Button
                    type="submit"
                    disabled={loading || !input.trim()}
                    size="sm"
                    className="h-10 flex-shrink-0 bg-[#D4AF37] px-4 hover:bg-[#D4AF37]/90"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {!open && (
        <Button
          type="button"
          size="lg"
          onClick={() => onOpenChange(true)}
          aria-expanded={false}
          aria-haspopup="dialog"
          className="fixed z-[9999] flex h-14 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full bg-[#D4AF37] px-4 text-white shadow-lg shadow-black/15 hover:bg-[#D4AF37]/90 sm:px-5 md:max-w-none right-[max(1rem,env(safe-area-inset-right,0px))]"
          style={{ bottom: fabBottomPx }}
        >
          <MessageCircle className="h-5 w-5 flex-shrink-0" />
          <span className="max-w-[5.5rem] truncate text-sm font-medium sm:max-w-none">
            AI Chat
          </span>
        </Button>
      )}
    </>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(panel, document.body);
}
