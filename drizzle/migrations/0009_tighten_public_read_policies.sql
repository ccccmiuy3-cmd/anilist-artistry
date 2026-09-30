COMMENT ON COLUMN public.profiles.username IS 'public profile field';

-- profiles: hide banned profiles instead of blanket public read
DROP POLICY IF EXISTS "profiles readable by all" ON public.profiles;
CREATE POLICY "profiles readable by all" ON public.profiles
  FOR SELECT USING (NOT banned);

-- comments: only readable on published works
DROP POLICY IF EXISTS "comments public read" ON public.comments;
CREATE POLICY "comments public read" ON public.comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.series s WHERE s.id = comments.series_id AND s.published)
  );

-- ratings: only readable on published works
DROP POLICY IF EXISTS "ratings public read" ON public.ratings;
CREATE POLICY "ratings public read" ON public.ratings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.series s WHERE s.id = ratings.series_id AND s.published)
  );

-- profile comments: only on non-banned profiles
DROP POLICY IF EXISTS "read profile comments" ON public.profile_comments;
CREATE POLICY "read profile comments" ON public.profile_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_comments.profile_id AND NOT p.banned)
  );

-- user follows: only follows targeting visible (non-banned) profiles
DROP POLICY IF EXISTS "read follows" ON public.user_follows;
CREATE POLICY "read follows" ON public.user_follows
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_follows.following_id AND NOT p.banned)
  );

-- storage: readers use stored signed URLs, so direct file reads are staff-only
DROP POLICY IF EXISTS "manga files readable" ON storage.objects;
CREATE POLICY "manga files readable" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'manga'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'uploader'))
  );