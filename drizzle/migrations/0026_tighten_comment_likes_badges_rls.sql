-- 1) comment_likes: cada usuário lê apenas os próprios votos
DROP POLICY IF EXISTS "comment likes read signed in" ON public.comment_likes;
CREATE POLICY "comment likes read own"
  ON public.comment_likes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Contagem pública de votos por comentário via função segura (sem expor quem votou)
CREATE OR REPLACE FUNCTION public.comment_vote_counts(_comment_id uuid)
RETURNS TABLE(likes bigint, dislikes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    count(*) FILTER (WHERE value > 0),
    count(*) FILTER (WHERE value < 0)
  FROM public.comment_likes
  WHERE comment_id = _comment_id
$function$;
GRANT EXECUTE ON FUNCTION public.comment_vote_counts(uuid) TO anon, authenticated;

-- 2) profile_badges: leitura pública apenas de selos de perfis não banidos
DROP POLICY IF EXISTS "profile_badges_select_public" ON public.profile_badges;
CREATE POLICY "profile_badges_select_public"
  ON public.profile_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_badges.user_id AND NOT p.banned
    )
  );

-- 3) badge_events: público vê apenas eventos ativos; admin vê todos
DROP POLICY IF EXISTS "badge events readable" ON public.badge_events;
CREATE POLICY "badge events readable"
  ON public.badge_events FOR SELECT
  USING (active OR public.has_role(auth.uid(), 'admin'));