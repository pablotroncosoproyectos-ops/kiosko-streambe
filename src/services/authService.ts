import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@/types/database";

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthenticatedUserSession {
  session: Session;
  userProfile: User;
}

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateLoginCredentials(loginCredentials: LoginCredentials): void {
  if (
    typeof loginCredentials.email !== "string" ||
    sanitizeEmail(loginCredentials.email).length === 0
  ) {
    throw new Error("Invalid credentials");
  }

  if (
    typeof loginCredentials.password !== "string" ||
    loginCredentials.password.trim().length === 0
  ) {
    throw new Error("Invalid credentials");
  }
}

async function fetchUserProfileUsingSupabaseClient(
  supabaseServerClient: SupabaseClient,
  userIdentifier: string,
): Promise<User> {
  const { data, error } = await supabaseServerClient
    .from("users")
    .select("id, email, full_name, role, is_active, created_at")
    .eq("id", userIdentifier)
    .single();

  if (error || !data) {
    throw new Error("Invalid credentials");
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
    isActive: data.is_active,
    createdAt: data.created_at,
  };
}

/**
 * Performs authentication using the provided Supabase client. In Route Handlers,
 * pass a client created with `createServerClient` from `@supabase/ssr` and the
 * `cookies` API so session tokens are persisted on the HTTP response.
 */
export async function loginWithEmailAndPassword(
  supabaseServerClient: SupabaseClient,
  loginCredentials: LoginCredentials,
): Promise<AuthenticatedUserSession> {
  validateLoginCredentials(loginCredentials);

  const sanitizedEmail = sanitizeEmail(loginCredentials.email);

  const { data, error } = await supabaseServerClient.auth.signInWithPassword({
    email: sanitizedEmail,
    password: loginCredentials.password,
  });

  if (error || !data.user || !data.session) {
    throw new Error("Invalid credentials");
  }

  const userProfile = await fetchUserProfileUsingSupabaseClient(
    supabaseServerClient,
    data.user.id,
  );

  if (!userProfile.isActive) {
    await supabaseServerClient.auth.signOut();
    throw new Error("Inactive account");
  }

  return {
    session: data.session,
    userProfile,
  };
}
