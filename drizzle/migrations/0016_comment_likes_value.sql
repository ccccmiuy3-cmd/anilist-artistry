ALTER TABLE public.comment_likes ADD COLUMN IF NOT EXISTS value smallint NOT NULL DEFAULT 1;
ALTER TABLE public.comment_likes DROP CONSTRAINT IF EXISTS comment_likes_value_check;
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_value_check CHECK (value IN (1, -1));