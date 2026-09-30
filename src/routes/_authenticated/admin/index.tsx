import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Eye, EyeOff, Pencil, Plus, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { searchAnilist, type AnilistResult } from "@/lib/anilist.functions";
import { claimFirstAdmin } from "@/lib/staff.functions";
import { coverUrl, slugify } from "@/lib/media";
import { useRoles, useSession } from "@/hooks/useAuth";
import { KINDS } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Painel de publicação — MangaVerso" },
      {
        name: "description",
        content: "Importe obras do AniList, publique capítulos e gerencie o catálogo do site.",
      },
      { property: "og:title", content: "Painel de publicação — MangaVerso" },
      { property: "og:description", content: "Importação AniList e gestão do catálogo." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useSession();
  const { isStaff, isAdmin, isLoading } = useRoles(user?.id);
  const queryClient = useQueryClient();
  const claim = useServerFn(claimFirstAdmin);
  const anilist = useServerFn(searchAnilist);

  const [term, setTerm] = useState("");
  const [results, setResults] = useState<AnilistResult[]>([]);
  const [kind, setKind] = useState<string>("Manga");

  const series = useQuery({
    queryKey: ["admin-series"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, slug, title, cover_url, kind, status, published, views, rating, chapters(id)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const search = useMutation({
    mutationFn: async () => anilist({ data: { search: term.trim() } }),
    onSuccess: (data) => {
      setResults(data);
      if (data.length === 0) toast.info("Nenhum resultado no AniList.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro na busca"),
  });

  const importSeries = useMutation({
    mutationFn: async (item: AnilistResult) => {
      const { error } = await supabase.from("series").insert({
        anilist_id: item.anilistId,
        slug: slugify(item.title) || `obra-${item.anilistId}`,
        title: item.title,
        alt_titles: item.altTitles,
        synopsis: item.synopsis,
        cover_url: item.coverUrl,
        banner_url: item.bannerUrl,
        genres: item.genres,
        status: item.status,
        author: item.author,
        artist: item.artist,
        rating: item.averageScore,
        kind,
        published: true,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obra importada do AniList!");
      queryClient.invalidateQueries({ queryKey: ["admin-series"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error && error.message.includes("duplicate")
          ? "Essa obra já está no catálogo."
          : "Não foi possível importar.",
      ),
  });

  const togglePublished = useMutation({
    mutationFn: async (row: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("series")
        .update({ published: !row.published })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-series"] }),
    onError: () => toast.error("Não foi possível alterar a publicação."),
  });

  const claimAdmin = useMutation({
    mutationFn: async () => claim({}),
    onSuccess: (result) => {
      if (result.granted) {
        toast.success("Você agora é administrador do site.");
        queryClient.invalidateQueries({ queryKey: ["roles", user?.id] });
      } else {
        toast.error(result.reason);
      }
    },
    onError: () => toast.error("Não foi possível assumir o painel."),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-4xl px-4 py-16 text-muted-foreground">Verificando acesso…</p>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <Shield className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-extrabold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Só a equipe pode publicar obras. Se este site é seu e ainda não tem administrador,
            assuma o painel agora.
          </p>
          <Button
            className="mt-6 font-semibold"
            disabled={claimAdmin.isPending}
            onClick={() => claimAdmin.mutate()}
          >
            Assumir como administrador
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold">Painel</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Importe obras do AniList e publique os capítulos.
            </p>
          </div>
          <Button asChild variant="outline" className="font-semibold">
            <Link to="/admin/nova">
              <Plus className="mr-2 h-4 w-4" /> Criar obra manualmente
            </Link>
          </Button>
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
          <h2 className="section-title">
            <Download className="h-5 w-5 text-primary" /> Importar do AniList
          </h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (term.trim()) search.mutate();
            }}
            className="mt-4 flex flex-wrap gap-3"
          >
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Nome da obra no AniList"
                className="bg-background pl-9"
              />
            </div>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm font-semibold"
            >
              {KINDS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={search.isPending} className="font-semibold">
              {search.isPending ? "Buscando…" : "Buscar"}
            </Button>
          </form>

          {results.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item) => (
                <div
                  key={item.anilistId}
                  className="flex gap-3 rounded-xl border border-border bg-surface-2 p-3"
                >
                  <img
                    src={coverUrl(item.coverUrl)}
                    alt={item.title}
                    className="h-32 w-22 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.status} · nota {item.averageScore || "—"}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                      {item.synopsis}
                    </p>
                    <Button
                      size="sm"
                      className="mt-2 font-semibold"
                      disabled={importSeries.isPending}
                      onClick={() => importSeries.mutate(item)}
                    >
                      Publicar como {kind}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-10">
          <h2 className="section-title">Catálogo ({series.data?.length ?? 0})</h2>
          <div className="mt-4 space-y-2">
            {(series.data ?? []).map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <img
                  src={coverUrl(row.cover_url)}
                  alt={row.title}
                  className="h-16 w-11 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.kind} · {row.chapters?.length ?? 0} capítulos · {row.views} visualizações
                    {row.published ? "" : " · rascunho"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title={row.published ? "Despublicar" : "Publicar"}
                  onClick={() => togglePublished.mutate({ id: row.id, published: row.published })}
                >
                  {row.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button asChild variant="outline" size="sm" className="font-semibold">
                  <Link to="/admin/$id" params={{ id: row.id }}>
                    <Pencil className="mr-2 h-4 w-4" /> Capítulos
                  </Link>
                </Button>
              </div>
            ))}
            {series.data?.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
                Nenhuma obra ainda. Busque no AniList acima para começar.
              </p>
            ) : null}
          </div>
          {isAdmin ? null : (
            <p className="mt-4 text-xs text-muted-foreground">
              Você está como uploader: pode publicar obras e capítulos.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
