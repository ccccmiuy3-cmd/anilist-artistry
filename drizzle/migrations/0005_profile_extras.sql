ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text, ADD COLUMN IF NOT EXISTS bio text, ADD COLUMN IF NOT EXISTS banner_url text, ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;

CREATE TABLE public.profile_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profile_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.profile_comments TO authenticated;
GRANT ALL ON public.profile_comments TO service_role;
ALTER TABLE public.profile_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read profile comments" ON public.profile_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "write own profile comment" ON public.profile_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND length(body) BETWEEN 1 AND 2000);
CREATE POLICY "delete own or on own profile" ON public.profile_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR auth.uid() = profile_id);

CREATE TABLE public.user_follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
GRANT SELECT ON public.user_follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read follows" ON public.user_follows FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "own follow insert" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);
CREATE POLICY "own follow delete" ON public.user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);