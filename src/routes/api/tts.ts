import { createFileRoute } from "@tanstack/react-router";

const MODEL = "google/gemini-3.1-flash-tts-preview";
const VOICES = new Set(["Kore", "Charon", "Aoede", "Puck", "Fenrir", "Leda", "Orus", "Zephyr"]);

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        const url = process.env["SUPABASE_URL"];
        const pub = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!apiKey || !url || !pub) return new Response("Servidor sem configuração", { status: 500 });

        // Only signed-in users may generate speech (it costs credits).
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Faça login para usar a voz realista", { status: 401 });
        const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: pub, Authorization: `Bearer ${token}` } });
        if (!who.ok) return new Response("Sessão inválida", { status: 401 });

        const body = (await request.json().catch(() => null)) as { text?: string; voice?: string } | null;
        const text = body?.text?.trim().slice(0, 1200);
        if (!text) return new Response("Texto vazio", { status: 400 });
        const voice = body?.voice && VOICES.has(body.voice) ? body.voice : "Kore";

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
                      text: `Narre em português do Brasil, com sotaque brasileiro natural, como um narrador profissional de audiolivro: ritmo fluido, pausas naturais na pontuação, emoção nos diálogos e entonação expressiva. Leia exatamente o texto a seguir:\n\n${text}`,
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
              "Cache-Control": "no-cache",
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
