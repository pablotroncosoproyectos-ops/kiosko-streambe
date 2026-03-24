import { NextResponse } from "next/server";
import { buildSanitizedAuthenticatedRouteHandlerResponse } from "@/lib/authenticatedRouteHandlerErrorResponse";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { getTopSellingProducts } from "@/services/reportService";

const TOP_SELLING_PRODUCTS_LIMIT = 5;

export async function GET(): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);
    const topSellingProducts = await getTopSellingProducts(
      supabaseServerClient,
      TOP_SELLING_PRODUCTS_LIMIT,
    );

    return NextResponse.json({ topSellingProducts }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedAuthenticatedRouteHandlerResponse(error);
  }
}
