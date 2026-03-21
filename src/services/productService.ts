import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/types/database";

interface ProductDatabaseRow {
  id: string;
  sku: string;
  name: string;
  price: number;
  current_stock: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductCreationPayload {
  name: string;
  sku: string;
  price: number;
  currentStock: number;
  isActive: boolean;
}

export interface ProductUpdatePayload {
  name?: string;
  sku?: string;
  price?: number;
  currentStock?: number;
  isActive?: boolean;
}

function mapDatabaseRowToProduct(row: ProductDatabaseRow): Product {
  return {
    id: row.id,
    sku: typeof row.sku === "string" ? row.sku : "",
    name: row.name,
    price: row.price,
    currentStock: row.current_stock,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function assertSkuIsUniqueWhenProvided(
  supabaseServerClient: SupabaseClient,
  skuValue: string,
  excludeProductIdentifier?: string,
): Promise<void> {
  const trimmedSku = skuValue.trim();

  if (trimmedSku.length === 0) {
    return;
  }

  let uniquenessQuery = supabaseServerClient
    .from("products")
    .select("id")
    .eq("sku", trimmedSku);

  if (typeof excludeProductIdentifier === "string") {
    uniquenessQuery = uniquenessQuery.neq("id", excludeProductIdentifier);
  }

  const { data: existingProductRow, error: existingProductError } =
    await uniquenessQuery.maybeSingle();

  if (existingProductError) {
    throw new Error("Unable to validate barcode uniqueness");
  }

  if (existingProductRow) {
    throw new Error("Barcode already exists");
  }
}

export async function listAllProducts(
  supabaseServerClient: SupabaseClient,
): Promise<Product[]> {
  const { data: productRows, error: productListError } =
    await supabaseServerClient
      .from("products")
      .select(
        "id, sku, name, price, current_stock, is_active, created_at",
      )
      .order("created_at", { ascending: false });

  if (productListError || !productRows) {
    throw new Error("Unable to list products");
  }

  return productRows.map((row) =>
    mapDatabaseRowToProduct(row as ProductDatabaseRow),
  );
}

export async function createProduct(
  supabaseServerClient: SupabaseClient,
  productCreationPayload: ProductCreationPayload,
): Promise<Product> {
  const trimmedProductName = productCreationPayload.name.trim();

  if (trimmedProductName.length === 0) {
    throw new Error("Invalid product name");
  }

  const normalizedSku = productCreationPayload.sku.trim();

  await assertSkuIsUniqueWhenProvided(supabaseServerClient, normalizedSku);

  const { data: insertedProductRow, error: insertProductError } =
    await supabaseServerClient
      .from("products")
      .insert({
        name: trimmedProductName,
        sku: normalizedSku,
        price: productCreationPayload.price,
        current_stock: productCreationPayload.currentStock,
        is_active: productCreationPayload.isActive,
      })
      .select(
        "id, sku, name, price, current_stock, is_active, created_at",
      )
      .single();

  if (insertProductError || !insertedProductRow) {
    throw new Error("Unable to create product");
  }

  return mapDatabaseRowToProduct(insertedProductRow as ProductDatabaseRow);
}

export async function updateProductByIdentifier(
  supabaseServerClient: SupabaseClient,
  productIdentifier: string,
  productUpdatePayload: ProductUpdatePayload,
): Promise<Product> {
  if (typeof productUpdatePayload.sku === "string") {
    await assertSkuIsUniqueWhenProvided(
      supabaseServerClient,
      productUpdatePayload.sku,
      productIdentifier,
    );
  }

  const databaseUpdatePayload: Record<string, string | number | boolean> = {};

  if (typeof productUpdatePayload.name === "string") {
    const trimmedName = productUpdatePayload.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Invalid product name");
    }
    databaseUpdatePayload.name = trimmedName;
  }

  if (typeof productUpdatePayload.sku === "string") {
    databaseUpdatePayload.sku = productUpdatePayload.sku.trim();
  }

  if (typeof productUpdatePayload.price === "number") {
    databaseUpdatePayload.price = productUpdatePayload.price;
  }

  if (typeof productUpdatePayload.currentStock === "number") {
    databaseUpdatePayload.current_stock = productUpdatePayload.currentStock;
  }

  if (typeof productUpdatePayload.isActive === "boolean") {
    databaseUpdatePayload.is_active = productUpdatePayload.isActive;
  }

  if (Object.keys(databaseUpdatePayload).length === 0) {
    throw new Error("No valid fields to update");
  }

  const { data: updatedProductRow, error: updateProductError } =
    await supabaseServerClient
      .from("products")
      .update(databaseUpdatePayload)
      .eq("id", productIdentifier)
      .select(
        "id, sku, name, price, current_stock, is_active, created_at",
      )
      .single();

  if (updateProductError || !updatedProductRow) {
    throw new Error("Unable to update product");
  }

  return mapDatabaseRowToProduct(updatedProductRow as ProductDatabaseRow);
}
