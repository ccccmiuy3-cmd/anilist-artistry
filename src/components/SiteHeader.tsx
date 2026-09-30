import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookMarked, LogOut, Search, Shield, User2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRoles, useSession } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Início" },
    { to: "/biblioteca", label: "Coleção" },
  { to: "/listas", label: "Listas" },
  { to: "/ranking", label: "Ranking" },
  { to: "/historico", label: "Histórico" },
  { to: "/catalogo", label: "Pesquisar" },
] as const;

export function SiteHeader() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { isStaff } = useRoles(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="https://cdn.mediocrescan.com/usuarios/156358/056c603c2288529c82b19ad4906b02c7f5a67be8.webp"
            alt="Better Mangá"
            className="h-7 w-auto object-contain drop-shadow-[0_0_10px_color-mix(in_oklab,var(--primary)_35%,transparent)] sm:h-8"
          />
        </Link>

        <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto text-sm font-semibold">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="whitespace-nowrap rounded-md px-3 py-2 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ to: "/catalogo", search: { q: term, kind: "Todos" } });
          }}
          className="relative hidden md:block"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Pesquisar"
            className="w-52 rounded-full border-border bg-surface pl-9"
          />
        </form>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-sm font-semibold">
                <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-surface-2">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
                <span className="hidden max-w-24 truncate sm:block">
                  {profile?.username ?? "leitor"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/u/$username" params={{ username: profile?.username ?? "" }} className="flex items-center gap-2">
                  <User2 className="h-4 w-4" /> Meu perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/biblioteca" className="flex items-center gap-2">
                  <BookMarked className="h-4 w-4" /> Minha biblioteca
                </Link>
              </DropdownMenuItem>
              {isStaff ? (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Painel
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="sm" className="rounded-full font-semibold">
            <Link to="/auth">Entrar</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 bg-surface/50">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-base font-bold text-primary">MangaVerso</p>
          <p>© {new Date().getFullYear()} — leitura de mangás, manhwas e comics</p>
        </div>
        <div className="flex gap-4">
          <Link to="/catalogo" search={{ q: "", kind: "Todos" }} className="hover:text-foreground">
            Coleção
          </Link>
          <Link to="/ranking" className="hover:text-foreground">
            Ranking
          </Link>
        </div>
      </div>
    </footer>
  );
}
