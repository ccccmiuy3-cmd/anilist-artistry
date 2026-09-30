import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Search } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { SeriesCard } from "@/components/SeriesCard";
import { Input } from "@/components/ui/input";
import { fetchSeries, KINDS } from "@/lib/queries";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  kind: fallback(z.string(), "Todos").default("Todos"),
});

export const Route = createFileRoute("/catalogo")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Coleção completa — MangaVerso" },
      {
        name: "description",
        content: "Explore todo o catálogo de mangás, manhwas, manhuas e comics do MangaVerso.",
      },
      { property: "og:title", content: "Coleção completa — MangaVerso" },
      { property: "og:description", content: "Todo o catálogo de obras disponíveis para leitura." },
    ],
  }),
  component: Catalogo,
});

function Catalogo() {
  const { q, kind } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const list = useQuery({
    queryKey: ["catalogo", q, kind],
    queryFn: () => fetchSeries({ kind, search: q, limit: 120, order: "updated_at" }),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="font-display text-3xl font-extrabold">Coleção</h1>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) =>
                navigate({ to: ".", search: (prev) => ({ ...prev, q: event.target.value }) })
              }
              placeholder="Buscar por título"
              className="bg-surface pl-9"
            />
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {["Todos", ...KINDS].map((item) => (
              <button
                key={item}
                onClick={() => navigate({ to: ".", search: (prev) => ({ ...prev, kind: item }) })}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  kind === item
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {(list.data ?? []).map((item) => (
            <SeriesCard
              key={item.id}
              slug={item.slug}
              title={item.title}
              cover={item.cover_url}
              rating={item.rating}
              chapters={item.chapters.length}
            />
          ))}
        </div>
        {list.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Carregando…</p> : null}
        {!list.isLoading && (list.data?.length ?? 0) === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Nenhuma obra encontrada.</p>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
