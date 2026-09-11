import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { Mic, Send, Sparkles, MessagesSquare, Square } from "lucide-react";
import { useSpeechInput } from "@/hooks/use-speech-input";
import { usePrefs } from "@/hooks/use-prefs";
import { toast } from "sonner";
import { AiMarkdown } from "@/components/ai-markdown";

export const Route = createFileRoute("/_app/candidate/assistant")({
  head: () => ({ meta: [{ title: "Career Assistant · ATS Engine" }] }),
  component: Assistant,
});

const starters = [
  "How do I negotiate a design lead offer?",
  "What should I ask in a systems design interview?",
  "Draft a follow-up email after a final round",
  "How to explain a career gap?",
];

function Assistant() {
  const [input, setInput] = useState("");
  const { floatingAssistant, setFloatingAssistant } = usePrefs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useSpeechInput();

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (err) => {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "The assistant is unavailable right now.");
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    voice.reset();
    await sendMessage({ text: t });
  }

  // Stream recognized speech straight into the composer.
  useEffect(() => {
    if (!voice.listening && !voice.transcript) return;
    const live = [voice.transcript, voice.interim].filter(Boolean).join(" ");
    if (live) setInput(live);
  }, [voice.transcript, voice.interim, voice.listening]);

  useEffect(() => {
    if (voice.error) toast.error(voice.error);
  }, [voice.error]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="AI coaching"
        title="Career assistant"
        subtitle="Grounded in your resume, applications, and real-time company data."
        actions={
          <button
            onClick={() => {
              setFloatingAssistant(!floatingAssistant);
              toast.success(
                floatingAssistant ? "Floating assistant hidden" : "Floating assistant enabled",
              );
            }}
            aria-pressed={floatingAssistant}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
              floatingAssistant
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-card text-foreground/70 hover:bg-surface"
            }`}
          >
            <MessagesSquare className="size-3.5" />
            Floating icon
            <span
              className={`relative h-4 w-7 rounded-full transition-colors ${
                floatingAssistant ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-3 rounded-full bg-white transition-transform ${
                  floatingAssistant ? "translate-x-3" : ""
                }`}
              />
            </span>
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-4">
        <SectionCard title="Conversation" className="lg:col-span-3">
          <div className="flex h-[560px] flex-col">
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
              {messages.length === 0 && (
                <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                  <div>
                    <Sparkles className="mx-auto mb-2 size-6 text-accent" />
                    <p>Ask about interviews, offers, negotiations, or career strategy.</p>
                  </div>
                </div>
              )}
              {messages.map((m, i) => {
                const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                const isStreaming =
                  status === "streaming" && m.role === "assistant" && i === messages.length - 1;
                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        m.role === "assistant"
                          ? "bg-accent text-accent-foreground"
                          : "bg-brand text-brand-foreground"
                      }`}
                    >
                      {m.role === "assistant" ? "AI" : "YOU"}
                    </div>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.role === "assistant"
                          ? "border border-border/60 bg-surface text-foreground shadow-sm"
                          : "bg-brand text-brand-foreground"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <AiMarkdown streaming={isStreaming}>{text}</AiMarkdown>
                      ) : (
                        text
                      )}
                    </div>
                  </div>
                );
              })}
              {busy && <div className="text-xs text-muted-foreground">Thinking…</div>}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-border p-4"
            >
              <button
                type="button"
                onClick={() => (voice.listening ? voice.stop() : voice.start())}
                disabled={!voice.supported}
                aria-pressed={voice.listening}
                aria-label={voice.listening ? "Stop voice input" : "Start voice input"}
                title={voice.supported ? "Voice input" : "Voice input not supported here"}
                className={`grid size-9 shrink-0 place-items-center rounded-md border transition-colors disabled:opacity-40 ${
                  voice.listening
                    ? "animate-pulse border-accent bg-accent text-accent-foreground"
                    : "border-border bg-surface text-foreground/70 hover:text-foreground"
                }`}
              >
                {voice.listening ? <Square className="size-3.5" /> : <Mic className="size-4" />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  voice.listening ? "Listening…" : "Ask anything, or tap the mic to speak"
                }
                className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-60"
              >
                Send <Send className="size-3" />
              </button>
            </form>
          </div>
        </SectionCard>

        <SectionCard title="Starters">
          <div className="space-y-2 p-4">
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={busy}
                className="w-full rounded-lg border border-border bg-surface p-3 text-left text-xs hover:border-accent/40 disabled:opacity-60"
              >
                <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                  <Sparkles className="size-3" /> Prompt
                </div>
                {s}
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
