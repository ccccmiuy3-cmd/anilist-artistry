import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookText, ChevronDown, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
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
  chapters: { id: string; number: number; title: string | null }[];
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
        .select("id, slug, title, cover_url, status, chapters(id, number, title)")
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
  const [number, setNumber] = useState(String(nextNumber));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const publish = useMutation({
    mutationFn: async () => {
      const num = Number(number);
      if (!Number.isFinite(num) || num <= 0) throw new Error("Número de capítulo inválido.");
      if (content.trim().length < 10) throw new Error("Escreva o texto do capítulo.");
      const { error } = await supabase.from("chapters").insert({
        series_id: novel.id,
        number: num,
        title: title.trim() || null,
        content: content.trim(),
        pages: [],
        published: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Capítulo publicado!");
      setTitle("");
      setContent("");
      setNumber(String(Number(number) + 1));
      queryClient.invalidateQueries({ queryKey: ["admin-novels"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao publicar"),
  });

  const recent = [...novel.chapters].sort((a, b) => Number(b.number) - Number(a.number)).slice(0, 5);

  return (
    <div className="border-t border-border p-4">
      {recent.length > 0 ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Últimos: {recent.map((c) => `Cap. ${formatChapter(c.number)}`).join(" · ")}
        </p>
      ) : null}
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          publish.mutate();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Número</Label>
            <Input value={number} onChange={(e) => setNumber(e.target.value)} inputMode="decimal" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label>Título (opcional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Texto do capítulo</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Cole ou escreva o texto aqui. Separe os parágrafos com uma linha em branco."
            className="min-h-56 bg-background"
          />
          <p className="text-xs text-muted-foreground">{content.trim().length} caracteres</p>
        </div>
        <Button type="submit" disabled={publish.isPending} className="font-semibold">
          <Send className="mr-2 h-4 w-4" />
          {publish.isPending ? "Publicando…" : "Publicar capítulo"}
        </Button>
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
