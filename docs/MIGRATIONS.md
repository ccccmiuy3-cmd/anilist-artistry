# Migrations — Banco de Dados

## Fonte oficial de verdade

As migrations SQL em `drizzle/migrations/*.sql` são a **fonte oficial** do
schema e das policies de segurança. O arquivo `drizzle/schema.ts` não contém
um mirror completo (mantido apenas para consultas tipadas); não confie nele
para conhecer o estado do banco.

- Nunca altere uma migration já aplicada em produção. Crie uma nova.
- Toda migration é idempotente e data-se de "fonte de verdade": colunas,
  policies, grants e funções vêm daqui.
- Para novas migrations, adicione também o `_journal.json` (entry `idx`,
  `when` ms epoch, `tag` = nome do arquivo) seguindo as entries 0029–0032.
- Protocolo: descreva Backup no início e Rollback comentado no final.

## Checklist de segurança em toda migration

1. `SECURITY DEFINER` → sempre `SET search_path = public, pg_temp` e chamadas
   com nome completamente qualificado (`public.<tabela>`).
2. Tabelas usam RLS habilitado; policies mínimas para `anon`/`authenticated`.
3. `GRANT` apenas para os papéis realmente necessários (`service_role`,
   `authenticated`, `anon`). Nada de `GRANT ALL ... TO public`.
4. Conteúdo privado nunca é legível por `anon` (histórico, status, favoritos,
   mensagens de suporte, settings, capítulos não publicados).

## Índice

| Migração | Propósito |
| --- | --- |
| 0000 | base (roles, profiles, series, chapters, ratings, comments, storage) |
| 0001 | policies storage (leitura pública inicial) |
| 0002 | `increment_series_views` |
| 0003 | seed demo |
| 0004 | reading_status, lists, list_items, list_follows |
| 0005 | profile extras, profile_comments, user_follows |
| 0006 | xp system + proteção por `SECURITY DEFINER` e RLS |
| 0007 | `protect_profile_xp` trigger |
| 0008 | admin account management (roles, ban, policies) |
| 0009 | apertura de policies públicas (profiles/comments/ratings/storage) |
| 0010 | profile customization |
| 0011 | avatar_frames |
| 0012 | input validation (banned, comentários) |
| 0013 | leitura de scroll position |
| 0014 | comment_likes |
| 0015 | chapter_reads |
| 0016 | comment_likes_value |
| 0017 | subscription_tiers |
| 0018 | fix trigger subscription tier |
| 0019 | apertura comment_likes + leitura storage |
| 0020 | series in_slider |
| 0021 | obra_ranking (7d) |
| 0022 | event_badges |
| 0023 | event_badges_rules |
| 0024 | índices de performance |
| 0025 | support_messages |
| 0026 | apertura comment_likes + profile_badges RLS |
| 0027 | comentários com respostas (parent_id) |
| 0028 | chapters.content (novels) |
| 0029 | media_settings (Cloudinary) — sem policies ⇒ só service_role |
| 0030 | primeiro admin atômico (`claim_first_admin`, advisory lock) |
| 0031 | storage: leitura pública de folders públicos + cleanup de URLs assinadas |
| 0032 | TTS: cota persistente `tts_rate_limit` + `consume_tts_quota` |

## Revisão de RLS (06/10/2026)

Resultado da auditoria sobre policies públicas × privadas:

- `series`/`chapters`: anon lê apenas `published = true`; staff via
  `has_role('uploader'|'admin')`. ✅
- `favorites`, `reading_history`, `reading_status`, `xp_events`,
  `chapter_reads`, `comment_likes`, `support_messages`: somente o dono. ✅
- `lists`/`list_items`: anon lê apenas `is_public` (owner vê os próprios
  privados). ✅
- `profiles`, `user_follows`, `comments`, `ratings`, `profile_comments`,
  `badge_events`, `profile_badges`, `avatar_frames` (ativos): leitura pública
  deliberada. ✅
- `media_settings`, `tts_rate_limit`, `storage.objects` (folders privados):
  sem acesso anon/authenticated; apenas `service_role`. ✅

### Mudanças aplicadas nesta rodada

- **0031**: pasta pública de conteúdo (profiles, comments, frames, badges,
  library) com policy SELECT pública e `file_size_limit` + whitelist MIME;
  URLs assinadas longas convertidas para URL pública ou path puro.
- **0032**: tabela de cota TTS bloqueada para anon/authenticated (RLS com
  `using(false)`), acessível apenas via `service_role`.
- **0030**: `claim_first_admin` não exposto a `authenticated` (só
  `service_role`), com lock atômico para impedir corrida na criação do
  primeiro admin.

## Rotina de aplicação (staging/produção)

Aplicar em ordem crescente (drizzle-kit migra por `_journal.json`). Nunca
rodar migrations fora de uma rede de deploy controlada (Lovable/Cloudflare).
Backup antes: `supabase db dump` do schema + dados de referência.