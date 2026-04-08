import { NextResponse } from "next/server";
import {
  createSupabaseServerClientUsingCookies,
  requireAuthenticatedAdministratorSupabaseClient,
} from "@/lib/supabase-server-route";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-service-role-client";

type PersistedRole = "ADMIN" | "OPERATOR";

interface UserUpdateRequestBody {
  role?: unknown;
  isActive?: unknown;
  canViewSalesHistory?: unknown;
}

function parseUserUpdateBody(body: unknown): {
  role: PersistedRole | null;
  isActive: boolean | null;
  canViewSalesHistory: boolean | null;
} | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const record = body as UserUpdateRequestBody;
  let role: PersistedRole | null = null;
  if ("role" in record) {
    if (record.role !== "ADMIN" && record.role !== "OPERATOR") {
      return null;
    }
    role = record.role;
  }
  let isActive: boolean | null = null;
  if ("isActive" in record) {
    if (typeof record.isActive !== "boolean") {
      return null;
    }
    isActive = record.isActive;
  }
  let canViewSalesHistory: boolean | null = null;
  if ("canViewSalesHistory" in record) {
    if (typeof record.canViewSalesHistory !== "boolean") {
      return null;
    }
    canViewSalesHistory = record.canViewSalesHistory;
  }
  if (role === null && isActive === null && canViewSalesHistory === null) {
    return null;
  }
  return { role, isActive, canViewSalesHistory };
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
  return NextResponse.json({ message: error.message }, { status: 500 });
}

export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ userIdentifier: string }> },
): Promise<NextResponse> {
  try {
    await requireAuthenticatedAdministratorSupabaseClient();

    const cookieClient = await createSupabaseServerClientUsingCookies();
    const { data: authData, error: authError } = await cookieClient.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    const administratorUserIdentifier = authData.user.id;

    const { userIdentifier } = await routeContext.params;
    if (typeof userIdentifier !== "string" || userIdentifier.trim().length === 0) {
      return NextResponse.json(
        { message: "Identificador de usuario inválido" },
        { status: 400 },
      );
    }
    const targetUserIdentifier = userIdentifier.trim();

    const requestBody: unknown = await request.json();
    const parsed = parseUserUpdateBody(requestBody);
    if (parsed === null) {
      return NextResponse.json(
        { message: "Cuerpo de solicitud inválido" },
        { status: 400 },
      );
    }

    if (parsed.isActive === false && targetUserIdentifier === administratorUserIdentifier) {
      return NextResponse.json(
        { message: "No puede desactivar su propia cuenta" },
        { status: 400 },
      );
    }

    if (
      parsed.role === "OPERATOR" &&
      targetUserIdentifier === administratorUserIdentifier
    ) {
      return NextResponse.json(
        { message: "No puede cambiar su propio rol a operador" },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, boolean | string> = {};
    if (parsed.role !== null) {
      updatePayload.role = parsed.role;
    }
    if (parsed.isActive !== null) {
      updatePayload.is_active = parsed.isActive;
    }
    if (parsed.canViewSalesHistory !== null) {
      updatePayload.can_view_sales_history = parsed.canViewSalesHistory;
    }

    const serviceClient = createSupabaseServiceRoleClient();
    const { data: updatedRows, error: updateError } = await serviceClient
      .from("users")
      .update(updatePayload)
      .eq("id", targetUserIdentifier)
      .select(
        "id, email, full_name, role, is_active, can_view_sales_history, created_at",
      )
      .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        { message: updateError.message || "No se pudo actualizar el usuario" },
        { status: 500 },
      );
    }
    if (!updatedRows) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({ user: updatedRows }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedErrorResponse(error);
  }
}
