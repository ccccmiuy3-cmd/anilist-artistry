import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookText, ChevronDown, Eye, FilePlus2, Pencil, Plus, Save, Search, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { uniqueSlug } from "@/lib/series-import";
import { coverUrl, formatChapter } from "@/lib/media";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/novels")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Novels — Painel Better Mangá" },
      { name: "description", content: "Cadastre novels e publique capítulos em texto." },
      { property: "og:title", content: "Novels — Painel Better Mangá" },
      { property: "og:description", content: "Gestão de novels e capítulos em texto." },
    ],
  }),
  component: AdminNovels,
});

type NovelRow = {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  status: string;
  chapters: { id: string; number: number; title: string | null; content: string | null; published: boolean; created_at: string }[];
};

function AdminNovels() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const novels = useQuery({
    queryKey: ["admin-novels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, slug, title, cover_url, status, chapters(id, number, title, content, published, created_at)")
        .eq("kind", "Novel")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NovelRow[];
    },
  });

  const [form, setForm] = useState({
    title: "",
    synopsis: "",
    coverUrl: "",
    bannerUrl: "",
    author: "",
    genres: "",
    status: "Em andamento",
  });
  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const createNovel = useMutation({
    mutationFn: async () => {
      const title = form.title.trim();
      if (!title) throw new Error("Informe o título da novel.");
      const { error } = await supabase.from("series").insert({
        slug: await uniqueSlug(title, ""),
        title,
        synopsis: form.synopsis,
        cover_url: form.coverUrl,
        banner_url: form.bannerUrl,
        author: form.author,
        genres: form.genres.split(",").map((g) => g.trim()).filter(Boolean),
        status: form.status,
        kind: "Novel",
        published: true,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Novel criada!");
      setForm({ title: "", synopsis: "", coverUrl: "", bannerUrl: "", author: "", genres: "", status: "Em andamento" });
      queryClient.invalidateQueries({ queryKey: ["admin-novels"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar novel"),
  });

  return (
    <AdminShell title="Novels" subtitle="Cadastre novels e publique capítulos em texto.">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <Plus className="h-5 w-5 text-primary" /> Nova novel
        </h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createNovel.mutate();
          }}
        >
          <Field label="Título" required value={form.title} onChange={(v) => set("title", v)} />
          <Field label="Autor" value={form.author} onChange={(v) => set("author", v)} />
          <Field label="URL da capa" value={form.coverUrl} onChange={(v) => set("coverUrl", v)} placeholder="https://…" />
          <Field label="URL do banner" value={form.bannerUrl} onChange={(v) => set("bannerUrl", v)} placeholder="https://…" />
          <Field label="Gêneros (vírgula)" value={form.genres} onChange={(v) => set("genres", v)} placeholder="Ação, Fantasia" />
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              {["Em andamento", "Completo", "Hiato", "Cancelado", "Em breve"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Sinopse</Label>
            <Textarea value={form.synopsis} onChange={(e) => set("synopsis", e.target.value)} className="min-h-24 bg-background" />
          </div>
          <Button type="submit" disabled={createNovel.isPending} className="font-semibold sm:col-span-2">
            {createNovel.isPending ? "Criando…" : "Criar novel"}
          </Button>
        </form>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <BookText className="h-5 w-5 text-primary" /> Novels cadastradas
        </h2>
        {(novels.data ?? []).length === 0 && !novels.isLoading ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            Nenhuma novel cadastrada ainda.
          </p>
        ) : null}
        {(novels.data ?? []).map((novel) => (
          <article key={novel.id} className="rounded-2xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => setOpenId(openId === novel.id ? null : novel.id)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <img src={coverUrl(novel.cover_url)} alt="" className="h-16 w-12 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{novel.title}</p>
                <p className="text-xs text-muted-foreground">
                  {novel.status} · {novel.chapters.length} {novel.chapters.length === 1 ? "capítulo" : "capítulos"}
                </p>
              </div>
              <Link
                to="/obra/$slug"
                params={{ slug: novel.slug }}
                className="shrink-0 text-xs font-semibold text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Ver página
              </Link>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${openId === novel.id ? "rotate-180" : ""}`} />
            </button>
            {openId === novel.id ? <ChapterForm novel={novel} /> : null}
          </article>
        ))}
      </section>
    </AdminShell>
  );
}

function ChapterForm({ novel }: { novel: NovelRow }) {
  const queryClient = useQueryClient();
  const nextNumber = Math.max(0, ...novel.chapters.map((c) => Number(c.number))) + 1;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [number, setNumber] = useState(String(nextNumber));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [search, setSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const draftKey = `better-manga:novel-draft:${novel.id}`;

  const resetEditor = () => {
    setEditingId(null);
    setNumber(String(Math.max(nextNumber, 1)));
    setTitle("");
    setContent("");
    setPublished(false);
    setShowPreview(false);
  };

  useEffect(() => {
    if (editingId) return;
    const saved = window.localStorage.getItem(draftKey);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved) as { number?: string; title?: string; content?: string; published?: boolean };
      setNumber(draft.number || String(nextNumber));
      setTitle(draft.title || "");
      setContent(draft.content || "");
      setPublished(Boolean(draft.published));
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey, editingId, nextNumber]);

  useEffect(() => {
    if (editingId) return;
    const timer = window.setTimeout(() => {
      if (title.trim() || content.trim()) {
        window.localStorage.setItem(draftKey, JSON.stringify({ number, title, content, published }));
      } else {
        window.localStorage.removeItem(draftKey);
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [content, draftKey, editingId, number, published, title]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingMinutes = wordCount ? Math.max(1, Math.ceil(wordCount / 220)) : 0;
  const paragraphs = content.split(/\n{2,}|\r?\n/).map((part) => part.trim()).filter(Boolean);

  const visibleChapters = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return [...novel.chapters]
      .sort((a, b) => Number(b.number) - Number(a.number))
      .filter((chapter) => !term || `capitulo ${chapter.number} ${chapter.title ?? ""}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [novel.chapters, search]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-novels"] });
    queryClient.invalidateQueries({ queryKey: ["series", novel.slug] });
  };

  const publish = useMutation({
    mutationFn: async () => {
      const num = Number(number);
      if (!Number.isFinite(num) || num < 0) throw new Error("Número de capítulo inválido.");
      if (content.trim().length < 10) throw new Error("Escreva o texto do capítulo.");
      if (novel.chapters.some((chapter) => Number(chapter.number) === num && chapter.id !== editingId)) {
        throw new Error(`O capítulo ${formatChapter(num)} já existe.`);
      }
      const values = {
        series_id: novel.id,
        number: num,
        title: title.trim() || null,
        content: content.trim(),
        pages: [],
        published,
      };
      const { error } = editingId
        ? await supabase.from("chapters").update(values).eq("id", editingId).eq("series_id", novel.id)
        : await supabase.from("chapters").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(published ? "Capítulo publicado!" : "Rascunho salvo!");
      window.localStorage.removeItem(draftKey);
      resetEditor();
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao publicar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chapters").delete().eq("id", id).eq("series_id", novel.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Capítulo excluído.");
      resetEditor();
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir capítulo"),
  });

  const editChapter = (chapter: NovelRow["chapters"][number]) => {
    setEditingId(chapter.id);
    setNumber(String(chapter.number));
    setTitle(chapter.title ?? "");
    setContent(chapter.content ?? "");
    setPublished(chapter.published);
    setShowPreview(false);
  };

  return (
    <div className="grid gap-5 border-t border-border p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-lg border border-border bg-background/60 p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar capítulo" className="pl-9" />
          </div>
          <Button type="button" size="icon" onClick={resetEditor} aria-label="Novo capítulo" title="Novo capítulo">
            <FilePlus2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
          {visibleChapters.map((chapter) => (
            <div key={chapter.id} className={`rounded-md border p-3 ${editingId === chapter.id ? "border-primary bg-primary/10" : "border-border bg-surface/70"}`}>
              <div className="flex min-w-0 items-start justify-between gap-2">
                <button type="button" onClick={() => editChapter(chapter)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-bold">Cap. {formatChapter(chapter.number)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{chapter.title || "Sem título"}</span>
                </button>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${chapter.published ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {chapter.published ? "Publicado" : "Rascunho"}
                </span>
              </div>
              <div className="mt-2 flex justify-end gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => editChapter(chapter)} aria-label="Editar capítulo" title="Editar capítulo">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <ConfirmDelete title={`Excluir capítulo ${formatChapter(chapter.number)}?`} description="O texto e os comentários ligados a este capítulo serão apagados permanentemente." onConfirm={() => remove.mutate(chapter.id)}>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label="Excluir capítulo" title="Excluir capítulo">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </ConfirmDelete>
              </div>
            </div>
          ))}
          {visibleChapters.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">Nenhum capítulo encontrado.</p> : null}
        </div>
      </aside>

      <form
        className="min-w-0 rounded-lg border border-border bg-background/60 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          publish.mutate();
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold">{editingId ? "Editar capítulo" : "Novo capítulo"}</h3>
            <p className="text-xs text-muted-foreground">O texto é salvo automaticamente neste aparelho enquanto você escreve.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview((shown) => !shown)}>
            <Eye className="h-4 w-4" /> {showPreview ? "Editar texto" : "Visualizar"}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <Label>Número</Label>
            <Input value={number} onChange={(e) => setNumber(e.target.value)} inputMode="decimal" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label>Título (opcional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background" />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label>Texto do capítulo</Label>
          {showPreview ? (
            <article className="min-h-96 rounded-md border border-border bg-surface px-5 py-7 text-[17px] leading-8 text-foreground/90 sm:px-8">
              {paragraphs.length ? paragraphs.map((paragraph, index) => <p key={index} className="mb-5 text-justify last:mb-0">{paragraph}</p>) : <p className="text-center text-sm text-muted-foreground">A prévia aparecerá aqui.</p>}
            </article>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole ou escreva o texto aqui. Separe os parágrafos com uma linha em branco."
              className="min-h-96 resize-y bg-background font-sans leading-7"
              maxLength={500000}
            />
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{content.length.toLocaleString("pt-BR")} caracteres</span>
            <span>{wordCount.toLocaleString("pt-BR")} palavras</span>
            <span>{readingMinutes} min de leitura</span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span><b>{published ? "Publicar agora" : "Salvar como rascunho"}</b><small className="block text-muted-foreground">{published ? "O capítulo ficará visível aos leitores." : "Somente a equipe poderá acessá-lo."}</small></span>
          </label>
          <Button type="submit" disabled={publish.isPending || content.trim().length < 10} className="font-semibold">
            {editingId ? <Save className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
            {publish.isPending ? "Salvando…" : editingId ? "Salvar alterações" : published ? "Publicar capítulo" : "Salvar rascunho"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="bg-background" />
    </div>
  );
}
