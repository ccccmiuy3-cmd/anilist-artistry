ALTER TABLE public.badge_events ADD COLUMN ends_at timestamptz, ADD COLUMN required_chapters integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.event_badge_progress(_event uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT count(*)::int FROM public.chapter_reads r, public.badge_events e
  WHERE e.id = _event AND r.user_id = auth.uid() AND r.created_at >= e.created_at
    AND (e.ends_at IS NULL OR r.created_at <= e.ends_at)
$$;
REVOKE EXECUTE ON FUNCTION public.event_badge_progress(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.event_badge_progress(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_event_badge(_event uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ev public.badge_events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
  SELECT * INTO ev FROM public.badge_events WHERE id = _event;
  IF NOT FOUND OR NOT ev.active OR (ev.ends_at IS NOT NULL AND now() > ev.ends_at) THEN
    RAISE EXCEPTION 'Este evento está encerrado';
  END IF;
  IF public.event_badge_progress(_event) < ev.required_chapters THEN
    RAISE EXCEPTION 'Leia % capítulos durante o evento para ganhar o selo', ev.required_chapters;
  END IF;
  INSERT INTO public.profile_badges (user_id, name, image_url, event_id, position)
  VALUES (auth.uid(), ev.name, ev.image_url, ev.id, 0)
  ON CONFLICT DO NOTHING;
END $$;