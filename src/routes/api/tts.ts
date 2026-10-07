import { createFileRoute } from "@tanstack/react-router";

const MODEL = "google/gemini-3.1-flash-tts-preview";
const VOICES = new Set(["Kore", "Charon", "Aoede", "Puck", "Fenrir", "Leda", "Orus", "Zephyr"]);

// Limites do narrador são configuráveis via env (sem alterar o frontend).
// Aplicam-se por usuário autenticado e são persistidos no banco (0032_tts_rate_limit).
const envNum = (value: string | undefined, fallback: number): number => {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

type TtsLimits = {
  maxChars: number;
  perMinuteRequests: number;
  perMinuteChars: number;
  perDayChars: number;
};

function readLimits(): TtsLimits {
  return {
    maxChars: envNum(process.env["TTS_MAX_CHARS"], 1200),
    perMinuteRequests: envNum(process.env["TTS_PER_MINUTE_REQUESTS"], 20),
    perMinuteChars: envNum(process.env["TTS_PER_MINUTE_CHARS"], 6000),
    perDayChars: envNum(process.env["TTS_PER_DAY_CHARS"], 60000),
  };
}

export const Route = createFileRoute("/api/tts")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        const url = process.env["SUPABASE_URL"];
        const pub = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!apiKey || !url || !pub)
          return new Response("Servidor sem configuração", { status: 500 });

        // Only signed-in users may generate speech (it costs credits).
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Faça login para usar a voz realista", { status: 401 });
        const who = await fetch(`${url}/auth/v1/user`, {
          headers: { apikey: pub, Authorization: `Bearer ${token}` },
        });
        if (!who.ok) return new Response("Sessão inválida", { status: 401 });

        const me = (await who.json().catch(() => null)) as { id?: string } | null;
        if (!me?.id) return new Response("Sessão inválida", { status: 401 });

        const limits = readLimits();
        const body = (await request.json().catch(() => null)) as {
          text?: string;
          voice?: string;
        } | null;
        const text = body?.text?.trim().slice(0, limits.maxChars);
        if (!text) return new Response("Texto vazio", { status: 400 });
        const voice = body?.voice && VOICES.has(body.voice) ? body.voice : "Kore";

        // Cota persistente (limites por minuto e por dia). Nunca logamos o
        // texto nem o token: falhas aqui retornam apenas mensagem genérica.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: allowed, error } = await supabaseAdmin.rpc("consume_tts_quota", {
          p_user_id: me.id,
          p_chars: text.length,
          p_max_minute_requests: limits.perMinuteRequests,
          p_max_minute_chars: limits.perMinuteChars,
          p_max_day_chars: limits.perDayChars,
        });
        if (error) {
          console.error("[tts] falha ao consumir cota", error.message);
          return new Response("Servidor temporariamente indisponível", { status: 503 });
        }
        if (allowed === false) {
          return new Response(
            "Limite de narração atingido — aguarde um instante e tente de novo.",
            {
              status: 429,
              headers: { "Retry-After": "60", "Cache-Control": "no-store" },
            },
          );
        }

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: MODEL,
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Narre em português do Brasil, com sotaque brasileiro natural, como um narrador experiente de audiolivro contando uma história para um amigo: voz calorosa, conversada e envolvente, em ritmo tranquilo e constante. Use entonação natural de fala real — leve emoção nos diálogos e momentos tensos, mas sem exagerar, sem gritar, sem sussurrar e sem teatralidade. Respeite as pausas da pontuação. Leia exatamente o texto a seguir, sem adicionar nem omitir nada:\n\n${text}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
              },
              stream_format: "sse",
            }),
            signal: request.signal,
          });
          return new Response(upstream.body, {
            status: upstream.status,
            headers: {
              "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              "X-Accel-Buffering": "no",
            },
          });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw e;
        }
      },
    },
  },
});
