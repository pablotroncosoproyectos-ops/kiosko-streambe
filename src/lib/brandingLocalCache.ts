export const CACHED_BUSINESS_NAME_KEY = "cached_business_name";
export const CACHED_BUSINESS_LOGO_KEY = "cached_business_logo";

export function persistBrandingToLocalCache(
  businessName: string,
  logoUrl: string | null,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const trimmedName = businessName.trim();
  if (trimmedName.length > 0) {
    window.localStorage.setItem(CACHED_BUSINESS_NAME_KEY, trimmedName);
  }
  const trimmedLogo = typeof logoUrl === "string" ? logoUrl.trim() : "";
  if (trimmedLogo.length > 0) {
    window.localStorage.setItem(CACHED_BUSINESS_LOGO_KEY, trimmedLogo);
  } else {
    window.localStorage.removeItem(CACHED_BUSINESS_LOGO_KEY);
  }
}
