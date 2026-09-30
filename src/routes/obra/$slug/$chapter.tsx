import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, ChevronRight, ChevronsDown, Home, Infinity, Maximize2, MessageCircle, Palette } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchCommentAuthors, fetchCommentParents, fetchSeriesBySlug } from "@/lib/queries";
import { formatChapter, timeAgo } from "@/lib/media";
import { useSession } from "@/hooks/useAuth";
import { CommentItem } from "@/components/CommentItem";
import { CommentComposer, type CommentDraft } from "@/components/CommentComposer";
import { uploadCommentImage } from "@/lib/comments";

export const Route = createFileRoute("/obra/$slug/$chapter")({
  staticData: { sitemap: false },
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["series", params.slug],
      queryFn: () => fetchSeriesBySlug(params.slug),
    }),
  head: ({ params, loaderData }) => {
    const seriesTitle = loaderData?.title ?? params.slug.replace(/-/g, " ");
    const chapterLabel = params.chapter.replace(/-/g, " ");
    const title = `Capítulo ${chapterLabel} — ${seriesTitle}`;
    const description = `Leia o capítulo ${chapterLabel} de ${seriesTitle} online no Better Mangá.`;
    const url = `https://bettermanga.net/obra/${encodeURIComponent(params.slug)}/${encodeURIComponent(params.chapter)}`;
    const image = loaderData?.cover_url?.startsWith("https://") ? loaderData.cover_url : null;
    return {
      meta: [
        { title: `${title} — Better Mangá` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
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

  const queryClient = useQueryClient();
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);

  const comments = useQuery({
    queryKey: ["chapter-comments", current?.id],
    enabled: Boolean(current),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, body, created_at, user_id, is_spoiler, image_url, parent_id")
        .eq("chapter_id", current!.id)
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((row) => row.user_id))];
      const [authors, parents] = await Promise.all([fetchCommentAuthors(ids), fetchCommentParents(rows)]);
      return rows.map((row) => ({
        ...row,
        author: authors.get(row.user_id) ?? null,
        parent: row.parent_id ? (parents.get(row.parent_id) ?? null) : null,
      }));
    },
  });

  const postComment = useMutation({
    mutationFn: async (draft: CommentDraft) => {
      if (!user || !obra || !current) throw new Error("Entre para comentar.");
      const imageUrl = draft.image ? await uploadCommentImage(user.id, draft.image) : null;
      const { error } = await supabase.from("comments").insert({
        series_id: obra.id,
        chapter_id: current.id,
        user_id: user.id,
        body: draft.body,
        is_spoiler: draft.isSpoiler,
        image_url: imageUrl,
        parent_id: replyTo?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["chapter-comments", current?.id] });
      toast.success("Comentário publicado!");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro"),
  });

  // Save chapter + exact scroll position; restore where the user stopped.
  useEffect(() => {
    if (!user || !obra || !current) return;
    let cancelled = false;
    let lastPos = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const progress = Math.round(((index + 1) / Math.max(obra.chapters.length, 1)) * 100);

    const save = (pos: number) => {
      void supabase.from("reading_history").upsert(
        {
          user_id: user.id,
          series_id: obra.id,
          chapter_id: current.id,
          progress,
          scroll_pos: pos,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,series_id" },
      );
      if (pos > 0.9) {
        void supabase
          .from("chapter_reads")
          .upsert(
            { user_id: user.id, chapter_id: current.id },
            { onConflict: "user_id,chapter_id" },
          );
      }
    };

    const currentPos = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };

    (async () => {
      const { data } = await supabase
        .from("reading_history")
        .select("chapter_id, scroll_pos")
        .eq("user_id", user.id)
        .eq("series_id", obra.id)
        .maybeSingle();
      if (cancelled) return;
      const saved = data?.chapter_id === current.id ? Number(data.scroll_pos) || 0 : 0;
      lastPos = saved;
      void save(saved);
      if (saved > 0.01 && saved < 0.99) {
        // wait for images to lay out, then jump
        let tries = 0;
        const jump = () => {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({ top: saved * max });
          if (++tries < 8 && !cancelled) setTimeout(jump, 400);
        };
        jump();
        toast.info("Continuando de onde você parou");
      }
    })();

    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const pos = currentPos();
        if (Math.abs(pos - lastPos) > 0.01) {
          lastPos = pos;
          void save(pos);
        }
      }, 800);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      const pos = currentPos();
      if (Math.abs(pos - lastPos) > 0.01) void save(pos);
    };
  }, [user, obra, current, index]);

  useEffect(() => {
    if (!obra) return;
    void supabase.rpc("increment_series_views", { _series_id: obra.id });
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

  const iconBtn =
    "grid h-9 w-9 place-items-center rounded-md text-foreground/90 transition hover:bg-surface-2 hover:text-primary disabled:opacity-30 disabled:pointer-events-none";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-8">
          <button type="button" onClick={() => history.back()} className={iconBtn} aria-label="Voltar">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <Link to="/obra/$slug" params={{ slug }} className="ml-2 flex items-center gap-1.5 text-sm font-bold hover:text-primary">
            <BookOpen className="h-4 w-4" /> Obra
          </Link>
          <h1 className="ml-3 flex min-w-0 items-center gap-2 text-sm">
            <span className="truncate text-muted-foreground">{obra.title}</span>
            <span className="shrink-0 font-bold text-primary">Cap. {formatChapter(current.number)}</span>
          </h1>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" disabled={!prev} onClick={() => go("prev")} className={iconBtn} aria-label="Capítulo anterior">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" disabled={!next} onClick={() => go("next")} className={iconBtn} aria-label="Próximo capítulo">
              <ChevronRight className="h-5 w-5" />
            </button>
            <Link to="/obra/$slug" params={{ slug }} className={`${iconBtn} hidden sm:grid`} aria-label="Lista de capítulos">
              <Infinity className="h-5 w-5" />
            </Link>
            <button
              type="button"
              className={`${iconBtn} hidden sm:grid`}
              aria-label="Tema"
              onClick={() => document.documentElement.classList.toggle("reader-dim")}
            >
              <Palette className="h-5 w-5" />
            </button>
            <button
              type="button"
              className={iconBtn}
              aria-label="Ir para o fim"
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
            >
              <ChevronsDown className="h-5 w-5" />
            </button>
            <button
              type="button"
              className={`${iconBtn} hidden sm:grid`}
              aria-label="Tela cheia"
              onClick={() =>
                document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
              }
            >
              <Maximize2 className="h-5 w-5" />
            </button>
            <Link to="/" className={iconBtn} aria-label="Início">
              <Home className="h-5 w-5" />
            </Link>
          </div>
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

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="section-title">
          <MessageCircle className="h-5 w-5" /> Comentários do capítulo
        </h2>
        {user ? (
          <div className="mt-4">
            <CommentComposer
              pending={postComment.isPending}
              onSubmit={(draft) => postComment.mutate(draft)}
              replyTo={replyTo?.username ?? null}
              onCancelReply={() => setReplyTo(null)}
            />
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
            <CommentItem
              key={comment.id}
              comment={comment}
              userId={user?.id}
              onReply={user ? (c) => setReplyTo({ id: c.id, username: c.author?.username ?? "leitor" }) : undefined}
            />
          ))}
          {(comments.data ?? []).length === 0 && !comments.isLoading ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              Seja o primeiro a comentar este capítulo.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
