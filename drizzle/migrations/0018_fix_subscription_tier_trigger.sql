create or replace function public.protect_subscription_tier()
returns trigger
language plpgsql
as $$
begin
  if new.subscription_tier is distinct from old.subscription_tier
     and auth.uid() is not null
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Somente administradores podem alterar o selo de assinatura';
  end if;
  return new;
end
$$;