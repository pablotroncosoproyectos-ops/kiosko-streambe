import { NextResponse } from "next/server";
import { getCurrentBuenosAiresCalendarDateYyyyMmDd } from "@/lib/buenosAiresReportingCalendar";
import { buildSanitizedAuthenticatedRouteHandlerResponse } from "@/lib/authenticatedRouteHandlerErrorResponse";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { getDailyClosureReportMetrics } from "@/services/reportService";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url);
    const reportDateQueryParameter = requestUrl.searchParams.get("reportDate");
    const reportCalendarDateYyyyMmDd =
      reportDateQueryParameter && reportDateQueryParameter.trim().length > 0
        ? reportDateQueryParameter.trim()
        : getCurrentBuenosAiresCalendarDateYyyyMmDd();

    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);
    const dailyClosureReportMetrics = await getDailyClosureReportMetrics(
      supabaseServerClient,
      reportCalendarDateYyyyMmDd,
    );

    return NextResponse.json({ dailyClosureReportMetrics }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedAuthenticatedRouteHandlerResponse(error);
  }
}
