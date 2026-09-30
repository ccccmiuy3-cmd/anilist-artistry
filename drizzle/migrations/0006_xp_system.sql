CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL,
  reason text NOT NULL,
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reason, ref_id)
);
GRANT SELECT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own xp events" ON public.xp_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX xp_events_created_idx ON public.xp_events (created_at);

CREATE OR REPLACE FUNCTION public.award_xp(_user uuid, _amount int, _reason text, _ref uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted int;
BEGIN
  INSERT INTO public.xp_events (user_id, amount, reason, ref_id)
  VALUES (_user, _amount, _reason, _ref) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted > 0 THEN
    UPDATE public.profiles SET xp = xp + _amount, level = 1 + ((xp + _amount) / 1000) WHERE id = _user;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid,int,text,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.xp_on_read() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.chapter_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.chapter_id IS DISTINCT FROM OLD.chapter_id) THEN
    PERFORM public.award_xp(NEW.user_id, 50, 'chapter', NEW.chapter_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reading_history_xp AFTER INSERT OR UPDATE ON public.reading_history
FOR EACH ROW EXECUTE FUNCTION public.xp_on_read();

CREATE OR REPLACE FUNCTION public.xp_on_comment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp(NEW.user_id, 10, 'comment', NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER comments_xp AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.xp_on_comment();

CREATE OR REPLACE FUNCTION public.xp_ranking(_period text)
RETURNS TABLE (id uuid, username text, avatar_url text, level int, xp bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH bounds AS (
    SELECT date_trunc('week', now()) AS wk
  )
  SELECT p.id, p.username, p.avatar_url, p.level,
    CASE WHEN _period = 'total' THEN p.xp::bigint ELSE COALESCE(s.total, 0) END AS xp
  FROM public.profiles p
  LEFT JOIN (
    SELECT e.user_id, SUM(e.amount)::bigint AS total
    FROM public.xp_events e, bounds b
    WHERE (_period = 'weekly' AND e.created_at >= b.wk)
       OR (_period = 'snapshot' AND e.created_at >= b.wk - interval '7 days' AND e.created_at < b.wk)
    GROUP BY e.user_id
  ) s ON s.user_id = p.id
  WHERE _period = 'total' OR s.total > 0
  ORDER BY xp DESC
  LIMIT 50
$$;
GRANT EXECUTE ON FUNCTION public.xp_ranking(text) TO anon, authenticated;