import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { coverUrl, formatChapter, timeAgo } from "@/lib/media";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export const Route = createFileRoute("/_authenticated/admin/$id")({
  head: () => ({
    meta: [
      { title: "Publicar capítulos — MangaVerso" },
      { name: "description", content: "Envie as páginas e publique novos capítulos da obra." },
      { property: "og:title", content: "Publicar capítulos — MangaVerso" },
      { property: "og:description", content: "Upload de páginas e publicação de capítulos." },
    ],
  }),
  component: ChapterManager,
});

function ChapterManager() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [urls, setUrls] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const series = useQuery({
    queryKey: ["admin-series", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, slug, title, cover_url, kind, published, chapters(id, number, title, pages, created_at)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function uploadPages(chapterNumber: string) {
    const uploaded: string[] = [];
    const ordered = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    for (const [index, file] of ordered.entries()) {
      const extension = file.name.split(".").pop() ?? "jpg";
      const path = `${id}/${chapterNumber}/${String(index + 1).padStart(3, "0")}.${extension}`;
      const { error } = await supabase.storage
        .from("manga")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data, error: signError } = await supabase.storage
        .from("manga")
        .createSignedUrl(path, TEN_YEARS);
      if (signError) throw signError;
      uploaded.push(data.signedUrl);
    }
    return uploaded;
  }

  const publish = useMutation({
    mutationFn: async () => {
      setBusy(true);
      const pasted = urls
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const uploaded = files.length > 0 ? await uploadPages(formatChapter(number)) : [];
      const pages = [...uploaded, ...pasted];
      if (pages.length === 0) throw new Error("Adicione páginas (upload ou links).");

      const { error } = await supabase.from("chapters").insert({
        series_id: id,
        number: Number(number),
        title: title.trim() || null,
        pages,
      });
      if (error) throw error;

      await supabase.from("series").update({ updated_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => {
      toast.success("Capítulo publicado!");
      setNumber("");
      setTitle("");
      setUrls("");
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ["admin-series", id] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível publicar."),
    onSettled: () => setBusy(false),
  });

  const removeChapter = useMutation({
    mutationFn: async (chapterId: string) => {
      const { error } = await supabase.from("chapters").delete().eq("id", chapterId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-series", id] }),
    onError: () => toast.error("Não foi possível apagar."),
  });

  const obra = series.data;
  const chapters = [...(obra?.chapters ?? [])].sort((a, b) => Number(b.number) - Number(a.number));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao painel
          </Link>
        </Button>

        {obra ? (
          <div className="flex items-center gap-4">
            <img
              src={coverUrl(obra.cover_url)}
              alt={obra.title}
              className="h-24 w-16 rounded-lg object-cover"
            />
            <div>
              <h1 className="font-display text-2xl font-extrabold">{obra.title}</h1>
              <p className="text-sm text-muted-foreground">
                {obra.kind} · {chapters.length} capítulos ·{" "}
                <Link to="/obra/$slug" params={{ slug: obra.slug }} className="text-primary">
                  ver no site
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Carregando…</p>
        )}

        <form
          className="mt-8 space-y-4 rounded-2xl border border-border bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault();
            publish.mutate();
          }}
        >
          <h2 className="section-title">
            <Upload className="h-5 w-5 text-primary" /> Novo capítulo
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input
                required
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="1"
                inputMode="decimal"
                className="bg-background"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Título (opcional)</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Páginas (imagens)</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              As imagens são ordenadas pelo nome do arquivo (01.jpg, 02.jpg…).
              {files.length > 0 ? ` ${files.length} arquivo(s) selecionado(s).` : ""}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Ou cole links das páginas (um por linha)</Label>
            <Textarea
              value={urls}
              onChange={(event) => setUrls(event.target.value)}
              className="min-h-24 bg-background font-mono text-xs"
              placeholder={"https://…/01.jpg\nhttps://…/02.jpg"}
            />
          </div>

          <Button type="submit" disabled={busy || number.trim() === ""} className="w-full font-semibold">
            {busy ? "Publicando…" : "Publicar capítulo"}
          </Button>
        </form>

        <section className="mt-8">
          <h2 className="section-title">Capítulos publicados</h2>
          <div className="mt-4 space-y-2">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm"
              >
                <span className="font-semibold">
                  Capítulo {formatChapter(chapter.number)}
                  {chapter.title ? (
                    <span className="ml-2 font-normal text-muted-foreground">{chapter.title}</span>
                  ) : null}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {Array.isArray(chapter.pages) ? chapter.pages.length : 0} páginas ·{" "}
                    {timeAgo(chapter.created_at)}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeChapter.mutate(chapter.id)}
                  title="Apagar capítulo"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {chapters.length === 0 ? (
              <p className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum capítulo publicado ainda.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
