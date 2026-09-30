CREATE POLICY "manga files readable" ON storage.objects FOR SELECT
  USING (bucket_id = 'manga');

CREATE POLICY "staff upload manga files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manga' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'uploader')));

CREATE POLICY "staff update manga files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'manga' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'uploader')));

CREATE POLICY "staff delete manga files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'manga' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'uploader')));