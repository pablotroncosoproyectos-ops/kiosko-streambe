import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient as createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { CookieOptions } from "@supabase/ssr";

const PASSWORD_CHANGE_PATHNAME = "/auth/reset-password";

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const authorizationCode = requestUrl.searchParams.get("code");
  const authType = requestUrl.searchParams.get("type");
  const nextPath = requestUrl.searchParams.get("next");
  const isLocalDevelopmentHost =
    requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonymousPublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (
    typeof supabaseUrl !== "string" ||
    supabaseUrl.trim().length === 0 ||
    typeof supabaseAnonymousPublicKey !== "string" ||
    supabaseAnonymousPublicKey.trim().length === 0
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const cookieStore = await cookies();
  function resolveCookieOptions(options: CookieOptions): CookieOptions {
    return {
      ...options,
      path: "/",
      secure: isLocalDevelopmentHost ? false : options.secure,
    };
  }

  const cookieEntries = cookieStore.getAll();
  console.log("Cookies encontradas:", cookieEntries.map((c) => c.name));
  const hasPkceFlowCookie = cookieEntries.some((cookieEntry) => {
    const cookieName = cookieEntry.name.toLowerCase();
    return (
      cookieName.includes("code-verifier") ||
      cookieName.includes("pkce") ||
      cookieName.startsWith("sb-") ||
      cookieName.startsWith("base-") ||
      cookieName.includes("flow-state")
    );
  });

  function buildRecoveryLoginRedirect(errorReason: string): NextResponse {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "error_description",
      "El enlace ha expirado o se abrió en un navegador diferente",
    );
    loginUrl.searchParams.set("error_reason", errorReason);
    return NextResponse.redirect(loginUrl);
  }

  const supabaseRouteHandlerClient = createRouteHandlerClient(
    supabaseUrl,
    supabaseAnonymousPublicKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set(name, value, resolveCookieOptions(options));
        },
        remove(name: string, options) {
          cookieStore.set(name, "", resolveCookieOptions(options));
        },
      },
    },
  );

  if (authorizationCode && authorizationCode.trim().length > 0) {
    // Modo diagnóstico: aunque no detectemos cookie PKCE por nombre,
    // intentamos el exchange igualmente para confirmar error real de Supabase.
    if (authType === "recovery" && !hasPkceFlowCookie) {
      console.warn(
        "No se detectó cookie PKCE por nombre, se intentará exchangeCodeForSession igualmente.",
      );
    }

    const { error: exchangeCodeError } =
      await supabaseRouteHandlerClient.auth.exchangeCodeForSession(
        authorizationCode,
      );
    if (exchangeCodeError) {
      const normalizedErrorMessage = exchangeCodeError.message.toLowerCase();
      const isFlowStateNotFoundError =
        normalizedErrorMessage.includes("flow_state_not_found") ||
        normalizedErrorMessage.includes("flow state not found");

      if (authType === "recovery" && isFlowStateNotFoundError) {
        return buildRecoveryLoginRedirect("flow_state_not_found");
      }

      return NextResponse.json(
        {
          message: "Falló exchangeCodeForSession",
          supabaseError: {
            name: exchangeCodeError.name,
            message: exchangeCodeError.message,
            status: exchangeCodeError.status,
            code: exchangeCodeError.code,
          },
          context: {
            path: requestUrl.pathname,
            hasCode: true,
            authType,
            nextPath,
          },
        },
        { status: 500 },
      );
    }
  }

  if (authType === "recovery") {
    return NextResponse.redirect(new URL(PASSWORD_CHANGE_PATHNAME, request.url));
  }

  const { data: sessionData } = await supabaseRouteHandlerClient.auth.getSession();
  if (
    typeof sessionData.session?.user?.recovery_sent_at === "string" &&
    sessionData.session.user.recovery_sent_at.trim().length > 0
  ) {
    return NextResponse.redirect(new URL(PASSWORD_CHANGE_PATHNAME, request.url));
  }

  if (typeof nextPath === "string" && nextPath.startsWith("/")) {
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
