import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  paragraphs: string[];
  activeIndex: number | null;
  onActiveChange: (index: number | null) => void;
  onFinished?: () => void;
};

export function NovelNarrator({ paragraphs, activeIndex, onActiveChange, onFinished }: Props) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState("");
  const [rate, setRate] = useState(1);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const indexRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const pt = all.filter((v) => v.lang.toLowerCase().startsWith("pt"));
      pt.sort((a, b) => Number(b.lang === "pt-BR") - Number(a.lang === "pt-BR"));
      setVoices(pt);
      setVoiceUri((cur) => cur || pt[0]?.voiceURI || "");
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    // Chapter changed: stop narration
    stoppedRef.current = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("idle");
    onActiveChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragraphs]);

  const speakFrom = (start: number) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    stoppedRef.current = false;
    const speakOne = (i: number) => {
      if (stoppedRef.current) return;
      if (i >= paragraphs.length) {
        setState("idle");
        onActiveChange(null);
        onFinished?.();
        return;
      }
      indexRef.current = i;
      onActiveChange(i);
      document.getElementById(`novel-p-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      const u = new SpeechSynthesisUtterance(paragraphs[i]);
      u.lang = "pt-BR";
      u.rate = rate;
      const voice = voices.find((v) => v.voiceURI === voiceUri);
      if (voice) u.voice = voice;
      u.onend = () => speakOne(i + 1);
      u.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled") speakOne(i + 1);
      };
      synth.speak(u);
    };
    setState("playing");
    speakOne(start);
  };

  if (!supported || paragraphs.length === 0) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (state === "playing") {
      synth.pause();
      setState("paused");
    } else if (state === "paused") {
      synth.resume();
      setState("playing");
    } else {
      speakFrom(activeIndex ?? 0);
    }
  };

  const stop = () => {
    stoppedRef.current = true;
    window.speechSynthesis.cancel();
    setState("idle");
    onActiveChange(null);
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
          if (state === "playing") setTimeout(() => speakFrom(indexRef.current), 0);
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
          onChange={(e) => setVoiceUri(e.target.value)}
          aria-label="Voz"
        >
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
          ))}
        </select>
      ) : null}
      <p className="w-full text-xs text-muted-foreground">Toque em um parágrafo para começar a ouvir a partir dele.</p>
    </div>
  );
}
