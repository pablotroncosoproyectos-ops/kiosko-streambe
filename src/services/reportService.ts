import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getBuenosAiresZonedDayBoundsUtcIsoStrings,
  isValidCalendarDateYyyyMmDd,
} from "@/lib/buenosAiresReportingCalendar";

const AUTOMATIC_SALE_CATEGORY_RECREATION_BREAK = "RECREO";
const AUTOMATIC_SALE_CATEGORY_FREE_SALE = "VENTA_LIBRE";

export interface DailySalesSummaryMetrics {
  dailyRevenueTotal: number;
  totalSalesTransactionCount: number;
  revenueByAutomaticSaleCategory: Array<{
    automaticSaleCategory: "RECREO" | "VENTA_LIBRE";
    categoryDisplayLabel: string;
    revenue: number;
  }>;
}

export interface TopSellingProductReportRow {
  productIdentifier: string;
  productName: string;
  stockKeepingUnit: string | null;
  totalUnitsSold: number;
  totalRevenue: number;
}

function parseNumericValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }
  return 0;
}

function resolveAutomaticSaleCategoryFromDailySummaryRow(
  row: Record<string, unknown>,
): "RECREO" | "VENTA_LIBRE" | null {
  const rawCategory =
    row.session_type ??
    row.sessionType ??
    row.automatic_sale_category ??
    row.automaticSaleCategory ??
    row.sale_session_type;

  if (rawCategory === AUTOMATIC_SALE_CATEGORY_RECREATION_BREAK) {
    return AUTOMATIC_SALE_CATEGORY_RECREATION_BREAK;
  }
  if (rawCategory === AUTOMATIC_SALE_CATEGORY_FREE_SALE) {
    return AUTOMATIC_SALE_CATEGORY_FREE_SALE;
  }
  return null;
}

function mapTopProductsViewRow(
  row: Record<string, unknown>,
): TopSellingProductReportRow {
  const productIdentifierRaw =
    row.product_id ?? row.productId ?? row.id ?? "";
  const productNameRaw =
    row.product_name ?? row.productName ?? row.name ?? "Sin nombre";
  const stockKeepingUnitRaw = row.sku ?? row.stock_keeping_unit ?? null;
  const totalUnitsSoldRaw =
    row.total_quantity_sold ??
    row.totalQuantitySold ??
    row.units_sold ??
    row.quantity_sold ??
    0;
  const totalRevenueRaw =
    row.total_revenue ?? row.totalRevenue ?? row.revenue ?? 0;

  return {
    productIdentifier: String(productIdentifierRaw),
    productName: String(productNameRaw),
    stockKeepingUnit:
      typeof stockKeepingUnitRaw === "string" && stockKeepingUnitRaw.length > 0
        ? stockKeepingUnitRaw
        : null,
    totalUnitsSold: Math.round(parseNumericValue(totalUnitsSoldRaw)),
    totalRevenue: parseNumericValue(totalRevenueRaw),
  };
}

export async function getDailySalesSummaryMetrics(
  supabaseClient: SupabaseClient,
): Promise<DailySalesSummaryMetrics> {
  const { data: dailySummaryRows, error: dailySummaryError } =
    await supabaseClient.from("v_daily_sales_summary").select("*");

  if (dailySummaryError) {
    throw new Error("Unable to load daily sales summary metrics");
  }

  const rows = dailySummaryRows ?? [];
  let dailyRevenueTotal = 0;
  let totalSalesTransactionCount = 0;
  let recreationBreakSessionRevenue = 0;
  let freeSaleSessionRevenue = 0;

  for (const rowUnknown of rows) {
    const row = rowUnknown as Record<string, unknown>;
    const rowRevenue = parseNumericValue(row.total_revenue);
    const rowTransactions = parseNumericValue(row.total_transactions);

    dailyRevenueTotal += rowRevenue;
    totalSalesTransactionCount += rowTransactions;

    const automaticSaleCategory =
      resolveAutomaticSaleCategoryFromDailySummaryRow(row);
    if (automaticSaleCategory === AUTOMATIC_SALE_CATEGORY_RECREATION_BREAK) {
      recreationBreakSessionRevenue += rowRevenue;
    } else if (automaticSaleCategory === AUTOMATIC_SALE_CATEGORY_FREE_SALE) {
      freeSaleSessionRevenue += rowRevenue;
    }
  }

  return {
    dailyRevenueTotal,
    totalSalesTransactionCount,
    revenueByAutomaticSaleCategory: [
      {
        automaticSaleCategory: AUTOMATIC_SALE_CATEGORY_RECREATION_BREAK,
        categoryDisplayLabel: "Recreo",
        revenue: recreationBreakSessionRevenue,
      },
      {
        automaticSaleCategory: AUTOMATIC_SALE_CATEGORY_FREE_SALE,
        categoryDisplayLabel: "Venta libre",
        revenue: freeSaleSessionRevenue,
      },
    ],
  };
}

export async function getCriticalStockAlertCount(
  supabaseClient: SupabaseClient,
): Promise<number> {
  const { count, error: countError } = await supabaseClient
    .from("v_low_stock_alerts")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error("Unable to load critical stock alert count");
  }

  return typeof count === "number" ? count : 0;
}

export async function getTopSellingProducts(
  supabaseClient: SupabaseClient,
  maximumProductCount: number,
): Promise<TopSellingProductReportRow[]> {
  const { data: topProductRows, error: topProductsError } =
    await supabaseClient
      .from("v_top_products")
      .select("*")
      .limit(maximumProductCount);

  if (topProductsError) {
    throw new Error("Unable to load top selling products");
  }

  return (topProductRows ?? []).map((row) =>
    mapTopProductsViewRow(row as Record<string, unknown>),
  );
}

export interface DailyClosureReportMetrics {
  reportCalendarDateYyyyMmDd: string;
  totalRevenue: number;
  totalTransactionCount: number;
  recreationBreakSessionRevenueTotal: number;
  freeSaleSessionRevenueTotal: number;
  grandTotalReconciliationAmount: number;
  revenueTotalCash: number;
  revenueTotalQr: number;
  revenueTotalTransfer: number;
  revenueTotalDebit: number;
  transactionCountCash: number;
  transactionCountQr: number;
  transactionCountTransfer: number;
  transactionCountDebit: number;
}

export interface InventoryMovementReportRow {
  movementIdentifier: string;
  productIdentifier: string;
  productName: string;
  movementType: string;
  quantity: number;
  reason: string;
  createdAtIso: string;
}

/**
 * Aggregates sales for a calendar day (Buenos Aires) from the sales table with session type
 * and payment method totals (CASH, QR, TRANSFER, DEBIT).
 */
export async function getDailyClosureReportMetrics(
  supabaseClient: SupabaseClient,
  reportCalendarDateYyyyMmDd: string,
): Promise<DailyClosureReportMetrics> {
  if (!isValidCalendarDateYyyyMmDd(reportCalendarDateYyyyMmDd)) {
    throw new Error("Invalid report calendar date");
  }

  const { rangeStartInclusiveUtcIso, rangeEndExclusiveUtcIso } =
    getBuenosAiresZonedDayBoundsUtcIsoStrings(reportCalendarDateYyyyMmDd);

  const { data: saleRows, error: salesError } = await supabaseClient
    .from("sales")
    .select("total_price, payment_method, sales_sessions!inner(session_type)")
    .gte("created_at", rangeStartInclusiveUtcIso)
    .lt("created_at", rangeEndExclusiveUtcIso);

  if (salesError) {
    throw new Error("Unable to load daily closure report metrics");
  }

  let totalRevenue = 0;
  let totalTransactionCount = 0;
  let recreationBreakSessionRevenueTotal = 0;
  let freeSaleSessionRevenueTotal = 0;
  let revenueTotalCash = 0;
  let revenueTotalQr = 0;
  let revenueTotalTransfer = 0;
  let revenueTotalDebit = 0;
  let transactionCountCash = 0;
  let transactionCountQr = 0;
  let transactionCountTransfer = 0;
  let transactionCountDebit = 0;

  for (const rowUnknown of saleRows ?? []) {
    const row = rowUnknown as Record<string, unknown>;
    const saleTotalPrice = parseNumericValue(row.total_price);
    const paymentMethodRaw = row.payment_method;
    const paymentMethodString =
      typeof paymentMethodRaw === "string" ? paymentMethodRaw : "";

    const sessionNestedUnknown = row.sales_sessions;
    let sessionTypeString: string | null = null;
    if (Array.isArray(sessionNestedUnknown)) {
      const firstSession = sessionNestedUnknown[0] as
        | Record<string, unknown>
        | undefined;
      const rawType = firstSession?.session_type;
      sessionTypeString = typeof rawType === "string" ? rawType : null;
    } else if (
      sessionNestedUnknown &&
      typeof sessionNestedUnknown === "object" &&
      !Array.isArray(sessionNestedUnknown)
    ) {
      const nestedRecord = sessionNestedUnknown as Record<string, unknown>;
      const rawType = nestedRecord.session_type;
      sessionTypeString = typeof rawType === "string" ? rawType : null;
    }

    totalRevenue += saleTotalPrice;
    totalTransactionCount += 1;

    if (sessionTypeString === AUTOMATIC_SALE_CATEGORY_RECREATION_BREAK) {
      recreationBreakSessionRevenueTotal += saleTotalPrice;
    } else if (sessionTypeString === AUTOMATIC_SALE_CATEGORY_FREE_SALE) {
      freeSaleSessionRevenueTotal += saleTotalPrice;
    }

    if (paymentMethodString === "CASH") {
      revenueTotalCash += saleTotalPrice;
      transactionCountCash += 1;
    } else if (paymentMethodString === "QR") {
      revenueTotalQr += saleTotalPrice;
      transactionCountQr += 1;
    } else if (paymentMethodString === "TRANSFER") {
      revenueTotalTransfer += saleTotalPrice;
      transactionCountTransfer += 1;
    } else if (paymentMethodString === "DEBIT") {
      revenueTotalDebit += saleTotalPrice;
      transactionCountDebit += 1;
    }
  }

  const grandTotalReconciliationAmount =
    recreationBreakSessionRevenueTotal + freeSaleSessionRevenueTotal;

  return {
    reportCalendarDateYyyyMmDd,
    totalRevenue,
    totalTransactionCount,
    recreationBreakSessionRevenueTotal,
    freeSaleSessionRevenueTotal,
    grandTotalReconciliationAmount,
    revenueTotalCash,
    revenueTotalQr,
    revenueTotalTransfer,
    revenueTotalDebit,
    transactionCountCash,
    transactionCountQr,
    transactionCountTransfer,
    transactionCountDebit,
  };
}

export async function getRecentInventoryMovementsWithProductName(
  supabaseClient: SupabaseClient,
  maximumRowCount: number,
): Promise<InventoryMovementReportRow[]> {
  const { data: movementRows, error: movementsError } = await supabaseClient
    .from("inventory_movements")
    .select(
      "id, product_id, quantity, movement_type, reason, created_at, products(name)",
    )
    .order("created_at", { ascending: false })
    .limit(maximumRowCount);

  if (movementsError) {
    throw new Error("Unable to load inventory movements");
  }

  return (movementRows ?? []).map((rowUnknown) => {
    const row = rowUnknown as Record<string, unknown>;
    const productsNestedUnknown = row.products;

    let resolvedProductName = "Unknown product";
    if (Array.isArray(productsNestedUnknown)) {
      const firstProductRow = productsNestedUnknown[0] as
        | { name?: string }
        | undefined;
      if (
        typeof firstProductRow?.name === "string" &&
        firstProductRow.name.trim().length > 0
      ) {
        resolvedProductName = firstProductRow.name;
      }
    } else if (
      productsNestedUnknown &&
      typeof productsNestedUnknown === "object" &&
      !Array.isArray(productsNestedUnknown)
    ) {
      const productRecord = productsNestedUnknown as { name?: string };
      if (
        typeof productRecord.name === "string" &&
        productRecord.name.trim().length > 0
      ) {
        resolvedProductName = productRecord.name;
      }
    }

    return {
      movementIdentifier: String(row.id ?? ""),
      productIdentifier: String(row.product_id ?? ""),
      productName: resolvedProductName,
      movementType: String(row.movement_type ?? ""),
      quantity: Math.round(parseNumericValue(row.quantity)),
      reason: typeof row.reason === "string" ? row.reason : "",
      createdAtIso: String(row.created_at ?? ""),
    };
  });
}
