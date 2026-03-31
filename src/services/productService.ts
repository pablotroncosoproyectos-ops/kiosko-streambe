import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/types/database";
import { ensureCategoryExistsInDatabase } from "@/services/categoryService";

const MAX_PRODUCT_CATEGORY_LENGTH = 80;

interface ProductDatabaseRow {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  image_url: string | null;
  price: number;
  cost_price?: number | null;
  es_granel?: boolean | null;
  cantidad_por_unidad?: number | null;
  es_combo?: boolean | null;
  current_stock: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductCreationPayload {
  name: string;
  sku: string;
  category: string;
  imageUrl: string | null;
  price: number;
  /** Precio de costo; null si no aplica */
  costPrice: number | null;
  isBulk: boolean;
  quantityPerUnit: number | null;
  isCombo: boolean;
  comboItems?: Array<{
    componentProductId: string;
    quantityPerCombo: number;
  }>;
  currentStock: number;
  isActive: boolean;
}

export interface ProductUpdatePayload {
  name?: string;
  sku?: string;
  category?: string;
  imageUrl?: string | null;
  price?: number;
  costPrice?: number | null;
  isBulk?: boolean;
  quantityPerUnit?: number | null;
  isCombo?: boolean;
  comboItems?: Array<{
    componentProductId: string;
    quantityPerCombo: number;
  }>;
  currentStock?: number;
  isActive?: boolean;
}

export function normalizeProductCategoryForDatabase(rawCategory: string): string {
  const trimmedCategory = rawCategory.trim().toUpperCase();
  if (
    trimmedCategory.length === 0 ||
    trimmedCategory.length > MAX_PRODUCT_CATEGORY_LENGTH
  ) {
    throw new Error("Invalid product category");
  }
  return trimmedCategory;
}

function mapDatabaseRowToProduct(row: ProductDatabaseRow): Product {
  const rawCostPrice = row.cost_price;
  const costPrice =
    typeof rawCostPrice === "number" && Number.isFinite(rawCostPrice)
      ? rawCostPrice
      : null;

  return {
    id: row.id,
    sku:
      row.sku === null || row.sku === undefined
        ? ""
        : typeof row.sku === "string"
          ? row.sku
          : String(row.sku),
    name: row.name,
    category: typeof row.category === "string" ? row.category : "",
    imageUrl: row.image_url,
    price: row.price,
    costPrice,
    isBulk: row.es_granel === true,
    quantityPerUnit:
      typeof row.cantidad_por_unidad === "number" &&
      Number.isFinite(row.cantidad_por_unidad) &&
      row.cantidad_por_unidad > 0
        ? row.cantidad_por_unidad
        : null,
    isCombo: row.es_combo === true,
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
      .select("*")
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

  const normalizedCategory = normalizeProductCategoryForDatabase(
    productCreationPayload.category,
  );

  await ensureCategoryExistsInDatabase(
    supabaseServerClient,
    normalizedCategory,
  );

  const normalizedSku = productCreationPayload.sku.trim();

  await assertSkuIsUniqueWhenProvided(supabaseServerClient, normalizedSku);

  const costPriceForInsert =
    typeof productCreationPayload.costPrice === "number" &&
    Number.isFinite(productCreationPayload.costPrice) &&
    productCreationPayload.costPrice >= 0
      ? productCreationPayload.costPrice
      : null;

  const priceForInsert = Number(productCreationPayload.price);
  if (!Number.isFinite(priceForInsert) || priceForInsert < 0) {
    throw new Error("Invalid product price");
  }

  const quantityPerUnitForInsert =
    typeof productCreationPayload.quantityPerUnit === "number" &&
    Number.isFinite(productCreationPayload.quantityPerUnit) &&
    productCreationPayload.quantityPerUnit > 0
      ? productCreationPayload.quantityPerUnit
      : null;

  /** SKU vacío se persiste como NULL (evita violaciones UNIQUE con '' repetidos). */
  const skuForInsert =
    normalizedSku.length > 0 ? normalizedSku : null;

  const imageUrlForInsert =
    productCreationPayload.imageUrl !== null &&
    typeof productCreationPayload.imageUrl === "string" &&
    productCreationPayload.imageUrl.trim().length > 0
      ? productCreationPayload.imageUrl.trim()
      : null;

  const productData = {
    name: trimmedProductName,
    sku: skuForInsert,
    category: normalizedCategory,
    image_url: imageUrlForInsert,
    price: priceForInsert,
    cost_price: costPriceForInsert,
    es_granel: productCreationPayload.isBulk,
    cantidad_por_unidad: productCreationPayload.isBulk
      ? quantityPerUnitForInsert
      : null,
    es_combo: productCreationPayload.isCombo,
    current_stock: productCreationPayload.currentStock,
    is_active: productCreationPayload.isActive,
  };

  console.log("FINAL PAYLOAD TO INSERT:", productData);

  const { data: insertedProductRow, error: insertProductError } =
    await supabaseServerClient
      .from("products")
      .insert(productData)
      .select("*")
      .single();

  if (insertProductError) {
    if (insertProductError.code === "23505") {
      throw new Error("Barcode already exists");
    }
    console.error("createProduct insert error:", insertProductError);
    throw new Error(
      insertProductError.message
        ? `${insertProductError.message} (code ${insertProductError.code})`
        : "Unable to create product",
    );
  }

  if (!insertedProductRow) {
    throw new Error("Unable to create product");
  }

  if (productCreationPayload.isCombo && productCreationPayload.comboItems) {
    const comboRows = productCreationPayload.comboItems
      .filter(
        (item) =>
          typeof item.componentProductId === "string" &&
          item.componentProductId.length > 0 &&
          Number.isFinite(item.quantityPerCombo) &&
          item.quantityPerCombo > 0 &&
          item.componentProductId !== String((insertedProductRow as ProductDatabaseRow).id),
      )
      .map((item) => ({
        combo_product_id: (insertedProductRow as ProductDatabaseRow).id,
        component_product_id: item.componentProductId,
        quantity_per_combo: item.quantityPerCombo,
      }));

    if (comboRows.length > 0) {
      const { error: comboInsertError } = await supabaseServerClient
        .from("combo_items")
        .insert(comboRows);
      if (comboInsertError) {
        throw new Error(
          comboInsertError.message
            ? `${comboInsertError.message} (code ${comboInsertError.code})`
            : "Unable to create product",
        );
      }
    }
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

  const databaseUpdatePayload: Record<string, string | number | boolean | null> =
    {};

  if (typeof productUpdatePayload.name === "string") {
    const trimmedName = productUpdatePayload.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Invalid product name");
    }
    databaseUpdatePayload.name = trimmedName;
  }

  if (typeof productUpdatePayload.sku === "string") {
    const trimmedSku = productUpdatePayload.sku.trim();
    databaseUpdatePayload.sku = trimmedSku.length > 0 ? trimmedSku : null;
  }
  if (typeof productUpdatePayload.category === "string") {
    const normalizedCategory = normalizeProductCategoryForDatabase(
      productUpdatePayload.category,
    );
    await ensureCategoryExistsInDatabase(
      supabaseServerClient,
      normalizedCategory,
    );
    databaseUpdatePayload.category = normalizedCategory;
  }
  if (
    typeof productUpdatePayload.imageUrl === "string" ||
    productUpdatePayload.imageUrl === null
  ) {
    if (productUpdatePayload.imageUrl === null) {
      databaseUpdatePayload.image_url = null;
    } else {
      const trimmedImageUrl = productUpdatePayload.imageUrl.trim();
      databaseUpdatePayload.image_url =
        trimmedImageUrl.length > 0 ? trimmedImageUrl : null;
    }
  }

  if (typeof productUpdatePayload.price === "number") {
    databaseUpdatePayload.price = productUpdatePayload.price;
  }

  if ("costPrice" in productUpdatePayload) {
    if (productUpdatePayload.costPrice === null) {
      databaseUpdatePayload.cost_price = null;
    } else if (
      typeof productUpdatePayload.costPrice === "number" &&
      Number.isFinite(productUpdatePayload.costPrice) &&
      productUpdatePayload.costPrice >= 0
    ) {
      databaseUpdatePayload.cost_price = productUpdatePayload.costPrice;
    }
  }

  if (typeof productUpdatePayload.isBulk === "boolean") {
    databaseUpdatePayload.es_granel = productUpdatePayload.isBulk;
  }

  if ("quantityPerUnit" in productUpdatePayload) {
    if (productUpdatePayload.quantityPerUnit === null) {
      databaseUpdatePayload.cantidad_por_unidad = null;
    } else if (
      typeof productUpdatePayload.quantityPerUnit === "number" &&
      Number.isFinite(productUpdatePayload.quantityPerUnit) &&
      productUpdatePayload.quantityPerUnit > 0
    ) {
      databaseUpdatePayload.cantidad_por_unidad =
        productUpdatePayload.quantityPerUnit;
    }
  }

  if (typeof productUpdatePayload.isCombo === "boolean") {
    databaseUpdatePayload.es_combo = productUpdatePayload.isCombo;
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
      .select("*")
      .single();

  if (updateProductError || !updatedProductRow) {
    if (updateProductError) {
      throw new Error(
        updateProductError.message
          ? `${updateProductError.message} (code ${updateProductError.code})`
          : "Unable to update product",
      );
    }
    throw new Error("Unable to update product");
  }

  if (productUpdatePayload.isCombo === true && productUpdatePayload.comboItems) {
    await supabaseServerClient
      .from("combo_items")
      .delete()
      .eq("combo_product_id", productIdentifier);

    const comboRows = productUpdatePayload.comboItems
      .filter(
        (item) =>
          typeof item.componentProductId === "string" &&
          item.componentProductId.length > 0 &&
          Number.isFinite(item.quantityPerCombo) &&
          item.quantityPerCombo > 0 &&
          item.componentProductId !== productIdentifier,
      )
      .map((item) => ({
        combo_product_id: productIdentifier,
        component_product_id: item.componentProductId,
        quantity_per_combo: item.quantityPerCombo,
      }));

    if (comboRows.length > 0) {
      const { error: comboInsertError } = await supabaseServerClient
        .from("combo_items")
        .insert(comboRows);
      if (comboInsertError) {
        throw new Error(
          comboInsertError.message
            ? `${comboInsertError.message} (code ${comboInsertError.code})`
            : "Unable to update product",
        );
      }
    }
  }

  return mapDatabaseRowToProduct(updatedProductRow as ProductDatabaseRow);
}

export interface StockAdjustmentParameters {
  productIdentifier: string;
  newStock: number;
  adjustmentReason: string | null;
}

export async function adjustProductStockWithInventoryMovement(
  supabaseServerClient: SupabaseClient,
  stockAdjustmentParameters: StockAdjustmentParameters,
): Promise<Product> {
  const { data: authenticationData, error: authenticationError } =
    await supabaseServerClient.auth.getUser();

  if (authenticationError || !authenticationData.user) {
    throw new Error("Authentication required");
  }

  const authenticatedUserIdentifier = authenticationData.user.id;

  const { data: productRow, error: fetchProductError } =
    await supabaseServerClient
      .from("products")
      .select("id, current_stock")
      .eq("id", stockAdjustmentParameters.productIdentifier)
      .maybeSingle();

  if (fetchProductError || !productRow) {
    throw new Error("Product not found");
  }

  const currentStockValue = productRow.current_stock as number;
  const newStockValue = stockAdjustmentParameters.newStock;

  if (!Number.isInteger(newStockValue) || newStockValue < 0) {
    throw new Error("Invalid new stock");
  }

  const stockDelta = newStockValue - currentStockValue;

  if (stockDelta === 0) {
    throw new Error("No stock change");
  }

  const trimmedAdjustmentReason = (
    stockAdjustmentParameters.adjustmentReason ?? ""
  ).trim();

  if (stockDelta < 0 && trimmedAdjustmentReason.length === 0) {
    throw new Error("Adjustment reason required");
  }

  const movementType = stockDelta > 0 ? "IN" : "OUT";
  const movementQuantity = Math.abs(stockDelta);
  const reasonForMovementRow =
    stockDelta > 0
      ? trimmedAdjustmentReason.length > 0
        ? trimmedAdjustmentReason
        : ""
      : trimmedAdjustmentReason;

  const { error: updateStockError } = await supabaseServerClient
    .from("products")
    .update({ current_stock: newStockValue })
    .eq("id", stockAdjustmentParameters.productIdentifier);

  if (updateStockError) {
    throw new Error("Unable to update product stock");
  }

  const { error: insertMovementError } = await supabaseServerClient
    .from("inventory_movements")
    .insert({
      product_id: stockAdjustmentParameters.productIdentifier,
      user_id: authenticatedUserIdentifier,
      quantity: movementQuantity,
      movement_type: movementType,
      reason: reasonForMovementRow,
    });

  if (insertMovementError) {
    await supabaseServerClient
      .from("products")
      .update({ current_stock: currentStockValue })
      .eq("id", stockAdjustmentParameters.productIdentifier);
    throw new Error("Unable to record inventory movement");
  }

  const { data: updatedProductRow, error: refetchProductError } =
    await supabaseServerClient
      .from("products")
      .select("*")
      .eq("id", stockAdjustmentParameters.productIdentifier)
      .single();

  if (refetchProductError || !updatedProductRow) {
    throw new Error("Unable to load updated product");
  }

  return mapDatabaseRowToProduct(updatedProductRow as ProductDatabaseRow);
}
