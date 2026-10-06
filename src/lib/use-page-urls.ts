import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { signChapterPages } from "@/lib/storage.functions";
import { isExternalUrl, toStoragePath } from "@/lib/storage-urls";

/**
 * Resolve as entradas de `chapters.pages` em URLs utilizáveis.
 *
 * - link externo colado → usado direto;
 * - path do Storage ou URL assinada legada → assinado no servidor com TTL
 *   curto (somente capítulos publicados, ou staff em prévia);
 * - inválido/negado → null (a imagem não é renderizada).
 */
export function usePageUrls(entries: ReadonlyArray<string | null | undefined>): {
  urls: Array<string | null>;
  isLoading: boolean;
} {
  const normalized = useMemo(() => entries.map((entry) => (typeof entry === "string" ? entry.trim() : "")), [entries]);

  const paths = useMemo(() => {
    const set = new Set<string>();
    for (const entry of normalized) {
      if (!entry || isExternalUrl(entry)) continue;
      const path = toStoragePath(entry);
      if (path) set.add(path);
    }
    return [...set];
  }, [normalized]);

  const signature = paths.join("\n");

  const signed = useQuery({
    queryKey: ["sign-chapter-pages", signature],
    queryFn: () => signChapterPages({ data: { paths: paths } }),
    enabled: paths.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const urls = useMemo(
    () =>
      normalized.map((entry) => {
        if (!entry) return null;
        if (isExternalUrl(entry)) return entry;
        const path = toStoragePath(entry);
        if (!path) return null;
        return signed.data?.[entry] ?? null;
      }),
    [normalized, signed.data],
  );

  return { urls, isLoading: signed.isPending && paths.length > 0 };
}
