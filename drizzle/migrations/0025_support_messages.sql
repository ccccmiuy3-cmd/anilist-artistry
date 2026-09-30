CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sender_id uuid NOT NULL DEFAULT auth.uid(),
  from_staff boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_user_idx ON public.support_messages (user_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read" ON public.support_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user sends own" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND ((user_id = auth.uid() AND from_staff = false)
    OR (from_staff = true AND public.has_role(auth.uid(), 'admin'))) AND char_length(body) BETWEEN 1 AND 2000);
CREATE POLICY "admin deletes" ON public.support_messages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;