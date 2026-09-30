import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { coverUrl, timeAgo } from "@/lib/media";
import { useRoles, useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/obras")({
  head: () => ({
    meta: [
      { title: "Gerenciar obras — Better Mangá" },
      { name: "description", content: "Edite, publique, despublique ou apague obras do catálogo." },
      { property: "og:title", content: "Gerenciar obras — Better Mangá" },
      { property: "og:description", content: "Gestão do catálogo de obras." },
    ],
  }),
  component: ObrasAdmin,
});

function ObrasAdmin() {
  const { user } = useSession();
  const { isStaff, isAdmin } = useRoles(user?.id);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pub" | "draft">("all");

  const series = useQuery({
    queryKey: ["admin-series"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, slug, title, cover_url, kind, status, published, views, rating, updated_at, chapters(id)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(
    () =>
      (series.data ?? []).filter(
        (r) =>
          r.title.toLowerCase().includes(q.toLowerCase()) &&
          (filter === "all" || (filter === "pub" ? r.published : !r.published)),
      ),
    [series.data, q, filter],
  );

  const toggle = useMutation({
    mutationFn: async (r: { id: string; published: boolean }) => {
      const { error } = await supabase.from("series").update({ published: !r.published }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-series"] }),
    onError: () => toast.error("Não foi possível alterar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("series").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obra apagada.");
      qc.invalidateQueries({ queryKey: ["admin-series"] });
    },
    onError: () => toast.error("Não foi possível apagar."),
  });

  return (
    <AdminShell
      title="Obras"
      subtitle={`${series.data?.length ?? 0} obras no catálogo`}
      actions={
        <Button asChild className="font-semibold">
          <Link to="/admin/nova">
            <Plus className="mr-2 h-4 w-4" /> Nova obra
          </Link>
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar obra…" className="h-11 bg-surface pl-9" />
        </div>
        <div className="flex rounded-xl border border-border bg-surface p-1">
          {([
            ["all", "Todas"],
            ["pub", "Publicadas"],
            ["draft", "Rascunhos"],
          ] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-4 border-b border-border p-3 last:border-0 hover:bg-surface-2/50">
            <img src={coverUrl(r.cover_url)} alt={r.title} className="h-20 w-14 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-bold">{r.title}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-px text-[10px] font-bold ${
                    r.published ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r.published ? "Publicada" : "Rascunho"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.kind} · {r.status} · {r.chapters?.length ?? 0} capítulos · {r.views} views · {timeAgo(r.updated_at)}
              </p>
            </div>
            <Button variant="ghost" size="icon" title={r.published ? "Despublicar" : "Publicar"} onClick={() => toggle.mutate(r)}>
              {r.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button asChild variant="outline" size="sm" className="font-semibold">
              <Link to="/admin/$id" params={{ id: r.id }}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
              </Link>
            </Button>
            {isAdmin ? (
              <ConfirmDelete
                title={`Apagar "${r.title}"?`}
                description="A obra e todos os capítulos serão apagados permanentemente."
                onConfirm={() => remove.mutate(r.id)}
              >
                <Button variant="ghost" size="icon" title="Apagar obra">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </ConfirmDelete>
            ) : null}
          </div>
        ))}
        {rows.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma obra encontrada.</p> : null}
      </div>
    </AdminShell>
  );
}
