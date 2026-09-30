import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  Heart,
  ListPlus,
  MessageCircle,
  Play,
  Send,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchComments, fetchSeriesBySlug } from "@/lib/queries";
import { coverUrl, formatChapter, timeAgo } from "@/lib/media";
import { useSession } from "@/hooks/useAuth";
import { AddToListButton, StatusButton } from "@/components/SeriesActions";
import { CommentLikeButton } from "@/components/CommentLikeButton";

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
  const [expanded, setExpanded] = useState(false);

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

  const history = useQuery({
    queryKey: ["history", slug, user?.id],
    enabled: Boolean(user && series.data),
    queryFn: async () => {
      const { data } = await supabase
        .from("reading_history")
        .select("chapter_id, progress, chapters(number)")
        .eq("user_id", user!.id)
        .eq("series_id", series.data!.id);
      return (data ?? []) as unknown as Array<{
        chapter_id: string | null;
        progress: number;
        chapters: { number: number } | null;
      }>;
    },
  });

  const myRating = useQuery({
    queryKey: ["my-rating", slug, user?.id],
    enabled: Boolean(user && series.data),
    queryFn: async () => {
      const { data } = await supabase
        .from("ratings")
        .select("score")
        .eq("user_id", user!.id)
        .eq("series_id", series.data!.id)
        .maybeSingle();
      return data?.score ?? 0;
    },
  });

  const ratingStats = useQuery({
    queryKey: ["rating-stats", series.data?.id],
    enabled: Boolean(series.data),
    queryFn: async () => {
      const { data } = await supabase
        .from("ratings")
        .select("score")
        .eq("series_id", series.data!.id);
      const rows = data ?? [];
      const avg = rows.length
        ? rows.reduce((sum, row) => sum + row.score, 0) / rows.length
        : 0;
      return { count: rows.length, avg };
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

  const rate = useMutation({
    mutationFn: async (score: number) => {
      if (!user || !series.data) throw new Error("Entre para avaliar.");
      const { error } = await supabase
        .from("ratings")
        .upsert(
          { user_id: user.id, series_id: series.data.id, score },
          { onConflict: "user_id,series_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-rating", slug, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["rating-stats", series.data?.id] });
      queryClient.invalidateQueries({ queryKey: ["series", slug] });
      toast.success("Avaliação registrada!");
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
  const readNumbers = new Set(
    (history.data ?? [])
      .filter((entry) => entry.progress >= 1)
      .map((entry) => entry.chapters?.number),
  );
  const lastRead = (history.data ?? [])
    .map((entry) => entry.chapters?.number)
    .filter((n): n is number => typeof n === "number")
    .sort((a, b) => b - a)[0];
  const continueChapter =
    obra.chapters.find((c) => c.number === lastRead) ??
    obra.chapters.find((c) => !readNumbers.has(c.number)) ??
    obra.chapters[0];

  const synopsisLong = (obra.synopsis ?? "").length > 320;
  const stats = ratingStats.data ?? { count: 0, avg: 0 };
  const average = stats.count > 0 ? stats.avg : Number(obra.rating) || 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="relative">
        <div className="h-48 w-full overflow-hidden sm:h-72">
          <img
            src={coverUrl(obra.banner_url ?? obra.cover_url)}
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <span className="cover-fade pointer-events-none" />
        </div>

        <main className="relative z-10 mx-auto -mt-28 max-w-6xl px-4 pb-10">
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Cover */}
            <div className="relative w-44 shrink-0 self-start sm:w-56">
              <img
                src={coverUrl(obra.cover_url)}
                alt={obra.title}
                className="aspect-[3/4] w-full rounded-xl object-cover ring-1 ring-border shadow-[var(--shadow-card)]"
              />
              <span className="absolute left-2 top-2 rounded-md bg-background/85 px-2 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur">
                {obra.kind}
              </span>
              <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-[11px] font-semibold backdrop-blur">
                <BookOpen className="h-3 w-3" /> {obra.chapters.length} capítulos
              </span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="font-display text-3xl font-extrabold leading-tight">{obra.title}</h1>
              {obra.alt_titles ? (
                <p className="mt-1 text-sm text-muted-foreground">{obra.alt_titles}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-surface-2 px-2 py-1 font-semibold">
                  {obra.status}
                </span>
                {obra.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {obra.author || obra.artist ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {obra.author ? `Autor: ${obra.author}` : ""}
                  {obra.author && obra.artist ? " · " : ""}
                  {obra.artist ? `Arte: ${obra.artist}` : ""}
                </p>
              ) : null}

              {obra.synopsis ? (
                <div className="mt-3">
                  <p
                    className={`whitespace-pre-line text-sm leading-relaxed text-muted-foreground ${
                      expanded ? "" : "line-clamp-3"
                    }`}
                  >
                    {obra.synopsis}
                  </p>
                  {synopsisLong ? (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="mt-1 flex items-center gap-1 text-sm font-semibold text-primary"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                      {expanded ? "Ver menos" : "Ver mais"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* Actions */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {continueChapter ? (
                  <Button asChild size="lg" className="font-bold">
                    <Link
                      to="/obra/$slug/$chapter"
                      params={{
                        slug: obra.slug,
                        chapter: formatChapter(continueChapter.number),
                      }}
                    >
                      <Play className="mr-2 h-4 w-4 fill-current" />
                      {readNumbers.size > 0
                        ? `Continue lendo (Capítulo ${formatChapter(continueChapter.number)})`
                        : "Começar a ler"}
                    </Link>
                  </Button>
                ) : null}
                <span className="flex items-center gap-1.5 font-display text-xl font-extrabold text-gold">
                  <Star className="h-5 w-5 fill-gold" />
                  {average.toFixed(1).replace(".", ",")}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {user ? (
                  <>
                    <Button
                      variant={favorite.data ? "default" : "outline"}
                      onClick={() => toggleFavorite.mutate()}
                      className="font-semibold"
                    >
                      <Heart
                        className={`mr-2 h-4 w-4 ${favorite.data ? "fill-current" : ""}`}
                      />
                      {favorite.data ? "Favoritado" : "Favoritar"}
                    </Button>
                    <AddToListButton userId={user.id} seriesId={obra.id} />
                    <StatusButton userId={user.id} seriesId={obra.id} />
                  </>
                ) : (
                  <Button asChild variant="outline" className="font-semibold">
                    <Link to="/auth">Entrar para favoritar</Link>
                  </Button>
                )}
              </div>

              {/* Rating */}
              <div className="mt-6 rounded-xl border border-border bg-surface p-5">
                <h2 className="text-sm font-semibold text-muted-foreground">Sua avaliação</h2>
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
                    <button
                      key={score}
                      disabled={!user || rate.isPending}
                      onClick={() => rate.mutate(score)}
                      className="transition-transform hover:scale-110 disabled:cursor-not-allowed"
                      aria-label={`Avaliar com ${score}`}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          score <= (myRating.data ?? 0)
                            ? "fill-gold text-gold"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  <span className="font-bold text-foreground">
                    {average.toFixed(1).replace(".", ",")}
                  </span>
                  média da obra · {stats.count} avaliações
                </p>
                {!user ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <Link to="/auth" className="text-primary">
                      Entre
                    </Link>{" "}
                    para avaliar.
                  </p>
                ) : null}
                <div className="-mx-5 -mb-5 mt-5 border-t border-border p-5">
                  <div className="flex items-start gap-3">
                    <Heart className="mt-1 h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-bold">Apoiar esta obra</p>
                      <p className="text-xs text-muted-foreground">O valor vai ajudar a pagar os capítulos.</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {["R$ 5", "R$ 10", "R$ 15", "Outro valor"].map((v) => (
                      <button
                        key={v}
                        onClick={() => toast.info("Doações em breve!")}
                        className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-bold hover:border-primary"
                      >
                        {v}
                      </button>
                    ))}
                    <button
                      onClick={() => toast.info("Doações em breve!")}
                      className="ml-auto rounded-lg border border-primary/50 bg-primary/15 px-5 py-2 text-sm font-bold text-primary"
                    >
                      Doar agora
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chapters */}
          <section className="mt-8 rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-lg font-bold">Capítulos</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
                className="font-semibold"
              >
                {order === "desc" ? "Recentes" : "Antigos"}
              </Button>
            </div>
            <ul className="divide-y divide-border">
              {chapters.map((chapter) => {
                const isRead = readNumbers.has(chapter.number);
                return (
                  <li key={chapter.id}>
                    <Link
                      to="/obra/$slug/$chapter"
                      params={{ slug: obra.slug, chapter: formatChapter(chapter.number) }}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2/60"
                    >
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                          isRead ? "bg-primary/15 text-primary" : "bg-surface-2"
                        }`}
                      >
                        {isRead ? <Check className="h-5 w-5" /> : formatChapter(chapter.number)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm font-bold ${
                            isRead ? "text-primary" : ""
                          }`}
                        >
                          Capítulo {formatChapter(chapter.number)}
                          {chapter.title ? (
                            <span className="ml-2 font-normal text-muted-foreground">
                              {chapter.title}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {timeAgo(chapter.created_at)}
                          {isRead ? (
                            <span className="ml-2 font-bold uppercase tracking-wide text-primary">
                              Lido
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Eye className="h-4 w-4" />
                      </span>
                    </Link>
                  </li>
                );
              })}
              {chapters.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Nenhum capítulo publicado ainda.
                </li>
              ) : null}
            </ul>
          </section>

          {/* Comments */}
          <section className="mt-10">
            <h2 className="section-title">
              <MessageCircle className="h-5 w-5" /> Comentários
            </h2>
            {user ? (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-surface p-4">
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Escreva seu comentário…"
                  maxLength={350}
                  className="min-h-24 border-none bg-transparent p-0 focus-visible:ring-0"
                />
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">{body.length}/350</span>
                  <Button
                    className="font-semibold"
                    disabled={body.trim().length === 0 || postComment.isPending}
                    onClick={() => postComment.mutate()}
                  >
                    <Send className="mr-2 h-4 w-4" /> Comentar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary">
                  Entre
                </Link>{" "}
                para comentar.
              </p>
            )}

            <ul className="mt-6 space-y-5">
              {(comments.data ?? []).map((comment) => (
                <li key={comment.id} className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-sm font-bold">
                    {comment.author?.avatar_url ? (
                      <img
                        src={comment.author.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (comment.author?.username ?? "?").slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">
                        {comment.author?.username ?? "leitor"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                      {comment.body}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <CommentLikeButton commentId={comment.id} userId={user?.id} />
                    </div>
                  </div>
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
