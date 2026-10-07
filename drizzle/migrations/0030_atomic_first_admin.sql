-- 0030 Atomic first-admin claim
-- ============================================================
-- Permite que o primeiro usuário autenticado assuma o papel de admin,
-- de forma ATÔMICA: um lock de aplicação garante que dois pedidos
-- simultâneos nunca criem dois admins (corrige corrida do claimFirstAdmin).
--
-- Backup: nenhum dado existente é alterado.
-- Rollback: drop function public.claim_first_admin(uuid);

create or replace function public.claim_first_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_have_admin boolean;
begin
  if p_user_id is null then
    return false;
  end if;

  -- Serializa o "primeiro admin": só uma transação passa por aqui por vez.
  perform pg_advisory_xact_lock(hashtext('better_manga_first_admin_v1'));

  select exists (
    select 1 from public.user_roles where role = 'admin'
  ) into v_have_admin;

  if v_have_admin then
    return false;
  end if;

  insert into public.user_roles (user_id, role)
  values (p_user_id, 'admin');

  return true;
end;
$$;

-- Somente o service role (servidor) pode executar: nunca fica exposto a
-- usuários autenticados/anônimos via API.
grant execute on function public.claim_first_admin(uuid) to service_role;

-- ============================================================
-- Rollback:
--   drop function if exists public.claim_first_admin(uuid);