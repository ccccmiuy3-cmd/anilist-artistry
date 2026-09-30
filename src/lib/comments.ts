import { supabase } from "@/integrations/supabase/client";

const BUCKET = "manga";
const PREFIX = "comments";
// 1 ano em segundos — links assinados de longa duração para imagens de comentários
const SIGNED_URL_TTL = 60 * 60 * 24 * 365;

export async function uploadCommentImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${PREFIX}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getCommentImageUrl(path: string): Promise<string> {
  if (path.startsWith("http")) return path;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) throw error;
  return data.signedUrl;
}
