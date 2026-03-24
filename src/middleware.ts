import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isDashboardRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/operador");

  if (isDashboardRoute) {
    // TODO: Integrar validación de sesión y roles con Supabase Auth (RBAC: ADMIN/OPERATOR).
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/operador/:path*"],
};
