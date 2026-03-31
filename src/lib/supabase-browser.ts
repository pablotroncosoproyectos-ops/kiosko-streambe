import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client for client components (Realtime, etc.).
 * RLS applies when the user session is present in the browser.
 */
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonymousPublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    typeof supabaseUrl !== "string" ||
    supabaseUrl.trim().length === 0 ||
    typeof supabaseAnonymousPublicKey !== "string" ||
    supabaseAnonymousPublicKey.trim().length === 0
  ) {
    throw new Error("Missing Supabase public environment variables");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonymousPublicKey);
}
