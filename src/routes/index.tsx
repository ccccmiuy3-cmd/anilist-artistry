import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, Heart, LayoutGrid, PlusSquare, Star, Trophy } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { SeriesCard } from "@/components/SeriesCard";
import { HScroll, SectionRow } from "@/components/SectionRow";
import { Button } from "@/components/ui/button";
import { fetchFavorites, fetchHistory, fetchSeries, KINDS } from "@/lib/queries";
import { coverUrl, formatChapter } from "@/lib/media";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Better Mangá — mangás, manhwas e comics atualizados" },
      {
        name: "description",
        content:
          "Leia mangás, manhwas, manhuas e comics em português. Capítulos novos todos os dias, favoritos e histórico de leitura.",
      },
      { property: "og:title", content: "Better Mangá — leitura online" },
      {
        property: "og:description",
        content: "Catálogo de mangás, manhwas e comics com capítulos atualizados.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bettermanga.net/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://bettermanga.net/" }],
  }),
  component: Home,
});

function Home() {
  const { user } = useSession();
  const [kind, setKind] = useState<string>("Manga");

  const byKind = useQuery({
    queryKey: ["series", "kind", kind],
    queryFn: () => fetchSeries({ kind, limit: 10, pinnedFirst: true }),
  });
  const topRated = useQuery({
    queryKey: ["series", "rating"],
    queryFn: () => fetchSeries({ order: "rating", limit: 8 }),
  });
  const recent = useQuery({
    queryKey: ["series", "created"],
    queryFn: () => fetchSeries({ order: "created_at", limit: 14 }),
  });
  const updated = useQuery({
    queryKey: ["series", "updated"],
    queryFn: () => fetchSeries({ order: "updated_at", limit: 12, pinnedFirst: true }),
  });
  const ranking = useQuery({
    queryKey: ["series", "views"],
    queryFn: () => fetchSeries({ order: "views", limit: 10 }),
  });
  const favorites = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchFavorites(user!.id),
  });
  const favoriteIds = new Set((favorites.data ?? []).map((item) => item.id));
  const history = useQuery({
    queryKey: ["history", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchHistory(user!.id),
  });

  const empty =
    !byKind.isLoading &&
    (byKind.data?.length ?? 0) === 0 &&
    (recent.data?.length ?? 0) === 0 &&
    (updated.data?.length ?? 0) === 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-7 font-display text-2xl font-extrabold sm:text-3xl">
          Better Mangá — ler mangás, manhwas e comics online
        </h1>
        {empty ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center">
            <h1 className="font-display text-2xl font-extrabold">Nenhuma obra publicada ainda</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Entre com sua conta, abra o painel e publique a primeira obra buscando os dados
              automaticamente no AniList.
            </p>
            <Button asChild className="mt-6 rounded-full font-semibold">
              <Link to="/admin">Abrir o painel</Link>
            </Button>
          </div>
        ) : null}

        <SectionRow icon={<LayoutGrid className="h-5 w-5" />} title="Escolher gênero">
          <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
            {KINDS.map((item) => (
              <button
                key={item}
                onClick={() => setKind(item)}
                className={`whitespace-nowrap border-b-2 px-3 pb-2 text-sm font-semibold transition-colors ${
                  kind === item
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {(byKind.data ?? []).slice(0, 5).map((item) => (
              <SeriesCard
                key={item.id}
                slug={item.slug}
                title={item.title}
                cover={item.cover_url}
                rating={item.rating}
                chapters={item.chapters.length}
                showTitle={false}
                favorite={favoriteIds.has(item.id)}
                seriesId={item.id}
              />
            ))}
            {byKind.data?.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground">
                Nada em {kind} por enquanto.
              </p>
            ) : null}
          </div>
        </SectionRow>

        {user && (favorites.data?.length ?? 0) > 0 ? (
          <SectionRow icon={<Heart className="h-5 w-5 text-gold" />} title="Favoritas atualizadas">
            <HScroll>
              {favorites.data!.map((item) => (
                <div key={item.id} className="w-[140px] shrink-0">
                  <SeriesCard
                    slug={item.slug}
                    title={item.title}
                    cover={item.cover_url}
                    rating={item.rating}
                    favorite
                    seriesId={item.id}
                  />
                </div>
              ))}
            </HScroll>
          </SectionRow>
        ) : null}

        {user && (history.data?.length ?? 0) > 0 ? (
          <SectionRow
            icon={<BookOpen className="h-5 w-5" />}
            title="Continue lendo"
            subtitle="Toque na capa para continuar de onde parou."
            action={
              <Button asChild variant="ghost" size="sm" className="text-primary">
                <Link to="/biblioteca">Ver todos</Link>
              </Button>
            }
          >
            <HScroll>
              {history.data!.map((row) => (
                <div key={row.series.id} className="w-[140px] shrink-0">
                  <SeriesCard
                    slug={row.series.slug}
                    title={row.series.title}
                    cover={row.series.cover_url}
                    progress={row.progress}
                    badge={row.chapters ? `Cap. ${formatChapter(row.chapters.number)}` : null}
                  />
                </div>
              ))}
            </HScroll>
          </SectionRow>
        ) : null}

        {(topRated.data?.length ?? 0) > 0 ? (
          <SectionRow icon={<Star className="h-5 w-5 fill-primary" />} title="Muito bem avaliados">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {topRated.data!.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  to="/obra/$slug"
                  params={{ slug: item.slug }}
                  className="card-hover relative block h-44 overflow-hidden rounded-xl ring-1 ring-border"
                >
                  <img
                    src={coverUrl(item.cover_url)}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                  <span className="cover-fade" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="line-clamp-2 font-display text-base font-bold">{item.title}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="rounded-md bg-surface-2/90 px-2 py-0.5 font-semibold">
                        {item.kind}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-gold">
                        <Star className="h-3 w-3 fill-gold" />
                        {Number(item.rating).toFixed(1).replace(".", ",")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.chapters.length} capítulos
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </SectionRow>
        ) : null}

        {(recent.data?.length ?? 0) > 0 ? (
          <SectionRow icon={<PlusSquare className="h-5 w-5" />} title="Adicionados recentemente">
            <HScroll>
              {recent.data!.map((item) => (
                <div key={item.id} className="w-[140px] shrink-0">
                  <SeriesCard
                    slug={item.slug}
                    title={item.title}
                    cover={item.cover_url}
                    favorite={favoriteIds.has(item.id)}
                    seriesId={item.id}
                  />
                </div>
              ))}
            </HScroll>
          </SectionRow>
        ) : null}

        {(updated.data?.length ?? 0) > 0 ? (
          <SectionRow
            icon={<Clock className="h-5 w-5" />}
            title="Atualizados recentes"
            action={
              <Button asChild variant="ghost" size="sm" className="text-primary">
                <Link to="/catalogo" search={{ q: "", kind: "Todos" }}>
                  Ver todos
                </Link>
              </Button>
            }
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {updated.data!.map((item) => (
                <SeriesCard
                  key={item.id}
                  slug={item.slug}
                  title={item.title}
                  cover={item.cover_url}
                  rating={item.rating}
                  chapters={item.chapters.length}
                  chapterList={item.chapters}
                  favorite={favoriteIds.has(item.id)}
                  seriesId={item.id}
                  badge={item.pinned ? "Fixada" : null}
                />
              ))}
            </div>
          </SectionRow>
        ) : null}

        {(ranking.data?.length ?? 0) > 0 ? (
          <SectionRow
            icon={<Trophy className="h-5 w-5" />}
            title="Rankings"
            subtitle="Mais lidas do site"
            action={
              <Button asChild variant="ghost" size="sm" className="text-primary">
                <Link to="/ranking">Ver todos</Link>
              </Button>
            }
          >
            <HScroll>
              {ranking.data!.map((item, index) => (
                <div key={item.id} className="w-[150px] shrink-0">
                  <div className="flex items-start gap-1">
                    <span className="font-display text-2xl font-black text-primary">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <SeriesCard
                        slug={item.slug}
                        title={item.title}
                        cover={item.cover_url}
                        rating={item.rating}
                        favorite={favoriteIds.has(item.id)}
                        seriesId={item.id}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </HScroll>
          </SectionRow>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
