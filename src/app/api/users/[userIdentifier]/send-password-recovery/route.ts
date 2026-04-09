import { NextResponse } from "next/server";
import { requireAuthenticatedAdministratorSupabaseClient } from "@/lib/supabase-server-route";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-service-role-client";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RATE_LIMIT_USER_MESSAGE =
  "Límite alcanzado. Por seguridad de Supabase, esperá 1 minuto antes de reintentar.";

const PASSWORD_RECOVERY_SUCCESS_MESSAGE =
  "Correo de recuperación enviado con éxito.";

function resolveApplicationBaseUrl(): string {
  const fromEnvironment = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (typeof fromEnvironment === "string" && fromEnvironment.length > 0) {
    return fromEnvironment.replace(/\/$/, "");
  }
  throw new Error("Missing NEXT_PUBLIC_APP_URL for password recovery redirect");
}

function buildSanitizedErrorResponse(error: unknown): NextResponse {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { message: "No se pudo procesar la solicitud" },
      { status: 500 },
    );
  }
  if (error.message === "Authentication required") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }
  if (
    error.message === "Authorized role required" ||
    error.message === "Administrator role required"
  ) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }
  if (error.message === "Missing Supabase service role key") {
    return NextResponse.json(
      { message: "Falta configuración del servidor (service role)" },
      { status: 500 },
    );
  }
  if (error.message === "Missing Supabase configuration") {
    return NextResponse.json(
      { message: "Configuración de Supabase incompleta" },
      { status: 500 },
    );
  }
  return NextResponse.json({ message: error.message }, { status: 500 });
}

function isAuthRateLimitStatus(statusCode: number, responseBodyText: string): boolean {
  if (statusCode === 429) {
    return true;
  }
  try {
    const parsed = JSON.parse(responseBodyText) as { error_code?: string };
    return parsed.error_code === "over_email_send_rate_limit";
  } catch {
    return false;
  }
}

/**
 * Envía correo de recuperación sin iniciar PKCE en el navegador del administrador.
 */
async function requestPasswordRecoveryEmailFromAuthServer(
  normalizedEmailAddress: string,
  redirectToUrl: string,
): Promise<{ ok: boolean; statusCode: number; bodyText: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonymousPublicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (
    typeof supabaseUrl !== "string" ||
    supabaseUrl.length === 0 ||
    typeof supabaseAnonymousPublicKey !== "string" ||
    supabaseAnonymousPublicKey.length === 0
  ) {
    throw new Error("Missing Supabase configuration");
  }

  const recoverEndpointUrl = `${supabaseUrl.replace(/\/$/, "")}/auth/v1/recover`;
  const response = await fetch(recoverEndpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonymousPublicKey,
      Authorization: `Bearer ${supabaseAnonymousPublicKey}`,
    },
    body: JSON.stringify({
      email: normalizedEmailAddress,
      redirect_to: redirectToUrl,
    }),
  });

  const bodyText = await response.text();

  return {
    ok: response.ok,
    statusCode: response.status,
    bodyText,
  };
}

/**
 * POST — Solo ADMIN. Envía el correo de recuperación vía Auth (`/auth/v1/recover`),
 * sin `generateLink` adicional (un solo golpe al rate limit por clic).
 * `redirect_to`: `/auth/callback?next=/auth/reset-password` (PKCE / fragment en cliente).
 */
export async function POST(
  request: Request,
  routeContext: { params: Promise<{ userIdentifier: string }> },
): Promise<NextResponse> {
  try {
    await requireAuthenticatedAdministratorSupabaseClient();

    const { userIdentifier: rawUserIdentifier } = await routeContext.params;
    const userIdentifier = decodeURIComponent(rawUserIdentifier ?? "").trim();

    if (!UUID_V4_REGEX.test(userIdentifier)) {
      return NextResponse.json(
        { message: "Identificador de usuario inválido" },
        { status: 400 },
      );
    }

    const serviceClient = createSupabaseServiceRoleClient();

    const { data: userRow, error: userRowError } = await serviceClient
      .from("users")
      .select("id, email")
      .eq("id", userIdentifier)
      .maybeSingle();

    if (userRowError) {
      return NextResponse.json(
        { message: "No se pudo validar el usuario" },
        { status: 500 },
      );
    }

    const emailFromRow =
      userRow &&
      typeof userRow.email === "string" &&
      userRow.email.trim().length > 0
        ? userRow.email.trim().toLowerCase()
        : null;

    if (emailFromRow === null) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    const applicationBaseUrl = resolveApplicationBaseUrl();
    // Callback PKCE + implicit: intercambia tokens y redirige a reset (whitelist en Supabase: /auth/callback*).
    const passwordResetRedirectUrl = `${applicationBaseUrl}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`;

    const recoverResult = await requestPasswordRecoveryEmailFromAuthServer(
      emailFromRow,
      passwordResetRedirectUrl,
    );

    if (!recoverResult.ok) {
      if (
        isAuthRateLimitStatus(recoverResult.statusCode, recoverResult.bodyText)
      ) {
        return NextResponse.json(
          { message: RATE_LIMIT_USER_MESSAGE },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { message: "No se pudo enviar el correo de recuperación" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: PASSWORD_RECOVERY_SUCCESS_MESSAGE },
      { status: 200 },
    );
  } catch (error: unknown) {
    return buildSanitizedErrorResponse(error);
  }
}
