import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, Heart, MessageCircle, Star, Trophy, Users } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ranking")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Ranking de Obras — Better Mangá" },
      { name: "description", content: "As obras mais vistas, mais reagidas e mais comentadas dos últimos 7 dias no Better Mangá." },
      { property: "og:title", content: "Ranking de Obras — Better Mangá" },
      { property: "og:description", content: "Top 20 de obras por views, reações e comentários nos últimos 7 dias." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bettermanga.net/ranking" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://bettermanga.net/ranking" }],
  }),
  component: Ranking,
});

// ---------- Rankings de obras (modelo: carrossel top 20 últimos 7 dias) ----------

type ObraRank = { id: string; slug: string; title: string; cover_url: string | null; rating: number; total: number };
type Metric = "views" | "reactions" | "comments";

const METRICS: { key: Metric; label: string; icon: typeof Eye }[] = [
  { key: "views", label: "Views", icon: Eye },
  { key: "reactions", label: "Reações", icon: Heart },
  { key: "comments", label: "Comentários", icon: MessageCircle },
];

const fmtRating = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function RankCard({ obra, place }: { obra: ObraRank; place: number }) {
  return (
    <div className="w-[140px] flex-shrink-0 sm:w-[160px]">
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-1.5 -top-1.5 z-[2] flex h-8 w-8 items-center justify-center rounded-md text-[24px] font-extrabold leading-none tabular-nums shadow-[0_0_0_3px_var(--background)]"
          style={{ backgroundColor: "var(--background)", color: "var(--background)", WebkitTextStroke: "2.5px var(--primary)", paintOrder: "stroke" }}
        >
          {place}
        </span>
        <Link
          to="/obra/$slug"
          params={{ slug: obra.slug }}
          className="group relative flex h-full flex-col text-left no-underline"
        >
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface-2 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-primary/10">
            {obra.cover_url ? (
              <img
                alt={obra.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                src={obra.cover_url}
              />
            ) : null}
            <span
              className="pointer-events-none absolute bottom-2 left-2 z-[2] inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2 py-0.5 shadow-[0_2px_12px_rgba(0,0,0,0.45)] backdrop-blur-md"
              title={`Média ${fmtRating(obra.rating)}`}
            >
              <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" strokeWidth={2.75} aria-hidden="true" />
              <span className="text-[11px] font-black leading-none tracking-tight tabular-nums text-amber-50">{fmtRating(obra.rating)}</span>
            </span>
          </div>
          <div className="mt-2 flex min-h-[2.5rem] flex-1 flex-col">
            <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground transition-colors group-hover:text-primary">{obra.title}</h3>
          </div>
        </Link>
      </div>
    </div>
  );
}

function ObrasRankings() {
  const [metric, setMetric] = useState<Metric>("views");

  const list = useQuery({
    queryKey: ["obra-ranking", metric],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("obra_ranking", { _metric: metric });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, rating: Number(r.rating), total: Number(r.total) })) as ObraRank[];
    },
  });

  const rows = list.data ?? [];
  const active = METRICS.find((m) => m.key === metric)!;

  return (
    <section className="relative px-4 py-4 md:px-6 md:py-8">
      <div className="mb-6 flex flex-col gap-4">
        <div className="mb-6 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" aria-hidden="true" />
          <h2 className="relative inline-block text-2xl font-bold text-foreground">
            Ranking de obras
            <span className="absolute -bottom-2 left-0 h-1 w-1/3 rounded-full bg-primary" aria-hidden="true" />
          </h2>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Métrica do ranking">
          {METRICS.map(({ key, label, icon: Icon }) => {
            const isActive = metric === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setMetric(key)}
                className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium transition-all ring-1 ring-inset md:text-sm ${
                  isActive
                    ? "border-primary/45 bg-primary/15 text-primary"
                    : "bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
        <p className="-mt-1 text-xs text-white/40">Últimos 7 dias · top 20</p>
      </div>

      <div className="relative -mx-4 px-4">
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" aria-hidden="true" />
        <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {rows.map((obra, i) => (
            <RankCard key={obra.id} obra={obra} place={i + 1} />
          ))}
          {rows.length === 0 && !list.isLoading ? (
            <p className="py-10 text-sm text-muted-foreground">Ainda sem dados de {active.label.toLowerCase()} nos últimos 7 dias.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Ranking() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl py-6 md:py-10">
        <div className="mx-4 mb-4 flex justify-center gap-2 md:mx-6">
          <Button asChild><Link to="/ranking"><Trophy className="mr-2 h-4 w-4" />Obras</Link></Button>
          <Button asChild variant="outline"><Link to="/ranking-leitores"><Users className="mr-2 h-4 w-4" />Leitores</Link></Button>
        </div>
        <ObrasRankings />
      </main>
      <SiteFooter />
    </div>
  );
}
