import { NextResponse } from "next/server";
import { buildSanitizedAuthenticatedRouteHandlerResponse } from "@/lib/authenticatedRouteHandlerErrorResponse";
import { requireAuthenticatedAdministratorSupabaseClient } from "@/lib/supabase-server-route";
import { listSalesSessionsHistoryForAdministrator } from "@/services/salesSessionService";

const DEFAULT_HISTORY_LIMIT = 80;

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAdministratorSupabaseClient();

    const requestUrl = new URL(request.url);
    const limitParameter = requestUrl.searchParams.get("limit");
    const parsedLimit =
      limitParameter === null
        ? DEFAULT_HISTORY_LIMIT
        : Number.parseInt(limitParameter, 10);
    const maximumRowCount = Number.isFinite(parsedLimit)
      ? parsedLimit
      : DEFAULT_HISTORY_LIMIT;

    const salesSessionsHistory =
      await listSalesSessionsHistoryForAdministrator(
        supabaseServerClient,
        maximumRowCount,
      );

    return NextResponse.json({ salesSessionsHistory }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedAuthenticatedRouteHandlerResponse(error);
  }
}
