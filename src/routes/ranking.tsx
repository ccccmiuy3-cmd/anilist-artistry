import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, Star, Trophy } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { fetchSeries } from "@/lib/queries";
import { coverUrl } from "@/lib/media";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking das obras mais lidas — MangaVerso" },
      {
        name: "description",
        content: "Veja o top de mangás, manhwas e comics mais lidos e melhor avaliados do site.",
      },
      { property: "og:title", content: "Ranking — MangaVerso" },
      { property: "og:description", content: "As obras mais lidas e melhor avaliadas do site." },
    ],
  }),
  component: Ranking,
});

function Ranking() {
  const [mode, setMode] = useState<"views" | "rating">("views");
  const list = useQuery({
    queryKey: ["ranking", mode],
    queryFn: () => fetchSeries({ order: mode, limit: 20 }),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="section-title">
          <Trophy className="h-6 w-6 text-primary" /> Rankings
        </h1>

        <div className="mt-6 flex gap-2">
          {(
            [
              { key: "views", label: "Views", icon: <Eye className="h-4 w-4" /> },
              { key: "rating", label: "Notas", icon: <Star className="h-4 w-4" /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${
                mode === tab.key
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <ol className="mt-6 space-y-2">
          {(list.data ?? []).map((item, index) => (
            <li key={item.id}>
              <Link
                to="/obra/$slug"
                params={{ slug: item.slug }}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/60"
              >
                <span className="w-8 text-center font-display text-2xl font-black text-primary">
                  {index + 1}
                </span>
                <img
                  src={coverUrl(item.cover_url)}
                  alt={item.title}
                  className="h-20 w-14 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.kind} · {item.chapters.length} capítulos
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="flex items-center gap-1 font-semibold text-gold">
                    <Star className="h-3.5 w-3.5 fill-gold" />
                    {Number(item.rating).toFixed(1).replace(".", ",")}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.views} views</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
        {!list.isLoading && (list.data?.length ?? 0) === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Ainda não há obras no ranking.</p>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
