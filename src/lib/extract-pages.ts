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
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const base = file.name.replace(/\.pdf$/i, "");
  const out: File[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/webp", 0.9));
    out.push(new File([blob], `${base}-${String(p).padStart(4, "0")}.webp`, { type: "image/webp" }));
    page.cleanup();
  }
  return out;
}

export async function extractPages(files: File[]): Promise<File[]> {
  const result: File[] = [];
  for (const f of files) {
    const n = f.name.toLowerCase();
    if (n.endsWith(".zip") || f.type.includes("zip")) result.push(...(await fromZip(f)));
    else if (n.endsWith(".pdf") || f.type === "application/pdf") result.push(...(await fromPdf(f)));
    else if (f.type.startsWith("image/")) result.push(f);
  }
  return result;
}
