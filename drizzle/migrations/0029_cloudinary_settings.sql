CREATE TABLE public.media_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cloud_name text,
  api_key text,
  api_secret text,
  folder text DEFAULT 'bettermanga',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.media_settings TO service_role;
ALTER TABLE public.media_settings ENABLE ROW LEVEL SECURITY;