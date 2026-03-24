import type { SupabaseClient } from "@supabase/supabase-js";

export interface SaleItemInput {
  productIdentifier: string;
  quantity: number;
}

export interface ProcessSalePayload {
  saleItemsList: SaleItemInput[];
  paymentMethod: "CASH" | "DEBIT" | "TRANSFER" | "QR";
  automaticSaleCategory: "RECREO" | "VENTA_LIBRE";
}

export interface ProcessSaleResult {
  saleIdentifier: string;
  totalSaleAmount: number;
}

interface ProcessSaleRpcObject {
  sale_id?: string;
  total?: number;
  total_sale_amount?: number;
}

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
      typeof saleItem.productIdentifier !== "string" ||
      saleItem.productIdentifier.trim().length === 0
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
  const sessionType = processSalePayload.automaticSaleCategory;
  const saleItems = processSalePayload.saleItemsList.map((saleItem) => ({
    product_id: saleItem.productIdentifier,
    quantity: saleItem.quantity,
  }));

  const { data, error: processSaleError } = await supabaseServerClient.rpc(
    "process_sale",
    {
      p_payment_method: paymentMethod,
      p_session_type: sessionType,
      p_sale_items: saleItems,
    },
  );

  if (processSaleError) {
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
    throw new Error("No se pudo procesar la venta");
  }

  const processSaleObject = data as ProcessSaleRpcObject | null;
  if (!processSaleObject || typeof processSaleObject.sale_id !== "string") {
    throw new Error("No se pudo procesar la venta");
  }

  const totalSaleAmount =
    typeof processSaleObject.total === "number"
      ? processSaleObject.total
      : processSaleObject.total_sale_amount;

  if (typeof totalSaleAmount !== "number") {
    throw new Error("No se pudo procesar la venta");
  }

  return {
    saleIdentifier: processSaleObject.sale_id,
    totalSaleAmount: Number(totalSaleAmount),
  };
}