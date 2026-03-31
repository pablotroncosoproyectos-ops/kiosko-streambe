import { NextResponse } from "next/server";
import { getAuthenticatedUserProfile } from "@/lib/supabase-server-route";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { openOperatorCashSession } from "@/services/salesSessionService";

interface OpenCashRequestBody {
  openingBalance: number;
}

function isValidOpenCashBody(
  requestBody: unknown,
): requestBody is OpenCashRequestBody {
  if (!requestBody || typeof requestBody !== "object") {
    return false;
  }
  const parsedBody = requestBody as Record<string, unknown>;
  return (
    typeof parsedBody.openingBalance === "number" &&
    Number.isFinite(parsedBody.openingBalance) &&
    parsedBody.openingBalance >= 0
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const authenticatedUserProfile = await getAuthenticatedUserProfile();

    const requestBody: unknown = await request.json();

    if (!isValidOpenCashBody(requestBody)) {
      return NextResponse.json(
        { message: "Cuerpo de solicitud inválido" },
        { status: 400 },
      );
    }

    const result = await openOperatorCashSession(
      supabaseServerClient,
      authenticatedUserProfile.id,
      requestBody.openingBalance,
    );

    return NextResponse.json(
      {
        message: "Caja abierta correctamente",
        sessionIdentifier: result.sessionIdentifier,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        return NextResponse.json(
          { message: "Se requiere autenticación" },
          { status: 401 },
        );
      }
      if (error.message === "Authorized role required") {
        return NextResponse.json({ message: "No autorizado" }, { status: 403 });
      }
      if (error.message === "Invalid opening balance") {
        return NextResponse.json(
          { message: "Saldo inicial inválido" },
          { status: 400 },
        );
      }
      if (error.message === "Session already open") {
        return NextResponse.json(
          { message: "Ya existe una sesión abierta" },
          { status: 409 },
        );
      }
      if (error.message === "Unable to open cash session") {
        return NextResponse.json(
          { message: "No se pudo abrir la caja" },
          { status: 500 },
        );
      }
      if (error.message === "Unable to verify open session") {
        return NextResponse.json(
          { message: "No se pudo verificar el estado de la sesión" },
          { status: 500 },
        );
      }
    }
    return NextResponse.json(
      { message: "No se pudo abrir la caja" },
      { status: 500 },
    );
  }
}
