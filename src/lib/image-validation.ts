export type ImageValidationResult =
  | { ok: true; extension: string }
  | { ok: false; errors: string[] };

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 4096;
export const MIN_IMAGE_DIMENSION = 32;
export const MAX_UPLOAD_FILES_PER_BATCH = 100;

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const SAFE_NAME_RE = /^[A-Za-z0-9._-]+$/;

export function extFromMime(mime: string): string | null {
  return MIME_TO_EXTENSION[mime] ?? null;
}

export function mimeFromExtension(ext: string): string | null {
  return EXTENSION_TO_MIME[ext.toLowerCase()] ?? null;
}

export function sanitizeImageFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]/g, "_")
    .replace(/\.+$/, "");
  if (cleaned && cleaned.length > 64) return cleaned.slice(0, 64);
  return cleaned;
}

export function validateImageFile(file: Pick<File, "name" | "type" | "size">): ImageValidationResult {
  const errors: string[] = [];
  const rawExt = file.name.split(".").pop() ?? "";
  const normalizedName = sanitizeImageFileName(file.name);

  if (file.size > MAX_IMAGE_FILE_BYTES) {
    errors.push("A imagem deve ter no máximo 5 MB.");
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.some((m) => m === file.type)) {
    errors.push("Formato não permitido — use JPG, PNG, WEBP, GIF ou AVIF.");
  }
  const expectedExt = extFromMime(file.type);
  if (expectedExt && rawExt && !SAFE_NAME_RE.test(rawExt)) {
    errors.push("Nome de arquivo inválido.");
  } else if (expectedExt && "jpg jpeg png webp gif avif".split(" ").includes(rawExt.toLowerCase()) && extFromMime=="")
  if (!SAFE_NAME_RE.test(normalizedName) || normalizedName.includes("..")) {
    errors.push("Nome de arquivo inválido.");
  }
  if (file.type && !SAFE_NAME_RE.test(rawExt)) {
    errors.push("Nome de arquivo inválido.");
  }

  return errors.length ? { ok: false, errors } : { ok: true, extension: MIME_TO_EXTENSION[file.type] };
}

export async function readImageDimensions(
  blob: Blob,
): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}