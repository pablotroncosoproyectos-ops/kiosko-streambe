import { NextResponse } from "next/server";
import { getCurrentBuenosAiresCalendarDateYyyyMmDd } from "@/lib/buenosAiresReportingCalendar";
import { buildSanitizedAuthenticatedRouteHandlerResponse } from "@/lib/authenticatedRouteHandlerErrorResponse";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import {
  getDailyClosureReportMetrics,
  type ReportSessionTypeFilter,
} from "@/services/reportService";

function resolveSessionTypeFilterFromSearchParam(
  raw: string | null,
): ReportSessionTypeFilter {
  if (raw === "RECREO" || raw === "LIBRE" || raw === "TOTAL") {
    return raw;
  }
  return "TOTAL";
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url);
    const reportDateQueryParameter = requestUrl.searchParams.get("reportDate");
    const reportCalendarDateYyyyMmDd =
      reportDateQueryParameter && reportDateQueryParameter.trim().length > 0
        ? reportDateQueryParameter.trim()
        : getCurrentBuenosAiresCalendarDateYyyyMmDd();
    const sessionTypeFilter = resolveSessionTypeFilterFromSearchParam(
      requestUrl.searchParams.get("sessionType"),
    );

    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);
    const dailyClosureReportMetrics = await getDailyClosureReportMetrics(
      supabaseServerClient,
      reportCalendarDateYyyyMmDd,
      sessionTypeFilter,
    );

    return NextResponse.json({ dailyClosureReportMetrics }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedAuthenticatedRouteHandlerResponse(error);
  }
}
