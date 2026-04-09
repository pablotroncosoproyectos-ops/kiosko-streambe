import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_MAX_SESSION_RESOLVE_ATTEMPTS = 25;
const DEFAULT_SESSION_RESOLVE_INTERVAL_MS = 200;

/**
 * Reintenta getUser tras getSession para dar tiempo al cliente PKCE / cookies.
 */
export async function waitForSupabaseAuthenticatedUser(
  supabase: SupabaseClient,
  maximumAttempts: number = DEFAULT_MAX_SESSION_RESOLVE_ATTEMPTS,
  intervalMilliseconds: number = DEFAULT_SESSION_RESOLVE_INTERVAL_MS,
): Promise<boolean> {
  for (
    let attemptIndex = 0;
    attemptIndex < maximumAttempts;
    attemptIndex++
  ) {
    if (attemptIndex > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMilliseconds));
    }
    await supabase.auth.getSession();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      return true;
    }
  }
  return false;
}

/**
 * Parámetros del fragmento (#) que envía GoTrue en flujos tipo implicit (p. ej. recovery).
 */
export interface ImplicitGrantParametersFromHash {
  access_token: string;
  refresh_token: string;
}

/**
 * Extrae access_token y refresh_token del hash de la URL actual del navegador.
 */
export function parseImplicitGrantParametersFromHash(
  hash: string,
): ImplicitGrantParametersFromHash | null {
  if (typeof hash !== "string" || hash.length <= 1 || hash === "#") {
    return null;
  }
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const parameters = new URLSearchParams(normalizedHash);
  const access_token = parameters.get("access_token");
  const refresh_token = parameters.get("refresh_token");
  if (
    typeof access_token !== "string" ||
    access_token.length === 0 ||
    typeof refresh_token !== "string" ||
    refresh_token.length === 0
  ) {
    return null;
  }
  return { access_token, refresh_token };
}

/**
 * Evita redirecciones abiertas: solo rutas relativas del mismo sitio.
 */
export function resolveSafeRelativeNavigationPath(
  nextPathFromQuery: string | null,
  fallbackPath: string,
): string {
  if (nextPathFromQuery === null || nextPathFromQuery.trim() === "") {
    return fallbackPath;
  }
  let candidate = nextPathFromQuery.trim();
  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return fallbackPath;
  }
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallbackPath;
  }
  if (candidate.includes("@")) {
    return fallbackPath;
  }
  const protocolPattern = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
  if (protocolPattern.test(candidate)) {
    return fallbackPath;
  }
  return candidate;
}
