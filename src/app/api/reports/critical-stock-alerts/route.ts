import { NextResponse } from "next/server";
import { buildSanitizedAuthenticatedRouteHandlerResponse } from "@/lib/authenticatedRouteHandlerErrorResponse";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { getCriticalStockAlertCount } from "@/services/reportService";

export async function GET(): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);
    const criticalStockAlertCount =
      await getCriticalStockAlertCount(supabaseServerClient);

    return NextResponse.json({ criticalStockAlertCount }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedAuthenticatedRouteHandlerResponse(error);
  }
}
