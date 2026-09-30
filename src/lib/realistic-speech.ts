import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

export class SpeechError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

let ctx: AudioContext | null = null;
export function getAudioContext() {
  if (!ctx || ctx.state === "closed") ctx = new AudioContext({ sampleRate: 24000 });
  return ctx;
}

/** Fetches the full PCM audio for a text chunk (buffered so the next one can be prefetched). */
export async function fetchSpeech(text: string, voice: string, signal: AbortSignal): Promise<Float32Array> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new SpeechError("Faça login para usar a voz realista", 401);
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text, voice }),
    signal,
  });
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => "");
    let parsed = msg;
    try {
      parsed = JSON.parse(msg)?.error?.message ?? JSON.parse(msg)?.message ?? msg;
    } catch {
      /* plain */
    }
    throw new SpeechError(parsed || `Erro ${res.status}`, res.status);
  }
  const parts: Uint8Array[] = [];
  let total = 0;
  let done = false;
  let failure: string | null = null;
  const parser = createParser({
    onEvent(ev) {
      try {
        const p = JSON.parse(ev.data) as { type: string; audio?: string; error?: { message?: string } };
        if (p.type === "error" || p.error) failure = p.error?.message ?? "Falha na voz";
        else if (p.type === "speech.audio.done") done = true;
        else if (p.type === "speech.audio.delta" && p.audio) {
          const b = Uint8Array.from(atob(p.audio), (c) => c.charCodeAt(0));
          parts.push(b);
          total += b.length;
        }
      } catch {
        /* ignore malformed keep-alives */
      }
    },
  });
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  while (true) {
    const n = await reader.read();
    if (n.done) break;
    parser.feed(n.value);
  }
  if (failure) throw new SpeechError(failure, 502);
  if (!done || total < 2) throw new SpeechError("Áudio incompleto", 502);
  const bytes = new Uint8Array(total - (total % 2));
  let off = 0;
  for (const part of parts) {
    const take = Math.min(part.length, bytes.length - off);
    bytes.set(part.subarray(0, take), off);
    off += take;
  }
  const view = new DataView(bytes.buffer);
  const out = new Float32Array(bytes.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}

/** Fetches ElevenLabs MP3 audio for a text chunk and decodes it to samples. */
export async function fetchElevenSpeech(text: string, voice: string, signal: AbortSignal): Promise<Float32Array> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new SpeechError("Faça login para usar a voz premium", 401);
  const res = await fetch("/api/elevenlabs-tts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text, voice }),
    signal,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new SpeechError(msg || `Erro ${res.status}`, res.status);
  }
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength < 100) throw new SpeechError("Áudio incompleto", 502);
  const decoded = await getAudioContext().decodeAudioData(bytes);
  return decoded.getChannelData(0).slice();
}
