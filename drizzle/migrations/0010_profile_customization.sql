ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS avatar_frame text,
  ADD COLUMN IF NOT EXISTS comment_bg text,
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;