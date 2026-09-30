import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  paragraphs: string[];
  activeIndex: number | null;
  onActiveChange: (index: number | null) => void;
  onFinished?: () => void;
};

const MAX_CHUNK = 180;

// Split long paragraphs into short sentence chunks: browsers (Chrome) silently
// stop long utterances after ~15s, so short pieces keep narration reliable.
function chunkText(text: string): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]+["'”»)]*\s*|[^.!?…]+$/g) ?? [text];
  const out: string[] = [];
  for (const raw of sentences) {
    let s = raw.trim();
    while (s.length > MAX_CHUNK) {
      let cut = s.lastIndexOf(",", MAX_CHUNK);
      if (cut < 60) cut = s.lastIndexOf(" ", MAX_CHUNK);
      if (cut < 60) cut = MAX_CHUNK;
      out.push(s.slice(0, cut + 1).trim());
      s = s.slice(cut + 1).trim();
    }
    if (s) out.push(s);
  }
  return out.filter((c) => /[\p{L}\p{N}]/u.test(c));
}

export function NovelNarrator({ paragraphs, activeIndex, onActiveChange, onFinished }: Props) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState("");
  const [rate, setRate] = useState(1);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");

  // Refs so callbacks always see fresh values (no stale closures).
  const pos = useRef({ p: 0, c: 0 });
  const session = useRef(0); // increments on every start/stop; old utterance events are ignored
  const settings = useRef({ rate: 1, voice: undefined as SpeechSynthesisVoice | undefined });
  const paragraphsRef = useRef(paragraphs);
  const callbacks = useRef({ onActiveChange, onFinished });
  callbacks.current = { onActiveChange, onFinished };
  paragraphsRef.current = paragraphs;
  settings.current = { rate, voice: voices.find((v) => v.voiceURI === voiceUri) };

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    try {
      const saved = JSON.parse(localStorage.getItem("novel-tts") ?? "{}");
      if (typeof saved.rate === "number") setRate(saved.rate);
      if (typeof saved.voice === "string") setVoiceUri(saved.voice);
    } catch {
      /* ignore */
    }
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const pt = all.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("pt"));
      pt.sort((a, b) => Number(b.lang.includes("BR")) - Number(a.lang.includes("BR")));
      setVoices(pt);
      setVoiceUri((cur) => (pt.some((v) => v.voiceURI === cur) ? cur : pt[0]?.voiceURI || ""));
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      session.current++;
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!supported) return;
    localStorage.setItem("novel-tts", JSON.stringify({ rate, voice: voiceUri }));
  }, [rate, voiceUri, supported]);

  const stop = useCallback(() => {
    session.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("idle");
    callbacks.current.onActiveChange(null);
  }, []);

  const play = useCallback((p: number, c = 0) => {
    const synth = window.speechSynthesis;
    const id = ++session.current;
    synth.cancel();
    setState("playing");

    const speak = (pi: number, ci: number) => {
      if (id !== session.current) return;
      const list = paragraphsRef.current;
      if (pi >= list.length) {
        session.current++;
        setState("idle");
        callbacks.current.onActiveChange(null);
        callbacks.current.onFinished?.();
        return;
      }
      const chunks = chunkText(list[pi]);
      if (ci >= chunks.length) return speak(pi + 1, 0);
      pos.current = { p: pi, c: ci };
      if (ci === 0) {
        callbacks.current.onActiveChange(pi);
        document.getElementById(`novel-p-${pi}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const u = new SpeechSynthesisUtterance(chunks[ci]);
      u.lang = settings.current.voice?.lang ?? "pt-BR";
      u.rate = settings.current.rate;
      if (settings.current.voice) u.voice = settings.current.voice;
      let done = false;
      const next = () => {
        if (done) return;
        done = true;
        clearTimeout(watchdog);
        speak(pi, ci + 1);
      };
      // Watchdog: some browsers never fire onend; move on after a generous timeout.
      const watchdog = window.setTimeout(next, 4000 + (chunks[ci].length * 160) / settings.current.rate);
      u.onend = next;
      u.onerror = (e) => {
        if (e.error === "interrupted" || e.error === "canceled") {
          done = true;
          clearTimeout(watchdog);
          return;
        }
        if (e.error === "not-allowed") {
          done = true;
          clearTimeout(watchdog);
          if (id === session.current) {
            session.current++;
            setState("idle");
          }
          return;
        }
        next();
      };
      // Small delay after cancel() avoids Chrome dropping the first utterance.
      window.setTimeout(() => id === session.current && synth.speak(u), ci === 0 && pi === p ? 60 : 0);
    };
    speak(p, c);
  }, []);

  // Chrome pauses forever after long idle; keep engine awake while playing.
  useEffect(() => {
    if (state !== "playing") return;
    const t = window.setInterval(() => {
      const s = window.speechSynthesis;
      if (s.speaking && !s.paused) {
        s.pause();
        s.resume();
      }
    }, 10000);
    return () => clearInterval(t);
  }, [state]);

  // Chapter changed: stop.
  useEffect(() => {
    stop();
    pos.current = { p: 0, c: 0 };
  }, [paragraphs, stop]);

  // User tapped a paragraph while playing: jump there.
  useEffect(() => {
    if (activeIndex == null || state === "idle") return;
    if (activeIndex !== pos.current.p) play(activeIndex, 0);
  }, [activeIndex, state, play]);

  if (!supported || paragraphs.length === 0) return null;

  // Pause = cancel + remember position (native pause/resume is broken on Android).
  const toggle = () => {
    if (state === "playing") {
      session.current++;
      window.speechSynthesis.cancel();
      setState("paused");
    } else if (state === "paused") {
      play(pos.current.p, pos.current.c);
    } else {
      play(activeIndex ?? 0, 0);
    }
  };

  const restartIfPlaying = () => {
    if (state === "playing") setTimeout(() => play(pos.current.p, pos.current.c), 0);
  };

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <Volume2 className="h-5 w-5 text-primary" />
      <span className="mr-auto text-sm font-bold">Narração automática</span>
      <Button size="sm" onClick={toggle} aria-label={state === "playing" ? "Pausar" : "Ouvir"}>
        {state === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {state === "playing" ? "Pausar" : state === "paused" ? "Continuar" : "Ouvir"}
      </Button>
      {state !== "idle" ? (
        <Button size="sm" variant="outline" onClick={stop} aria-label="Parar">
          <Square className="h-4 w-4" />
        </Button>
      ) : null}
      <select
        className="h-9 rounded-md border border-border bg-background px-2 text-xs"
        value={rate}
        onChange={(e) => {
          setRate(Number(e.target.value));
          restartIfPlaying();
        }}
        aria-label="Velocidade"
      >
        {[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
          <option key={r} value={r}>{r}x</option>
        ))}
      </select>
      {voices.length > 1 ? (
        <select
          className="h-9 max-w-44 rounded-md border border-border bg-background px-2 text-xs"
          value={voiceUri}
          onChange={(e) => {
            setVoiceUri(e.target.value);
            restartIfPlaying();
          }}
          aria-label="Voz"
        >
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
          ))}
        </select>
      ) : null}
      <p className="w-full text-xs text-muted-foreground">
        {voices.length === 0
          ? "Nenhuma voz em português encontrada neste aparelho; será usada a voz padrão."
          : "Toque em um parágrafo para ouvir a partir dele."}
      </p>
    </div>
  );
}
