import { NextResponse } from "next/server";
import { buildSanitizedAuthenticatedRouteHandlerResponse } from "@/lib/authenticatedRouteHandlerErrorResponse";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import {
  getTopSellingProductsForReportDate,
  type ReportSessionTypeFilter,
} from "@/services/reportService";

const TOP_SELLING_PRODUCTS_LIMIT = 5;

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
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const url = new URL(request.url);
    const reportDate = url.searchParams.get("reportDate") ?? "";
    const sessionTypeFilter = resolveSessionTypeFilterFromSearchParam(
      url.searchParams.get("sessionType"),
    );

    const topSellingProducts = await getTopSellingProductsForReportDate(
      supabaseServerClient,
      reportDate,
      TOP_SELLING_PRODUCTS_LIMIT,
      sessionTypeFilter,
    );

    return NextResponse.json({ topSellingProducts }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedAuthenticatedRouteHandlerResponse(error);
  }
}
