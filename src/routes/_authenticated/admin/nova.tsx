import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/media";
import { KINDS } from "@/lib/queries";
import { useSession } from "@/hooks/useAuth";
import { searchAnilist } from "@/lib/anilist.functions";

export const Route = createFileRoute("/_authenticated/admin/nova")({
  head: () => ({
    meta: [
      { title: "Nova obra — MangaVerso" },
      { name: "description", content: "Cadastre manualmente uma obra no catálogo do MangaVerso." },
      { property: "og:title", content: "Nova obra — MangaVerso" },
      { property: "og:description", content: "Cadastro manual de obras." },
    ],
  }),
  component: NovaObra,
});

function NovaObra() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [form, setForm] = useState({
    title: "",
    altTitles: "",
    synopsis: "",
    coverUrl: "",
    bannerUrl: "",
    kind: "Manga",
    status: "Em andamento",
    author: "",
    artist: "",
    genres: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .insert({
          slug: slugify(form.title),
          title: form.title,
          alt_titles: form.altTitles,
          synopsis: form.synopsis,
          cover_url: form.coverUrl,
          banner_url: form.bannerUrl,
          kind: form.kind,
          status: form.status,
          author: form.author,
          artist: form.artist,
          genres: form.genres
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          published: true,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Obra criada!");
      navigate({ to: "/admin/$id", params: { id } });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro ao criar"),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao painel
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-extrabold">Nova obra</h1>

        <form
          className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <Field label="Título" required value={form.title} onChange={(v) => set("title", v)} />
          <Field
            label="Títulos alternativos"
            value={form.altTitles}
            onChange={(v) => set("altTitles", v)}
          />
          <div className="space-y-1.5">
            <Label>Sinopse</Label>
            <Textarea
              value={form.synopsis}
              onChange={(event) => set("synopsis", event.target.value)}
              className="min-h-28 bg-background"
            />
          </div>
          <Field
            label="URL da capa"
            value={form.coverUrl}
            onChange={(v) => set("coverUrl", v)}
            placeholder="https://…"
          />
          <Field
            label="URL do banner"
            value={form.bannerUrl}
            onChange={(v) => set("bannerUrl", v)}
            placeholder="https://…"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select
                value={form.kind}
                onChange={(event) => set("kind", event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {KINDS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(event) => set("status", event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {["Em andamento", "Completo", "Hiato", "Cancelado", "Em breve"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Autor" value={form.author} onChange={(v) => set("author", v)} />
            <Field label="Arte" value={form.artist} onChange={(v) => set("artist", v)} />
          </div>
          <Field
            label="Gêneros (separados por vírgula)"
            value={form.genres}
            onChange={(v) => set("genres", v)}
            placeholder="Ação, Aventura, Fantasia"
          />
          <Button
            type="submit"
            disabled={create.isPending || form.title.trim().length === 0}
            className="w-full font-semibold"
          >
            {create.isPending ? "Criando…" : "Criar obra"}
          </Button>
        </form>
      </main>
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
      <Input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="bg-background"
      />
    </div>
  );
}
