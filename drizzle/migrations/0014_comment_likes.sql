CREATE TABLE public.comment_likes (
  user_id uuid NOT NULL,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT SELECT ON public.comment_likes TO anon;
GRANT ALL ON public.comment_likes TO service_role;

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment likes public read"
  ON public.comment_likes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "own comment like insert"
  ON public.comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own comment like delete"
  ON public.comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);