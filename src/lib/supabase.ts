import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedSupabaseClient: SupabaseClient | null = null;

function getSupabaseConfiguration(): {
  supabaseUrl: string;
  supabaseAnonymousPublicKey: string;
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonymousPublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (typeof supabaseUrl !== "string" || supabaseUrl.trim().length === 0) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (
    typeof supabaseAnonymousPublicKey !== "string" ||
    supabaseAnonymousPublicKey.trim().length === 0
  ) {
    throw new Error(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return { supabaseUrl, supabaseAnonymousPublicKey };
}

export function getSupabaseClient(): SupabaseClient {
  if (cachedSupabaseClient) {
    return cachedSupabaseClient;
  }

  const { supabaseUrl, supabaseAnonymousPublicKey } =
    getSupabaseConfiguration();
  cachedSupabaseClient = createClient(supabaseUrl, supabaseAnonymousPublicKey);

  return cachedSupabaseClient;
}

export const supabaseClient: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, propertyKey) {
    const client = getSupabaseClient();
    const value = (client as unknown as Record<PropertyKey, unknown>)[
      propertyKey
    ];

    if (typeof value === "function") {
      return (value as (...arguments_: unknown[]) => unknown).bind(client);
    }

    return value;
  },
});

