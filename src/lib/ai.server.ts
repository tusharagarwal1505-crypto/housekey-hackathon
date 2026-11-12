import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const MODEL = "openai/gpt-6-astra";
const RUN_HEADER = "X-Lovable-AIG-Run-ID";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_HEADER)) headers.set(RUN_HEADER, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_HEADER)?.trim() || undefined;
    return res;
  };
}

export class AIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

/** Streams the gateway call and returns the final text. */
export async function runAI(system: string, messages: ModelMessage[], effort: "low" | "medium" = "low") {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AIError("AI is not configured.", 401);
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses(MODEL),
    instructions: system,
    messages,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: effort,
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
    onError: ({ error }) => {
      failure = error;
    },
  });
  const text = await Promise.resolve(result.text).catch((e: unknown) => {
    failure ??= e;
    return "";
  });
  if (failure || !text) {
    const status = (failure as { statusCode?: number })?.statusCode;
    console.error("AI gateway error", failure);
    if (status === 429) throw new AIError("AI is busy right now — please try again in a moment.", 429);
    if (status === 402) throw new AIError("AI credits have run out. Add credits in Settings → Plans & credits.", 402);
    throw new AIError("The AI couldn't complete this request.", status);
  }
  return text;
}

export function parseJSON<T>(text: string): T {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new AIError("The AI returned an unreadable answer.");
  return JSON.parse(m[0]) as T;
}
