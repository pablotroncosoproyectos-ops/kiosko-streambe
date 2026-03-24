import type { SupabaseClient } from "@supabase/supabase-js";

export interface SaleItemInput {
  productIdentifier: string;
  quantity: number;
}

export interface ProcessSalePayload {
  saleItemsList: SaleItemInput[];
  paymentMethod: "CASH" | "TRANSFER" | "QR";
}

export interface ProcessSaleResult {
  saleIdentifier: string;
  totalSaleAmount: number;
}

interface ProcessSaleRpcRow {
  sale_id: string;
  total_sale_amount: number;
}

function validateProcessSalePayload(processSalePayload: ProcessSalePayload): void {
  if (!Array.isArray(processSalePayload.saleItemsList) || processSalePayload.saleItemsList.length === 0) {
    throw new Error("Sale items list is required");
  }

  for (const saleItem of processSalePayload.saleItemsList) {
    if (
      typeof saleItem.productIdentifier !== "string" ||
      saleItem.productIdentifier.trim().length === 0
    ) {
      throw new Error("Invalid sale item product identifier");
    }

    if (
      typeof saleItem.quantity !== "number" ||
      !Number.isInteger(saleItem.quantity) ||
      saleItem.quantity <= 0
    ) {
      throw new Error("Invalid sale item quantity");
    }
  }
}

export async function processSale(
  supabaseServerClient: SupabaseClient,
  processSalePayload: ProcessSalePayload,
): Promise<ProcessSaleResult> {
  validateProcessSalePayload(processSalePayload);

  const { data: processSaleData, error: processSaleError } = await supabaseServerClient.rpc(
    "process_sale",
    {
      p_payment_method: processSalePayload.paymentMethod,
      p_sale_items: processSalePayload.saleItemsList.map((saleItem) => ({
        product_id: saleItem.productIdentifier,
        quantity: saleItem.quantity,
      })),
    },
  );

  if (processSaleError) {
    const rpcErrorMessage = processSaleError.message.toLowerCase();
    if (rpcErrorMessage.includes("insufficient stock")) {
      throw new Error("Insufficient stock");
    }
    throw new Error("Unable to process sale");
  }

  const processSaleRows = processSaleData as ProcessSaleRpcRow[] | null;
  const processSaleRow = Array.isArray(processSaleRows)
    ? processSaleRows[0]
    : (processSaleData as ProcessSaleRpcRow | null);

  if (!processSaleRow || typeof processSaleRow.sale_id !== "string") {
    throw new Error("Unable to process sale");
  }

  return {
    saleIdentifier: processSaleRow.sale_id,
    totalSaleAmount: Number(processSaleRow.total_sale_amount),
  };
}
