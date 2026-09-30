import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AnilistResult = {
  anilistId: number;
  title: string;
  altTitles: string;
  synopsis: string;
  coverUrl: string;
  bannerUrl: string;
  genres: string[];
  status: string;
  author: string;
  artist: string;
  averageScore: number;
};

const QUERY = `
query ($search: String) {
  Page(perPage: 12) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
      id
      title { romaji english native }
      description(asHtml: false)
      coverImage { extraLarge large }
      bannerImage
      genres
      status
      averageScore
      staff(perPage: 6) { edges { role node { name { full } } } }
    }
  }
}`;

const STATUS_PT: Record<string, string> = {
  RELEASING: "Em andamento",
  FINISHED: "Completo",
  NOT_YET_RELEASED: "Em breve",
  CANCELLED: "Cancelado",
  HIATUS: "Hiato",
};

export const searchAnilist = createServerFn({ method: "POST" })
  .inputValidator((input: { search: string }) => z.object({ search: z.string().min(1) }).parse(input))
  .handler(async ({ data }): Promise<AnilistResult[]> => {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { search: data.search } }),
    });

    if (!response.ok) {
      throw new Error(`Não foi possível buscar no AniList (${response.status}).`);
    }

    const json = (await response.json()) as {
      data?: { Page?: { media?: unknown[] } };
      errors?: { message: string }[];
    };
    if (json.errors?.length) throw new Error(json.errors[0]!.message);

    const media = (json.data?.Page?.media ?? []) as Array<{
      id: number;
      title: { romaji?: string; english?: string; native?: string };
      description?: string;
      coverImage?: { extraLarge?: string; large?: string };
      bannerImage?: string;
      genres?: string[];
      status?: string;
      averageScore?: number;
      staff?: { edges?: Array<{ role?: string; node?: { name?: { full?: string } } }> };
    }>;

    return media.map((item) => {
      const edges = item.staff?.edges ?? [];
      const findRole = (needle: string) =>
        edges.find((edge) => (edge.role ?? "").toLowerCase().includes(needle))?.node?.name?.full ?? "";
      const titles = [item.title.romaji, item.title.english, item.title.native].filter(Boolean) as string[];
      return {
        anilistId: item.id,
        title: titles[0] ?? "Sem título",
        altTitles: titles.slice(1).join(", "),
        synopsis: (item.description ?? "").replace(/<[^>]+>/g, "").trim(),
        coverUrl: item.coverImage?.extraLarge ?? item.coverImage?.large ?? "",
        bannerUrl: item.bannerImage ?? "",
        genres: item.genres ?? [],
        status: STATUS_PT[item.status ?? ""] ?? "Em andamento",
        author: findRole("story") || findRole("original") || "",
        artist: findRole("art") || "",
        averageScore: item.averageScore ? Math.round((item.averageScore / 10) * 10) / 10 : 0,
      };
    });
  });
