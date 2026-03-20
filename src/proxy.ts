import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Session protection for dashboard routes. Uses `auth.getUser()` so the token is
 * validated with Supabase Auth (recommended over reading unverified session cookies).
 *
 * Next.js 16+ uses the `proxy.ts` convention (replaces deprecated `middleware.ts`).
 */
function isDashboardRoute(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/operador");
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();

  if (!isDashboardRoute(request.nextUrl.pathname)) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonymousPublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonymousPublicKey) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabaseServerClient = createServerClient(
    supabaseUrl,
    supabaseAnonymousPublicKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabaseServerClient.auth.getUser();

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/operador/:path*"],
};
