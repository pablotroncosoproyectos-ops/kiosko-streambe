import { NextResponse } from "next/server";
import { requireAuthenticatedAdministratorSupabaseClient } from "@/lib/supabase-server-route";
import {
  updateProductByIdentifier,
  type ProductUpdatePayload,
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

  if (errorMessage === "Administrator role required") {
    return NextResponse.json(
      { message: "Administrator role required" },
      { status: 403 },
    );
  }

  if (errorMessage === "Missing Supabase configuration") {
    return NextResponse.json(
      { message: "Unable to process request" },
      { status: 500 },
    );
  }

  if (errorMessage === "Unable to update product") {
    return NextResponse.json({ message: "Unable to update product" }, { status: 500 });
  }

  if (errorMessage === "No valid fields to update") {
    return NextResponse.json(
      { message: "No valid fields to update" },
      { status: 400 },
    );
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

function parseProductUpdatePayload(
  requestBody: unknown,
): ProductUpdatePayload | null {
  if (!requestBody || typeof requestBody !== "object") {
    return null;
  }

  const parsedBody = requestBody as Record<string, unknown>;
  const productUpdatePayload: ProductUpdatePayload = {};

  if ("name" in parsedBody) {
    if (typeof parsedBody.name !== "string") {
      return null;
    }
    productUpdatePayload.name = parsedBody.name;
  }

  if ("sku" in parsedBody) {
    if (typeof parsedBody.sku !== "string") {
      return null;
    }
    productUpdatePayload.sku = parsedBody.sku;
  }

  if ("price" in parsedBody) {
    if (
      typeof parsedBody.price !== "number" ||
      !Number.isFinite(parsedBody.price)
    ) {
      return null;
    }
    productUpdatePayload.price = parsedBody.price;
  }

  if ("currentStock" in parsedBody) {
    if (
      typeof parsedBody.currentStock !== "number" ||
      !Number.isFinite(parsedBody.currentStock) ||
      !Number.isInteger(parsedBody.currentStock)
    ) {
      return null;
    }
    productUpdatePayload.currentStock = parsedBody.currentStock;
  }

  if ("isActive" in parsedBody) {
    if (typeof parsedBody.isActive !== "boolean") {
      return null;
    }
    productUpdatePayload.isActive = parsedBody.isActive;
  }

  return productUpdatePayload;
}

export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ productIdentifier: string }> },
): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAdministratorSupabaseClient();

    const { productIdentifier } = await routeContext.params;

    if (typeof productIdentifier !== "string" || productIdentifier.length === 0) {
      return NextResponse.json({ message: "Invalid product identifier" }, { status: 400 });
    }

    const requestBody: unknown = await request.json();
    const productUpdatePayload = parseProductUpdatePayload(requestBody);

    if (!productUpdatePayload) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 },
      );
    }

    if (Object.keys(productUpdatePayload).length === 0) {
      return NextResponse.json(
        { message: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updatedProduct = await updateProductByIdentifier(
      supabaseServerClient,
      productIdentifier,
      productUpdatePayload,
    );

    return NextResponse.json({ product: updatedProduct }, { status: 200 });
  } catch (error: unknown) {
    return buildSanitizedErrorResponse(error);
  }
}
