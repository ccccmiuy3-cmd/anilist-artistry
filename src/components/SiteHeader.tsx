import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookMarked, LogOut, Search, Shield, User2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRoles, useSession } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-0 px-3 py-2 sm:h-24 sm:flex-nowrap sm:gap-4 sm:px-4 sm:py-0">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Better Mangá — início">
          <img
            src="https://cdn.mediocrescan.com/usuarios/156358/056c603c2288529c82b19ad4906b02c7f5a67be8.webp"
            alt="Better Mangá"
            className="h-11 w-auto object-contain drop-shadow-[0_0_14px_color-mix(in_oklab,var(--primary)_45%,transparent)] sm:h-20"
          />
        </Link>

        <div className="flex-1 sm:hidden" />

        <nav className="no-scrollbar order-last flex w-full items-center justify-between gap-0.5 overflow-x-auto text-xs font-semibold sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 sm:justify-start sm:gap-1 sm:text-sm">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="whitespace-nowrap rounded-md px-2 py-2 transition-colors sm:px-3"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button
          asChild
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 rounded-full border-border bg-surface"
          aria-label="Pesquisar"
        >
          <Link to="/catalogo" search={{ q: "", kind: "Todos" }}>
            <Search className="h-4 w-4" />
          </Link>
        </Button>

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
          <img
            src="https://cdn.mediocrescan.com/usuarios/156358/056c603c2288529c82b19ad4906b02c7f5a67be8.webp"
            alt="Better Mangá"
            className="h-16 w-auto object-contain drop-shadow-[0_0_14px_color-mix(in_oklab,var(--primary)_45%,transparent)] sm:h-20"
          />
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
