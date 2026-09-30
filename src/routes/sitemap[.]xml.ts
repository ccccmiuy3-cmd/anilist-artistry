import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";
import { sitemapPathForLocation, sitemapStaticPaths, sitemapXML, type SitemapEntry } from "@/lib/sitemap";

const BASE_URL = "https://bettermanga.net";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return new Response("Sitemap data source unavailable", { status: 503 });
        const supabase = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            },
          },
        });
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));
        const seriesRoute = router.routesById["/obra/$slug/"];
        if (seriesRoute) {
          for (let offset = 0; ; ) {
            const { data, error } = await supabase.from("series").select("slug, updated_at").eq("published", true).order("id").range(offset, offset + 999);
            if (error) throw error;
            if (!data.length) break;
            for (const row of data) {
              const location = router.buildLocation({ to: "/obra/$slug", params: { slug: row.slug } });
              const path = sitemapPathForLocation(router, location, seriesRoute.id);
              if (path) entries.push({ path, lastmod: row.updated_at });
            }
            offset += data.length;
          }
        }
        const listRoute = router.routesById["/listas/$id"];
        if (listRoute) {
          for (let offset = 0; ; ) {
            const { data, error } = await supabase.from("lists").select("id, updated_at").eq("is_public", true).order("id").range(offset, offset + 999);
            if (error) throw error;
            if (!data.length) break;
            for (const row of data) {
              const location = router.buildLocation({ to: "/listas/$id", params: { id: row.id } });
              const path = sitemapPathForLocation(router, location, listRoute.id);
              if (path) entries.push({ path, lastmod: row.updated_at });
            }
            offset += data.length;
          }
        }
        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});