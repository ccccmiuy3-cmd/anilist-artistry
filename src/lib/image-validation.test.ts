import { describe, expect, it } from "vitest";

import {
  MAX_IMAGE_FILE_BYTES,
  extFromMime,
  isAllowedMimeType,
  mimeFromExtension,
  sanitizeImageFileName,
  validateImageFile,
} from "./image-validation";

describe("mimeFromExtension / extFromMime", () => {
  it("mapeia extensões conhecidas para o MIME certo", () => {
    expect(mimeFromExtension("jpg")).toBe("image/jpeg");
    expect(mimeFromExtension("JPEG")).toBe("image/jpeg");
    expect(mimeFromExtension("webp")).toBe("image/webp");
    expect(mimeFromExtension("gif")).toBe("image/gif");
    expect(mimeFromExtension("avif")).toBe("image/avif");
  });

  it("devolve null para formato desconhecido", () => {
    expect(mimeFromExtension("zip")).toBeNull();
    expect(mimeFromExtension("")).toBeNull();
    expect(extFromMime("application/pdf")).toBeNull();
  });
});

describe("sanitizeImageFileName", () => {
  it("remove acentos e normaliza o nome", () => {
    expect(sanitizeImageFileName("Capa Açúcar.jpg")).toBe("Capa_Acucar.jpg");
  });

  it("troca separadores de path e espaços por underscore", () => {
    expect(sanitizeImageFileName("../../etc/passwd.png")).toBe(".._.._etc_passwd.png");
    expect(sanitizeImageFileName("my avatar.png")).toBe("my_avatar.png");
  });

  it("remove pontos finais", () => {
    expect(sanitizeImageFileName("image...")).toBe("image");
  });

  it("trunca nomes longos em 64 caracteres", () => {
    const long = "a".repeat(100) + ".png";
    expect(sanitizeImageFileName(long).length).toBe(64);
  });

  it("substitui símbolos por underscore", () => {
    expect(sanitizeImageFileName("!!!")).toBe("___");
  });

  it("mantém nomes seguros intactos", () => {
    expect(sanitizeImageFileName("avatar-final_v2.png")).toBe("avatar-final_v2.png");
  });
});

describe("validateImageFile", () => {
  it("aceita imagem válida e devolve a extensão canônica", () => {
    const result = validateImageFile({ name: "avatar.png", type: "image/png", size: 1024 });
    expect(result).toEqual({ ok: true, extension: "png" });
  });

  it("rejeita arquivo acima de 5 MB", () => {
    const result = validateImageFile({
      name: "foto.jpg",
      type: "image/jpeg",
      size: MAX_IMAGE_FILE_BYTES + 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join()).toContain("5 MB");
  });

  it("rejeita MIME fora da whitelist", () => {
    const result = validateImageFile({ name: "foto.svg", type: "image/svg+xml", size: 10 });
    expect(result.ok).toBe(false);
  });

  it("rejeita extensão que não confere com o tipo declarado", () => {
    const result = validateImageFile({ name: "foto.jpg", type: "image/png", size: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join()).toContain("não confere");
  });

  it("rejeita nome com `..` mesmo com tipo válido", () => {
    const result = validateImageFile({ name: "a..b.png", type: "image/png", size: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join()).toContain("inválido");
  });

  it("rejeita extensão desconhecida quando o MIME é vazio", () => {
    const result = validateImageFile({ name: "foto.zzz", type: "", size: 10 });
    expect(result.ok).toBe(false);
  });
});

describe("isAllowedMimeType", () => {
  it("aceita apenas os tipos autorizados", () => {
    expect(isAllowedMimeType("image/jpeg")).toBe(true);
    expect(isAllowedMimeType("image/avif")).toBe(true);
    expect(isAllowedMimeType("image/bmp")).toBe(false);
    expect(isAllowedMimeType("application/pdf")).toBe(false);
  });
});
