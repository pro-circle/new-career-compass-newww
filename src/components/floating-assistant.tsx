import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessagesSquare, X, Send, Sparkles } from "lucide-react";
import { AiMarkdown } from "@/components/ai-markdown";

/** Floating career-assistant bubble. Rendered only when the user enables it. */
export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[460px] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-accent" /> Career assistant
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Ask about interviews, offers, or your next move.
              </p>
            )}
            {messages.map((m, i) => {
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              const isStreaming =
                status === "streaming" && m.role === "assistant" && i === messages.length - 1;
              return (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === "assistant"
                      ? "border border-border/60 bg-surface text-foreground"
                      : "ml-auto bg-brand text-brand-foreground"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <AiMarkdown streaming={isStreaming}>{text}</AiMarkdown>
                  ) : (
                    text
                  )}
                </div>
              );
            })}
            {busy && <p className="text-[11px] text-muted-foreground">Thinking…</p>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = input.trim();
              if (!t || busy) return;
              setInput("");
              void sendMessage({ text: t });
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="submit"
              disabled={busy}
              className="grid size-8 place-items-center rounded-md bg-accent text-accent-foreground disabled:opacity-60"
              aria-label="Send"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Career assistant"
        title="Career assistant"
        className="fixed bottom-6 right-6 z-50 grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-xl transition-transform hover:scale-105"
      >
        <MessagesSquare className="size-6" />
      </button>
    </>
  );
}
