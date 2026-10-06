-- =====================================================================
-- 0031_storage_public_read_and_signed_url_cleanup.sql
-- ---------------------------------------------------------------------
-- Objetivo:
--   1. Reabrir LEITURA PÚBLICA apenas das pastas cujo conteúdo é público
--      (avatars, banners, comentários, molduras, selos, biblioteca). As
--      pastas de capítulos (privadas até a publicação) permanecem somente
--      para staff.
--   2. Impedir a criação de novos uploads fora do policy no Storage
--      (limites de tamanho e MIME no bucket).
--   3. Substituir URLs assinadas de longa duração (10 anos) gravadas no
--      banco por URLs públicas (conteúdo publico) ou por paths puros
--      (paginas de capitulos), que passam a ser assinadas na leitura com
--      TTL curto.
--
-- BACKUP / ROLLBACK:
--   * Antes de aplicar em staging/producao, tire backup (Supabase Dashboard
--     ou pg_dump). A migracao reescreve dados em:
--       public.profiles, public.avatar_frames, public.badge_events,
--       public.profile_badges, public.chapters, storage.buckets.
--   * A nova versao do codigo tolera AMBOS os formatos (path e URL legada),
--     entao o rollback primario e restaurar o backup com a versao anterior
--     do codigo; nao e preciso desfazer os dados manualmente.
--   * Nota de seguranca: tokens assinados antigos ja emitidos continuam
--     validos ate expirarem/rotacao, bandeira tratada na auditoria.
-- =====================================================================

-- 1) Leitura publica das pastas de midia publica (nunca capítulos).
DROP POLICY IF EXISTS "public media folders read" ON storage.objects;
CREATE POLICY "public media folders read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'manga'
    AND (storage.foldername(name))[1] IN ('profiles', 'comments', 'frames', 'badges', 'library')
  );

-- 2) Limites de tamanho e MIME no bucket (defesa em profundidade; a
--    validacao central no cliente e a principal barreira).
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']
WHERE id = 'manga';

-- 3) Conteudo publico: URL publica no lugar de URL assinada legada.
UPDATE public.profiles
SET avatar_url = regexp_replace(
      avatar_url,
      '/storage/v1/object/sign/manga/([^?]+).*$',
      '/storage/v1/object/public/manga/\1'
    )
WHERE avatar_url LIKE '%/storage/v1/object/sign/manga/%';

UPDATE public.profiles
SET banner_url = regexp_replace(
      banner_url,
      '/storage/v1/object/sign/manga/([^?]+).*$',
      '/storage/v1/object/public/manga/\1'
    )
WHERE banner_url LIKE '%/storage/v1/object/sign/manga/%';

UPDATE public.avatar_frames
SET image_url = regexp_replace(
      image_url,
      '/storage/v1/object/sign/manga/([^?]+).*$',
      '/storage/v1/object/public/manga/\1'
    )
WHERE image_url LIKE '%/storage/v1/object/sign/manga/%';

UPDATE public.badge_events
SET image_url = regexp_replace(
      image_url,
      '/storage/v1/object/sign/manga/([^?]+).*$',
      '/storage/v1/object/public/manga/\1'
    )
WHERE image_url LIKE '%/storage/v1/object/sign/manga/%';

UPDATE public.profile_badges
SET image_url = regexp_replace(
      image_url,
      '/storage/v1/object/sign/manga/([^?]+).*$',
      '/storage/v1/object/public/manga/\1'
    )
WHERE image_url LIKE '%/storage/v1/object/sign/manga/%';

-- 4) Paginas de capitulos: guarda somente o PATH. A URL assinada curta e
--    gerada no servidor na leitura (capitulo publicado ou staff em preve).
--    Links externos colados nao sao tocados.
UPDATE public.chapters
SET pages = (
  SELECT COALESCE(jsonb_agg(
           CASE
             WHEN (value #>> '{}') LIKE '%/storage/v1/object/sign/manga/%'
               THEN to_jsonb(
                 substring(value #>> '{}' from '/storage/v1/object/sign/manga/([^?]+)')
               )
             ELSE value
           END
           ORDER BY ordinality),
           '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(pages, '[]'::jsonb)) WITH ORDINALITY AS t(value, ordinality)
)
WHERE pages::text LIKE '%/storage/v1/object/sign/manga/%';