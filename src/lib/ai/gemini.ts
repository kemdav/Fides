import { GoogleGenAI } from "@google/genai";
import { getServerEnv } from "@/lib/env";

/** A single turn in a concierge conversation. */
export interface ConciergeTurn {
  role: "user" | "model";
  text: string;
}

/** Optional generation settings for a concierge request. */
export interface GenerateReplyOptions {
  /** Provider rules and tone injected as the system instruction. */
  systemInstruction?: string;
  /** Sampling temperature; lower values are more deterministic. */
  temperature?: number;
  /** Caller-supplied signal so a request can be cancelled upstream. */
  signal?: AbortSignal;
}

/**
 * Sends a conversation to the Gemini API and returns the assistant reply.
 *
 * The request is bounded by `AI_CONCIERGE_TIMEOUT_MS` (default 3000 ms) as
 * required by the SRS/SPMP, so a slow model never blocks the interface.
 *
 * This is a transport wrapper only — prompt construction and the booking
 * confirmation flow belong to the concierge feature module.
 */
export async function generateConciergeReply(
  turns: ConciergeTurn[],
  options: GenerateReplyOptions = {}
): Promise<string> {
  const env = getServerEnv();

  if (!env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. See .env.example for setup."
    );
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_CONCIERGE_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });

  try {
    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: turns.map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      })),
      config: {
        abortSignal: controller.signal,
        systemInstruction: options.systemInstruction,
        temperature: options.temperature,
      },
    });

    return response.text ?? "";
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}
