import { NextResponse } from "next/server";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { processSale, type ProcessSalePayload } from "@/services/saleService";

function buildSanitizedErrorResponse(error: unknown): NextResponse {
  if (!(error instanceof Error)) {
    return NextResponse.json({ message: "Unable to process sale" }, { status: 500 });
  }

  if (error.message === "Authentication required") {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  if (error.message === "Authorized role required") {
    return NextResponse.json({ message: "Authorized role required" }, { status: 403 });
  }

  if (
    error.message === "Sale items list is required" ||
    error.message === "Invalid sale item product identifier" ||
    error.message === "Invalid sale item quantity"
  ) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (error.message === "Insufficient stock") {
    return NextResponse.json({ message: "Insufficient stock" }, { status: 409 });
  }

  return NextResponse.json({ message: "Unable to process sale" }, { status: 500 });
}

function isValidProcessSaleRequestBody(
  requestBody: unknown,
): requestBody is ProcessSalePayload {
  if (!requestBody || typeof requestBody !== "object") {
    return false;
  }

  const parsedBody = requestBody as Record<string, unknown>;
  const hasValidPaymentMethod =
    parsedBody.paymentMethod === "CASH" ||
    parsedBody.paymentMethod === "TRANSFER" ||
    parsedBody.paymentMethod === "QR";

  if (!hasValidPaymentMethod || !Array.isArray(parsedBody.saleItemsList)) {
    return false;
  }

  return parsedBody.saleItemsList.every((saleItem) => {
    if (!saleItem || typeof saleItem !== "object") {
      return false;
    }

    const parsedSaleItem = saleItem as Record<string, unknown>;
    return (
      typeof parsedSaleItem.productIdentifier === "string" &&
      parsedSaleItem.productIdentifier.trim().length > 0 &&
      typeof parsedSaleItem.quantity === "number" &&
      Number.isInteger(parsedSaleItem.quantity) &&
      parsedSaleItem.quantity > 0
    );
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const requestBody: unknown = await request.json();
    if (!isValidProcessSaleRequestBody(requestBody)) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const processSaleResult = await processSale(supabaseServerClient, requestBody);

    return NextResponse.json(
      {
        message: "Sale processed successfully",
        saleIdentifier: processSaleResult.saleIdentifier,
        totalSaleAmount: processSaleResult.totalSaleAmount,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return buildSanitizedErrorResponse(error);
  }
}
