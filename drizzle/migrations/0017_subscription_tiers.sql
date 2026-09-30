alter table public.profiles add column if not exists subscription_tier text not null default 'none';

alter table public.profiles add constraint profiles_subscription_tier_check
  check (subscription_tier in ('none','bronze','prata','ouro','diamante'));

create or replace function public.protect_subscription_tier()
returns trigger
language plpgsql
as $$
begin
  if new.subscription_tier is distinct from old.subscription_tier
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Somente administradores podem alterar o selo de assinatura';
  end if;
  return new;
end
$$;

drop trigger if exists trg_protect_subscription_tier on public.profiles;
create trigger trg_protect_subscription_tier
before update on public.profiles
for each row execute function public.protect_subscription_tier();