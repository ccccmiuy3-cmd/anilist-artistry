CREATE TABLE public.chapter_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chapter_id)
);

GRANT SELECT, INSERT, DELETE ON public.chapter_reads TO authenticated;
GRANT ALL ON public.chapter_reads TO service_role;

ALTER TABLE public.chapter_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own chapter reads select" ON public.chapter_reads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own chapter reads insert" ON public.chapter_reads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own chapter reads delete" ON public.chapter_reads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);