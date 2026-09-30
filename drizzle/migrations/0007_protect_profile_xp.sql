CREATE OR REPLACE FUNCTION public.protect_profile_xp() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.xp := OLD.xp;
    NEW.level := OLD.level;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_protect_xp BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_xp();