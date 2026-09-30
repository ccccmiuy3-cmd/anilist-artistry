ALTER TABLE public.comments ADD CONSTRAINT comments_body_len CHECK (length(btrim(body)) BETWEEN 1 AND 2000) NOT VALID;
ALTER TABLE public.lists ADD CONSTRAINT lists_title_len CHECK (length(btrim(title)) BETWEEN 1 AND 100) NOT VALID;
ALTER TABLE public.lists ADD CONSTRAINT lists_desc_len CHECK (description IS NULL OR length(description) <= 500) NOT VALID;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_len CHECK (length(username) BETWEEN 2 AND 30) NOT VALID;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_len CHECK (display_name IS NULL OR length(display_name) <= 50) NOT VALID;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_len CHECK (bio IS NULL OR length(bio) <= 500) NOT VALID;
ALTER TABLE public.chapters ADD CONSTRAINT chapters_number_range CHECK (number >= 0 AND number <= 100000) NOT VALID;
ALTER TABLE public.chapters ADD CONSTRAINT chapters_series_number_uniq UNIQUE (series_id, number);
ALTER TABLE public.avatar_frames ADD CONSTRAINT frames_url_http CHECK (image_url ~* '^https?://') NOT VALID;