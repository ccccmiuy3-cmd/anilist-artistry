import { supabase } from "@/integrations/supabase/client";
import { BUCKET, isExternalUrl, publicStorageUrl, toStoragePath } from "@/lib/storage-urls";

const PREFIX = "comments";

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

/**
 * Imagem de comentário é conteúdo público: devolvemos a URL pública do
 * Storage em vez de um link assinado de longa duração. Caminho gravado no
 * banco continua sendo apenas o path (nunca uma URL com token).
 */
export async function getCommentImageUrl(path: string): Promise<string> {
  if (isExternalUrl(path)) return path;
  const storagePath = toStoragePath(path);
  if (!storagePath) return path;
  return publicStorageUrl(storagePath);
}
