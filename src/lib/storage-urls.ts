import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "manga";

/**
 * TTL para arquivos privados (páginas de capítulos): algumas horas.
 * Nunca anos — a URL é regerada quando necessário.
 */
export const PRIVATE_URL_TTL_SECONDS = 6 * 60 * 60;

/** Teto absoluto de qualquer URL assinada gerada pelo app: 24 horas. */
export const MAX_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

const SIGN_RE = /\/storage\/v1\/object\/sign\/([^/]+)\/([^\s?#]+)/i;
const PUBLIC_RE = /\/storage\/v1\/object\/public\/([^/]+)\/([^\s?#]+)/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHAPTER_SEG_RE = /^\d+(\.\d+)?$/;

/** Extrai o path do Storage a partir de uma URL assinada ou pública. */
export function storagePathFromUrl(value: string): string | null {
  const match = SIGN_RE.exec(value) ?? PUBLIC_RE.exec(value);
  if (!match) return null;
  const bucket = match[1];
  const rawPath = match[2];
  if (bucket !== BUCKET || !rawPath) return null;
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

/** URL http(s) que não aponta para o nosso Storage (link externo colado). */
export function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) && storagePathFromUrl(value) === null;
}

/** Path sem traversal, com segmentos em charset seguro. */
export function isSafeStoragePath(path: string): boolean {
  if (!path || path.length > 512) return false;
  if (path.startsWith("/") || path.includes("\\") || path.includes("//")) return false;
  const segments = path.split("/");
  return segments.every(
    (segment) =>
      segment !== "" &&
      segment !== "." &&
      segment !== ".." &&
      /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment),
  );
}

/**
 * Normaliza o que está gravado no banco: aceita URL assinada legada, URL
 * pública ou path puro e devolve o path do Storage. Link externo → null.
 */
export function toStoragePath(value: string): string | null {
  const fromUrl = storagePathFromUrl(value);
  if (fromUrl) return isSafeStoragePath(fromUrl) ? fromUrl : null;
  if (/^https?:\/\//i.test(value)) return null;
  const trimmed = value.trim();
  return isSafeStoragePath(trimmed) ? trimmed : null;
}

/** Forma canônica de um path dentro do bucket (para comparar/assinatura). */
export function isChapterPagePath(path: string): boolean {
  const segments = path.split("/");
  if (segments.length !== 3) return false;
  const [seriesId, chapter, file] = segments;
  if (!seriesId || !chapter || !file) return false;
  return UUID_RE.test(seriesId) && CHAPTER_SEG_RE.test(chapter);
}

/** URL pública/CDN — somente para conteúdo que realmente é público. */
export function publicStorageUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Limita qualquer TTL pedido ao máximo permitido (24h). */
export function clampTtl(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return PRIVATE_URL_TTL_SECONDS;
  return Math.min(Math.floor(seconds), MAX_SIGNED_URL_TTL_SECONDS);
}
