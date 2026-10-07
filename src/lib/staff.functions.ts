import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Grants the "admin" role to the signed-in user when the site has no admin yet.
 * This is how the site owner takes control right after creating their account.
 * The check+insert runs inside one database transaction with an advisory lock
 * (0030_atomic_first_admin), so two simultaneous requests can't create two admins.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: granted, error } = await supabaseAdmin.rpc("claim_first_admin", {
      p_user_id: context.userId,
    });
    if (error) throw new Error(error.message);

    if (granted === null || granted === false) {
      return { granted: false as const, reason: "Este site já tem um administrador." };
    }

    return { granted: true as const };
  });
