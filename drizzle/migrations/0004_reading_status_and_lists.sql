CREATE TABLE public.reading_status (
  user_id uuid NOT NULL,
  series_id uuid NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, series_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_status TO authenticated;
GRANT ALL ON public.reading_status TO service_role;
ALTER TABLE public.reading_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own status" ON public.reading_status FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lists TO authenticated;
GRANT ALL ON public.lists TO service_role;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public lists readable" ON public.lists FOR SELECT TO anon, authenticated
  USING (is_public OR auth.uid() = user_id);
CREATE POLICY "own lists insert" ON public.lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own lists update" ON public.lists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own lists delete" ON public.lists FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.list_items (
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  series_id uuid NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, series_id)
);
GRANT SELECT ON public.list_items TO anon;
GRANT SELECT, INSERT, DELETE ON public.list_items TO authenticated;
GRANT ALL ON public.list_items TO service_role;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items readable" ON public.list_items FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.lists l WHERE l.id = list_id AND (l.is_public OR l.user_id = auth.uid())));
CREATE POLICY "own items insert" ON public.list_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.lists l WHERE l.id = list_id AND l.user_id = auth.uid()));
CREATE POLICY "own items delete" ON public.list_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lists l WHERE l.id = list_id AND l.user_id = auth.uid()));

CREATE TABLE public.list_follows (
  user_id uuid NOT NULL,
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, list_id)
);
GRANT SELECT, INSERT, DELETE ON public.list_follows TO authenticated;
GRANT ALL ON public.list_follows TO service_role;
ALTER TABLE public.list_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own follows" ON public.list_follows FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT DELETE ON public.reading_history TO authenticated;