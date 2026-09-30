import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ChevronRight,
  Crown,
  Heart,
  History,
  Library,
  ListOrdered,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  User2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { coverUrl, timeAgo } from "@/lib/media";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — MangaVerso` },
      { name: "description", content: `Perfil de @${params.username} no MangaVerso: favoritos, listas e comentários.` },
      { property: "og:title", content: `@${params.username} — MangaVerso` },
      { property: "og:description", content: "Perfil de leitor no MangaVerso." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Perfil,
});

const PLANS = [
  { name: "Bronze", price: "R$ 4,99", period: "7 dias", desc: "Sem anúncios e acesso antecipado para experimentar a plataforma." },
  { name: "Prata", price: "R$ 7,99", period: "30 dias", desc: "Uma experiência melhor para continuar acompanhando tudo." },
  { name: "Ouro", price: "R$ 23,99", period: "90 dias", desc: "A escolha de quem quer a melhor experiência completa." },
];

function Perfil() {
  const { username } = Route.useParams();
  const { user } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"planos" | "favoritos">("planos");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);

  const profile = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, banner_url, level, xp, created_at")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const p = profile.data;
  const isMe = Boolean(user && p && user.id === p.id);

  const stats = useQuery({
    queryKey: ["profile-stats", p?.id, user?.id],
    enabled: Boolean(p),
    queryFn: async () => {
      const [followers, following, favs, mine] = await Promise.all([
        supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", p!.id),
        supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", p!.id),
        supabase.from("favorites").select("series(id, slug, title, cover_url)").eq("user_id", p!.id).limit(24),
        user
          ? supabase.from("user_follows").select("follower_id").eq("follower_id", user.id).eq("following_id", p!.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        followers: followers.count ?? 0,
        following: following.count ?? 0,
        favorites: ((favs.data ?? []) as unknown as { series: { id: string; slug: string; title: string; cover_url: string | null } | null }[])
          .map((f) => f.series)
          .filter((x): x is NonNullable<typeof x> => Boolean(x)),
        iFollow: Boolean(mine.data),
      };
    },
  });

  const comments = useQuery({
    queryKey: ["profile-comments", p?.id],
    enabled: Boolean(p),
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_comments")
        .select("id, body, created_at, author_id")
        .eq("profile_id", p!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.author_id))];
      const map = new Map<string, { username: string; avatar_url: string | null; level: number }>();
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, username, avatar_url, level").in("id", ids);
        for (const x of ps ?? []) map.set(x.id, x);
      }
      return rows.map((r) => ({ ...r, author: map.get(r.author_id) }));
    },
  });

  const follow = useMutation({
    mutationFn: async () => {
      if (stats.data?.iFollow) await supabase.from("user_follows").delete().eq("follower_id", user!.id).eq("following_id", p!.id);
      else await supabase.from("user_follows").insert({ follower_id: user!.id, following_id: p!.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile-stats"] }),
  });

  const post = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profile_comments").insert({ profile_id: p!.id, author_id: user!.id, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["profile-comments"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("profile_comments").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile-comments"] }),
  });

  if (profile.isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">Carregando…</p>
      </div>
    );
  }
  if (!p) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">Perfil não encontrado.</p>
      </div>
    );
  }

  const xpGoal = Math.max(1000, (p.level + 1) * 1000);
  const menu = isMe
    ? [
        { to: "/biblioteca", label: "Coleção", icon: Library },
        { to: "/listas", label: "Minhas listas", icon: ListOrdered },
        { to: "/historico", label: "Histórico", icon: History },
      ]
    : [];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-10">
        <div className="relative h-48 overflow-hidden rounded-b-2xl bg-surface sm:h-64">
          {p.banner_url ? (
            <img src={p.banner_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,var(--primary),transparent_70%)] opacity-30" />
          )}
          <span className="cover-fade" />
        </div>

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="-mt-20 relative">
            <div className="h-36 w-36 overflow-hidden rounded-full border-4 border-background bg-surface-2 ring-2 ring-primary">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center"><User2 className="h-12 w-12 text-muted-foreground" /></div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-primary">@{p.username}</h1>
              <span className="rounded border border-border px-1.5 text-xs font-bold text-muted-foreground">Nv. {p.level}</span>
            </div>
            {p.display_name ? <p className="text-sm text-muted-foreground">{p.display_name}</p> : null}
            {p.bio ? <p className="mt-2 text-sm">{p.bio}</p> : null}
            <div className="mt-4 flex gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /><b className="text-foreground">{stats.data?.followers ?? 0}</b> seguidores</span>
              <span className="flex items-center gap-1"><User2 className="h-4 w-4" /><b className="text-foreground">{stats.data?.following ?? 0}</b> seguindo</span>
            </div>
            <p className="mt-3 flex items-center gap-1 text-sm">
              {p.xp.toLocaleString("pt-BR")}/{xpGoal.toLocaleString("pt-BR")} XP <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, (p.xp / xpGoal) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Membro desde {new Date(p.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
            </p>

            {!isMe && user ? (
              <Button className="mt-4 w-full" variant={stats.data?.iFollow ? "outline" : "default"} onClick={() => follow.mutate()}>
                <UserPlus className="mr-2 h-4 w-4" /> {stats.data?.iFollow ? "Seguindo" : "Seguir"}
              </Button>
            ) : null}

            {isMe ? (
              <nav className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
                {menu.map((m) => (
                  <Link key={m.to} to={m.to} className="flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm hover:bg-surface-2">
                    <m.icon className="h-4 w-4 text-primary" /> {m.label}
                    <ChevronRight className="ml-auto h-4 w-4 text-primary" />
                  </Link>
                ))}
                <button onClick={() => setEditing(true)} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm hover:bg-surface-2">
                  <Pencil className="h-4 w-4 text-primary" /> Editar perfil
                  <ChevronRight className="ml-auto h-4 w-4 text-primary" />
                </button>
              </nav>
            ) : null}
          </aside>

          <section className="pt-6">
            <div className="flex gap-2">
              <button
                onClick={() => setTab("planos")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === "planos" ? "bg-primary/20 text-primary" : "bg-surface-2"}`}
              >
                <Crown className="h-4 w-4" /> Planos VIP
              </button>
              <button
                onClick={() => setTab("favoritos")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === "favoritos" ? "bg-primary/20 text-primary" : "bg-surface-2"}`}
              >
                <Heart className="h-4 w-4" /> Favoritos ({stats.data?.favorites.length ?? 0})
              </button>
            </div>

            {tab === "planos" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {PLANS.map((pl) => (
                  <div key={pl.name} className="rounded-xl border border-border bg-surface p-5">
                    <p className="flex items-center gap-2 font-display text-lg font-bold">
                      <Crown className="h-5 w-5 text-gold" /> {pl.name}
                    </p>
                    <p className="mt-1 text-sm">
                      <b>{pl.price}</b> <span className="text-muted-foreground">/ {pl.period}</span>
                    </p>
                    <p className="mt-3 min-h-10 text-xs text-muted-foreground">{pl.desc}</p>
                    <Button className="mt-4 w-full font-bold" onClick={() => toast.info("Pagamentos em breve!")}>
                      Assinar Agora
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {(stats.data?.favorites ?? []).map((f) => (
                  <Link key={f.id} to="/obra/$slug" params={{ slug: f.slug }} title={f.title}>
                    <img src={coverUrl(f.cover_url)} alt={f.title} className="aspect-[2/3] w-full rounded-lg border border-border object-cover" />
                  </Link>
                ))}
                {stats.data?.favorites.length === 0 ? <p className="col-span-full text-sm text-muted-foreground">Sem favoritos ainda.</p> : null}
              </div>
            )}

            <h2 className="mt-10 flex items-center gap-2 font-display text-lg font-bold">
              <MessageSquare className="h-5 w-5 text-primary" /> Comentários do perfil
            </h2>
            {user ? (
              <div className="mt-4 rounded-xl border border-border bg-surface p-4">
                <Textarea
                  value={body}
                  maxLength={2000}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={isMe ? "Comentar no seu perfil..." : `Comentar no perfil de @${p.username}...`}
                  className="min-h-20 border-none bg-transparent p-0 focus-visible:ring-0"
                />
                <div className="mt-2 flex items-center justify-end gap-3">
                  <span className="text-xs text-muted-foreground">{body.length}/2000</span>
                  <Button size="sm" disabled={!body.trim() || post.isPending} onClick={() => post.mutate()}>
                    <Send className="mr-2 h-4 w-4" /> Comentar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground"><Link to="/auth" className="text-primary">Entre</Link> para comentar.</p>
            )}
            <ul className="mt-6 space-y-5">
              {(comments.data ?? []).map((c) => (
                <li key={c.id} className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-sm font-bold">
                    {c.author?.avatar_url ? <img src={c.author.avatar_url} alt="" className="h-full w-full object-cover" /> : (c.author?.username ?? "?")[0]?.toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Link to="/u/$username" params={{ username: c.author?.username ?? "" }} className="text-sm font-bold hover:text-primary">
                        {c.author?.username ?? "leitor"}
                        <span className="ml-2 rounded border border-border px-1 text-[10px] text-muted-foreground">Nv. {c.author?.level ?? 1}</span>
                      </Link>
                      <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{c.body}</p>
                    {user && (user.id === c.author_id || isMe) ? (
                      <button onClick={() => del.mutate(c.id)} className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <Trash2 className="h-3 w-3" /> Excluir
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      {isMe ? <EditProfile open={editing} onOpenChange={setEditing} profile={p} /> : null}
      <SiteFooter />
    </div>
  );
}

function EditProfile({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: { id: string; display_name: string | null; bio: string | null; avatar_url: string | null; banner_url: string | null };
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    display_name: profile.display_name ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
    banner_url: profile.banner_url ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name || null,
          bio: form.bio || null,
          avatar_url: form.avatar_url || null,
          banner_url: form.banner_url || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["public-profile"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      onOpenChange(false);
      toast.success("Perfil atualizado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar perfil</DialogTitle></DialogHeader>
        <Input placeholder="Nome de exibição" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        <Textarea placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <Input placeholder="URL do avatar" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
        <Input placeholder="URL do banner" value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} />
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
      </DialogContent>
    </Dialog>
  );
}
