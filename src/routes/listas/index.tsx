import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Globe, ListOrdered, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { PageTitle, TabButton } from "@/components/LibraryBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { coverUrl } from "@/lib/media";

export const Route = createFileRoute("/listas/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Listas — Better Mangá" },
      { name: "description", content: "Organize obras em listas e descubra listas criadas pela comunidade." },
      { property: "og:title", content: "Listas — Better Mangá" },
      { property: "og:description", content: "Organize obras e descubra listas da comunidade." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bettermanga.net/listas" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://bettermanga.net/listas" }],
  }),
  component: ListasPage,
});

type ListRow = {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  list_items: { series: { cover_url: string | null } | null }[];
};

async function withAuthors(rows: ListRow[]) {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const map = new Map<string, string>();
  if (ids.length) {
    const { data } = await supabase.from("profiles").select("id, username").in("id", ids);
    for (const p of data ?? []) map.set(p.id, p.username);
  }
  return rows.map((r) => ({ ...r, author: map.get(r.user_id) ?? "leitor" }));
}

const LIST_SELECT = "id, title, user_id, created_at, list_items(series(cover_url))";

function ListasPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"publicas" | "minhas" | "seguidas">("publicas");
  const [nick, setNick] = useState("");
  const [sort, setSort] = useState("recent");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const lists = useQuery({
    queryKey: ["lists", tab, user?.id],
    enabled: tab === "publicas" || Boolean(user),
    queryFn: async () => {
      if (tab === "seguidas") {
        const { data, error } = await supabase
          .from("list_follows")
          .select(`lists!inner(${LIST_SELECT})`)
          .eq("user_id", user!.id);
        if (error) throw error;
        return withAuthors(((data ?? []) as unknown as { lists: ListRow }[]).map((r) => r.lists));
      }
      let q = supabase.from("lists").select(LIST_SELECT).order("created_at", { ascending: false }).limit(60);
      q = tab === "minhas" ? q.eq("user_id", user!.id) : q.eq("is_public", true);
      const { data, error } = await q;
      if (error) throw error;
      return withAuthors((data ?? []) as unknown as ListRow[]);
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("lists")
        .insert({ user_id: user!.id, title: title.trim(), description: desc.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setDesc("");
      setTab("minhas");
      qc.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Lista criada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const shown = (lists.data ?? [])
    .filter((l) => !nick || l.author.toLowerCase().includes(nick.replace("@", "").toLowerCase()))
    .sort((a, b) =>
      sort === "size" ? b.list_items.length - a.list_items.length : b.created_at.localeCompare(a.created_at),
    );

  const needsLogin = tab !== "publicas" && !user;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          icon={<ListOrdered className="h-7 w-7" />}
          title="Listas"
          subtitle="Organize obras e descubra listas da comunidade"
          right={
            user ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="font-semibold">
                    <Plus className="mr-2 h-4 w-4" /> Nova lista
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova lista</DialogTitle>
                  </DialogHeader>
                  <Input placeholder="Nome da lista" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
                  <Button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>
                    Criar lista
                  </Button>
                </DialogContent>
              </Dialog>
            ) : null
          }
        />

        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "publicas"} onClick={() => setTab("publicas")} icon={<Globe className="h-4 w-4" />} label="Públicas" />
          <TabButton active={tab === "minhas"} onClick={() => setTab("minhas")} icon={<ListOrdered className="h-4 w-4" />} label="Minhas" />
          <TabButton active={tab === "seguidas"} onClick={() => setTab("seguidas")} icon={<Bookmark className="h-4 w-4" />} label="Seguidas" />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Filtrar pelo @nick do criador..."
              className="h-11 bg-surface pl-9"
            />
          </div>
          <label className="text-xs text-muted-foreground">
            Ordenar por
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground sm:w-52"
            >
              <option value="recent">Recentes</option>
              <option value="size">Mais obras</option>
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {tab === "publicas" ? "Explora listas públicas da comunidade." : tab === "minhas" ? "Suas listas." : "Listas que você segue."}
        </p>

        {needsLogin ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            <Link to="/auth" className="text-primary">Entre</Link> para ver suas listas.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((l) => {
              const covers = l.list_items.map((i) => i.series?.cover_url ?? null);
              const extra = covers.length - 4;
              return (
                <Link
                  key={l.id}
                  to="/listas/$id"
                  params={{ id: l.id }}
                  className="overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary/60"
                >
                  <div className="grid aspect-[3/4] grid-cols-2 grid-rows-2 gap-px bg-border">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="relative bg-surface-2">
                        {covers[i] ? (
                          <img src={coverUrl(covers[i])} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : null}
                        {i === 3 && extra > 0 ? (
                          <span className="absolute inset-0 grid place-items-center bg-background/60 text-lg font-bold">
                            +{extra}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="p-3">
                    <p className="truncate font-bold">{l.title}</p>
                    <p className="text-xs text-muted-foreground">
                      @{l.author} · {l.list_items.length} obras
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {!needsLogin && shown.length === 0 && !lists.isLoading ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">Nenhuma lista encontrada.</p>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
