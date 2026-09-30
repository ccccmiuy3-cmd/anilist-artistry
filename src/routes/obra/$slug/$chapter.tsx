import { useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchSeriesBySlug } from "@/lib/queries";
import { formatChapter } from "@/lib/media";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/obra/$slug/$chapter")({
  head: () => ({
    meta: [
      { title: "Leitor de capítulo — MangaVerso" },
      {
        name: "description",
        content: "Leia o capítulo página por página com navegação rápida entre capítulos.",
      },
      { property: "og:title", content: "Leitor de capítulo — MangaVerso" },
      { property: "og:description", content: "Leitura fluida, página por página." },
    ],
  }),
  component: Reader,
});

function Reader() {
  const { slug, chapter } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useSession();

  const series = useQuery({
    queryKey: ["series", slug],
    queryFn: () => fetchSeriesBySlug(slug),
  });

  const obra = series.data;
  const index = useMemo(
    () => obra?.chapters.findIndex((item) => formatChapter(item.number) === chapter) ?? -1,
    [obra, chapter],
  );
  const current = index >= 0 ? obra!.chapters[index] : undefined;
  const prev = index > 0 ? obra!.chapters[index - 1] : undefined;
  const next = obra && index >= 0 && index < obra.chapters.length - 1 ? obra.chapters[index + 1] : undefined;

  const pages = useMemo(() => {
    const raw = (current?.pages ?? []) as unknown;
    return Array.isArray(raw) ? (raw.filter((item) => typeof item === "string") as string[]) : [];
  }, [current]);

  useEffect(() => {
    if (!user || !obra || !current) return;
    void supabase.from("reading_history").upsert(
      {
        user_id: user.id,
        series_id: obra.id,
        chapter_id: current.id,
        progress: Math.round(((index + 1) / Math.max(obra.chapters.length, 1)) * 100),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,series_id" },
    );
  }, [user, obra, current, index]);

  useEffect(() => {
    if (!obra) return;
    void supabase.rpc;
    void supabase
      .from("series")
      .update({ views: obra.views + 1 })
      .eq("id", obra.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obra?.id, chapter]);

  if (series.isLoading) {
    return <p className="p-10 text-center text-muted-foreground">Carregando capítulo…</p>;
  }

  if (!obra || !current) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Capítulo não encontrado</h1>
          <Button asChild className="mt-6">
            <Link to="/obra/$slug" params={{ slug }}>
              Ver a obra
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  function go(direction: "prev" | "next") {
    const target = direction === "prev" ? prev : next;
    if (!target) return;
    navigate({
      to: "/obra/$slug/$chapter",
      params: { slug, chapter: formatChapter(target.number) },
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/obra/$slug" params={{ slug }}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{obra.title}</p>
            <p className="text-xs text-muted-foreground">
              Capítulo {formatChapter(current.number)}
              {current.title ? ` · ${current.title}` : ""}
            </p>
          </div>
          <Button asChild variant="ghost" size="icon">
            <Link to="/obra/$slug" params={{ slug }}>
              <List className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl">
        {pages.length === 0 ? (
          <p className="p-16 text-center text-sm text-muted-foreground">
            Este capítulo ainda não tem páginas.
          </p>
        ) : (
          pages.map((page, pageIndex) => (
            <img
              key={`${page}-${pageIndex}`}
              src={page}
              alt={`Página ${pageIndex + 1}`}
              loading={pageIndex < 2 ? "eager" : "lazy"}
              className="w-full"
            />
          ))
        )}
      </main>

      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-8">
        <Button variant="outline" disabled={!prev} onClick={() => go("prev")} className="font-semibold">
          <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
        </Button>
        <Button asChild variant="ghost" className="font-semibold">
          <Link to="/obra/$slug" params={{ slug }}>
            Capítulos
          </Link>
        </Button>
        <Button disabled={!next} onClick={() => go("next")} className="font-semibold">
          Próximo <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
