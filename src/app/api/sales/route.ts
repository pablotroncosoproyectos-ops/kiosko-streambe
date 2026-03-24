import { NextResponse } from "next/server";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { processSale, type ProcessSalePayload } from "@/services/saleService";

interface ProcessSaleRequestBody {
  paymentMethod: "CASH" | "DEBIT" | "TRANSFER" | "QR";
  automaticSaleCategory: "RECREO" | "VENTA_LIBRE";
  saleItemsList: Array<{
    productIdentifier?: string;
    product_id?: string;
    quantity: number;
  }>;
}

function buildSanitizedErrorResponse(error: unknown): NextResponse {
  console.error("[api/sales] Detailed error:", error);

  if (!(error instanceof Error)) {
    return NextResponse.json({ message: "No se pudo procesar la venta" }, { status: 500 });
  }

  if (error.message === "Autenticación requerida") {
    return NextResponse.json({ message: "Autenticación requerida" }, { status: 401 });
  }

  if (error.message === "Se requiere un rol autorizado") {
    return NextResponse.json({ message: "Se requiere un rol autorizado" }, { status: 403 });
  }

  if (
    error.message === "La lista de artículos es requerida" ||
    error.message === "Identificador de producto inválido" ||
    error.message === "Cantidad de artículo inválida" ||
    error.message === "Categoría de venta automática inválida" ||
    error.message === "Método de pago inválido"
  ) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (error.message === "Stock insuficiente") {
    return NextResponse.json({ message: "Stock insuficiente" }, { status: 409 });
  }

  return NextResponse.json({ message: "No se pudo procesar la venta" }, { status: 500 });
}

function isValidProcessSaleRequestBody(
  requestBody: unknown,
): requestBody is ProcessSaleRequestBody {
  if (!requestBody || typeof requestBody !== "object") {
    return false;
  }

  const parsedBody = requestBody as Record<string, unknown>;
  const hasValidPaymentMethod =
    parsedBody.paymentMethod === "CASH" ||
    parsedBody.paymentMethod === "DEBIT" ||
    parsedBody.paymentMethod === "TRANSFER" ||
    parsedBody.paymentMethod === "QR";
  const hasValidAutomaticSaleCategory =
    parsedBody.automaticSaleCategory === "RECREO" ||
    parsedBody.automaticSaleCategory === "VENTA_LIBRE";

  if (
    !hasValidPaymentMethod ||
    !hasValidAutomaticSaleCategory ||
    !Array.isArray(parsedBody.saleItemsList)
  ) {
    return false;
  }

  return parsedBody.saleItemsList.every((saleItem) => {
    if (!saleItem || typeof saleItem !== "object") {
      return false;
    }

    const parsedSaleItem = saleItem as Record<string, unknown>;
    const hasValidProductIdentifier =
      (typeof parsedSaleItem.productIdentifier === "string" &&
        parsedSaleItem.productIdentifier.trim().length > 0) ||
      (typeof parsedSaleItem.product_id === "string" &&
        parsedSaleItem.product_id.trim().length > 0);
    const hasValidQuantity =
      typeof parsedSaleItem.quantity === "number" &&
      Number.isInteger(parsedSaleItem.quantity) &&
      parsedSaleItem.quantity > 0;

    return hasValidProductIdentifier && hasValidQuantity;
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const requestBody: unknown = await request.json();
    if (!isValidProcessSaleRequestBody(requestBody)) {
      return NextResponse.json({ message: "Cuerpo de la solicitud inválido" }, { status: 400 });
    }

    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const normalizedProcessSalePayload: ProcessSalePayload = {
      paymentMethod: requestBody.paymentMethod,
      automaticSaleCategory: requestBody.automaticSaleCategory,
      saleItemsList: requestBody.saleItemsList.map((saleItem) => ({
        productIdentifier:
          typeof saleItem.productIdentifier === "string" &&
          saleItem.productIdentifier.trim().length > 0
            ? saleItem.productIdentifier
            : (saleItem.product_id as string),
        quantity: saleItem.quantity,
      })),
    };

    const processSaleResult = await processSale(
      supabaseServerClient,
      normalizedProcessSalePayload,
    );

    return NextResponse.json(
      {
        message: "Venta procesada con éxito",
        saleIdentifier: processSaleResult.saleIdentifier,
        totalSaleAmount: processSaleResult.totalSaleAmount,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return buildSanitizedErrorResponse(error);
  }
}
