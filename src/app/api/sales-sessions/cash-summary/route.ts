import { NextResponse } from "next/server";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import {
  getOpenSessionBasicsForOperator,
  getOpenSessionCashSummaryForOperator,
} from "@/services/salesSessionService";

/**
 * Sin `includeArqueo=true`: solo confirma sesión VENTA_LIBRE abierta (tabla `sales_sessions`).
 * Con `includeArqueo=true`: incluye agregados desde `sales` (modal Cerrar caja).
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const includeArqueo =
      new URL(request.url).searchParams.get("includeArqueo") === "true";

    if (includeArqueo) {
      const summary = await getOpenSessionCashSummaryForOperator(
        supabaseServerClient,
      );
      return NextResponse.json({ cashSummary: summary }, { status: 200 });
    }

    const openSession = await getOpenSessionBasicsForOperator(
      supabaseServerClient,
    );
    return NextResponse.json({ openSession }, { status: 200 });
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
