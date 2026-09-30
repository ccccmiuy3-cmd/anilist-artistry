CREATE TABLE public.badge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badge_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.badge_events TO authenticated;
GRANT ALL ON public.badge_events TO service_role;
ALTER TABLE public.badge_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badge events readable" ON public.badge_events FOR SELECT USING (true);
CREATE POLICY "admins insert badge events" ON public.badge_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update badge events" ON public.badge_events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete badge events" ON public.badge_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.profile_badges ADD COLUMN event_id uuid REFERENCES public.badge_events(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX profile_badges_user_event_uniq ON public.profile_badges(user_id, event_id) WHERE event_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_event_badge(_event uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ev public.badge_events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
  SELECT * INTO ev FROM public.badge_events WHERE id = _event;
  IF NOT FOUND OR NOT ev.active THEN RAISE EXCEPTION 'Este evento está encerrado'; END IF;
  INSERT INTO public.profile_badges (user_id, name, image_url, event_id, position)
  VALUES (auth.uid(), ev.name, ev.image_url, ev.id, 0)
  ON CONFLICT DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_event_badge(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_event_badge(uuid) TO authenticated;