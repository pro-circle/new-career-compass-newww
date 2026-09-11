/**
 * Server-only AI router. Two providers, two jobs:
 *
 *   1. OpenRouter — `google/gemma-4-26b-a4b-it:free`. Used for the
 *      conversational surfaces (Career Assistant chat, one-shot generators).
 *      Up to 2 keys, round-robined with cooldown on failure.
 *   2. Groq — `openai/gpt-oss-120b`. Used for every agentic/structured task
 *      (resume parsing, job-link evaluation, matching, auto-apply drafting).
 *      Up to 3 keys, round-robined with cooldown on failure.
 *
 * Either pool can cover for the other: chat falls back to Groq, agent work
 * falls back to OpenRouter. Never import this file from client code.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { serverEnv } from "./env.server";

export const GROQ_MODEL = "openai/gpt-oss-120b";
export const OPENROUTER_MODEL = "google/gemma-4-26b-a4b-it:free";

const COOLDOWN_MS = 60_000;
const cooldown = new Map<string, number>();
const cursors = { groq: 0, openrouter: 0 };

function dedupe(keys: (string | undefined)[]): string[] {
  return Array.from(new Set(keys.filter((k): k is string => !!k && k.trim().length > 8)));
}

export function groqKeys(): string[] {
  return dedupe([
    serverEnv("GROQ_API_KEY_1"),
    serverEnv("GROQ_API_KEY_2"),
    serverEnv("GROQ_API_KEY_3"),
    serverEnv("GROQ_API_KEY"),
  ]);
}

export function openRouterKeys(): string[] {
  return dedupe([
    serverEnv("OPENROUTER_API_KEY_1"),
    serverEnv("OPENROUTER_API_KEY_2"),
    serverEnv("OPENROUTER_API_KEY"),
  ]);
}

function healthy(all: string[]): string[] {
  const now = Date.now();
  const ok = all.filter((k) => (cooldown.get(k) ?? 0) < now);
  return ok.length ? ok : all;
}

export function markKeyFailed(key: string) {
  cooldown.set(key, Date.now() + COOLDOWN_MS);
}

function groqModel(key: string): LanguageModel {
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: key,
  })(GROQ_MODEL);
}

function openRouterModel(key: string): LanguageModel {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    headers: {
      "HTTP-Referer": serverEnv("APP_URL") ?? "http://localhost:5173",
      "X-Title": "ATS Engine",
    },
  })(OPENROUTER_MODEL);
}

export type Provider = "groq" | "openrouter";
export type Attempt = { provider: Provider; model: LanguageModel; key: string };

function pool(provider: Provider): Attempt[] {
  const keys = healthy(provider === "groq" ? groqKeys() : openRouterKeys());
  if (!keys.length) return [];
  const start = cursors[provider];
  const attempts: Attempt[] = keys.map((_, i) => {
    const key = keys[(start + i) % keys.length];
    return {
      provider,
      key,
      model: provider === "groq" ? groqModel(key) : openRouterModel(key),
    };
  });
  cursors[provider] = (start + 1) % keys.length;
  return attempts;
}

/**
 * Ordered attempts for a request.
 * `chat`  -> OpenRouter first, Groq as failover.
 * `agent` -> Groq first, OpenRouter as failover.
 */
export function providerChain(kind: "chat" | "agent" = "agent"): Attempt[] {
  return kind === "chat"
    ? [...pool("openrouter"), ...pool("groq")]
    : [...pool("groq"), ...pool("openrouter")];
}

export function hasAnyProvider(): boolean {
  return groqKeys().length > 0 || openRouterKeys().length > 0;
}

export const MISSING_KEYS_MESSAGE =
  "No AI provider configured. Add OPENROUTER_API_KEY_1/2 (chat) and GROQ_API_KEY_1/2/3 (agent) to your .env file.";

/** First model to try for a streaming endpoint. Throws when nothing is set. */
export function primaryModel(kind: "chat" | "agent" = "chat"): Attempt {
  const chain = providerChain(kind);
  if (!chain.length) throw new Error(MISSING_KEYS_MESSAGE);
  return chain[0];
}

/**
 * One-shot generation with automatic key/provider failover.
 * Always streams under the hood, then resolves the full text.
 */
export async function runAgent(opts: {
  system?: string;
  prompt: string;
  kind?: "chat" | "agent";
  maxOutputTokens?: number;
}): Promise<{ text: string; provider: string }> {
  const { streamText } = await import("ai");
  const chain = providerChain(opts.kind ?? "agent");
  if (!chain.length) throw new Error(MISSING_KEYS_MESSAGE);

  let lastErr: unknown;
  for (const attempt of chain) {
    try {
      const result = streamText({
        model: attempt.model,
        system: opts.system,
        prompt: opts.prompt,
        ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
      });
      const text = await result.text;
      if (text?.trim()) return { text, provider: attempt.provider };
    } catch (err) {
      lastErr = err;
      markKeyFailed(attempt.key);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All AI providers failed");
}

/** Run the agent and parse the first JSON object it returns. */
export async function runAgentJson<T>(opts: {
  system?: string;
  prompt: string;
}): Promise<T | null> {
  const { text } = await runAgent(opts);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
