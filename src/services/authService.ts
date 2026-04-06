import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@/types/database";

export interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthenticatedUserSessionPayload {
  userProfile: User;
}

function sanitizeEmailAddress(emailAddress: string): string {
  return emailAddress.trim().toLowerCase();
}

function validateLoginCredentials(loginCredentials: LoginCredentials): void {
  if (
    typeof loginCredentials.email !== "string" ||
    sanitizeEmailAddress(loginCredentials.email).length === 0
  ) {
    throw new Error("Credenciales no válidas");
  }

  if (
    typeof loginCredentials.password !== "string" ||
    loginCredentials.password.trim().length === 0
  ) {
    throw new Error("Credenciales no válidas");
  }
}

function mapUserDatabaseRowToUserProfile(userDatabaseRow: {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  can_view_sales_history?: boolean | null;
}): User {
  if (userDatabaseRow.role !== "ADMIN" && userDatabaseRow.role !== "OPERATOR") {
    throw new Error("Credenciales no válidas");
  }

  const role = userDatabaseRow.role as User["role"];
  return {
    id: userDatabaseRow.id,
    email: userDatabaseRow.email,
    fullName: userDatabaseRow.full_name,
    role,
    isActive: userDatabaseRow.is_active,
    createdAt: userDatabaseRow.created_at,
    canViewSalesHistory:
      role === "ADMIN"
        ? true
        : Boolean(userDatabaseRow.can_view_sales_history),
  };
}

async function fetchUserProfileUsingSupabaseClient(
  supabaseServerClient: SupabaseClient,
  authenticatedUserIdentifier: string,
): Promise<User> {
  const { data: userDatabaseRow, error: userProfileError } =
    await supabaseServerClient
      .from("users")
      .select("*")
      .eq("id", authenticatedUserIdentifier)
      .single();

  if (userProfileError || !userDatabaseRow) {
    throw new Error("Perfil de usuario no disponible");
  }

  return mapUserDatabaseRowToUserProfile(
    userDatabaseRow as {
      id: string;
      email: string;
      full_name: string;
      role: string;
      is_active: boolean;
      created_at: string;
      can_view_sales_history?: boolean | null;
    },
  );
}

/**
 * Authenticates with Supabase Auth and loads the application user profile from `users`.
 * The Supabase client must be created with `@supabase/ssr` and Next.js cookies so the
 * session is persisted on the HTTP response.
 */
export async function loginWithEmailAndPassword(
  supabaseServerClient: SupabaseClient,
  loginCredentials: LoginCredentials,
): Promise<AuthenticatedUserSessionPayload> {
  validateLoginCredentials(loginCredentials);

  const sanitizedEmailAddress = sanitizeEmailAddress(loginCredentials.email);

  const { data: authenticationData, error: authenticationError } =
    await supabaseServerClient.auth.signInWithPassword({
      email: sanitizedEmailAddress,
      password: loginCredentials.password,
    });

  if (
    authenticationError ||
    !authenticationData.user ||
    !authenticationData.session
  ) {
    throw new Error("Credenciales no válidas");
  }

  const userProfile = await fetchUserProfileUsingSupabaseClient(
    supabaseServerClient,
    authenticationData.user.id,
  );

  if (!userProfile.isActive) {
    await supabaseServerClient.auth.signOut();
    throw new Error("Inactive account");
  }

  return {
    userProfile,
  };
}
