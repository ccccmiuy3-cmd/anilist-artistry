import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import {
  BUCKET,
  PRIVATE_URL_TTL_SECONDS,
  isChapterPagePath,
  toStoragePath,
} from "@/lib/storage-urls";

/** Máximo de paths assinados por chamada (um capítulo grande cabe em 1 chamada). */
const MAX_PATHS_PER_CALL = 120;

export type SignedPageMap = Record<string, string | null>;

/**
 * O chamador é staff (admin/uploader)? Usado para pré-visualizar capítulos
 * não publicados no painel. Sem token → anônimo.
 */
async function requestIsStaff(): Promise<boolean> {
  try {
    const request = getRequest();
    const token = request?.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return false;
    const url = process.env["SUPABASE_URL"];
    const publishable = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !publishable) return false;

    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient<Database>(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.auth.getClaims(token);
    const sub = error ? undefined : data?.claims?.sub;
    if (!sub) return false;
    const [admin, uploader] = await Promise.all([
      client.rpc("has_role", { _user_id: sub, _role: "admin" }),
      client.rpc("has_role", { _user_id: sub, _role: "uploader" }),
    ]);
    return Boolean(admin.data || uploader.data);
  } catch {
    return false;
  }
}

/**
 * Gera URLs assinadas de curtíssima duração para páginas de capítulos.
 *
 * Regras:
 * - aceita somente paths no formato {uuid-da-obra}/{capitulo}/{arquivo};
 * - anônimo só recebe URLs de capítulos publicados em obras publicadas;
 * - staff (admin/uploader) também recebe de capítulos em rascunho, para prévia;
 * - o resultado é mapeado pela entrada original, para aceitar paths e URLs
 *   legadas gravadas em antigas versões do banco.
 */
export const signChapterPages = createServerFn({ method: "POST" })
  .inputValidator((data: { paths?: unknown }) => data)
  .handler(async ({ data }) => {
    const raw = Array.isArray(data?.paths) ? data.paths : [];
    const inputs: string[] = [];
    const seen = new Set<string>();
    for (const item of raw) {
      if (typeof item !== "string") continue;
      const path = toStoragePath(item);
      if (!path || !isChapterPagePath(path)) continue;
      if (seen.has(path)) continue;
      seen.add(path);
      inputs.push(item);
      if (seen.size >= MAX_PATHS_PER_CALL) break;
    }

    const result: SignedPageMap = {};
    if (!seen.size) return result;

    const pathByInput = new Map<string, string>();
    for (const input of inputs) pathByInput.set(input, toStoragePath(input)!);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const seriesIds = [...new Set([...seen].map((p) => p.split("/")[0] as string))];
    const [chaptersRes, seriesRes] = await Promise.all([
      supabaseAdmin.from("chapters").select("number, series_id").in("series_id", seriesIds),
      supabaseAdmin.from("series").select("id, published").in("id", seriesIds),
    ]);
    if (chaptersRes.error || seriesRes.error) {
      throw new Error("Não foi possível verificar as páginas solicitadas.");
    }

    const publishedSeries = new Set((seriesRes.data ?? []).filter((s) => s.published).map((s) => s.id));
    const publishedChapters = new Set(
      (chaptersRes.data ?? [])
        .filter((c) => publishedSeries.has(c.series_id))
        .map((c) => `${c.series_id}/${Number(c.number)}`),
    );

    const staff = await requestIsStaff();
    const allowed = [...seen].filter((path) => {
      const [seriesId, chapter] = path.split("/");
      return staff || publishedChapters.has(`${seriesId ?? ""}/${Number(chapter ?? "")}`);
    });

    if (!allowed.length) return result;

    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrls(allowed, PRIVATE_URL_TTL_SECONDS);
    if (error) throw new Error("Não foi possível gerar os links das páginas.");

    const urlByPath = new Map<string, string | null>();
    for (const row of signed ?? []) {
      const path = row.path ?? "";
      urlByPath.set(path, row.signedUrl ?? null);
    }
    for (const [input, path] of pathByInput) {
      result[input] = urlByPath.get(path) ?? null;
    }
    return result;
  });
