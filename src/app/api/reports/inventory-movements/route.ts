import { NextResponse } from "next/server";
import { buildSanitizedAuthenticatedRouteHandlerResponse } from "@/lib/authenticatedRouteHandlerErrorResponse";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { getRecentInventoryMovementsWithProductName } from "@/services/reportService";

const RECENT_INVENTORY_MOVEMENTS_LIMIT = 10;

export async function GET(): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);
    const recentInventoryMovements = await getRecentInventoryMovementsWithProductName(
      supabaseServerClient,
      RECENT_INVENTORY_MOVEMENTS_LIMIT,
    );

    return NextResponse.json({ recentInventoryMovements }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedAuthenticatedRouteHandlerResponse(error);
  }
}
