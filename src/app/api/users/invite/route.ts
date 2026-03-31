import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedAdministratorSupabaseClient } from "@/lib/supabase-server-route";

type InvitationRole = "ADMIN" | "OPERADOR";
type PersistedRole = "ADMIN" | "OPERATOR";

interface InviteRequestBody {
  email: string;
  role: InvitationRole;
}

function resolveAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (typeof supabaseUrl !== "string" || supabaseUrl.trim().length === 0) {
    throw new Error("Missing Supabase configuration");
  }
  if (typeof serviceRoleKey !== "string" || serviceRoleKey.trim().length === 0) {
    throw new Error("Missing Supabase service role key");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isValidInviteBody(requestBody: unknown): requestBody is InviteRequestBody {
  if (!requestBody || typeof requestBody !== "object") {
    return false;
  }
  const body = requestBody as Record<string, unknown>;
  const hasEmail =
    typeof body.email === "string" && body.email.trim().length > 0;
  const hasRole = body.role === "ADMIN" || body.role === "OPERADOR";
  return hasEmail && hasRole;
}

function mapRoleForDatabase(role: InvitationRole): PersistedRole {
  return role === "OPERADOR" ? "OPERATOR" : "ADMIN";
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireAuthenticatedAdministratorSupabaseClient();

    const requestBody: unknown = await request.json();
    if (!isValidInviteBody(requestBody)) {
      return NextResponse.json(
        { message: "Cuerpo de solicitud inválido" },
        { status: 400 },
      );
    }

    const email = requestBody.email.trim().toLowerCase();
    const persistedRole = mapRoleForDatabase(requestBody.role);
    const fullNameFallback = "";
    const appUrl =
      typeof process.env.NEXT_PUBLIC_APP_URL === "string" &&
      process.env.NEXT_PUBLIC_APP_URL.trim().length > 0
        ? process.env.NEXT_PUBLIC_APP_URL.trim()
        : "http://localhost:3000";

    const adminSupabaseClient = resolveAdminSupabaseClient();

    const { data: inviteData, error: inviteError } =
      await adminSupabaseClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl}/auth/complete-profile`,
        data: { role: persistedRole },
      });

    if (inviteError) {
      return NextResponse.json(
        { message: inviteError.message || "No se pudo enviar la invitación" },
        { status: 500 },
      );
    }

    const invitedUserId = inviteData.user?.id;
    if (typeof invitedUserId !== "string" || invitedUserId.trim().length === 0) {
      return NextResponse.json(
        { message: "No se pudo obtener el usuario invitado" },
        { status: 500 },
      );
    }

    const { error: upsertUserError } = await adminSupabaseClient
      .from("users")
      .upsert(
        {
          id: invitedUserId,
          email,
          full_name: fullNameFallback,
          role: persistedRole,
          is_active: true,
        },
        { onConflict: "id" },
      );

    if (upsertUserError) {
      return NextResponse.json(
        {
          message:
            upsertUserError.message ||
            "Invitación enviada, pero no se pudo sincronizar public.users",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Invitación enviada correctamente" },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message === "Authentication required" ||
        error.message === "Authorized role required" ||
        error.message === "Administrator role required"
      ) {
        return NextResponse.json({ message: "No autorizado" }, { status: 403 });
      }
      if (error.message === "Missing Supabase service role key") {
        return NextResponse.json(
          { message: "Falta SUPABASE_SERVICE_ROLE_KEY" },
          { status: 500 },
        );
      }
    }
    return NextResponse.json(
      { message: "No se pudo enviar la invitación" },
      { status: 500 },
    );
  }
}
