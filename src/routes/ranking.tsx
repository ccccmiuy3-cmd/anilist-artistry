import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Crown, Flame, Sparkles, Star } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking de XP dos leitores — Better Mangá" },
      { name: "description", content: "Veja quem mais ganhou XP lendo mangás, manhwas e comics no Better Mangá." },
      { property: "og:title", content: "Ranking de XP — Better Mangá" },
      { property: "og:description", content: "O pódio dos leitores mais ativos do Better Mangá." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ranking,
});

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
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none ${
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

function Ranking() {
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
            className={`relative outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-orange-500/70 ${cfg.av}`}
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
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Leitores
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold">Ranking de XP</h1>
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
            <section className="mt-12" aria-label="Pódio top 3">
              <div className="mx-auto w-full max-w-lg md:max-w-2xl">
                <div className="flex items-end justify-center gap-1.5 px-1 sm:gap-3 md:gap-5">
                  {podium(second, 2)}
                  {podium(first, 1)}
                  {podium(third, 3)}
                </div>
                <div className="mx-1 mt-0 h-2 rounded-b-lg bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 shadow-inner md:mx-2" aria-hidden="true" />
                <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">Pódio</p>
              </div>
            </section>

            <ol className="mt-12 space-y-2.5">
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
      </main>
      <SiteFooter />
    </div>
  );
}
