DROP POLICY "comment likes public read" ON public.comment_likes;
CREATE POLICY "comment likes read signed in"
ON public.comment_likes FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY "comment images public read" ON storage.objects;