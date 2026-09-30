import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";
import type { SeriesRow } from "@/lib/queries";
import { coverUrl, formatChapter } from "@/lib/media";

const INTERVAL = 6000;

export function HeroCarousel({ items }: { items: SeriesRow[] }) {
  const slides = items.slice(0, 5);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  if (slides.length === 0) return null;

  const go = (delta: number) =>
    setIndex((current) => (current + delta + slides.length) % slides.length);

  return (
    <section
      aria-label="Destaques"
      className="relative h-64 overflow-hidden rounded-2xl ring-1 ring-border sm:h-80 lg:h-[26rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((item, slideIndex) => {
        const latest = item.chapters[0];
        const active = slideIndex === index;
        return (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              active ? "z-10 opacity-100" : "z-0 opacity-0"
            }`}
            aria-hidden={!active}
          >
            <img
              src={coverUrl(item.cover_url)}
              alt={item.title}
              className={`h-full w-full object-cover object-top transition-transform duration-[6000ms] ease-out ${
                active ? "scale-105" : "scale-100"
              }`}
              loading={slideIndex === 0 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="rounded-md bg-primary/20 px-2 py-0.5 text-primary">{item.kind}</span>
                <span className="flex items-center gap-1 text-gold">
                  <Star className="h-3 w-3 fill-gold" />
                  {Number(item.rating ?? 0).toFixed(1).replace(".", ",")}
                </span>
                {item.status ? (
                  <span className="rounded-md bg-surface-2/90 px-2 py-0.5 text-muted-foreground">
                    {item.status}
                  </span>
                ) : null}
              </div>
              <h2 className="line-clamp-2 max-w-xl font-display text-xl font-extrabold drop-shadow sm:text-2xl lg:text-3xl">
                {item.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {latest ? (
                  <Link
                    to="/obra/$slug/$chapter"
                    params={{ slug: item.slug, chapter: formatChapter(latest.number) }}
                    className="inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03]"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Ler cap. {formatChapter(latest.number)}
                  </Link>
                ) : null}
                <Link
                  to="/obra/$slug"
                  params={{ slug: item.slug }}
                  className="inline-flex items-center rounded-full border border-border bg-surface-2/80 px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-2"
                >
                  Ver obra
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Destaque anterior"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-background/60 p-2 text-foreground/80 opacity-0 transition-opacity hover:bg-background/80 hover:text-foreground focus-visible:opacity-100 sm:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Próximo destaque"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-background/60 p-2 text-foreground/80 opacity-0 transition-opacity hover:bg-background/80 hover:text-foreground focus-visible:opacity-100 sm:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 right-4 z-30 flex items-center gap-1.5">
            {slides.map((item, dotIndex) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Ir para destaque ${dotIndex + 1}`}
                onClick={() => setIndex(dotIndex)}
                className={`h-1.5 rounded-full transition-all ${
                  dotIndex === index ? "w-5 bg-primary" : "w-1.5 bg-foreground/40 hover:bg-foreground/60"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
