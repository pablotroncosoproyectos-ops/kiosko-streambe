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

export type ReportSessionTypeFilter = "TOTAL" | "RECREO" | "LIBRE";

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

interface TopProductsSaleItemRow {
  product_id: string;
  quantity: number;
  unit_price: number | null;
  products: { name?: string; sku?: string } | { name?: string; sku?: string }[] | null;
  sales:
    | {
        created_at?: string;
        sales_sessions?:
          | { session_type?: string }
          | { session_type?: string }[]
          | null;
      }
    | {
        created_at?: string;
        sales_sessions?:
          | { session_type?: string }
          | { session_type?: string }[]
          | null;
      }[]
    | null;
}

function resolveSessionTypeFromSaleItemRow(
  row: TopProductsSaleItemRow,
): string | null {
  const salesNested = row.sales;
  const salesRecord = Array.isArray(salesNested)
    ? (salesNested[0] ?? null)
    : salesNested;
  if (!salesRecord || typeof salesRecord !== "object") {
    return null;
  }
  const sessionsNested = (salesRecord as { sales_sessions?: unknown }).sales_sessions;
  const sessionRecord = Array.isArray(sessionsNested)
    ? (sessionsNested[0] ?? null)
    : sessionsNested;
  if (!sessionRecord || typeof sessionRecord !== "object") {
    return null;
  }
  const raw = (sessionRecord as { session_type?: unknown }).session_type;
  return typeof raw === "string" ? raw : null;
}

function resolveProductInfoFromSaleItemRow(row: TopProductsSaleItemRow): {
  name: string;
  sku: string | null;
} {
  const nested = row.products;
  const productRecord = Array.isArray(nested) ? (nested[0] ?? null) : nested;
  const name =
    productRecord && typeof productRecord === "object" && typeof productRecord.name === "string"
      ? productRecord.name
      : "Sin nombre";
  const skuRaw =
    productRecord && typeof productRecord === "object" && typeof productRecord.sku === "string"
      ? productRecord.sku
      : "";
  return { name, sku: skuRaw.trim().length > 0 ? skuRaw : null };
}

export async function getTopSellingProductsForReportDate(
  supabaseClient: SupabaseClient,
  reportCalendarDateYyyyMmDd: string,
  maximumProductCount: number,
  sessionTypeFilter: ReportSessionTypeFilter = "TOTAL",
): Promise<TopSellingProductReportRow[]> {
  if (!isValidCalendarDateYyyyMmDd(reportCalendarDateYyyyMmDd)) {
    throw new Error("Invalid report calendar date");
  }

  const { rangeStartInclusiveUtcIso, rangeEndExclusiveUtcIso } =
    getBuenosAiresZonedDayBoundsUtcIsoStrings(reportCalendarDateYyyyMmDd);

  const { data: saleItemRows, error } = await supabaseClient
    .from("sale_items")
    .select(
      "product_id, quantity, unit_price, products(name, sku), sales!inner(created_at, sales_sessions!inner(session_type))",
    )
    .gte("sales.created_at", rangeStartInclusiveUtcIso)
    .lt("sales.created_at", rangeEndExclusiveUtcIso);

  if (error) {
    throw new Error("Unable to load top selling products");
  }

  const aggregatesByProduct = new Map<
    string,
    { productName: string; sku: string | null; totalUnitsSold: number; totalRevenue: number }
  >();

  for (const rowUnknown of saleItemRows ?? []) {
    const row = rowUnknown as unknown as TopProductsSaleItemRow;
    const productIdentifier = typeof row.product_id === "string" ? row.product_id : "";
    if (productIdentifier.trim().length === 0) continue;

    const sessionType = resolveSessionTypeFromSaleItemRow(row);
    if (sessionTypeFilter === "RECREO" && sessionType !== "RECREO") continue;
    if (sessionTypeFilter === "LIBRE" && sessionType !== "VENTA_LIBRE") continue;

    const { name: productName, sku } = resolveProductInfoFromSaleItemRow(row);
    const quantity = Math.round(parseNumericValue(row.quantity));
    const unitPrice = parseNumericValue(row.unit_price);
    const revenue = quantity * unitPrice;

    const existing = aggregatesByProduct.get(productIdentifier);
    if (existing) {
      existing.totalUnitsSold += quantity;
      existing.totalRevenue += revenue;
    } else {
      aggregatesByProduct.set(productIdentifier, {
        productName,
        sku,
        totalUnitsSold: quantity,
        totalRevenue: revenue,
      });
    }
  }

  return [...aggregatesByProduct.entries()]
    .map(([productIdentifier, aggregate]) => ({
      productIdentifier,
      productName: aggregate.productName,
      stockKeepingUnit: aggregate.sku,
      totalUnitsSold: aggregate.totalUnitsSold,
      totalRevenue: aggregate.totalRevenue,
    }))
    .sort((a, b) => {
      if (b.totalUnitsSold !== a.totalUnitsSold) {
        return b.totalUnitsSold - a.totalUnitsSold;
      }
      return b.totalRevenue - a.totalRevenue;
    })
    .slice(0, maximumProductCount);
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
  /** SUM(quantity * (unit_price - coalesce(unit_cost, 0))) por ítem */
  grossProfitTotal: number;
  grossProfitRecreationBreakTotal: number;
  grossProfitFreeSaleTotal: number;
}

export interface InventoryMovementReportRow {
  movementIdentifier: string;
  productIdentifier: string;
  productName: string;
  movementType: string;
  quantity: number;
  reason: string;
  createdAtIso: string;
  operatorFullName: string | null;
  operatorRole: "ADMIN" | "OPERATOR" | null;
}

/**
 * Aggregates sales for a calendar day (Buenos Aires) from the sales table with session type
 * and payment method totals (CASH, QR, TRANSFER, DEBIT).
 */
export async function getDailyClosureReportMetrics(
  supabaseClient: SupabaseClient,
  reportCalendarDateYyyyMmDd: string,
  sessionTypeFilter: ReportSessionTypeFilter = "TOTAL",
): Promise<DailyClosureReportMetrics> {
  if (!isValidCalendarDateYyyyMmDd(reportCalendarDateYyyyMmDd)) {
    throw new Error("Invalid report calendar date");
  }

  const { rangeStartInclusiveUtcIso, rangeEndExclusiveUtcIso } =
    getBuenosAiresZonedDayBoundsUtcIsoStrings(reportCalendarDateYyyyMmDd);

  const { data: saleRows, error: salesError } = await supabaseClient
    .from("sales")
    .select(
      "id, total_price, payment_method, sales_sessions!inner(session_type)",
    )
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

  const sessionTypeBySaleIdentifier = new Map<string, string>();
  const saleIdentifiersForItems: string[] = [];

  for (const rowUnknown of saleRows ?? []) {
    const row = rowUnknown as Record<string, unknown>;
    const saleIdentifier = typeof row.id === "string" ? row.id : "";
    if (saleIdentifier.length > 0) {
      saleIdentifiersForItems.push(saleIdentifier);
    }

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

    if (saleIdentifier.length > 0 && sessionTypeString !== null) {
      sessionTypeBySaleIdentifier.set(saleIdentifier, sessionTypeString);
    }

    const includeSaleForFilter =
      sessionTypeFilter === "TOTAL" ||
      (sessionTypeFilter === "RECREO" &&
        sessionTypeString === AUTOMATIC_SALE_CATEGORY_RECREATION_BREAK) ||
      (sessionTypeFilter === "LIBRE" &&
        sessionTypeString === AUTOMATIC_SALE_CATEGORY_FREE_SALE);

    if (!includeSaleForFilter) {
      continue;
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

  let grossProfitTotal = 0;
  let grossProfitRecreationBreakTotal = 0;
  let grossProfitFreeSaleTotal = 0;

  if (saleIdentifiersForItems.length > 0) {
    const { data: saleItemRows, error: saleItemsError } = await supabaseClient
      .from("sale_items")
      .select("sale_id, quantity, unit_price, unit_cost")
      .in("sale_id", saleIdentifiersForItems);

    if (saleItemsError) {
      throw new Error("Unable to load daily closure report metrics");
    }

    for (const saleItemRowUnknown of saleItemRows ?? []) {
      const saleItemRow = saleItemRowUnknown as Record<string, unknown>;
      const saleIdentifierForItem = String(saleItemRow.sale_id ?? "");
      const quantity = parseNumericValue(saleItemRow.quantity);
      const unitPrice = parseNumericValue(saleItemRow.unit_price);
      const unitCostRaw = saleItemRow.unit_cost;
      const unitCostEffective =
        unitCostRaw === null || unitCostRaw === undefined
          ? 0
          : parseNumericValue(unitCostRaw);
      const lineGrossProfit = quantity * (unitPrice - unitCostEffective);

      grossProfitTotal += lineGrossProfit;

      const sessionTypeForSale = sessionTypeBySaleIdentifier.get(
        saleIdentifierForItem,
      );
      if (sessionTypeForSale === AUTOMATIC_SALE_CATEGORY_RECREATION_BREAK) {
        grossProfitRecreationBreakTotal += lineGrossProfit;
      } else if (sessionTypeForSale === AUTOMATIC_SALE_CATEGORY_FREE_SALE) {
        grossProfitFreeSaleTotal += lineGrossProfit;
      }
    }
  }

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
    grossProfitTotal,
    grossProfitRecreationBreakTotal,
    grossProfitFreeSaleTotal,
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
      operatorFullName: null,
      operatorRole: null,
    };
  });
}

export async function getRecentInventoryMovementsWithProductNameForReportDate(
  supabaseClient: SupabaseClient,
  reportCalendarDateYyyyMmDd: string,
  maximumRowCount: number,
  sessionTypeFilter: ReportSessionTypeFilter = "TOTAL",
): Promise<InventoryMovementReportRow[]> {
  if (!isValidCalendarDateYyyyMmDd(reportCalendarDateYyyyMmDd)) {
    throw new Error("Invalid report calendar date");
  }

  const { rangeStartInclusiveUtcIso, rangeEndExclusiveUtcIso } =
    getBuenosAiresZonedDayBoundsUtcIsoStrings(reportCalendarDateYyyyMmDd);

  const { data: movementRows, error: movementsError } = await supabaseClient
    .from("inventory_movements")
    .select(
      "id, product_id, quantity, movement_type, reason, created_at, products(name), users(full_name, role)",
    )
    .gte("created_at", rangeStartInclusiveUtcIso)
    .lt("created_at", rangeEndExclusiveUtcIso)
    .order("created_at", { ascending: false })
    .limit(maximumRowCount);

  if (movementsError) {
    throw new Error("Unable to load inventory movements");
  }

  const rows = (movementRows ?? []).map((rowUnknown) => {
    const row = rowUnknown as Record<string, unknown>;
    const productsNestedUnknown = row.products;
    const usersNestedUnknown = row.users;

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

    let operatorFullName: string | null = null;
    let operatorRole: "ADMIN" | "OPERATOR" | null = null;
    if (Array.isArray(usersNestedUnknown)) {
      const firstUserRow = usersNestedUnknown[0] as
        | { full_name?: string; role?: string }
        | undefined;
      if (
        typeof firstUserRow?.full_name === "string" &&
        firstUserRow.full_name.trim().length > 0
      ) {
        operatorFullName = firstUserRow.full_name;
      }
      if (firstUserRow?.role === "ADMIN" || firstUserRow?.role === "OPERATOR") {
        operatorRole = firstUserRow.role;
      }
    } else if (
      usersNestedUnknown &&
      typeof usersNestedUnknown === "object" &&
      !Array.isArray(usersNestedUnknown)
    ) {
      const userRecord = usersNestedUnknown as { full_name?: string; role?: string };
      if (
        typeof userRecord.full_name === "string" &&
        userRecord.full_name.trim().length > 0
      ) {
        operatorFullName = userRecord.full_name;
      }
      if (userRecord.role === "ADMIN" || userRecord.role === "OPERATOR") {
        operatorRole = userRecord.role;
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
      operatorFullName,
      operatorRole,
    };
  });

  return rows.filter((row) => {
    if (sessionTypeFilter === "TOTAL") {
      return true;
    }
    const normalizedReason = row.reason.trim().toUpperCase();
    if (sessionTypeFilter === "RECREO") {
      return normalizedReason.includes("RECREO");
    }
    return (
      normalizedReason.includes("VENTA_LIBRE") ||
      normalizedReason.includes("VENTA LIBRE") ||
      normalizedReason.includes("LIBRE")
    );
  });
}
