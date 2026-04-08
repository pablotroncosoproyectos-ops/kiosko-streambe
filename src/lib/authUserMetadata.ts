/**
 * Clave en `user_metadata` de Supabase Auth: si es true, el proxy obliga el cambio de contraseña.
 */
export const MUST_CHANGE_PASSWORD_USER_METADATA_KEY = "must_change_password";

export function readMustChangePasswordFromUserMetadata(
  user: { user_metadata?: Record<string, unknown> | null } | null,
): boolean {
  if (!user?.user_metadata) {
    return false;
  }
  const rawValue = user.user_metadata[MUST_CHANGE_PASSWORD_USER_METADATA_KEY];
  return rawValue === true || rawValue === "true";
}
