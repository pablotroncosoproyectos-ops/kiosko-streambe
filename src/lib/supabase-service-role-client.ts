import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con **service role** (clave `service_role` del panel de Supabase,
 * variable `SUPABASE_SERVICE_ROLE_KEY`). Ese JWT **omite RLS** en Postgres y permite
 * `auth.admin.*`. No exponer la clave al cliente.
 */
export function createSupabaseServiceRoleClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
    throw new Error("Missing Supabase configuration");
  }
  if (typeof serviceRoleKey !== "string" || serviceRoleKey.length === 0) {
    throw new Error("Missing Supabase service role key");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
