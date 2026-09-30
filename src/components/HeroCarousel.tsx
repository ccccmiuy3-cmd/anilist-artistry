import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronLeft, ChevronRight, Eye, Info, Play, Star } from "lucide-react";
import type { SeriesRow } from "@/lib/queries";
import { coverUrl, formatChapter } from "@/lib/media";
import { Button } from "@/components/ui/button";

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
      className="relative min-h-[35rem] overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-hero)] ring-1 ring-border sm:min-h-[38rem] lg:min-h-[31rem]"
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
              src={coverUrl(item.banner_url ?? item.cover_url)}
              alt=""
              className={`h-full w-full object-cover object-top transition-transform duration-[6000ms] ease-out ${
                active ? "scale-[1.04]" : "scale-100"
              }`}
              loading={slideIndex === 0 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 bg-[image:var(--gradient-hero-vertical)]" />
            <div className="absolute inset-0 hidden bg-[image:var(--gradient-hero-horizontal)] lg:block" />

            <div className="absolute inset-0 z-20 flex flex-col justify-end p-5 sm:p-8 lg:grid lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-end lg:gap-10 lg:p-10">
              <div className="max-w-3xl">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-[0.68rem] font-extrabold uppercase">
                  <span className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground shadow-[var(--shadow-glow)]">
                    Destaque
                  </span>
                  {latest ? (
                    <span className="rounded-full border border-foreground/15 bg-background/55 px-3 py-1.5 text-foreground backdrop-blur-md">
                      Novo capítulo
                    </span>
                  ) : null}
                  {item.status ? (
                    <span className="rounded-full border border-foreground/15 bg-background/55 px-3 py-1.5 text-muted-foreground backdrop-blur-md">
                      {item.status}
                    </span>
                  ) : null}
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                  {[item.kind, ...(item.genres ?? []).slice(0, 3)].map((label, genreIndex) => (
                    <span key={`${label}-${genreIndex}`} className="inline-flex items-center gap-2">
                      {genreIndex > 0 ? <span className="h-1 w-1 rounded-full bg-primary" /> : null}
                      {label}
                    </span>
                  ))}
                </div>

                <h2 className="line-clamp-2 max-w-2xl font-display text-3xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                  {item.title}
                </h2>

                {item.synopsis ? (
                  <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-6 text-foreground/75 sm:text-base">
                    {item.synopsis.replace(/<[^>]*>/g, "")}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-foreground/90 sm:text-sm">
                  <span className="flex items-center gap-1.5 text-gold">
                    <Star className="h-4 w-4 fill-gold" />
                    {Number(item.rating ?? 0).toFixed(1).replace(".", ",")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {item.chapters.length} {item.chapters.length === 1 ? "capítulo" : "capítulos"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-primary" />
                    {new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(item.views ?? 0)} leituras
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {latest ? (
                    <Button asChild size="lg" className="h-12 rounded-xl px-5 font-bold shadow-[var(--shadow-glow)]">
                      <Link
                        to="/obra/$slug/$chapter"
                        params={{ slug: item.slug, chapter: formatChapter(latest.number) }}
                      >
                        <Play className="fill-current" />
                        Ler cap. {formatChapter(latest.number)}
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-xl border-foreground/20 bg-background/50 px-5 font-bold backdrop-blur-md hover:bg-background/80"
                  >
                    <Link to="/obra/$slug" params={{ slug: item.slug }}>
                      <Info />
                      Ver obra
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="hidden lg:block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-2xl ring-1 ring-foreground/20">
                  <img
                    src={coverUrl(item.cover_url)}
                    alt={`Capa de ${item.title}`}
                    className="h-full w-full object-cover"
                    loading={slideIndex === 0 ? "eager" : "lazy"}
                  />
                  <span className="absolute inset-0 ring-1 ring-inset ring-foreground/10" />
                </div>
                <p className="mt-3 text-center text-xs font-bold text-muted-foreground">
                  {String(slideIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {slides.length > 1 ? (
        <>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Destaque anterior"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-30 hidden -translate-y-1/2 rounded-full border-foreground/15 bg-background/55 text-foreground backdrop-blur-md hover:bg-background/80 sm:inline-flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Próximo destaque"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-30 hidden -translate-y-1/2 rounded-full border-foreground/15 bg-background/55 text-foreground backdrop-blur-md hover:bg-background/80 sm:inline-flex"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="absolute bottom-4 right-5 z-30 flex items-center gap-1.5 sm:bottom-6 sm:right-8 lg:left-10 lg:right-auto">
            {slides.map((item, dotIndex) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                aria-label={`Ir para destaque ${dotIndex + 1}`}
                onClick={() => setIndex(dotIndex)}
                className={`h-1.5 min-w-0 rounded-full p-0 transition-all ${
                  dotIndex === index ? "w-7 bg-primary" : "w-2 bg-foreground/35 hover:bg-foreground/60"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
