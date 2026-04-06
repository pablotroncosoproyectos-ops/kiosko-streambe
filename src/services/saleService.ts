import type { SupabaseClient } from "@supabase/supabase-js";

export interface SaleItemInput {
  productId: string;
  quantity: number;
}

export interface ProcessSalePayload {
  saleItemsList: SaleItemInput[];
  paymentMethod: "CASH" | "DEBIT" | "TRANSFER" | "QR";
  automaticSaleCategory: "RECREO" | "VENTA_LIBRE";
  notes?: string | null;
}

export interface ProcessSaleResult {
  saleIdentifier: string;
  totalSaleAmount: number;
}

interface ProcessSaleRpcObject {
  saleId?: string;
  sale_id?: string;
  total?: number;
  total_sale_amount?: number;
}

export const MISSING_OPEN_SESSION_ERROR_MESSAGE =
  "Debe abrir una sesión (Caja/Recreo) antes de realizar una venta.";
export const INVENTORY_MOVEMENT_PRODUCT_ID_NULL_ERROR_MESSAGE =
  "No se pudo registrar el movimiento de inventario. Revise la función/trigger de inventario (product_id nulo).";

function validateProcessSalePayload(processSalePayload: ProcessSalePayload): void {
  if (
    processSalePayload.automaticSaleCategory !== "RECREO" &&
    processSalePayload.automaticSaleCategory !== "VENTA_LIBRE"
  ) {
    throw new Error("Categoría de venta automática inválida");
  }

  if (!Array.isArray(processSalePayload.saleItemsList) || processSalePayload.saleItemsList.length === 0) {
    throw new Error("La lista de artículos es requerida");
  }

  for (const saleItem of processSalePayload.saleItemsList) {
    if (
      typeof saleItem.productId !== "string" ||
      saleItem.productId.trim().length === 0
    ) {
      throw new Error("Identificador de producto inválido");
    }

    if (
      typeof saleItem.quantity !== "number" ||
      !Number.isInteger(saleItem.quantity) ||
      saleItem.quantity <= 0
    ) {
      throw new Error("Cantidad de artículo inválida");
    }
  }
}

export async function processSale(
  supabaseServerClient: SupabaseClient,
  processSalePayload: ProcessSalePayload,
): Promise<ProcessSaleResult> {
  validateProcessSalePayload(processSalePayload);

  const paymentMethod = processSalePayload.paymentMethod;
  const sessionType = processSalePayload.automaticSaleCategory
    .toUpperCase()
    .trim() as ProcessSalePayload["automaticSaleCategory"];
  const normalizedNotes =
    typeof processSalePayload.notes === "string" &&
    processSalePayload.notes.trim().length > 0
      ? processSalePayload.notes.trim()
      : null;
  const saleItems = processSalePayload.saleItemsList.map((saleItem) => ({
    product_id: saleItem.productId,
    quantity: saleItem.quantity,
  }));

  // La RPC `process_sale` en Postgres debe resolver la sesión VENTA_LIBRE con la caja global
  // del kiosco (p. ej. `public.kiosko_open_venta_libre_session_id()`), no solo por auth.uid().
  const { data, error: processSaleError } = await supabaseServerClient.rpc(
    "process_sale",
    {
      p_payment_method: paymentMethod,
      p_session_type: sessionType,
      p_sale_items: saleItems,
    },
  );

  if (processSaleError) {
    const rpcErrorUnknown = processSaleError as unknown as {
      details?: string;
      hint?: string;
      code?: string;
    };

    const rpcErrorMessage = processSaleError.message.toLowerCase();
    if (rpcErrorMessage.includes("insufficient stock")) {
      throw new Error("Stock insuficiente");
    }
    if (rpcErrorMessage.includes("invalid payment method")) {
      throw new Error("Método de pago inválido");
    }
    if (rpcErrorMessage.includes("invalid automatic sale category")) {
      throw new Error("Categoría de venta automática inválida");
    }
    if (
      rpcErrorUnknown.code === "P0001" &&
      rpcErrorMessage.includes("no se encontró una sesión abierta")
    ) {
      throw new Error(MISSING_OPEN_SESSION_ERROR_MESSAGE);
    }
    if (
      rpcErrorUnknown.code === "23502" &&
      rpcErrorMessage.includes('column "product_id"') &&
      rpcErrorMessage.includes("inventory_movements")
    ) {
      throw new Error(INVENTORY_MOVEMENT_PRODUCT_ID_NULL_ERROR_MESSAGE);
    }
    throw new Error(
      processSaleError.message.trim().length > 0
        ? `${processSaleError.message} (code ${rpcErrorUnknown.code ?? "unknown"})`
        : "No se pudo procesar la venta",
    );
  }

  const processSaleObject = data as ProcessSaleRpcObject | null;
  const resolvedSaleIdentifier =
    typeof processSaleObject?.sale_id === "string"
      ? processSaleObject.sale_id
      : typeof processSaleObject?.saleId === "string"
        ? processSaleObject.saleId
        : null;

  if (resolvedSaleIdentifier === null) {
    throw new Error("No se pudo procesar la venta");
  }

  if (normalizedNotes !== null) {
    const { error: updateSaleNotesError } = await supabaseServerClient
      .from("sales")
      .update({ notes: normalizedNotes })
      .eq("id", resolvedSaleIdentifier);
    if (updateSaleNotesError) {
      throw new Error(
        updateSaleNotesError.message.trim().length > 0
          ? `No se pudo guardar las observaciones: ${updateSaleNotesError.message}`
          : "No se pudo guardar las observaciones",
      );
    }
  }

  const resolvedProcessSaleObject = processSaleObject as ProcessSaleRpcObject;
  const totalSaleAmountRaw =
    typeof resolvedProcessSaleObject.total === "number"
      ? resolvedProcessSaleObject.total
      : resolvedProcessSaleObject.total_sale_amount;
  const totalSaleAmount =
    typeof totalSaleAmountRaw === "number" && Number.isFinite(totalSaleAmountRaw)
      ? totalSaleAmountRaw
      : 0;

  return {
    saleIdentifier: resolvedSaleIdentifier,
    totalSaleAmount: Number(totalSaleAmount),
  };
}