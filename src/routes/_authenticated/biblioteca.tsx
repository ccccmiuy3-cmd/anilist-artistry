import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Heart } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { SeriesCard } from "@/components/SeriesCard";
import { SectionRow } from "@/components/SectionRow";
import { fetchFavorites, fetchHistory } from "@/lib/queries";
import { formatChapter } from "@/lib/media";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({
    meta: [
      { title: "Minha biblioteca — MangaVerso" },
      {
        name: "description",
        content: "Suas obras favoritas e o histórico de leitura salvos na sua conta.",
      },
      { property: "og:title", content: "Minha biblioteca — MangaVerso" },
      { property: "og:description", content: "Favoritos e histórico de leitura." },
    ],
  }),
  component: Biblioteca,
});

function Biblioteca() {
  const { user } = useSession();
  const favorites = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchFavorites(user!.id),
  });
  const history = useQuery({
    queryKey: ["history", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchHistory(user!.id),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 font-display text-3xl font-extrabold">Minha biblioteca</h1>

        <SectionRow icon={<Heart className="h-5 w-5" />} title="Favoritas">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {(favorites.data ?? []).map((item) => (
              <SeriesCard
                key={item.id}
                slug={item.slug}
                title={item.title}
                cover={item.cover_url}
                rating={item.rating}
              />
            ))}
          </div>
          {favorites.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Você ainda não favoritou nenhuma obra.{" "}
              <Link to="/catalogo" search={{ q: "", kind: "Todos" }} className="text-primary">
                Explorar a coleção
              </Link>
            </p>
          ) : null}
        </SectionRow>

        <SectionRow icon={<BookOpen className="h-5 w-5" />} title="Histórico de leitura">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {(history.data ?? []).map((row) => (
              <SeriesCard
                key={row.series.id}
                slug={row.series.slug}
                title={row.series.title}
                cover={row.series.cover_url}
                progress={row.progress}
                badge={row.chapters ? `Cap. ${formatChapter(row.chapters.number)}` : null}
              />
            ))}
          </div>
          {history.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma leitura registrada ainda.</p>
          ) : null}
        </SectionRow>
      </main>
      <SiteFooter />
    </div>
  );
}
