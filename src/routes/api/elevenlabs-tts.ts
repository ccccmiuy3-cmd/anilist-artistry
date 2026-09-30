import { createFileRoute } from "@tanstack/react-router";

// ElevenLabs voices (pt-BR friendly, multilingual v2).
const VOICES = new Set([
  "EXAVITQu4vr4xnSDxMaL", // Sarah
  "FGY2WhTYpPnrIDTdsKH5", // Laura
  "Xb7hH8MSUJpSbSDYk0k2", // Alice
  "pFZP5JQG7iQjIQuC4Bku", // Lily
  "onwK4e9ZLuTAKqWW03F9", // Daniel
  "nPczCjzI2devNBz1zQrb", // Brian
  "JBFqnCBsd6RMkjVDRZzb", // George
  "TX3LPaxmHKxFdv7VOQHJ", // Liam
]);

export const Route = createFileRoute("/api/elevenlabs-tts")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["ELEVENLABS_API_KEY"];
        const url = process.env["SUPABASE_URL"];
        const pub = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!apiKey) return new Response("ElevenLabs não conectado", { status: 503 });
        if (!url || !pub) return new Response("Servidor sem configuração", { status: 500 });

        // Only signed-in users may generate speech (it costs ElevenLabs credits).
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Faça login para usar a voz premium", { status: 401 });
        const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: pub, Authorization: `Bearer ${token}` } });
        if (!who.ok) return new Response("Sessão inválida", { status: 401 });

        const body = (await request.json().catch(() => null)) as { text?: string; voice?: string } | null;
        const text = body?.text?.trim().slice(0, 1200);
        if (!text) return new Response("Texto vazio", { status: 400 });
        const voice = body?.voice && VOICES.has(body.voice) ? body.voice : "EXAVITQu4vr4xnSDxMaL";

        try {
          const upstream = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
              body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true, speed: 1.0 },
              }),
              signal: request.signal,
            },
          );
          if (!upstream.ok) {
            const err = await upstream.text();
            return new Response(err || `ElevenLabs falhou (${upstream.status})`, { status: upstream.status });
          }
          return new Response(upstream.body, {
            status: 200,
            headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-cache" },
          });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw e;
        }
      },
    },
  },
});
