import { NextResponse } from "next/server";
import {
  requireAuthenticatedAuthorizedSupabaseClient,
} from "@/lib/supabase-server-route";
import {
  createProduct,
  listAllProducts,
  type ProductCreationPayload,
} from "@/services/productService";

function buildSanitizedErrorResponse(error: unknown): NextResponse {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { message: "Unable to process request" },
      { status: 500 },
    );
  }

  const errorMessage = error.message;

  if (errorMessage === "Authentication required") {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  if (errorMessage === "Administrator role required" || errorMessage === "Authorized role required") {
    return NextResponse.json(
      { message: "Authorized role required" },
      { status: 403 },
    );
  }

  if (errorMessage === "Missing Supabase configuration") {
    return NextResponse.json(
      { message: "Unable to process request" },
      { status: 500 },
    );
  }

  if (errorMessage === "Unable to list products") {
    return NextResponse.json({ message: "Unable to list products" }, { status: 500 });
  }

  if (errorMessage === "Unable to create product") {
    return NextResponse.json({ message: "Unable to create product" }, { status: 500 });
  }

  if (errorMessage === "Invalid product name") {
    return NextResponse.json({ message: "Invalid product name" }, { status: 400 });
  }

  if (errorMessage === "Barcode already exists") {
    return NextResponse.json({ message: "Barcode already exists" }, { status: 409 });
  }

  if (errorMessage === "Unable to validate barcode uniqueness") {
    return NextResponse.json(
      { message: "Unable to validate barcode uniqueness" },
      { status: 500 },
    );
  }

  if (errorMessage === "Invalid product category") {
    return NextResponse.json(
      { message: "Invalid product category" },
      { status: 400 },
    );
  }

  if (errorMessage === "Invalid product price") {
    return NextResponse.json(
      { message: "Invalid product price" },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: errorMessage }, { status: 500 });
}

function isValidProductCreationRequestBody(
  requestBody: unknown,
): requestBody is ProductCreationPayload {
  if (!requestBody || typeof requestBody !== "object") {
    return false;
  }

  const parsedBody = requestBody as Record<string, unknown>;

  const hasValidName =
    typeof parsedBody.name === "string" && parsedBody.name.trim().length > 0;
  const hasValidCategory =
    typeof parsedBody.category === "string" &&
    parsedBody.category.trim().length > 0 &&
    parsedBody.category.trim().length <= 80;
  const hasValidImageUrl =
    parsedBody.imageUrl === undefined ||
    parsedBody.imageUrl === null ||
    typeof parsedBody.imageUrl === "string";
  const hasValidPrice =
    typeof parsedBody.price === "number" &&
    Number.isFinite(parsedBody.price) &&
    parsedBody.price >= 0;
  const hasValidCostPrice =
    parsedBody.costPrice === undefined ||
    parsedBody.costPrice === null ||
    (typeof parsedBody.costPrice === "number" &&
      Number.isFinite(parsedBody.costPrice) &&
      parsedBody.costPrice >= 0);
  const hasValidCurrentStock =
    typeof parsedBody.currentStock === "number" &&
    Number.isFinite(parsedBody.currentStock) &&
    Number.isInteger(parsedBody.currentStock);
  const hasValidIsActive = typeof parsedBody.isActive === "boolean";
  const hasValidIsBulk =
    parsedBody.isBulk === undefined || typeof parsedBody.isBulk === "boolean";
  const hasValidQuantityPerUnit =
    parsedBody.quantityPerUnit === undefined ||
    parsedBody.quantityPerUnit === null ||
    (typeof parsedBody.quantityPerUnit === "number" &&
      Number.isFinite(parsedBody.quantityPerUnit) &&
      parsedBody.quantityPerUnit > 0);
  const hasValidIsCombo =
    parsedBody.isCombo === undefined || typeof parsedBody.isCombo === "boolean";
  const hasValidComboItems =
    parsedBody.comboItems === undefined ||
    (Array.isArray(parsedBody.comboItems) &&
      parsedBody.comboItems.every(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as { componentProductId?: unknown }).componentProductId ===
            "string" &&
          typeof (item as { quantityPerCombo?: unknown }).quantityPerCombo ===
            "number",
      ));
  const hasValidSku =
    parsedBody.sku === undefined ||
    parsedBody.sku === null ||
    typeof parsedBody.sku === "string";

  return (
    hasValidName &&
    hasValidCategory &&
    hasValidImageUrl &&
    hasValidPrice &&
    hasValidCostPrice &&
    hasValidIsBulk &&
    hasValidQuantityPerUnit &&
    hasValidIsCombo &&
    hasValidComboItems &&
    hasValidCurrentStock &&
    hasValidIsActive &&
    hasValidSku
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);
    const products = await listAllProducts(supabaseServerClient);

    return NextResponse.json({ products }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const requestBody: unknown = await request.json();

    if (!isValidProductCreationRequestBody(requestBody)) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 },
      );
    }

    const skuFromRequest =
      typeof requestBody.sku === "string" ? requestBody.sku : "";

    const resolvedCostPrice =
      typeof requestBody.costPrice === "number" &&
      Number.isFinite(requestBody.costPrice)
        ? requestBody.costPrice
        : null;

    const productCreationPayload: ProductCreationPayload = {
      name: requestBody.name,
      sku: skuFromRequest,
      category: requestBody.category,
      imageUrl:
        typeof requestBody.imageUrl === "string" || requestBody.imageUrl === null
          ? requestBody.imageUrl
          : null,
      price: requestBody.price,
      costPrice: resolvedCostPrice,
      isBulk: requestBody.isBulk === true,
      quantityPerUnit:
        typeof requestBody.quantityPerUnit === "number"
          ? requestBody.quantityPerUnit
          : null,
      isCombo: requestBody.isCombo === true,
      comboItems: Array.isArray(requestBody.comboItems)
        ? requestBody.comboItems
            .map((item) => ({
              componentProductId:
                typeof item.componentProductId === "string"
                  ? item.componentProductId
                  : "",
              quantityPerCombo:
                typeof item.quantityPerCombo === "number"
                  ? item.quantityPerCombo
                  : 0,
            }))
            .filter(
              (item) =>
                item.componentProductId.length > 0 &&
                Number.isFinite(item.quantityPerCombo) &&
                item.quantityPerCombo > 0,
            )
        : [],
      currentStock: requestBody.currentStock,
      isActive: requestBody.isActive,
    };

    const createdProduct = await createProduct(
      supabaseServerClient,
      productCreationPayload,
    );

    return NextResponse.json({ product: createdProduct }, { status: 201 });
  } catch (error: unknown) {
    return buildSanitizedErrorResponse(error);
  }
}
