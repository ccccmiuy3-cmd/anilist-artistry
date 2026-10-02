// Client-only: extracts page images from .zip / .pdf uploads.
const IMG = /\.(jpe?g|png|webp|gif|avif)$/i;
const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" };

export type ExtractProgress = (done: number, total: number) => void;

async function fromZip(file: File, onProgress?: ExtractProgress): Promise<File[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((f) => !f.dir && IMG.test(f.name) && !f.name.includes("__MACOSX"));
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const base = file.name.replace(/\.zip$/i, "");
  const out: File[] = [];
  let done = 0;
  onProgress?.(0, entries.length);
  for (const [i, e] of entries.entries()) {
    const ext = e.name.split(".").pop()!.toLowerCase();
    const blob = await e.async("blob");
    out.push(new File([blob], `${base}-${String(i + 1).padStart(4, "0")}.${ext}`, { type: MIME[ext] ?? "image/jpeg" }));
    onProgress?.(++done, entries.length);
  }
  return out;
}

async function fromPdf(file: File, onProgress?: ExtractProgress): Promise<File[]> {
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
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/password/i.test(msg)) throw new Error(`"${file.name}" está protegido por senha.`);
    throw new Error(`Não foi possível abrir "${file.name}": ${msg}`);
  }
  const base = file.name.replace(/\.pdf$/i, "");
  const out: File[] = [];
  const MAX_SIDE = 4096; // evita estourar memória do canvas em páginas enormes
  const MAX_AREA = 16_000_000;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false })!;
  onProgress?.(0, doc.numPages);
  for (let p = 1; p <= doc.numPages; p++) {
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
  await doc.destroy();
  return out;
}

export async function extractPages(files: File[], onProgress?: ExtractProgress): Promise<File[]> {
  const result: File[] = [];
  for (const f of files) {
    const n = f.name.toLowerCase();
    if (n.endsWith(".zip") || f.type.includes("zip")) result.push(...(await fromZip(f, onProgress)));
    else if (n.endsWith(".pdf") || f.type === "application/pdf") result.push(...(await fromPdf(f, onProgress)));
    else if (f.type.startsWith("image/")) result.push(f);
  }
  return result;
}
