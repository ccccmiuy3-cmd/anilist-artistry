CREATE TABLE public.avatar_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.avatar_frames TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.avatar_frames TO authenticated;
GRANT ALL ON public.avatar_frames TO service_role;
ALTER TABLE public.avatar_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "frames readable" ON public.avatar_frames FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert frames" ON public.avatar_frames FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update frames" ON public.avatar_frames FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete frames" ON public.avatar_frames FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));