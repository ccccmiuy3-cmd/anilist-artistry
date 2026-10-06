// Client-only: extracts page images from .zip / .pdf uploads.
const IMG = /\.(jpe?g|png|webp|gif|avif)$/i;
const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" };

export type ExtractProgress = (done: number, total: number) => void;

// Limites de processamento (evitam zip-bombs, PDFs gigantes e páginas inválidas).
export const MAX_ARCHIVE_FILE_BYTES = 512 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 500;
export const MAX_PDF_PAGES = 240;
export const MAX_EXTRACTED_FILES = 100;
export const MAX_EXTRACTED_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_PROCESS_TIME_MS = 5 * 60 * 1000;

function ensureNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Extração cancelada.", "AbortError");
}

function ensureWithin(deadline: number): void {
  if (Date.now() > deadline) throw new Error("Tempo máximo de processamento excedido.");
}

function isSuspiciousArchivePath(name: string): boolean {
  if (!name) return true;
  if (name.includes("..")) return true;
  if (name.includes("\\")) return true;
  if (name.startsWith("/")) return true;
  if (/^[a-zA-Z]:/.test(name)) return true;
  return false;
}

function assertArchiveSize(file: File): void {
  if (file.size > MAX_ARCHIVE_FILE_BYTES) {
    throw new Error(`"${file.name}" é maior que o limite de ${MAX_ARCHIVE_FILE_BYTES / 1024 / 1024} MB.`);
  }
}

async function fromZip(file: File, onProgress?: ExtractProgress, signal?: AbortSignal): Promise<File[]> {
  assertArchiveSize(file);
  const JSZip = (await import("jszip")).default;
  ensureNotAborted(signal);
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files)
    .filter((f) => !f.dir && IMG.test(f.name) && !f.name.includes("__MACOSX") && !isSuspiciousArchivePath(f.name));
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error(`O arquivo tem ${entries.length} imagens — máximo permitido: ${MAX_ZIP_ENTRIES}.`);
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const base = file.name.replace(/\.zip$/i, "");
  const out: File[] = [];
  const deadline = Date.now() + MAX_PROCESS_TIME_MS;
  let done = 0;
  let totalBytes = 0;
  onProgress?.(0, entries.length);
  for (const [i, e] of entries.entries()) {
    ensureNotAborted(signal);
    ensureWithin(deadline);
    const ext = e.name.split(".").pop()!.toLowerCase();
    const blob = await e.async("blob");
    if (blob.size > MAX_EXTRACTED_IMAGE_BYTES) {
      throw new Error(`A página "${e.name}" tem mais de ${MAX_EXTRACTED_IMAGE_BYTES / 1024 / 1024} MB (extraída de "${file.name}").`);
    }
    totalBytes += blob.size;
    if (totalBytes > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
      throw new Error(`Conteúdo descompactado de "${file.name}" excede o limite de 2 GB.`);
    }
    out.push(new File([blob], `${base}-${String(i + 1).padStart(4, "0")}.${ext}`, { type: MIME[ext] ?? "image/jpeg" }));
    onProgress?.(++done, entries.length);
  }
  return out;
}

async function fromPdf(file: File, onProgress?: ExtractProgress, signal?: AbortSignal): Promise<File[]> {
  assertArchiveSize(file);
  // Polyfill for pdfjs-dist on browsers without the Map upsert proposal.
  const MP = Map.prototype as unknown as Record<string, unknown>;
  if (typeof MP["getOrInsertComputed"] !== "function") {
    MP["getOrInsertComputed"] = function (this: Map<unknown, unknown>, key: unknown, fn: (k: unknown) => unknown) {
      if (this.has(key)) return this.get(key);
      const v = fn(key);
      this.set(key, v);
      return v;
    };
  }
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  ensureNotAborted(signal);
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/password/i.test(msg)) throw new Error(`"${file.name}" está protegido por senha.`);
    throw new Error(`Não foi possível abrir "${file.name}": ${msg}`);
  }
  if (doc.numPages > MAX_PDF_PAGES) {
    throw new Error(`"${file.name}" tem ${doc.numPages} páginas — máximo permitido: ${MAX_PDF_PAGES}.`);
  }
  const base = file.name.replace(/\.pdf$/i, "");
  const out: File[] = [];
  const MAX_SIDE = 4096; // evita estourar memória do canvas em páginas enormes
  const MAX_AREA = 16_000_000;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const deadline = Date.now() + MAX_PROCESS_TIME_MS;
  let totalBytes = 0;
  onProgress?.(0, doc.numPages);
  for (let p = 1; p <= doc.numPages; p++) {
    ensureNotAborted(signal);
    ensureWithin(deadline);
    const page = await doc.getPage(p);
    try {
      const base1 = page.getViewport({ scale: 1 });
      let scale = 2;
      scale = Math.min(scale, MAX_SIDE / base1.width, MAX_SIDE / base1.height, Math.sqrt(MAX_AREA / (base1.width * base1.height)));
      const vp = page.getViewport({ scale: Math.max(scale, 0.5) });
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
      let blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
      // Safari pode não gerar WebP: cai para JPEG
      if (!blob || blob.type !== "image/webp") blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
      if (!blob) throw new Error("falha ao gerar imagem");
      if (blob.size > MAX_EXTRACTED_IMAGE_BYTES) {
        throw new Error(`A página ${p} de "${file.name}" gerou mais de ${MAX_EXTRACTED_IMAGE_BYTES / 1024 / 1024} MB.`);
      }
      totalBytes += blob.size;
      if (totalBytes > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
        throw new Error(`Conteúdo gerado de "${file.name}" excede o limite de 2 GB.`);
      }
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      out.push(new File([blob], `${base}-${String(p).padStart(4, "0")}.${ext}`, { type: blob.type }));
    } catch (e) {
      throw new Error(`Erro na página ${p} de "${file.name}": ${e instanceof Error ? e.message : e}`);
    } finally {
      page.cleanup();
    }
    onProgress?.(p, doc.numPages);
  }
  canvas.width = canvas.height = 0;
  await doc.cleanup?.();
  return out;
}

export async function extractPages(
  files: File[],
  onProgress?: ExtractProgress,
  signal?: AbortSignal,
): Promise<File[]> {
  const result: File[] = [];
  for (const f of files) {
    ensureNotAborted(signal);
    const n = f.name.toLowerCase();
    if (n.endsWith(".zip") || f.type.includes("zip")) result.push(...(await fromZip(f, onProgress, signal)));
    else if (n.endsWith(".pdf") || f.type === "application/pdf") result.push(...(await fromPdf(f, onProgress, signal)));
    else if (f.type.startsWith("image/")) {
      if (f.size > MAX_EXTRACTED_IMAGE_BYTES) {
        throw new Error(`"${f.name}" tem mais de ${MAX_EXTRACTED_IMAGE_BYTES / 1024 / 1024} MB.`);
      }
      result.push(f);
    }
    if (result.length > MAX_EXTRACTED_FILES) {
      throw new Error(`Máximo de ${MAX_EXTRACTED_FILES} imagens por capítulo.`);
    }
  }
  return result;
}