import { describe, expect, it } from "vitest";

import {
  MAX_SIGNED_URL_TTL_SECONDS,
  PRIVATE_URL_TTL_SECONDS,
  clampTtl,
  isChapterPagePath,
  isExternalUrl,
  isSafeStoragePath,
  storagePathFromUrl,
  toStoragePath,
} from "./storage-urls";

const SIGNED =
  "https://xyz.supabase.co/storage/v1/object/sign/manga/series-1/uuid/1/3.png?token=abc&ts=1";
const PUBLIC =
  "https://xyz.supabase.co/storage/v1/object/public/manga/avatars/user-1.png";

describe("storagePathFromUrl", () => {
  it("extrai o path de URL assinada", () => {
    expect(storagePathFromUrl(SIGNED)).toBe("series-1/uuid/1/3.png");
  });

  it("extrai o path de URL pública", () => {
    expect(storagePathFromUrl(PUBLIC)).toBe("avatars/user-1.png");
  });

  it("rejeita bucket diferente e URLs não-storage", () => {
    expect(storagePathFromUrl("https://x.supabase.co/storage/v1/object/public/other/a.png")).toBeNull();
    expect(storagePathFromUrl("https://example.com/img.png")).toBeNull();
  });
});

describe("isExternalUrl", () => {
  it("distingue link externo de url do nosso storage", () => {
    expect(isExternalUrl("https://via.placeholder.com/300")).toBe(true);
    expect(isExternalUrl(PUBLIC)).toBe(false);
  });
});

describe("isSafeStoragePath", () => {
  it("aceita paths normais", () => {
    expect(isSafeStoragePath("profiles/uuid.png")).toBe(true);
    expect(isSafeStoragePath("series-1/1.5/img.png")).toBe(true);
    expect(isSafeStoragePath("avatars/1.png")).toBe(true);
  });

  it("rejeita traversal e separadores suspeitos", () => {
    expect(isSafeStoragePath("/etc/passwd")).toBe(false);
    expect(isSafeStoragePath("a\\b.png")).toBe(false);
    expect(isSafeStoragePath("a//b.png")).toBe(false);
    expect(isSafeStoragePath("../up.png")).toBe(false);
    expect(isSafeStoragePath("a/../b.png")).toBe(false);
    expect(isSafeStoragePath("space name.png")).toBe(false);
    expect(isSafeStoragePath("a".repeat(600))).toBe(false);
  });
});

describe("toStoragePath", () => {
  it("normaliza URL assinada, pública e path puro", () => {
    expect(toStoragePath(SIGNED)).toBe("series-1/uuid/1/3.png");
    expect(toStoragePath(PUBLIC)).toBe("avatars/user-1.png");
    expect(toStoragePath("profiles/uuid.png")).toBe("profiles/uuid.png");
  });

  it("devolve null para links externos e paths inseguros", () => {
    expect(toStoragePath("https://via.placeholder.com/300")).toBeNull();
    expect(toStoragePath("a/../b.png")).toBeNull();
  });
});

describe("isChapterPagePath", () => {
  it("valida estrutura series-uuid/chapter-index/arquivo", () => {
    expect(isChapterPagePath("0a1b2c3d-4e5f-4a5b-8c9d-0e1f2a3b4c5d/1/3.png")).toBe(true);
    expect(isChapterPagePath("0a1b2c3d-4e5f-4a5b-8c9d-0e1f2a3b4c5d/1.5/thumb.png")).toBe(true);
  });

  it("rejeita paths sem uuid/número", () => {
    expect(isChapterPagePath("series-1/1/3.png")).toBe(false);
    expect(isChapterPagePath("a/1/3.png")).toBe(false);
    expect(isChapterPagePath("a/b/c.png")).toBe(false);
  });
});

describe("clampTtl", () => {
  it("mantém TTL dentro do teto de 24h", () => {
    expect(clampTtl(600)).toBe(600);
    expect(clampTtl(PRIVATE_URL_TTL_SECONDS)).toBe(PRIVATE_URL_TTL_SECONDS);
    expect(clampTtl(999999)).toBe(MAX_SIGNED_URL_TTL_SECONDS);
  });

  it("cai no default para valores inválidos", () => {
    expect(clampTtl(-5)).toBe(PRIVATE_URL_TTL_SECONDS);
    expect(clampTtl(Number.NaN)).toBe(PRIVATE_URL_TTL_SECONDS);
    expect(clampTtl(0)).toBe(PRIVATE_URL_TTL_SECONDS);
  });
});