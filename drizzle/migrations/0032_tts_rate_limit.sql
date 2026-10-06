-- 0032 TTS quota and rate limit
-- ============================================================
-- Objetivo: limitar o uso da narração por IA (API /api/tts), que
-- consome créditos pagos. O limite é persistente por usuário, em
-- janelas de 1 minuto e por dia (UTC), para sobreviver a múltiplos
-- processos/instâncias e a reinicializações.
--
-- Tune via env vars no servidor (sem alterar o frontend):
--   TTS_MAX_CHARS            (padrão 1200)
--   TTS_PER_MINUTE_REQUESTS  (padrão 20)
--   TTS_PER_MINUTE_CHARS     (padrão 6000)
--   TTS_PER_DAY_CHARS        (padrão 60000)
--
-- Backup: nenhum dado existente é modificado (apenas creation).
-- Rollback: DROP TABLE + DROP FUNCTION abaixo (ao final do arquivo).

create table public.tts_rate_limit (
  user_id uuid primary key references auth.users (id) on delete cascade,
  minute_start timestamptz not null default now(),
  minute_requests integer not null default 0,
  minute_chars integer not null default 0,
  day date not null,
  day_chars integer not null default 0,
  updated_at timestamptz not null default now()
);
comment on table public.tts_rate_limit is
  'Contador de uso da narração por IA, por usuário (janelas de 1 min e 1 dia).';

alter table public.tts_rate_limit enable row level security;
-- Nenhum role autenticado/anônimo acessa a tabela diretamente:
create policy "no_tts_rate_limit_direct_access"
  on public.tts_rate_limit
  for all
  to authenticated
  using (false)
  with check (false);
create policy "no_tts_rate_limit_direct_access_anon"
  on public.tts_rate_limit
  for all
  to anon
  using (false)
  with check (false);

grant select, insert, update on public.tts_rate_limit to service_role;

-- ------------------------------------------------------------------
create or replace function public.consume_tts_quota(
  p_user_id uuid,
  p_chars integer,
  p_max_minute_requests integer,
  p_max_minute_chars integer,
  p_max_day_chars integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
set statement_timeout = '3s'
as $$
declare
  rec public.tts_rate_limit%rowtype;
  v_now timestamptz := clock_timestamp();
  v_day date := (timezone('utc', v_now))::date;
  v_allowed boolean;
begin
  if p_chars < 0 then
    raise exception 'p_chars inválido';
  end if;

  -- Serializa por usuário e cria a linha na primeira chamada, resistindo a corrida.
  loop
    select *
      into rec
      from public.tts_rate_limit
     where user_id = p_user_id
     for update;

    if found then
      exit;
    end if;

    begin
      insert into public.tts_rate_limit (user_id, minute_start, minute_requests, minute_chars, day, day_chars)
      values (p_user_id, v_now, 1, greatest(p_chars, 0), v_day, greatest(p_chars, 0));
      return 1 <= p_max_minute_requests
         and greatest(p_chars, 0) <= p_max_minute_chars
         and greatest(p_chars, 0) <= p_max_day_chars;
    exception when unique_violation then
      -- outro processo inseriu a linha entre o select e o insert; repete.
    end;
  end loop;

  -- Janela de 1 minuto.
  if rec.minute_start < v_now - interval '1 minute' then
    rec.minute_start := v_now;
    rec.minute_requests := 1;
    rec.minute_chars := greatest(p_chars, 0);
  else
    rec.minute_requests := rec.minute_requests + 1;
    rec.minute_chars := rec.minute_chars + greatest(p_chars, 0);
  end if;

  -- Mudou de dia (UTC).
  if rec.day <> v_day then
    rec.day := v_day;
    rec.day_chars := greatest(p_chars, 0);
  else
    rec.day_chars := rec.day_chars + greatest(p_chars, 0);
  end if;

  v_allowed := rec.minute_requests <= p_max_minute_requests
           and rec.minute_chars <= p_max_minute_chars
           and rec.day_chars <= p_max_day_chars;

  -- Persiste sempre (inclusive tentativas recusadas): evita que tentativas
  -- dentro da mesma janela ignorem o limite.
  update public.tts_rate_limit
     set minute_start = rec.minute_start,
         minute_requests = rec.minute_requests,
         minute_chars = rec.minute_chars,
         day = rec.day,
         day_chars = rec.day_chars,
         updated_at = v_now
   where user_id = p_user_id;

  return v_allowed;
end;
$$;

grant execute on function public.consume_tts_quota(uuid, integer, integer, integer, integer) to service_role;

-- Índices auxiliares (limpeza de linhas antigas).
create index if not exists tts_rate_limit_day_idx on public.tts_rate_limit (day);

-- ============================================================
-- Rollback:
--   drop function if exists public.consume_tts_quota(uuid, integer, integer, integer, integer);
--   drop table if exists public.tts_rate_limit;