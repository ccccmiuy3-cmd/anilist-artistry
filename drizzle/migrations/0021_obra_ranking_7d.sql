CREATE OR REPLACE FUNCTION public.obra_ranking(_metric text)
RETURNS TABLE (id uuid, slug text, title text, cover_url text, rating numeric, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH win AS (SELECT now() - interval '7 days' AS since)
  SELECT s.id, s.slug, s.title, s.cover_url, s.rating,
    CASE _metric
      WHEN 'views' THEN (SELECT count(*)::bigint FROM public.reading_history rh, win w WHERE rh.series_id = s.id AND rh.updated_at >= w.since)
      WHEN 'reactions' THEN (SELECT count(*)::bigint FROM public.comment_likes cl JOIN public.comments c ON c.id = cl.comment_id, win w WHERE c.series_id = s.id AND cl.created_at >= w.since)
      ELSE (SELECT count(*)::bigint FROM public.comments c, win w WHERE c.series_id = s.id AND c.created_at >= w.since)
    END AS total
  FROM public.series s
  WHERE s.published
  ORDER BY 6 DESC, s.views DESC
  LIMIT 20
$$;
GRANT EXECUTE ON FUNCTION public.obra_ranking(text) TO anon, authenticated;