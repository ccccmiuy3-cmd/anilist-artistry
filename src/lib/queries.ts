import { supabase } from "@/integrations/supabase/client";

export const KINDS = [
  "Comic",
  "Manga",
  "Manhwa",
  "Manhua",
  "Shoujo",
  "Yaoi",
  "Yuri",
  "Novel",
] as const;

export type ChapterLite = {
  id: string;
  number: number;
  title: string | null;
  created_at: string;
};

export type SeriesRow = {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  kind: string;
  status: string;
  rating: number;
  views: number;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  chapters: ChapterLite[];
};

const SERIES_SELECT =
  "id, slug, title, cover_url, kind, status, rating, views, pinned, created_at, updated_at, chapters(id, number, title, created_at)";

function normalize(rows: unknown): SeriesRow[] {
  return ((rows ?? []) as SeriesRow[]).map((row) => ({
    ...row,
    chapters: [...(row.chapters ?? [])].sort((a, b) => Number(b.number) - Number(a.number)),
  }));
}

export async function fetchSeries(options: {
  kind?: string;
  order?: "updated_at" | "created_at" | "rating" | "views";
  limit?: number;
  search?: string;
  pinnedFirst?: boolean;
}) {
  let query = supabase.from("series").select(SERIES_SELECT).eq("published", true);

  if (options.kind && options.kind !== "Todos") query = query.eq("kind", options.kind);
  if (options.search) query = query.ilike("title", `%${options.search}%`);
  if (options.pinnedFirst) query = query.order("pinned", { ascending: false });

  query = query.order(options.order ?? "updated_at", { ascending: false }).limit(options.limit ?? 24);

  const { data, error } = await query;
  if (error) throw error;
  return normalize(data);
}

export async function fetchSeriesBySlug(slug: string) {
  const { data, error } = await supabase
    .from("series")
    .select(
      "id, slug, title, alt_titles, synopsis, cover_url, banner_url, kind, status, author, artist, genres, rating, views, published, created_at, updated_at, chapters(id, number, title, created_at, pages)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    chapters: [...(data.chapters ?? [])].sort((a, b) => Number(a.number) - Number(b.number)),
  };
}

export async function fetchFavorites(userId: string) {
  const { data, error } = await supabase
    .from("favorites")
    .select(`series_id, created_at, series!inner(${SERIES_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as { series: SeriesRow }[]).map((row) => row.series);
}

export async function fetchHistory(userId: string) {
  const { data, error } = await supabase
    .from("reading_history")
    .select(
      `progress, updated_at, chapter_id, chapters(id, number), series!inner(id, slug, title, cover_url)`,
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(24);
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    progress: number;
    updated_at: string;
    chapter_id: string | null;
    chapters: { id: string; number: number } | null;
    series: { id: string; slug: string; title: string; cover_url: string | null };
  }>;
}

export async function fetchComments(seriesId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, created_at, user_id, is_spoiler, image_url")
    .eq("series_id", seriesId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((row) => row.user_id))];
  const authors = new Map<
    string,
    { username: string; avatar_url: string | null; level: number; avatar_frame: string | null }
  >();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, level, avatar_frame")
      .in("id", ids);
    for (const profile of profiles ?? []) {
      authors.set(profile.id, { username: profile.username, avatar_url: profile.avatar_url });
    }
  }
  return rows.map((row) => ({ ...row, author: authors.get(row.user_id) ?? null }));
}
