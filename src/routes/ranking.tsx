import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Crown, Eye, Flame, Heart, MessageCircle, Sparkles, Star, Trophy } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ranking")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Rankings — Better Mangá" },
      { name: "description", content: "As obras mais vistas, mais reagidas e mais comentadas dos últimos 7 dias, além do ranking de XP dos leitores do Better Mangá." },
      { property: "og:title", content: "Rankings — Better Mangá" },
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
              title={`Média ${fmtRating(obra.rating)} (${METRICS.find((m) => m.key)?.label ?? ""})`}
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
            Rankings
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

// ---------- Ranking de XP dos leitores ----------

type Reader = { id: string; username: string; avatar_url: string | null; level: number; xp: number };
type Tab = "weekly" | "total" | "snapshot";

function nextReset() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(0, 0, 0, 0);
  next.setUTCDate(now.getUTCDate() + ((8 - now.getUTCDay()) % 7 || 7));
  const ms = next.getTime() - now.getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return `${d}d ${h}h`;
}

function LevelBadge({ level }: { level: number }) {
  const high = level >= 50;
  return (
    <span
      title={high ? `Nível ${level} · Crítico` : `Nível ${level} · Viciado`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums ${
        high ? "border-yellow-500/35 bg-yellow-500/10 text-yellow-100" : "border-purple-500/30 bg-purple-500/10 text-purple-200"
      }`}
    >
      {high ? <Star className="h-[11px] w-[11px] shrink-0 text-yellow-300" strokeWidth={2.5} /> : <Flame className="h-[11px] w-[11px] shrink-0 text-purple-300" strokeWidth={2.5} />}
      <span>Nv.&nbsp;{level}</span>
    </span>
  );
}

function Avatar({ r, className }: { r: Reader; className: string }) {
  return (
    <div className={`grid place-items-center overflow-hidden rounded-full bg-surface-2 font-medium text-primary ${className}`}>
      {r.avatar_url ? (
        <img src={r.avatar_url} alt={r.username} className="h-full w-full object-cover" />
      ) : (
        r.username.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

function XpRanking() {
  const [tab, setTab] = useState<Tab>("weekly");
  const [reset, setReset] = useState("");
  useEffect(() => setReset(nextReset()), []);

  const list = useQuery({
    queryKey: ["xp-ranking", tab],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("xp_ranking", { _period: tab });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, xp: Number(r.xp) })) as Reader[];
    },
  });

  const rows = list.data ?? [];
  const [first, second, third] = rows;
  const rest = rows.slice(3);

  const podium = (r: Reader | undefined, place: 1 | 2 | 3) => {
    const cfg = {
      1: {
        h: "h-[11.5rem] md:h-56",
        av: "h-[5.75rem] w-[5.75rem] md:h-[6.75rem] md:w-[6.75rem]",
        ring: "ring-[3px] ring-amber-400/90",
        bg: "from-amber-600/55 via-amber-900/85 to-zinc-950",
        border: "border-amber-400/35",
        glow: "from-amber-200/20",
        xp: "text-amber-200",
      },
      2: {
        h: "h-[8.5rem] md:h-44",
        av: "h-[4.5rem] w-[4.5rem] md:h-24 md:w-24",
        ring: "ring-2 ring-white/20",
        bg: "from-slate-600/50 via-slate-800/90 to-zinc-950",
        border: "border-slate-500/30",
        glow: "from-white/15",
        xp: "text-zinc-400",
      },
      3: {
        h: "h-[7rem] md:h-36",
        av: "h-[4.25rem] w-[4.25rem] md:h-[5.25rem] md:w-[5.25rem]",
        ring: "ring-2 ring-white/20",
        bg: "from-amber-900/45 via-amber-950/90 to-zinc-950",
        border: "border-amber-900/50",
        glow: "from-amber-500/10",
        xp: "text-zinc-400",
      },
    }[place];
    if (!r) return <div className="min-w-0 flex-1" />;
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <div className="relative z-[2] flex flex-col items-center">
          {place === 1 ? (
            <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-amber-950 shadow-lg shadow-amber-900/40">
              <Crown className="h-4 w-4" strokeWidth={2.2} />
            </div>
          ) : null}
          <Link
            to="/u/$username"
            params={{ username: r.username }}
            aria-label={`Perfil de ${r.username}`}
            className={`relative outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-primary/70 ${cfg.av}`}
          >
            <Avatar r={r} className={`absolute inset-0 h-full w-full rounded-full shadow-xl ring-offset-2 ring-offset-zinc-950 ${cfg.ring}`} />
          </Link>
        </div>
        <div
          className={`relative z-[1] -mt-5 flex w-full max-w-[10.5rem] flex-col items-center rounded-t-2xl border-x border-t bg-gradient-to-b px-2 pb-4 pt-9 md:max-w-[11.5rem] ${cfg.h} ${cfg.bg} ${cfg.border} shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`}
        >
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-12 rounded-t-2xl bg-gradient-to-b ${cfg.glow} to-transparent`} aria-hidden="true" />
          <span className="select-none text-5xl font-black leading-none text-black/[0.12] md:text-6xl" aria-hidden="true">
            {place}
          </span>
          <p className="-mt-1 flex w-full max-w-full flex-wrap items-center justify-center gap-1 px-1">
            <span className="truncate text-sm font-semibold text-zinc-100 md:text-base">{r.username}</span>
            <LevelBadge level={r.level} />
          </p>
          <p className={`mt-auto pt-2 text-center text-xs font-bold tabular-nums md:text-sm ${cfg.xp}`}>
            {fmt(r.xp)} <span className="font-medium text-white/25">XP</span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <section className="mt-16 border-t border-border pt-12">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Leitores
        </span>
        <h2 className="mt-4 font-display text-3xl font-extrabold">Ranking de XP</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tab === "weekly" ? "Quem mais ganhou XP nesta semana." : tab === "total" ? "Quem mais acumulou XP desde sempre." : "Resultado da última semana encerrada."}
        </p>

        <div className="mt-8 inline-flex rounded-xl border border-border bg-surface p-1.5">
          {([
            ["weekly", "Semanal"],
            ["total", "Total"],
            ["snapshot", "Último snapshot"],
          ] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {tab === "weekly" ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" /> Próximo reset semanal:
            <span className="font-bold text-foreground">{reset}</span>
          </p>
        ) : null}
      </div>

      {rows.length ? (
        <>
          <div className="mx-auto mt-12 w-full max-w-lg px-1 md:max-w-2xl" aria-label="Pódio top 3">
            <div className="flex items-end justify-center gap-1.5 px-1 sm:gap-3 md:gap-5">
              {podium(second, 2)}
              {podium(first, 1)}
              {podium(third, 3)}
            </div>
            <div className="mx-1 mt-0 h-2 rounded-b-lg bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 shadow-inner md:mx-2" aria-hidden="true" />
            <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">Pódio</p>
          </div>

          <ol className="mx-auto mt-12 max-w-2xl space-y-2.5">
            {rest.map((r, i) => (
              <li key={r.id}>
                <Link
                  to="/u/$username"
                  params={{ username: r.username }}
                  className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-primary/60"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-xs font-bold text-muted-foreground">{i + 4}</span>
                  <Avatar r={r} className="h-11 w-11 text-lg" />
                  <span className="font-bold">{r.username}</span>
                  <LevelBadge level={r.level} />
                  <span className="ml-auto text-sm font-bold text-primary">
                    {fmt(r.xp)}<span className="ml-0.5 text-[10px] text-muted-foreground">XP</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      ) : !list.isLoading ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">Ainda não há leitores no ranking.</p>
      ) : null}
    </section>
  );
}

function Ranking() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl py-6 md:py-10">
        <ObrasRankings />
        <XpRanking />
      </main>
      <SiteFooter />
    </div>
  );
}
