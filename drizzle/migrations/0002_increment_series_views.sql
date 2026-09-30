CREATE OR REPLACE FUNCTION public.increment_series_views(_series_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.series SET views = views + 1 WHERE id = _series_id AND published = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_series_views(UUID) TO anon, authenticated;