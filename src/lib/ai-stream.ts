/**
 * Client helper for the streaming generation endpoint (`/api/generate`).
 * Every AI generation in the app streams token-by-token through this.
 */
export async function streamGeneration(
  body: { prompt: string; system?: string; context?: string; kind?: "chat" | "agent" },
  onChunk: (text: string) => void,
): Promise<string> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw new Error((await res.text()) || "Generation failed");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onChunk(chunk);
  }
  return full;
}
