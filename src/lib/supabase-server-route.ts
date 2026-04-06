import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type UserRole = "ADMIN" | "OPERATOR";
interface AuthenticatedUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  /** ADMIN: siempre true en cliente; OPERADOR: columna `can_view_sales_history`. */
  canViewSalesHistory: boolean;
}

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

export async function getAuthenticatedUserProfile(): Promise<AuthenticatedUserProfile> {
  const supabaseServerClient = await createSupabaseServerClientUsingCookies();
  const { data: authenticationData, error: authenticationError } =
    await supabaseServerClient.auth.getUser();

  if (authenticationError || !authenticationData.user) {
    throw new Error("Authentication required");
  }

  const { data: authenticatedUserProfileRow, error: authenticatedUserProfileError } =
    await supabaseServerClient
      .from("users")
      .select("*")
      .eq("id", authenticationData.user.id)
      .single();

  if (authenticatedUserProfileError || !authenticatedUserProfileRow) {
    throw new Error("Authentication required");
  }

  const role = authenticatedUserProfileRow.role as UserRole;
  if (role !== "ADMIN" && role !== "OPERATOR") {
    throw new Error("Authentication required");
  }

  const rowWithHistoryFlag = authenticatedUserProfileRow as typeof authenticatedUserProfileRow & {
    can_view_sales_history?: boolean | null;
  };
  const operatorCanViewHistory = Boolean(
    rowWithHistoryFlag.can_view_sales_history,
  );

  return {
    id: authenticatedUserProfileRow.id,
    email: authenticatedUserProfileRow.email,
    fullName: authenticatedUserProfileRow.full_name,
    role,
    isActive: authenticatedUserProfileRow.is_active,
    createdAt: authenticatedUserProfileRow.created_at,
    canViewSalesHistory:
      role === "ADMIN" ? true : operatorCanViewHistory,
  };
}
