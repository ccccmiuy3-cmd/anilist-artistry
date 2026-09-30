ALTER TABLE public.chapters ADD COLUMN content text;
COMMENT ON COLUMN public.chapters.content IS 'Texto do capítulo para obras do tipo Novel (leitura em modo texto).';
