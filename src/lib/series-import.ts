import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/media";

/** Gera um slug que ainda não existe no catálogo (evita erro de duplicado e títulos só em japonês). */
export async function uniqueSlug(title: string, fallback: string) {
  const base = slugify(title) || slugify(fallback) || `obra-${Date.now().toString(36)}`;
  const { data } = await supabase.from("series").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/** Retorna a obra já importada com esse ID do AniList, se existir. */
export async function findByAnilistId(anilistId?: number | null) {
  if (!anilistId) return null;
  const { data } = await supabase
    .from("series")
    .select("id, title")
    .eq("anilist_id", anilistId)
    .maybeSingle();
  return data;
}
