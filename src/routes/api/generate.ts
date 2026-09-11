import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";

/**
 * Streams AI text for one-shot generators (resume optimizer, cover letter,
 * mock-interview coach). Body: { prompt, system?, context?, kind? }.
 *
 * kind "chat"  -> OpenRouter gemma first (default, conversational output)
 * kind "agent" -> Groq first (structured / analytical output)
 */
export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { prompt?: string; system?: string; context?: string; kind?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        if (!body.prompt?.trim()) {
          return new Response("prompt required", { status: 400 });
        }

        const { hasAnyProvider, providerChain, markKeyFailed, MISSING_KEYS_MESSAGE } = await import(
          "@/lib/ai-provider.server"
        );
        if (!hasAnyProvider()) {
          return new Response(MISSING_KEYS_MESSAGE, { status: 500 });
        }

        const prompt = body.context ? `${body.context}\n\n---\n\n${body.prompt}` : body.prompt;
        const chain = providerChain(body.kind === "agent" ? "agent" : "chat");

        for (let i = 0; i < chain.length; i++) {
          const attempt = chain[i];
          const isLast = i === chain.length - 1;
          try {
            const result = streamText({
              model: attempt.model,
              system: body.system ?? "You are a helpful career assistant. Use markdown.",
              prompt,
              onError: ({ error }: { error: unknown }) => {
                markKeyFailed(attempt.key);
                console.error(`[generate] ${attempt.provider} stream error`, error);
              },
            });
            await result.warnings;
            return result.toTextStreamResponse();
          } catch (err) {
            markKeyFailed(attempt.key);
            console.error(`[generate] ${attempt.provider} failed`, err);
            if (isLast) {
              return new Response(
                err instanceof Error ? err.message : "Generation is unavailable right now.",
                { status: 502 },
              );
            }
          }
        }
        return new Response(MISSING_KEYS_MESSAGE, { status: 500 });
      },
    },
  },
});
