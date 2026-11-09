import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { z } from 'zod';
import { creditIdentitySchema } from './credit-rules';
import { resolveWallet } from './credits.server';

const GATEWAY = "https://ai.gateway.lovable.dev";
const CHAT_MODEL = "openai/gpt-6-astra";
const STT_MODEL = "openai/gpt-transcribe";
const TTS_MODEL = "google/gemini-3.1-flash-tts-preview";

const SYSTEM =
  "You are AI PLEX, a sharp, friendly assistant. Answer clearly using Markdown. When the user shares an image, analyze it carefully and describe what matters.";

function apiKey() {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new Error("AI is not configured");
  return key;
}

function errorResponse(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

async function relayError(res: Response) {
  const text = await res.text();
  console.error(`Gateway error [${res.status}]: ${text}`);
  let message = "The AI service is unavailable right now.";
  if (res.status === 429) message = "Too many requests — please wait a moment and try again.";
  else if (res.status === 402) message = "AI credits are used up. Please add credits to continue.";
  else {
    try {
      message = JSON.parse(text)?.error?.message ?? JSON.parse(text)?.message ?? message;
    } catch {
      /* keep default */
    }
  }
  return errorResponse(res.status, message);
}

export async function handleChat(request: Request) {
  let body;
  try {
    body = creditIdentitySchema.extend({ messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(20000), image: z.string().max(10000000).optional() })).min(1).max(100) }).parse(await request.json());
  } catch {
    return errorResponse(400, "Invalid request");
  }
  const msgs = body.messages.slice(-30);
  if (!msgs.length) return errorResponse(400, "No message provided");

  const messages: ModelMessage[] = msgs.map((m) => {
    if (m.role === "user" && m.image?.startsWith("data:image/")) {
      return {
        role: "user",
        content: [
          { type: "text", text: m.content || "Analyze this image." },
          { type: "image", image: new URL(m.image) },
        ],
      };
    }
    return { role: m.role, content: String(m.content ?? "").slice(0, 20000) } as ModelMessage;
  });

  let walletContext;
  try { walletContext = await resolveWallet(request, body.guestToken); }
  catch { return errorResponse(401, 'Could not open your credits. Please refresh and try again.'); }
  const { db, wallet } = walletContext;
  const requestId = crypto.randomUUID();
  const { data: reserved, error: reserveError } = await db.rpc('credit_reserve', { p_wallet: wallet.id, p_request: requestId });
  if (reserveError) return errorResponse(503, 'Could not check credits. Please try again.');
  if (!reserved) return errorResponse(402, 'No credits remaining. Watch a rewarded ad to earn 15 credits.');
  const settle = async (success: boolean) => {
    const { error } = await db.rpc('credit_finish', { p_wallet: wallet.id, p_request: requestId, p_success: success });
    if (error) throw new Error('Could not settle answer credits');
  };
  try {
  const key = apiKey();
  const provider = createOpenAI({
    baseURL: `${GATEWAY}/v1`,
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses(CHAT_MODEL),
    system: SYSTEM,
    messages,
    abortSignal: request.signal,
    providerOptions: { openai: { store: false, reasoningEffort: "low" } },
    onError: ({ error }) => console.error("chat stream error", error),
  });
  const reader = result.textStream.getReader();
  let hasText = false;
  return new Response(new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value.trim()) hasText = true;
          controller.enqueue(new TextEncoder().encode(value));
        }
        const reason = await result.finishReason;
        const success = hasText && !request.signal.aborted && reason !== 'error';
        await settle(success);
        if (!success) { controller.error(new Error('The answer did not complete. Your credit was refunded.')); return; }
        controller.close();
      } catch (error) {
        await settle(false).catch(e => console.error('Credit settlement failed', e));
        controller.error(error);
      }
    },
    async cancel() { await reader.cancel(); await settle(false); },
  }), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch {
    await settle(false);
    return errorResponse(503, 'AI is unavailable. Your credit was refunded. Please try again.');
  }
}

export async function handleTranscribe(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, "Invalid audio upload");
  }
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return errorResponse(400, "No audio recorded");
  if (file.size > 20 * 1024 * 1024) return errorResponse(413, "Recording is too long");

  const out = new FormData();
  out.append("model", STT_MODEL);
  out.append("file", new File([file], "speech.webm", { type: file.type.startsWith("audio/") ? file.type : "audio/webm" }));
  out.append("response_format", "json");
  out.append("stream", "true");
  const res = await fetch(`${GATEWAY}/v1/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: out,
  });
  if (!res.ok) return relayError(res);

  const raw = await res.text();
  let text = "";
  let deltas = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const ev = JSON.parse(data);
      if (ev.type === "transcript.text.delta") deltas += ev.delta ?? "";
      if (ev.type === "transcript.text.done") text = ev.text ?? "";
      if (ev.type === "error") return errorResponse(502, ev.error?.message ?? "Transcription failed");
    } catch {
      /* ignore */
    }
  }
  return Response.json({ text: (text || deltas).trim() });
}

export async function handleSpeech(request: Request) {
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid request");
  }
  const text = (body.text ?? "").trim().slice(0, 3000);
  if (!text) return errorResponse(400, "Nothing to read");
  const res = await fetch(`${GATEWAY}/v1/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      contents: [{ role: "user", parts: [{ text: `Read aloud naturally: ${text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
      },
      stream_format: "audio",
    }),
  });
  if (!res.ok) return relayError(res);
  return new Response(res.body, {
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "audio/wav" },
  });
}
