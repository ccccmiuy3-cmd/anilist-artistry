import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Apenas administradores.");
}

export const getMediaSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Só as colunas necessárias: nunca puxamos "*".
    const { data } = await supabaseAdmin
      .from("media_settings")
      .select("cloud_name, api_key, api_secret, folder")
      .eq("id", 1)
      .maybeSingle();
    return {
      cloud_name: data?.cloud_name ?? "",
      api_key: data?.api_key ?? "",
      folder: data?.folder ?? "bettermanga",
      hasSecret: !!data?.api_secret,
    };
  });

export const saveMediaSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { cloud_name: string; api_key: string; api_secret?: string; folder: string }) => d,
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row: Record<string, unknown> = {
      id: 1,
      cloud_name: data.cloud_name.trim(),
      api_key: data.api_key.trim(),
      folder: data.folder.trim() || "bettermanga",
      updated_at: new Date().toISOString(),
    };
    if (data.api_secret?.trim()) row["api_secret"] = data.api_secret.trim();
    const { error } = await supabaseAdmin
      .from("media_settings")
      .upsert(row as Database["public"]["Tables"]["media_settings"]["Insert"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function sha1Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Returns a signature so the browser can upload straight to Cloudinary without seeing the secret. */
export const signCloudinaryUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Só as colunas necessárias (evita arrastar "*" — colunas secretas futuras).
    const { data: settings } = await supabaseAdmin
      .from("media_settings")
      .select("cloud_name, api_key, api_secret, folder")
      .eq("id", 1)
      .maybeSingle();
    if (!settings?.cloud_name || !settings.api_key || !settings.api_secret)
      throw new Error("Configure as chaves do Cloudinary primeiro.");
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = settings.folder || "bettermanga";
    const signature = await sha1Hex(
      `folder=${folder}&timestamp=${timestamp}${settings.api_secret}`,
    );
    return {
      cloud_name: settings.cloud_name,
      api_key: settings.api_key,
      folder,
      timestamp,
      signature,
    };
  });
