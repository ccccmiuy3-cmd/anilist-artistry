import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Heart, MessageCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchComments, fetchSeriesBySlug } from "@/lib/queries";
import { coverUrl, formatChapter, timeAgo } from "@/lib/media";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/obra/$slug/")({
  head: () => ({
    meta: [
      { title: "Obra — MangaVerso" },
      {
        name: "description",
        content: "Sinopse, gêneros e lista completa de capítulos da obra no MangaVerso.",
      },
      { property: "og:title", content: "Obra — MangaVerso" },
      { property: "og:description", content: "Sinopse, gêneros e capítulos disponíveis." },
    ],
  }),
  component: SeriesPage,
});

function SeriesPage() {
  const { slug } = Route.useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const series = useQuery({
    queryKey: ["series", slug],
    queryFn: () => fetchSeriesBySlug(slug),
  });

  const favorite = useQuery({
    queryKey: ["favorite", slug, user?.id],
    enabled: Boolean(user && series.data),
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("series_id")
        .eq("user_id", user!.id)
        .eq("series_id", series.data!.id)
        .maybeSingle();
      return Boolean(data);
    },
  });

  const comments = useQuery({
    queryKey: ["comments", series.data?.id],
    enabled: Boolean(series.data),
    queryFn: () => fetchComments(series.data!.id),
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user || !series.data) throw new Error("Entre para favoritar.");
      if (favorite.data) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("series_id", series.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, series_id: series.data.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite", slug, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro"),
  });

  const postComment = useMutation({
    mutationFn: async () => {
      if (!user || !series.data) throw new Error("Entre para comentar.");
      const { error } = await supabase
        .from("comments")
        .insert({ series_id: series.data.id, user_id: user.id, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["comments", series.data?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro"),
  });

  if (series.isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-5xl px-4 py-16 text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  const obra = series.data;
  if (!obra) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h1 className="font-display text-2xl font-extrabold">Obra não encontrada</h1>
          <Button asChild className="mt-6">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    );
  }

  const chapters = order === "asc" ? obra.chapters : [...obra.chapters].reverse();
  const first = obra.chapters[0];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="relative">
        <div className="h-48 w-full overflow-hidden sm:h-64">
          <img
            src={coverUrl(obra.banner_url ?? obra.cover_url)}
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <span className="cover-fade" />
        </div>

        <main className="mx-auto -mt-24 max-w-5xl px-4 pb-10">
          <div className="flex flex-col gap-6 sm:flex-row">
            <img
              src={coverUrl(obra.cover_url)}
              alt={obra.title}
              className="h-64 w-44 shrink-0 rounded-xl object-cover ring-1 ring-border shadow-[var(--shadow-card)]"
            />
            <div className="flex-1">
              <h1 className="font-display text-3xl font-extrabold leading-tight">{obra.title}</h1>
              {obra.alt_titles ? (
                <p className="mt-1 text-sm text-muted-foreground">{obra.alt_titles}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-surface-2 px-2 py-1 font-semibold">{obra.kind}</span>
                <span className="rounded-md bg-surface-2 px-2 py-1 font-semibold">
                  {obra.status}
                </span>
                <span className="flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 font-semibold text-gold">
                  <Star className="h-3.5 w-3.5 fill-gold" />
                  {Number(obra.rating).toFixed(1).replace(".", ",")}
                </span>
                <span className="rounded-md bg-surface-2 px-2 py-1 font-semibold">
                  {obra.chapters.length} capítulos
                </span>
              </div>

              {obra.genres.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {obra.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              ) : null}

              {obra.author || obra.artist ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {obra.author ? `Autor: ${obra.author}` : ""}
                  {obra.author && obra.artist ? " · " : ""}
                  {obra.artist ? `Arte: ${obra.artist}` : ""}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                {first ? (
                  <Button asChild className="font-semibold">
                    <Link
                      to="/obra/$slug/$chapter"
                      params={{ slug: obra.slug, chapter: formatChapter(first.number) }}
                    >
                      <BookOpen className="mr-2 h-4 w-4" /> Começar a ler
                    </Link>
                  </Button>
                ) : null}
                {user ? (
                  <Button
                    variant={favorite.data ? "default" : "outline"}
                    onClick={() => toggleFavorite.mutate()}
                    className="font-semibold"
                  >
                    <Heart className={`mr-2 h-4 w-4 ${favorite.data ? "fill-current" : ""}`} />
                    {favorite.data ? "Favoritada" : "Favoritar"}
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="font-semibold">
                    <Link to="/auth">Entrar para favoritar</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {obra.synopsis ? (
            <section className="mt-8 rounded-xl border border-border bg-surface p-5">
              <h2 className="font-display text-lg font-bold">Sinopse</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {obra.synopsis}
              </p>
            </section>
          ) : null}

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Capítulos</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
              >
                {order === "asc" ? "Mais antigos primeiro" : "Mais novos primeiro"}
              </Button>
            </div>
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  to="/obra/$slug/$chapter"
                  params={{ slug: obra.slug, chapter: formatChapter(chapter.number) }}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/60"
                >
                  <span>
                    Capítulo {formatChapter(chapter.number)}
                    {chapter.title ? (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {chapter.title}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(chapter.created_at)}
                  </span>
                </Link>
              ))}
              {chapters.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhum capítulo publicado ainda.
                </p>
              ) : null}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="section-title">
              <MessageCircle className="h-5 w-5" /> Comentários
            </h2>
            {user ? (
              <div className="mt-4">
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Escreva um comentário…"
                  className="bg-surface"
                />
                <Button
                  className="mt-2 font-semibold"
                  disabled={body.trim().length === 0 || postComment.isPending}
                  onClick={() => postComment.mutate()}
                >
                  Comentar
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary">
                  Entre
                </Link>{" "}
                para comentar.
              </p>
            )}

            <ul className="mt-6 space-y-4">
              {(comments.data ?? []).map((comment) => (
                <li key={comment.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-surface-2 text-xs">
                      {comment.author?.avatar_url ? (
                        <img src={comment.author.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (comment.author?.username ?? "?").slice(0, 1).toUpperCase()
                      )}
                    </span>
                    {comment.author?.username ?? "leitor"}
                    <span className="text-xs font-normal text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm">{comment.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
