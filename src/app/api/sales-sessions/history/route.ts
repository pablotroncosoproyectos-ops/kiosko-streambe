import { NextResponse } from "next/server";
import { buildSanitizedAuthenticatedRouteHandlerResponse } from "@/lib/authenticatedRouteHandlerErrorResponse";
import { requireAuthenticatedAdministratorSupabaseClient } from "@/lib/supabase-server-route";
import { listSalesSessionsHistoryForAdministrator } from "@/services/salesSessionService";

const DEFAULT_HISTORY_LIMIT = 80;

interface SalesSessionHistoryApiRow {
  sessionIdentifier: string;
  userIdentifier: string;
  operatorFullName: string | null;
  closedByFullName: string | null;
  sessionType: string;
  status: string;
  totalAmount: number;
  startedAtIso: string;
  closedAtIso: string | null;
  notes: string | null;
  expenseNotes: string | null;
  expense_notes: string | null;
  expectedBalance: number | null;
  closingBalance: number | null;
  cashDifference: number | null;
}

interface SalesSessionsHistoryApiResponse {
  salesSessionsHistory: SalesSessionHistoryApiRow[];
}

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

    const responseBody: SalesSessionsHistoryApiResponse = {
      salesSessionsHistory: salesSessionsHistory.map((sessionRow) => ({
        ...sessionRow,
        expense_notes: sessionRow.expenseNotes,
      })),
    };
    return NextResponse.json(responseBody, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedAuthenticatedRouteHandlerResponse(error);
  }
}
