import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { SeriesRow } from "@/lib/queries";
import { coverUrl, formatChapter } from "@/lib/media";
import { Button } from "@/components/ui/button";

const INTERVAL = 6000;

export function HeroCarousel({ items }: { items: SeriesRow[] }) {
  const allSlides = items.slice(0, 10);
  const kinds = useMemo(
    () => Array.from(new Set(allSlides.map((item) => item.kind).filter(Boolean))),
    [allSlides],
  );
  const [kind, setKind] = useState("Todos");
  const slides = useMemo(
    () => (kind === "Todos" ? allSlides : allSlides.filter((item) => item.kind === kind)),
    [allSlides, kind],
  );
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setIndex(0), [kind]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    timer.current = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, INTERVAL);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, slides.length]);

  if (allSlides.length === 0) return null;

  const active = slides[index] ?? slides[0];
  if (!active) return null;
  const latest = active.chapters[0];
  const go = (delta: number) =>
    setIndex((current) => (current + delta + slides.length) % slides.length);

  return (
    <section
      aria-label="Destaques"
      className="w-full overflow-hidden bg-background pb-6 pt-4 md:pb-8 md:pt-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="no-scrollbar mx-auto mb-4 flex max-w-7xl items-center gap-1 overflow-x-auto px-4 md:mb-5 md:justify-center">
        {["Todos", ...kinds].map((label) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant={kind === label ? "default" : "ghost"}
            onClick={() => setKind(label)}
            className={`h-8 shrink-0 rounded-full px-4 text-xs font-semibold ${
              kind === label
                ? "shadow-[var(--shadow-glow)]"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="relative overflow-hidden md:min-h-[25rem]">
          <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(55%_65%_at_24%_50%,color-mix(in_oklab,var(--primary)_24%,transparent),transparent_72%)] md:block" />

          <div key={active.id} className="relative z-10 flex flex-col items-center gap-4 py-2 md:min-h-[25rem] md:flex-row md:gap-10 md:py-8 lg:gap-12">
            <div className="relative w-[11.25rem] shrink-0 overflow-hidden rounded-xl shadow-[var(--shadow-hero)] ring-1 ring-primary/30 md:w-[13.75rem] lg:w-[16.25rem]">
              <img
                src={coverUrl(active.cover_url)}
                alt={`Capa de ${active.title}`}
                className="aspect-[3/4] h-full w-full object-cover"
                draggable={false}
              />
              <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-foreground/10" />
            </div>

            <div className="flex w-full max-w-xl min-w-0 flex-1 flex-col items-center gap-3 text-center md:items-start md:gap-4 md:text-left">
              <div className="flex flex-wrap justify-center gap-1.5 md:justify-start">
                {[active.kind, ...(active.genres ?? []).slice(0, 3)].filter(Boolean).map((label, genreIndex) => (
                  <span
                    key={`${label}-${genreIndex}`}
                    className="rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 text-[0.65rem] font-semibold text-foreground/70"
                  >
                    {label}
                  </span>
                ))}
              </div>

              <h2 className="line-clamp-2 font-display text-lg font-black leading-tight md:text-3xl lg:text-4xl">
                {active.title}
              </h2>

              {active.synopsis ? (
                <p className="line-clamp-2 max-w-lg text-xs leading-relaxed text-muted-foreground md:line-clamp-3 md:text-sm">
                  {active.synopsis.replace(/<[^>]*>/g, "")}
                </p>
              ) : null}

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground md:text-sm">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>
                  {active.chapters.length} {active.chapters.length === 1 ? "capítulo disponível" : "capítulos disponíveis"}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap justify-center gap-2 md:justify-start">
                {latest ? (
                  <Button asChild size="sm" className="rounded-full px-4 text-xs font-black uppercase shadow-[var(--shadow-glow)]">
                    <Link
                      to="/obra/$slug/$chapter"
                      params={{ slug: active.slug, chapter: formatChapter(latest.number) }}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Começar a ler
                    </Link>
                  </Button>
                ) : null}
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="rounded-full bg-foreground/5 px-4 text-xs font-black uppercase text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                >
                  <Link to="/obra/$slug" params={{ slug: active.slug }}>
                    <BookOpen className="h-3.5 w-3.5" />
                    Ver detalhes
                  </Link>
                </Button>
              </div>
            </div>

            {slides.length > 1 ? (
              <div className="hidden shrink-0 flex-col items-center gap-3 md:flex">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Destaque anterior"
                  onClick={() => go(-1)}
                  className="h-9 w-9 rounded-full border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center gap-1.5">
                  {slides.map((item, dotIndex) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant="ghost"
                      aria-label={`Ir para destaque ${dotIndex + 1}`}
                      onClick={() => setIndex(dotIndex)}
                      className={`min-h-0 min-w-0 rounded-full p-0 transition-all ${
                        dotIndex === index ? "h-5 w-1.5 bg-primary" : "h-1.5 w-1.5 bg-foreground/25 hover:bg-foreground/55"
                      }`}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Próximo destaque"
                  onClick={() => go(1)}
                  className="h-9 w-9 rounded-full border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>

          {slides.length > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-1.5 md:hidden">
              {slides.map((item, dotIndex) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  aria-label={`Ir para destaque ${dotIndex + 1}`}
                  onClick={() => setIndex(dotIndex)}
                  className={`h-1.5 min-w-0 rounded-full p-0 transition-all ${
                    dotIndex === index ? "w-6 bg-primary" : "w-1.5 bg-foreground/25 hover:bg-foreground/55"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}