import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type UserRole = "ADMIN" | "OPERATOR";

function getSupabasePublicConfiguration(): {
  supabaseUrl: string;
  supabaseAnonymousPublicKey: string;
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonymousPublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (typeof supabaseUrl !== "string" || supabaseUrl.trim().length === 0) {
    throw new Error("Missing Supabase configuration");
  }

  if (
    typeof supabaseAnonymousPublicKey !== "string" ||
    supabaseAnonymousPublicKey.trim().length === 0
  ) {
    throw new Error("Missing Supabase configuration");
  }

  return { supabaseUrl, supabaseAnonymousPublicKey };
}

/**
 * Creates a Supabase client bound to Next.js cookies for Route Handlers.
 * Respects Row Level Security using the authenticated session.
 */
export async function createSupabaseServerClientUsingCookies(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonymousPublicKey } =
    getSupabasePublicConfiguration();

  return createServerClient(supabaseUrl, supabaseAnonymousPublicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

/**
 * Returns a Supabase server client only if the current user is an active administrator.
 */
export async function requireAuthenticatedAdministratorSupabaseClient(): Promise<SupabaseClient> {
  return requireAuthenticatedAuthorizedSupabaseClient(["ADMIN"]);
}

export async function requireAuthenticatedAuthorizedSupabaseClient(
  allowedRoles: UserRole[],
): Promise<SupabaseClient> {
  const supabaseServerClient = await createSupabaseServerClientUsingCookies();

  const { data: authenticationData, error: authenticationError } =
    await supabaseServerClient.auth.getUser();

  if (authenticationError || !authenticationData.user) {
    throw new Error("Authentication required");
  }

  const authenticatedUserIdentifier = authenticationData.user.id;

  const { data: authenticatedUserProfile, error: authenticatedUserProfileError } =
    await supabaseServerClient
      .from("users")
      .select("role, is_active")
      .eq("id", authenticatedUserIdentifier)
      .single();

  if (
    authenticatedUserProfileError ||
    !authenticatedUserProfile ||
    !authenticatedUserProfile.is_active
  ) {
    throw new Error("Authentication required");
  }

  const userRole = authenticatedUserProfile.role as UserRole;
  const isRoleAllowed = allowedRoles.includes(userRole);

  if (!isRoleAllowed) {
    throw new Error("Authorized role required");
  }

  return supabaseServerClient;
}
