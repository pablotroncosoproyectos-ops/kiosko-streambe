import { NextResponse } from "next/server";
import { getAuthenticatedUserProfile } from "@/lib/supabase-server-route";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { getOpenSessionCashSummaryForOperator } from "@/services/salesSessionService";

export async function GET(): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const authenticatedUserProfile = await getAuthenticatedUserProfile();

    const summary = await getOpenSessionCashSummaryForOperator(
      supabaseServerClient,
      authenticatedUserProfile.id,
    );

    return NextResponse.json(
      { cashSummary: summary },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Se requiere autenticación" },
        { status: 401 },
      );
    }
    if (error instanceof Error && error.message === "Authorized role required") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json(
      { message: "No se pudo cargar el resumen de caja" },
      { status: 500 },
    );
  }
}
