import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  Crown,
  FileText,
  Frame,
  Heart,
  History,
  ImageIcon,
  Library,
  ListOrdered,
  Lock,
  MessageSquare,
  Palette,
  Pencil,
  Send,
  Trash2,
  User2,
  UserPlus,
  Users,
  X,
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
import { FramedAvatar } from "@/components/FramedAvatar";

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
        .select("id, username, display_name, bio, avatar_url, banner_url, level, xp, created_at, accent_color, avatar_frame, comment_bg, is_private")
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
      if (stats.data?.iFollow) { const { error: dbErr } = await supabase.from("user_follows").delete().eq("follower_id", user!.id).eq("following_id", p!.id); if (dbErr) throw dbErr; }
      else { const { error: dbErr } = await supabase.from("user_follows").insert({ follower_id: user!.id, following_id: p!.id }); if (dbErr) throw dbErr; }
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
      { const { error: dbErr } = await supabase.from("profile_comments").delete().eq("id", id); if (dbErr) throw dbErr; }
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
            <FramedAvatar src={p.avatar_url} frame={p.avatar_frame} size={144} />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold" style={{ color: p.accent_color ?? "var(--primary)" }}>@{p.username}</h1>
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
                <li
                  key={c.id}
                  className="flex gap-3 rounded-xl p-3"
                  style={p.comment_bg ? { background: p.comment_bg } : undefined}
                >
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

const ACCENT_COLORS = ["#22d3ee", "#f97316", "#a78bfa", "#4ade80", "#f472b6", "#facc15", "#f87171", "#60a5fa"];

const FRAMES = [
  { id: "none", label: "Sem moldura", color: "var(--border)" },
  { id: "cyan", label: "Ciano", color: "#22d3ee" },
  { id: "gold", label: "Ouro", color: "#facc15" },
  { id: "fire", label: "Fogo", color: "#f97316" },
  { id: "sakura", label: "Sakura", color: "#f472b6" },
  { id: "violet", label: "Violeta", color: "#a78bfa" },
];

function frameColor(frame?: string | null) {
  return FRAMES.find((f) => f.id === frame)?.color ?? "var(--primary)";
}

const COMMENT_BGS = [
  { id: "", label: "Padrão", value: "" },
  { id: "blue", label: "Azul noturno", value: "linear-gradient(135deg, rgba(34,211,238,.12), rgba(96,165,250,.06))" },
  { id: "purple", label: "Violeta", value: "linear-gradient(135deg, rgba(167,139,250,.14), rgba(244,114,182,.06))" },
  { id: "green", label: "Verde", value: "linear-gradient(135deg, rgba(74,222,128,.12), rgba(34,211,238,.05))" },
  { id: "fire", label: "Fogo", value: "linear-gradient(135deg, rgba(249,115,22,.14), rgba(250,204,21,.05))" },
];

type EditScreen = "main" | "identidade" | "cores" | "moldura" | "fundo" | "privacidade";

type EditableProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  level: number;
  accent_color: string | null;
  avatar_frame: string | null;
  comment_bg: string | null;
  is_private: boolean;
};

function EditProfile({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: EditableProfile;
}) {
  const qc = useQueryClient();
  const [screen, setScreen] = useState<EditScreen>("main");
  const [form, setForm] = useState({
    username: profile.username,
    display_name: profile.display_name ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
    banner_url: profile.banner_url ?? "",
    accent_color: profile.accent_color ?? "",
    avatar_frame: profile.avatar_frame ?? "",
    comment_bg: profile.comment_bg ?? "",
    is_private: profile.is_private,
  });
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [framePage, setFramePage] = useState(0);
  const { data: frames } = useQuery({
    queryKey: ["avatar-frames"],
    queryFn: async () => {
      const { data, error } = await supabase.from("avatar_frames").select("id, name, image_url").eq("active", true).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const save = useMutation({
    mutationFn: async (patch: Partial<typeof form>) => {
      const next = { ...form, ...patch };
      const { error } = await supabase
        .from("profiles")
        .update({
          username: next.username.trim() || profile.username,
          display_name: next.display_name || null,
          bio: next.bio || null,
          avatar_url: next.avatar_url || null,
          banner_url: next.banner_url || null,
          accent_color: next.accent_color || null,
          avatar_frame: next.avatar_frame || null,
          comment_bg: next.comment_bg || null,
          is_private: next.is_private,
        })
        .eq("id", profile.id);
      if (error) throw error;
      setForm(next);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["public-profile"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil atualizado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  async function upload(kind: "avatar" | "banner", file: File) {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Imagem maior que 20 MB");
      return;
    }
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `profiles/${profile.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("manga").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from("manga").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (!data?.signedUrl) throw new Error("Falha ao gerar link da imagem");
      save.mutate({ [kind === "avatar" ? "avatar_url" : "banner_url"]: data.signedUrl });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload — tente colar um link de imagem");
    } finally {
      setUploading(null);
    }
  }

  const accent = form.accent_color || "var(--primary)";

  const menuItems: { id: EditScreen; label: string; icon: typeof FileText; value?: string }[] = [
    { id: "identidade", label: "Nome, nick e bio", icon: FileText },
    { id: "cores", label: "Cores do menu", icon: Palette },
    { id: "moldura", label: "Moldura do avatar", icon: Frame },
    { id: "fundo", label: "Fundo nos comentários", icon: ImageIcon },
    { id: "privacidade", label: "Privacidade", icon: Lock, value: form.is_private ? "Privado" : "Público" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setScreen("main");
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 [&>button:last-child]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between px-4 pt-4">
          {screen === "main" ? (
            <button
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold hover:bg-surface"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
          ) : (
            <button
              onClick={() => setScreen("main")}
              className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold hover:bg-surface"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 hover:bg-surface"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {screen === "main" ? (
          <>
            <div className="relative mx-4 mt-4 h-32 overflow-hidden rounded-xl bg-surface-2">
              {form.banner_url ? (
                <img src={form.banner_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,var(--primary),transparent_70%)] opacity-30" />
              )}
              <button
                onClick={() => bannerInput.current?.click()}
                className="absolute inset-0 grid place-items-center bg-black/40 text-sm font-semibold opacity-0 transition hover:opacity-100"
              >
                <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> {uploading === "banner" ? "Enviando…" : "Alterar banner"}</span>
              </button>
              <input
                ref={bannerInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload("banner", f);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="-mt-10 ml-8 relative h-20 w-20">
              <FramedAvatar src={form.avatar_url} frame={form.avatar_frame || null} size={80} />
              <button
                onClick={() => avatarInput.current?.click()}
                className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-[11px] font-semibold opacity-0 transition hover:opacity-100"
              >
                <span className="flex flex-col items-center gap-0.5"><Camera className="h-4 w-4" /> {uploading === "avatar" ? "…" : "Foto"}</span>
              </button>
              <input
                ref={avatarInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload("avatar", f);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="mt-3 px-6">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                {form.display_name || form.username}
                <span className="rounded border border-border px-1.5 text-xs font-bold text-muted-foreground">Nv. {profile.level}</span>
              </p>
              <p className="text-sm" style={{ color: accent }}>@{form.username}</p>
            </div>

            <p className="mt-5 px-6 text-xs font-bold tracking-widest text-muted-foreground">EDITAR PERFIL</p>
            <nav className="mt-2 space-y-2 px-4 pb-4">
              {menuItems.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setScreen(m.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-sm font-semibold hover:bg-surface-2"
                >
                  <m.icon className="h-4 w-4" style={{ color: accent }} /> {m.label}
                  {m.value ? <span className="ml-auto text-xs font-normal text-muted-foreground">{m.value}</span> : null}
                  <ChevronRight className={`h-4 w-4 ${m.value ? "" : "ml-auto"}`} style={{ color: accent }} />
                </button>
              ))}
            </nav>
          </>
        ) : null}

        {screen === "identidade" ? (
          <div className="space-y-3 px-6 py-5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground">NOME, NICK E BIO</p>
            <label className="block text-xs text-muted-foreground">
              Nome de exibição
              <Input className="mt-1" maxLength={50} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </label>
            <label className="block text-xs text-muted-foreground">
              Nick (@usuário)
              <Input
                className="mt-1"
                maxLength={30}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_.-]/g, "") })}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Bio
              <Textarea className="mt-1 min-h-24" maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </label>
            <label className="block text-xs text-muted-foreground">
              Link do avatar (ou toque na foto na tela anterior)
              <Input className="mt-1" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
            </label>
            <label className="block text-xs text-muted-foreground">
              Link do banner
              <Input className="mt-1" value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} />
            </label>
            <Button className="w-full" disabled={save.isPending || !form.username.trim()} onClick={() => save.mutate({}, { onSuccess: () => setScreen("main") })}>
              Salvar
            </Button>
          </div>
        ) : null}

        {screen === "cores" ? (
          <div className="space-y-4 px-6 py-5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground">CORES DO MENU</p>
            <div className="grid grid-cols-4 gap-3">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => save.mutate({ accent_color: c })}
                  className={`h-12 rounded-xl border-2 transition ${form.accent_color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => save.mutate({ accent_color: "" })}>
              Voltar à cor padrão
            </Button>
          </div>
        ) : null}

        {screen === "moldura" ? (
          <div className="space-y-4 px-6 py-5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground">MOLDURA</p>
            {(() => {
              const all = [
                { id: "none", name: "Sem moldura", image_url: "" },
                ...(frames ?? []),
              ];
              const perPage = 9;
              const pageCount = Math.max(1, Math.ceil(all.length / perPage));
              const page = Math.min(framePage, pageCount - 1);
              const items = all.slice(page * perPage, page * perPage + perPage);
              return (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {items.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => save.mutate({ avatar_frame: f.image_url })}
                        className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 text-xs transition ${form.avatar_frame === f.image_url || (!form.avatar_frame && !f.image_url) ? "border-primary bg-surface-2" : "border-border bg-surface hover:border-muted-foreground/40"}`}
                      >
                        {f.image_url ? (
                          <img src={f.image_url} alt="" loading="lazy" className="h-16 w-16 object-contain" />
                        ) : (
                          <span className="h-16 w-16 rounded-full border-2 border-dashed border-border" />
                        )}
                        <span className="line-clamp-1">{f.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setFramePage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface disabled:opacity-40"
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-bold tabular-nums">
                      {page + 1} / {pageCount}
                    </span>
                    <button
                      onClick={() => setFramePage(Math.min(pageCount - 1, page + 1))}
                      disabled={page >= pageCount - 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface disabled:opacity-40"
                      aria-label="Próxima página"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setScreen("main")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                </>
              );
            })()}
          </div>
        ) : null}

        {screen === "fundo" ? (
          <div className="space-y-4 px-6 py-5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground">FUNDO NOS COMENTÁRIOS</p>
            <div className="space-y-2">
              {COMMENT_BGS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => save.mutate({ comment_bg: b.value })}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-sm ${form.comment_bg === b.value ? "border-primary" : "border-border"}`}
                >
                  <span className="h-10 w-16 rounded-lg bg-surface-2" style={b.value ? { background: b.value } : undefined} />
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {screen === "privacidade" ? (
          <div className="space-y-4 px-6 py-5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground">PRIVACIDADE</p>
            {[
              { v: false, label: "Público", desc: "Qualquer pessoa pode ver seu perfil, favoritos e comentários." },
              { v: true, label: "Privado", desc: "Seu perfil fica discreto e só você gerencia quem interage." },
            ].map((o) => (
              <button
                key={o.label}
                onClick={() => save.mutate({ is_private: o.v })}
                className={`w-full rounded-xl border p-4 text-left ${form.is_private === o.v ? "border-primary bg-surface-2" : "border-border bg-surface"}`}
              >
                <p className="flex items-center gap-2 text-sm font-bold"><Lock className="h-4 w-4" style={{ color: accent }} /> {o.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{o.desc}</p>
              </button>
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
