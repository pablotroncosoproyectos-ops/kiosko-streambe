import { NextResponse } from "next/server";
import { getAuthenticatedUserProfile } from "@/lib/supabase-server-route";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { closeOpenSessionWithCashArqueo } from "@/services/salesSessionService";

interface CloseCashRequestBody {
  physicalCash: number;
  openingBalance?: number | null;
  expensesTotal?: number | null;
  expense_notes?: string | null;
  closed_by?: string | null;
  shiftClosingNotes?: string | null;
}

function isValidCloseCashBody(
  requestBody: unknown,
): requestBody is CloseCashRequestBody {
  if (!requestBody || typeof requestBody !== "object") {
    return false;
  }
  const parsedBody = requestBody as Record<string, unknown>;
  if (
    typeof parsedBody.physicalCash !== "number" ||
    !Number.isFinite(parsedBody.physicalCash)
  ) {
    return false;
  }
  const openingOk =
    parsedBody.openingBalance === undefined ||
    parsedBody.openingBalance === null ||
    (typeof parsedBody.openingBalance === "number" &&
      Number.isFinite(parsedBody.openingBalance) &&
      parsedBody.openingBalance >= 0);
  const expensesOk =
    parsedBody.expensesTotal === undefined ||
    parsedBody.expensesTotal === null ||
    (typeof parsedBody.expensesTotal === "number" &&
      Number.isFinite(parsedBody.expensesTotal) &&
      parsedBody.expensesTotal >= 0);
  const notesOk =
    parsedBody.expense_notes === undefined ||
    parsedBody.expense_notes === null ||
    typeof parsedBody.expense_notes === "string";
  const closedByOk =
    parsedBody.closed_by === undefined ||
    parsedBody.closed_by === null ||
    typeof parsedBody.closed_by === "string";
  const legacyNotesOk =
    parsedBody.shiftClosingNotes === undefined ||
    parsedBody.shiftClosingNotes === null ||
    typeof parsedBody.shiftClosingNotes === "string";
  return openingOk && expensesOk && notesOk && closedByOk && legacyNotesOk;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const authenticatedUserProfile = await getAuthenticatedUserProfile();

    const requestBody: unknown = await request.json();

    if (!isValidCloseCashBody(requestBody)) {
      return NextResponse.json(
        { message: "Cuerpo de solicitud inválido" },
        { status: 400 },
      );
    }

    const resolvedOpeningBalance =
      typeof requestBody.openingBalance === "number"
        ? requestBody.openingBalance
        : null;
    const resolvedExpensesTotal =
      typeof requestBody.expensesTotal === "number"
        ? requestBody.expensesTotal
        : null;

    const result = await closeOpenSessionWithCashArqueo(
      supabaseServerClient,
      authenticatedUserProfile.id,
      requestBody.physicalCash,
      resolvedOpeningBalance,
      resolvedExpensesTotal,
      requestBody.expense_notes ?? requestBody.shiftClosingNotes,
      requestBody.closed_by ?? authenticatedUserProfile.id,
    );

    return NextResponse.json(
      {
        message: "Caja cerrada correctamente",
        closeResult: result,
      },
      { status: 200 },
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
      if (error.message === "Invalid physical cash amount") {
        return NextResponse.json(
          { message: "Monto de efectivo inválido" },
          { status: 400 },
        );
      }
      if (error.message === "No open session") {
        return NextResponse.json(
          { message: "No hay sesión abierta para cerrar" },
          { status: 400 },
        );
      }
      if (error.message === "Unable to close session") {
        return NextResponse.json(
          { message: "No se pudo cerrar la sesión. Compruebe columnas en la base de datos." },
          { status: 500 },
        );
      }
      if (error.message === "Unable to close open recreation sessions") {
        return NextResponse.json(
          {
            message:
              "La caja se cerró pero no se pudieron cerrar las sesiones de recreo abiertas. Revise la base de datos o contacte soporte.",
          },
          { status: 500 },
        );
      }
      if (
        error.message ===
        "Las observaciones del turno superan la longitud máxima permitida"
      ) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
    }
    return NextResponse.json(
      { message: "No se pudo cerrar la caja" },
      { status: 500 },
    );
  }
}
