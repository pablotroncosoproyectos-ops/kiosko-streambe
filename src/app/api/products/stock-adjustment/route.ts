import { NextResponse } from "next/server";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";
import { adjustProductStockWithInventoryMovement } from "@/services/productService";

interface StockAdjustmentRequestBody {
  productIdentifier: string;
  newStock: number;
  adjustmentReason?: string | null;
}

function buildSanitizedErrorResponse(error: unknown): NextResponse {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { message: "No se pudo procesar la solicitud" },
      { status: 500 },
    );
  }

  const errorMessage = error.message;

  if (errorMessage === "Authentication required") {
    return NextResponse.json(
      { message: "Se requiere autenticación" },
      { status: 401 },
    );
  }

  if (errorMessage === "Authorized role required") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  if (errorMessage === "Missing Supabase configuration") {
    return NextResponse.json(
      { message: "No se pudo procesar la solicitud" },
      { status: 500 },
    );
  }

  if (errorMessage === "Product not found") {
    return NextResponse.json({ message: "Producto no encontrado" }, { status: 404 });
  }

  if (errorMessage === "Invalid new stock") {
    return NextResponse.json(
      { message: "Cantidad de stock inválida" },
      { status: 400 },
    );
  }

  if (errorMessage === "No stock change") {
    return NextResponse.json(
      { message: "No hay cambio de stock" },
      { status: 400 },
    );
  }

  if (errorMessage === "Adjustment reason required") {
    return NextResponse.json(
      {
        message:
          "El motivo del ajuste es obligatorio cuando se reduce el stock",
      },
      { status: 400 },
    );
  }

  if (errorMessage === "Unable to update product stock") {
    return NextResponse.json(
      { message: "No se pudo actualizar el stock" },
      { status: 500 },
    );
  }

  if (errorMessage === "Unable to record inventory movement") {
    return NextResponse.json(
      { message: "No se pudo registrar el movimiento de inventario" },
      { status: 500 },
    );
  }

  if (errorMessage === "Unable to load updated product") {
    return NextResponse.json(
      { message: "No se pudo cargar el producto actualizado" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { message: "No se pudo procesar la solicitud" },
    { status: 500 },
  );
}

function isValidStockAdjustmentRequestBody(
  requestBody: unknown,
): requestBody is StockAdjustmentRequestBody {
  if (!requestBody || typeof requestBody !== "object") {
    return false;
  }

  const parsedBody = requestBody as Record<string, unknown>;

  const hasValidProductIdentifier =
    typeof parsedBody.productIdentifier === "string" &&
    parsedBody.productIdentifier.trim().length > 0;

  const hasValidNewStock =
    typeof parsedBody.newStock === "number" &&
    Number.isFinite(parsedBody.newStock) &&
    Number.isInteger(parsedBody.newStock) &&
    parsedBody.newStock >= 0;

  const hasValidOptionalReason =
    parsedBody.adjustmentReason === undefined ||
    parsedBody.adjustmentReason === null ||
    typeof parsedBody.adjustmentReason === "string";

  return (
    hasValidProductIdentifier && hasValidNewStock && hasValidOptionalReason
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const requestBody: unknown = await request.json();

    if (!isValidStockAdjustmentRequestBody(requestBody)) {
      return NextResponse.json(
        { message: "Cuerpo de solicitud inválido" },
        { status: 400 },
      );
    }

    const resolvedAdjustmentReason =
      typeof requestBody.adjustmentReason === "string"
        ? requestBody.adjustmentReason
        : null;

    const updatedProduct = await adjustProductStockWithInventoryMovement(
      supabaseServerClient,
      {
        productIdentifier: requestBody.productIdentifier.trim(),
        newStock: requestBody.newStock,
        adjustmentReason: resolvedAdjustmentReason,
      },
    );

    return NextResponse.json({ product: updatedProduct }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedErrorResponse(error);
  }
}
