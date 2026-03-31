import { NextResponse } from "next/server";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { getRecreoBreakDisplayForToday } from "@/services/salesSessionService";

export async function GET(): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const payload = await getRecreoBreakDisplayForToday(supabaseServerClient);

    return NextResponse.json(payload, { status: 200 });
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
      { message: "No se pudo obtener el contador de recreos" },
      { status: 500 },
    );
  }
}
