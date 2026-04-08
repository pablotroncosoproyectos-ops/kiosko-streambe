import { NextResponse } from "next/server";
import { requireAuthenticatedAdministratorSupabaseClient } from "@/lib/supabase-server-route";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-service-role-client";
import { MUST_CHANGE_PASSWORD_USER_METADATA_KEY } from "@/lib/authUserMetadata";

export interface ManagedUserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  can_view_sales_history: boolean | null;
  created_at: string;
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

type PersistedUserRole = "ADMIN" | "OPERATOR";

interface CreateUserRequestBody {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  canViewSalesHistory?: unknown;
}

const MINIMUM_PASSWORD_LENGTH = 8;

function parseCreateUserRequestBody(body: unknown): {
  fullName: string;
  email: string;
  password: string;
  role: PersistedUserRole;
  canViewSalesHistory: boolean;
} | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const record = body as CreateUserRequestBody;
  if (typeof record.fullName !== "string" || record.fullName.trim().length === 0) {
    return null;
  }
  if (typeof record.email !== "string" || record.email.trim().length === 0) {
    return null;
  }
  if (typeof record.password !== "string" || record.password.length < MINIMUM_PASSWORD_LENGTH) {
    return null;
  }
  if (record.role !== "ADMIN" && record.role !== "OPERATOR") {
    return null;
  }
  if (typeof record.canViewSalesHistory !== "boolean") {
    return null;
  }
  return {
    fullName: record.fullName.trim(),
    email: record.email.trim().toLowerCase(),
    password: record.password,
    role: record.role,
    canViewSalesHistory: record.canViewSalesHistory,
  };
}

function buildCreateUserAuthErrorResponse(message: string): NextResponse {
  const normalized = message.trim().toLowerCase();
  const duplicateHints = [
    "already been registered",
    "already registered",
    "user already exists",
    "email address is already",
    "duplicate",
  ];
  if (duplicateHints.some((hint) => normalized.includes(hint))) {
    return NextResponse.json(
      { message: "Ya existe una cuenta con este correo." },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { message: message.length > 0 ? message : "No se pudo crear el usuario" },
    { status: 500 },
  );
}

/**
 * Crea usuario en Auth (service role) + fila en `public.users`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireAuthenticatedAdministratorSupabaseClient();

    const requestBody: unknown = await request.json();
    const parsed = parseCreateUserRequestBody(requestBody);
    if (parsed === null) {
      return NextResponse.json(
        {
          message:
            "Cuerpo inválido: fullName, email, password (mín. 8), role (ADMIN|OPERATOR) y canViewSalesHistory (boolean) son obligatorios.",
        },
        { status: 400 },
      );
    }

    const serviceClient = createSupabaseServiceRoleClient();

    const canViewSalesHistoryForDatabase =
      parsed.role === "ADMIN" ? true : parsed.canViewSalesHistory;

    const { data: createAuthData, error: createAuthError } =
      await serviceClient.auth.admin.createUser({
        email: parsed.email,
        password: parsed.password,
        email_confirm: true,
        user_metadata: {
          [MUST_CHANGE_PASSWORD_USER_METADATA_KEY]: true,
          full_name: parsed.fullName,
        },
      });

    if (createAuthError || !createAuthData.user) {
      if (createAuthError) {
        return buildCreateUserAuthErrorResponse(createAuthError.message);
      }
      return NextResponse.json(
        { message: "No se pudo crear el usuario en Auth" },
        { status: 500 },
      );
    }

    const newUserIdentifier = createAuthData.user.id;

    const { error: insertUserError } = await serviceClient.from("users").insert({
      id: newUserIdentifier,
      email: parsed.email,
      full_name: parsed.fullName,
      role: parsed.role,
      is_active: true,
      can_view_sales_history: canViewSalesHistoryForDatabase,
      created_at: new Date().toISOString(),
    });

    if (insertUserError) {
      await serviceClient.auth.admin.deleteUser(newUserIdentifier);
      const messageLower = insertUserError.message.toLowerCase();
      if (
        messageLower.includes("duplicate") ||
        messageLower.includes("unique") ||
        messageLower.includes("23505")
      ) {
        return NextResponse.json(
          { message: "Ya existe un registro en perfiles con este correo o id." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          message:
            insertUserError.message ||
            "Usuario creado en Auth pero falló la sincronización con public.users",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "Usuario creado correctamente",
        userId: newUserIdentifier,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return buildSanitizedErrorResponse(error);
  }
}

/**
 * Lista usuarios de `public.users` (solo administradores autenticados).
 */
export async function GET(): Promise<NextResponse> {
  try {
    await requireAuthenticatedAdministratorSupabaseClient();

    const serviceClient = createSupabaseServiceRoleClient();
    const { data: userRows, error: listError } = await serviceClient
      .from("users")
      .select(
        "id, email, full_name, role, is_active, can_view_sales_history, created_at",
      )
      .order("created_at", { ascending: false });

    if (listError) {
      return NextResponse.json(
        { message: listError.message || "No se pudo listar usuarios" },
        { status: 500 },
      );
    }

    const users = (userRows ?? []) as ManagedUserRow[];
    return NextResponse.json({ users }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedErrorResponse(error);
  }
}
