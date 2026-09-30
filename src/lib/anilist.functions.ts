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
query ($search: String, $ids: [Int], $sort: [MediaSort]) {
  Page(perPage: 24) {
    media(search: $search, id_in: $ids, type: MANGA, sort: $sort) {
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
    const gql = (query: string, variables: Record<string, unknown>) =>
      fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables }),
      });
    const raw = data.search.trim();
    let variables: Record<string, unknown> = { search: raw, sort: ["SEARCH_MATCH"] };
    const url = /anilist\.co\/(manga|anime|search)\/?(\d+)?/i.exec(raw);
    if (url) {
      const [, kind, id] = url;
      if (kind === "manga" && id) variables = { ids: [Number(id)] };
      else if (kind === "anime" && id) {
        // Anime link: import the manga it is based on
        const r = await gql(
          `query ($id: Int) { Media(id: $id, type: ANIME) { relations { edges { relationType node { id type } } } } }`,
          { id: Number(id) },
        );
        const j = (await r.json()) as { data?: { Media?: { relations?: { edges?: Array<{ node?: { id: number; type: string } }> } } } };
        const ids = (j.data?.Media?.relations?.edges ?? []).filter((e) => e.node?.type === "MANGA").map((e) => e.node!.id);
        if (!ids.length) throw new Error("Esse anime não tem mangá de origem no AniList.");
        variables = { ids };
      } else {
        // Link de busca do AniList (ex.: /search/manga?search=Naruto)
        const params = new URL(raw.startsWith("http") ? raw : `https://${raw}`).searchParams;
        const q = params.get("search") ?? params.get("query");
        if (!q) {
          throw new Error(
            "Esse link é só a página de busca do AniList. Abra a obra lá e cole o link dela (ex.: https://anilist.co/manga/30656/Vagabond).",
          );
        }
        variables = { search: q, sort: ["SEARCH_MATCH"] };
      }
    }
    const response = await gql(QUERY, variables);

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
