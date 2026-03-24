import { NextResponse } from "next/server";
import {
  requireAuthenticatedAdministratorSupabaseClient,
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

  return NextResponse.json(
    { message: "Unable to process request" },
    { status: 500 },
  );
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
    parsedBody.category === "DULCE" ||
    parsedBody.category === "SALADO" ||
    parsedBody.category === "SNACK" ||
    parsedBody.category === "BEBIDA" ||
    parsedBody.category === "FRUTA" ||
    parsedBody.category === "LIBRERIA";
  const hasValidImageUrl =
    parsedBody.imageUrl === undefined ||
    parsedBody.imageUrl === null ||
    typeof parsedBody.imageUrl === "string";
  const hasValidPrice =
    typeof parsedBody.price === "number" && Number.isFinite(parsedBody.price);
  const hasValidCurrentStock =
    typeof parsedBody.currentStock === "number" &&
    Number.isFinite(parsedBody.currentStock) &&
    Number.isInteger(parsedBody.currentStock);
  const hasValidIsActive = typeof parsedBody.isActive === "boolean";
  const hasValidSku =
    parsedBody.sku === undefined ||
    parsedBody.sku === null ||
    typeof parsedBody.sku === "string";

  return (
    hasValidName &&
    hasValidCategory &&
    hasValidImageUrl &&
    hasValidPrice &&
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
      await requireAuthenticatedAdministratorSupabaseClient();

    const requestBody: unknown = await request.json();

    if (!isValidProductCreationRequestBody(requestBody)) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 },
      );
    }

    const skuFromRequest =
      typeof requestBody.sku === "string" ? requestBody.sku : "";

    const productCreationPayload: ProductCreationPayload = {
      name: requestBody.name,
      sku: skuFromRequest,
      category: requestBody.category,
      imageUrl:
        typeof requestBody.imageUrl === "string" || requestBody.imageUrl === null
          ? requestBody.imageUrl
          : null,
      price: requestBody.price,
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
