import { NextResponse } from "next/server";
import { buildSanitizedAuthenticatedRouteHandlerResponse } from "@/lib/authenticatedRouteHandlerErrorResponse";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { getDailySalesSummaryMetrics } from "@/services/reportService";

export async function GET(): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);
    const dailySalesSummaryMetrics =
      await getDailySalesSummaryMetrics(supabaseServerClient);

    return NextResponse.json(
      { dailySalesSummaryMetrics },
      { status: 200 },
    );
  } catch (error: unknown) {
    return buildSanitizedAuthenticatedRouteHandlerResponse(error);
  }
}
