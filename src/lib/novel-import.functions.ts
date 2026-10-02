import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

const strip = (s: string) => decode(s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();

/** Extrai título, número e parágrafos de um HTML de capítulo. */
export function extractChapter(html: string) {
  html = html.replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, "");
  const markers = ["chapter-markdown-content", "chapter-content", "reading-content", "text-left", "entry-content", "prose"];
  let scope = html;
  for (const m of markers) {
    const i = html.indexOf(m);
    if (i >= 0) {
      scope = html.slice(html.lastIndexOf("<", i));
      const end = scope.search(/<\/section>|<section[^>]*comment|id="comments"|class="[^"]*comment/i);
      if (end > 0) scope = scope.slice(0, end);
      break;
    }
  }
  const h1 = strip(scope.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const h2 = strip(scope.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? "");
  const paragraphs = [...scope.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)]
    .map((m) => strip(m[1] ?? ""))
    .filter((p) => p.length > 0 && !/^traduzido (usando|por)/i.test(p));
  const num = (h1 || strip(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "")).match(/cap[íi]tulo\s*(\d+(?:[.,]\d+)?)/i)?.[1];
  return { title: h2 || null, number: num ? num.replace(",", ".") : null, content: paragraphs.join("\n\n") };
}

function assertPublicUrl(raw: string) {
  const u = new URL(raw);
  if (!/^https?:$/.test(u.protocol)) throw new Error("Use um link http(s).");
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)/.test(h))
    throw new Error("Link não permitido.");
  return u.toString();
}

export const importNovelChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().url().max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Sem permissão.");
    const url = assertPublicUrl(data.url);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BetterMangaBot/1.0)", Accept: "text/html" },
        redirect: "follow",
      });
    } catch {
      return { ok: false as const, error: "Não foi possível abrir o link." };
    }
    if (!res.ok) return { ok: false as const, error: `O site respondeu com erro ${res.status}.` };
    const html = (await res.text()).slice(0, 3_000_000);
    const result = extractChapter(html);
    if (result.content.length < 50)
      return {
        ok: false as const,
        error: "O site carrega o texto só no navegador. Abra o capítulo, copie o texto (ou salve a página) e cole aqui.",
      };
    return { ok: true as const, ...result };
  });
