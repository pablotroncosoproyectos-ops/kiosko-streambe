import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getBuenosAiresZonedDayBoundsUtcIsoStrings,
  getCurrentBuenosAiresCalendarDateYyyyMmDd,
} from "@/lib/buenosAiresReportingCalendar";

const RECREO_SESSION_TYPE = "RECREO";
const VENTA_LIBRE_SESSION_TYPE = "VENTA_LIBRE";
const OPEN_SESSION_STATUS = "OPEN";
const CLOSED_SESSION_STATUS = "CLOSED";

const MAX_RECREO_NOTES_LENGTH = 500;
const MAX_SHIFT_CLOSING_NOTES_LENGTH = 2000;
export const MAX_RECREO_BREAKS_PER_SCHOOL_DAY = 5;

function normalizeSessionTypeForDatabase(rawValue: string): string {
  const normalized = rawValue.trim().toUpperCase();
  if (
    normalized !== RECREO_SESSION_TYPE &&
    normalized !== VENTA_LIBRE_SESSION_TYPE
  ) {
    throw new Error("Invalid session type");
  }
  return normalized;
}

function normalizeSessionStatusForDatabase(rawValue: string): string {
  const normalized = rawValue.trim().toUpperCase();
  if (normalized !== OPEN_SESSION_STATUS && normalized !== CLOSED_SESSION_STATUS) {
    throw new Error("Invalid session status");
  }
  return normalized;
}

export interface SalesSessionHistoryRow {
  sessionIdentifier: string;
  userIdentifier: string;
  operatorFullName: string | null;
  closedByFullName: string | null;
  sessionType: string;
  status: string;
  totalAmount: number;
  startedAtIso: string;
  closedAtIso: string | null;
  notes: string | null;
  expenseNotes: string | null;
  /** Presente si la sesión se cerró con arqueo de caja (columnas en BD). */
  expectedBalance: number | null;
  closingBalance: number | null;
  cashDifference: number | null;
}

function normalizeShiftClosingNotes(rawNotes: unknown): string | null {
  if (rawNotes === undefined || rawNotes === null) {
    return null;
  }
  if (typeof rawNotes !== "string") {
    return null;
  }
  const trimmed = rawNotes.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > MAX_SHIFT_CLOSING_NOTES_LENGTH) {
    throw new Error("Las observaciones del turno superan la longitud máxima permitida");
  }
  return trimmed;
}

function normalizeOptionalSessionNotes(rawNotes: unknown): string | null {
  if (rawNotes === undefined || rawNotes === null) {
    return null;
  }
  if (typeof rawNotes !== "string") {
    return null;
  }
  const trimmed = rawNotes.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > MAX_RECREO_NOTES_LENGTH) {
    throw new Error("Las notas del recreo superan la longitud máxima permitida");
  }
  return trimmed;
}

function parseNumericRowValue(rawValue: unknown): number | null {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue;
  }
  const parsed = Number.parseFloat(String(rawValue));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Ensures an OPEN RECREO session exists for the operator before any sale.
 * If one already exists, updates its notes.
 */
export async function startOrUpdateOpenRecreoSession(
  supabaseClient: SupabaseClient,
  authenticatedUserIdentifier: string,
  rawNotes: unknown,
): Promise<{ sessionIdentifier: string }> {
  const normalizedNotes = normalizeOptionalSessionNotes(rawNotes);
  const recreoSessionType = normalizeSessionTypeForDatabase(RECREO_SESSION_TYPE);
  const openSessionStatus = normalizeSessionStatusForDatabase(OPEN_SESSION_STATUS);

  const { data: existingSessionRow, error: existingSessionError } =
    await supabaseClient
      .from("sales_sessions")
      .select("id")
      .eq("user_id", authenticatedUserIdentifier)
      .eq("session_type", recreoSessionType)
      .eq("status", openSessionStatus)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (existingSessionError) {
    throw new Error("Unable to start recreation session");
  }

  if (existingSessionRow && typeof existingSessionRow.id === "string") {
    const { error: updateError } = await supabaseClient
      .from("sales_sessions")
      .update({ notes: normalizedNotes })
      .eq("id", existingSessionRow.id);

    if (updateError) {
      throw new Error("Unable to update recreation session notes");
    }

    return { sessionIdentifier: existingSessionRow.id };
  }

  const { data: insertedRow, error: insertError } = await supabaseClient
    .from("sales_sessions")
    .insert({
      user_id: authenticatedUserIdentifier,
      session_type: recreoSessionType,
      status: openSessionStatus,
      total_amount: 0,
      notes: normalizedNotes,
    })
    .select("id")
    .single();

  if (insertError || !insertedRow || typeof insertedRow.id !== "string") {
    throw new Error("Unable to create recreation session");
  }

  return { sessionIdentifier: insertedRow.id };
}

export async function listSalesSessionsHistoryForAdministrator(
  supabaseClient: SupabaseClient,
  maximumRowCount: number,
): Promise<SalesSessionHistoryRow[]> {
  const safeLimit = Math.min(Math.max(1, maximumRowCount), 200);

  const { data: sessionRows, error: sessionListError } = await supabaseClient
    .from("sales_sessions")
    .select(
      "id, user_id, closed_by, session_type, status, total_amount, started_at, closed_at, notes, expense_notes, expected_balance, closing_balance, cash_difference",
    )
    .order("started_at", { ascending: false })
    .limit(safeLimit);

  if (sessionListError) {
    throw new Error("Unable to load sales sessions history");
  }

  const userIdentifiers = Array.from(new Set((sessionRows ?? []).flatMap((rowUnknown) => {
    const row = rowUnknown as Record<string, unknown>;
    const openedBy =
      typeof row.user_id === "string" && row.user_id.trim().length > 0
        ? row.user_id.trim()
        : "";
    const closedBy =
      typeof row.closed_by === "string" && row.closed_by.trim().length > 0
        ? row.closed_by.trim()
        : "";
    return [openedBy, closedBy].filter((identifier) => identifier.length > 0);
  })));

  const fullNameByUserIdentifier = new Map<string, string>();
  if (userIdentifiers.length > 0) {
    const { data: userRows, error: usersError } = await supabaseClient
      .from("users")
      .select("id, full_name")
      .in("id", userIdentifiers);

    if (!usersError && userRows) {
      for (const userRowUnknown of userRows) {
        const userRow = userRowUnknown as Record<string, unknown>;
        const identifier = String(userRow.id ?? "");
        const fullName = userRow.full_name;
        if (
          identifier.length > 0 &&
          typeof fullName === "string" &&
          fullName.trim().length > 0
        ) {
          fullNameByUserIdentifier.set(identifier, fullName.trim());
        }
      }
    }
  }

  return (sessionRows ?? []).map((rowUnknown) => {
    const row = rowUnknown as Record<string, unknown>;
    const userIdentifier =
      typeof row.user_id === "string" ? row.user_id : String(row.user_id ?? "");
    const closedByIdentifier =
      typeof row.closed_by === "string"
        ? row.closed_by
        : String(row.closed_by ?? "");
    const operatorFullName =
      fullNameByUserIdentifier.get(userIdentifier) ?? null;
    const closedByFullName =
      closedByIdentifier.trim().length > 0
        ? fullNameByUserIdentifier.get(closedByIdentifier) ?? null
        : null;

    const totalAmountRaw = row.total_amount;
    const totalAmount =
      typeof totalAmountRaw === "number" && Number.isFinite(totalAmountRaw)
        ? totalAmountRaw
        : Number.parseFloat(String(totalAmountRaw ?? "0")) || 0;

    return {
      sessionIdentifier: String(row.id ?? ""),
      userIdentifier: String(row.user_id ?? ""),
      operatorFullName,
      closedByFullName,
      sessionType:
        typeof row.session_type === "string"
          ? row.session_type.trim().toUpperCase()
          : "",
      status:
        typeof row.status === "string"
          ? row.status.trim().toUpperCase()
          : "",
      totalAmount,
      startedAtIso: String(row.started_at ?? ""),
      closedAtIso:
        row.closed_at === null || row.closed_at === undefined
          ? null
          : String(row.closed_at),
      notes:
        typeof row.notes === "string" && row.notes.trim().length > 0
          ? row.notes.trim()
          : null,
      expenseNotes:
        typeof row.expense_notes === "string" && row.expense_notes.trim().length > 0
          ? row.expense_notes.trim()
          : null,
      expectedBalance: parseNumericRowValue(row.expected_balance),
      closingBalance: parseNumericRowValue(row.closing_balance),
      cashDifference: parseNumericRowValue(row.cash_difference),
    };
  });
}

export interface RecreoBreakDisplayPayload {
  recreoSessionsStartedTodayCount: number;
  displayBreakIndex: number;
  maxBreaksPerDay: number;
}

/**
 * Cuenta sesiones RECREO iniciadas hoy (calendario Buenos Aires), todas las operadoras.
 */
export async function getRecreoBreakDisplayForToday(
  supabaseClient: SupabaseClient,
): Promise<RecreoBreakDisplayPayload> {
  const todayCalendarYyyyMmDd = getCurrentBuenosAiresCalendarDateYyyyMmDd();
  const { rangeStartInclusiveUtcIso, rangeEndExclusiveUtcIso } =
    getBuenosAiresZonedDayBoundsUtcIsoStrings(todayCalendarYyyyMmDd);

  const { count, error: countError } = await supabaseClient
    .from("sales_sessions")
    .select("id", { count: "exact", head: true })
    .eq("session_type", normalizeSessionTypeForDatabase(RECREO_SESSION_TYPE))
    .gte("started_at", rangeStartInclusiveUtcIso)
    .lt("started_at", rangeEndExclusiveUtcIso);

  if (countError) {
    throw new Error("Unable to count recreation sessions");
  }

  const recreoSessionsStartedTodayCount = count ?? 0;
  const displayBreakIndex = Math.min(
    recreoSessionsStartedTodayCount,
    MAX_RECREO_BREAKS_PER_SCHOOL_DAY,
  );

  return {
    recreoSessionsStartedTodayCount,
    displayBreakIndex,
    maxBreaksPerDay: MAX_RECREO_BREAKS_PER_SCHOOL_DAY,
  };
}

/** Subtotales de ventas por medio de pago en una sesión o grupo de sesiones. */
export interface SalesByPaymentMethodBreakdown {
  cash: number;
  debit: number;
  transfer: number;
  qr: number;
}

export interface OpenSessionCashSummaryPayload {
  sessionIdentifier: string;
  sessionType: string;
  openingBalance: number;
  expensesTotal: number;
  /** Efectivo total: caja VENTA_LIBRE + sesiones RECREO del alcance del arqueo. */
  cashSalesTotal: number;
  cashSalesVentaLibreTotal: number;
  cashSalesRecreoTotal: number;
  ventaLibreSalesByPaymentMethod: SalesByPaymentMethodBreakdown;
  recreoSalesByPaymentMethod: SalesByPaymentMethodBreakdown;
  /** Suma de todos los medios de pago en VL + Recreo (bruto del turno mostrado). */
  grossSalesTotal: number;
  expectedCashBalance: number;
}

type NormalizedPaymentArqueoBucket = "CASH" | "DEBIT" | "TRANSFER" | "QR";

function normalizePaymentMethodToArqueoBucket(
  rawPaymentMethod: unknown,
): NormalizedPaymentArqueoBucket | null {
  if (rawPaymentMethod === null || rawPaymentMethod === undefined) {
    return null;
  }
  const asciiFolded = String(rawPaymentMethod)
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const compact = asciiFolded.replace(/\s+/g, "_");

  if (compact === "CASH" || compact === "EFECTIVO") {
    return "CASH";
  }
  if (compact === "DEBIT" || compact === "DEBITO") {
    return "DEBIT";
  }
  if (compact === "TRANSFER" || compact === "TRANSFERENCIA") {
    return "TRANSFER";
  }
  if (compact === "QR") {
    return "QR";
  }
  return null;
}

function parseSaleTotalPriceValue(rawTotalPrice: unknown): number {
  if (typeof rawTotalPrice === "number" && Number.isFinite(rawTotalPrice)) {
    return rawTotalPrice;
  }
  const parsed = Number.parseFloat(String(rawTotalPrice ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptySalesByPaymentMethodBreakdown(): SalesByPaymentMethodBreakdown {
  return { cash: 0, debit: 0, transfer: 0, qr: 0 };
}

function sumSalesByPaymentMethodBreakdown(
  breakdown: SalesByPaymentMethodBreakdown,
): number {
  return (
    breakdown.cash +
    breakdown.debit +
    breakdown.transfer +
    breakdown.qr
  );
}

interface ArqueoSalesAggregateResult {
  ventaLibreSalesByPaymentMethod: SalesByPaymentMethodBreakdown;
  recreoSalesByPaymentMethod: SalesByPaymentMethodBreakdown;
}

async function computeArqueoSalesAggregates(
  supabaseClient: SupabaseClient,
  ventaLibreSessionIdentifier: string,
  recreoSessionIdentifiers: string[],
): Promise<ArqueoSalesAggregateResult> {
  const ventaLibreSalesByPaymentMethod =
    createEmptySalesByPaymentMethodBreakdown();
  const recreoSalesByPaymentMethod =
    createEmptySalesByPaymentMethodBreakdown();

  const sessionIdentifierSet = new Set<string>([ventaLibreSessionIdentifier]);
  for (const recreoSessionIdentifier of recreoSessionIdentifiers) {
    if (typeof recreoSessionIdentifier === "string" && recreoSessionIdentifier.trim().length > 0) {
      sessionIdentifierSet.add(recreoSessionIdentifier.trim());
    }
  }
  const uniqueSessionIdentifiers = [...sessionIdentifierSet];

  if (uniqueSessionIdentifiers.length === 0) {
    return {
      ventaLibreSalesByPaymentMethod,
      recreoSalesByPaymentMethod,
    };
  }

  const { data: saleRows, error: salesError } = await supabaseClient
    .from("sales")
    .select("total_price, payment_method, session_id")
    .in("session_id", uniqueSessionIdentifiers);

  if (salesError) {
    throw new Error("Unable to load session sales");
  }

  for (const rowUnknown of saleRows ?? []) {
    const row = rowUnknown as Record<string, unknown>;
    const bucket = normalizePaymentMethodToArqueoBucket(row.payment_method);
    if (bucket === null) {
      continue;
    }
    const lineAmount = parseSaleTotalPriceValue(row.total_price);
    const rowSessionIdentifier = row.session_id;
    const isVentaLibreSaleRow =
      rowSessionIdentifier === ventaLibreSessionIdentifier;

    const targetBreakdown = isVentaLibreSaleRow
      ? ventaLibreSalesByPaymentMethod
      : recreoSalesByPaymentMethod;

    if (bucket === "CASH") {
      targetBreakdown.cash += lineAmount;
      continue;
    }
    if (bucket === "DEBIT") {
      targetBreakdown.debit += lineAmount;
      continue;
    }
    if (bucket === "TRANSFER") {
      targetBreakdown.transfer += lineAmount;
      continue;
    }
    targetBreakdown.qr += lineAmount;
  }

  return {
    ventaLibreSalesByPaymentMethod,
    recreoSalesByPaymentMethod,
  };
}

/**
 * Arqueo de ventas únicamente sobre la sesión VENTA_LIBRE abierta (caja del turno).
 * Efectivo esperado en cierre: opening_balance + sum(sales.total_price donde payment_method = CASH) - expenses_total.
 * Los desgloses "Recreo" en el payload quedan en cero: las ventas de recreo usan otro session_id y no entran en esta caja.
 */
async function computeArqueoSalesForOpenVentaLibreSession(
  supabaseClient: SupabaseClient,
  ventaLibreSessionIdentifier: string,
): Promise<
  ArqueoSalesAggregateResult & {
    cashSalesVentaLibreTotal: number;
    cashSalesRecreoTotal: number;
    cashSalesTotal: number;
    grossSalesTotal: number;
  }
> {
  const aggregates = await computeArqueoSalesAggregates(
    supabaseClient,
    ventaLibreSessionIdentifier,
    [],
  );

  const cashSalesVentaLibreTotal =
    aggregates.ventaLibreSalesByPaymentMethod.cash;
  const cashSalesRecreoTotal = aggregates.recreoSalesByPaymentMethod.cash;
  const cashSalesTotal = cashSalesVentaLibreTotal + cashSalesRecreoTotal;
  const grossSalesTotal =
    sumSalesByPaymentMethodBreakdown(
      aggregates.ventaLibreSalesByPaymentMethod,
    ) +
    sumSalesByPaymentMethodBreakdown(aggregates.recreoSalesByPaymentMethod);

  return {
    ventaLibreSalesByPaymentMethod: aggregates.ventaLibreSalesByPaymentMethod,
    recreoSalesByPaymentMethod: aggregates.recreoSalesByPaymentMethod,
    cashSalesVentaLibreTotal,
    cashSalesRecreoTotal,
    cashSalesTotal,
    grossSalesTotal,
  };
}

async function closeOpenRecreoSessionsForOperator(
  supabaseClient: SupabaseClient,
  operatorUserIdentifier: string,
  closedByUserIdentifier: string,
): Promise<void> {
  const recreoSessionType = normalizeSessionTypeForDatabase(RECREO_SESSION_TYPE);
  const openSessionStatus = normalizeSessionStatusForDatabase(OPEN_SESSION_STATUS);
  const closedSessionStatus = normalizeSessionStatusForDatabase(
    CLOSED_SESSION_STATUS,
  );
  const closedAtIso = new Date().toISOString();

  const { error: updateError } = await supabaseClient
    .from("sales_sessions")
    .update({
      status: closedSessionStatus,
      closed_at: closedAtIso,
      closed_by: closedByUserIdentifier,
    })
    .eq("user_id", operatorUserIdentifier)
    .eq("session_type", recreoSessionType)
    .eq("status", openSessionStatus);

  if (updateError) {
    throw new Error("Unable to close open recreation sessions");
  }
}

/**
 * Sesión de caja del turno (VENTA_LIBRE abierta): una sola por kiosco, compartida entre
 * ADMIN y OPERATOR. No filtra por `user_id` (quien abrió queda en la fila para auditoría).
 * `expectedCashBalance` = opening_balance + ventas en efectivo (tabla `sales`, session_id de esta sesión) - expenses_total.
 */
export async function getOpenSessionCashSummaryForOperator(
  supabaseClient: SupabaseClient,
): Promise<OpenSessionCashSummaryPayload | null> {
  const ventaLibreType = normalizeSessionTypeForDatabase(VENTA_LIBRE_SESSION_TYPE);
  const openStatus = normalizeSessionStatusForDatabase(OPEN_SESSION_STATUS);

  const { data: openSessionRow, error: fetchError } = await supabaseClient
    .from("sales_sessions")
    .select("id, session_type, opening_balance, expenses_total")
    .eq("session_type", ventaLibreType)
    .eq("status", openStatus)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw new Error("Unable to load open session");
  }

  if (!openSessionRow || typeof openSessionRow.id !== "string") {
    return null;
  }

  const sessionIdentifier = openSessionRow.id;
  const openingBalance = parseNumericRowValue(openSessionRow.opening_balance) ?? 0;
  const expensesTotal = parseNumericRowValue(openSessionRow.expenses_total) ?? 0;

  const {
    cashSalesVentaLibreTotal,
    cashSalesRecreoTotal,
    cashSalesTotal,
    grossSalesTotal,
    ventaLibreSalesByPaymentMethod,
    recreoSalesByPaymentMethod,
  } = await computeArqueoSalesForOpenVentaLibreSession(
    supabaseClient,
    sessionIdentifier,
  );

  const expectedCashBalance = openingBalance + cashSalesTotal - expensesTotal;

  return {
    sessionIdentifier,
    sessionType:
      typeof openSessionRow.session_type === "string"
        ? openSessionRow.session_type.trim().toUpperCase()
        : "",
    openingBalance,
    expensesTotal,
    cashSalesTotal,
    cashSalesVentaLibreTotal,
    cashSalesRecreoTotal,
    ventaLibreSalesByPaymentMethod,
    recreoSalesByPaymentMethod,
    grossSalesTotal,
    expectedCashBalance,
  };
}

export async function openOperatorCashSession(
  supabaseClient: SupabaseClient,
  authenticatedUserIdentifier: string,
  openingBalance: number,
): Promise<{ sessionIdentifier: string }> {
  if (!Number.isFinite(openingBalance) || openingBalance < 0) {
    throw new Error("Invalid opening balance");
  }
  const ventaLibreSessionType = normalizeSessionTypeForDatabase(
    VENTA_LIBRE_SESSION_TYPE,
  );
  const openSessionStatus = normalizeSessionStatusForDatabase(OPEN_SESSION_STATUS);

  const { data: existingOpenRow, error: existingOpenError } =
    await supabaseClient
      .from("sales_sessions")
      .select("id")
      .eq("session_type", ventaLibreSessionType)
      .eq("status", openSessionStatus)
      .limit(1)
      .maybeSingle();

  if (existingOpenError) {
    throw new Error("Unable to verify open session");
  }

  if (existingOpenRow && typeof existingOpenRow.id === "string") {
    throw new Error("Session already open");
  }

  const { data: insertedRow, error: insertError } = await supabaseClient
    .from("sales_sessions")
    .insert({
      user_id: authenticatedUserIdentifier,
      session_type: ventaLibreSessionType,
      status: openSessionStatus,
      total_amount: 0,
      opening_balance: openingBalance,
      expenses_total: 0,
    })
    .select("id")
    .single();

  if (insertError || !insertedRow || typeof insertedRow.id !== "string") {
    throw new Error("Unable to open cash session");
  }

  return { sessionIdentifier: insertedRow.id };
}

export interface CloseSessionCashPayload {
  sessionIdentifier: string;
  expectedBalance: number;
  closingBalance: number;
  cashDifference: number;
}

export async function closeOpenSessionWithCashArqueo(
  supabaseClient: SupabaseClient,
  authenticatedUserIdentifier: string,
  physicalCashAmount: number,
  optionalOpeningBalance: number | null,
  optionalExpensesTotal: number | null,
  rawExpenseNotes: unknown,
  rawClosedByUserIdentifier: unknown,
): Promise<CloseSessionCashPayload> {
  if (!Number.isFinite(physicalCashAmount) || physicalCashAmount < 0) {
    throw new Error("Invalid physical cash amount");
  }

  const expenseNotes = normalizeShiftClosingNotes(rawExpenseNotes);
  const closedByUserIdentifier =
    typeof rawClosedByUserIdentifier === "string" &&
    rawClosedByUserIdentifier.trim().length > 0
      ? rawClosedByUserIdentifier.trim()
      : authenticatedUserIdentifier;
  const openSessionStatus = normalizeSessionStatusForDatabase(OPEN_SESSION_STATUS);
  const closedSessionStatus = normalizeSessionStatusForDatabase(
    CLOSED_SESSION_STATUS,
  );

  const ventaLibreSessionType = normalizeSessionTypeForDatabase(
    VENTA_LIBRE_SESSION_TYPE,
  );

  const { data: openSessionRow, error: fetchError } = await supabaseClient
    .from("sales_sessions")
    .select("id, opening_balance, expenses_total")
    .eq("session_type", ventaLibreSessionType)
    .eq("status", openSessionStatus)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw new Error("Unable to load open session");
  }

  if (!openSessionRow || typeof openSessionRow.id !== "string") {
    throw new Error("No open session");
  }

  const sessionIdentifier = openSessionRow.id;

  const storedOpening =
    parseNumericRowValue(openSessionRow.opening_balance) ?? 0;
  const storedExpenses = parseNumericRowValue(openSessionRow.expenses_total) ?? 0;

  const openingBalance =
    optionalOpeningBalance !== null &&
    Number.isFinite(optionalOpeningBalance) &&
    optionalOpeningBalance >= 0
      ? optionalOpeningBalance
      : storedOpening;

  const expensesTotal =
    optionalExpensesTotal !== null &&
    Number.isFinite(optionalExpensesTotal) &&
    optionalExpensesTotal >= 0
      ? optionalExpensesTotal
      : storedExpenses;

  const { cashSalesTotal } = await computeArqueoSalesForOpenVentaLibreSession(
    supabaseClient,
    sessionIdentifier,
  );

  const expectedBalance = openingBalance + cashSalesTotal - expensesTotal;
  const cashDifference = physicalCashAmount - expectedBalance;

  const { error: updateError } = await supabaseClient
    .from("sales_sessions")
    .update({
      status: closedSessionStatus,
      closed_at: new Date().toISOString(),
      opening_balance: openingBalance,
      expenses_total: expensesTotal,
      expected_balance: expectedBalance,
      closing_balance: physicalCashAmount,
      cash_difference: cashDifference,
      expense_notes: expenseNotes,
      closed_by: closedByUserIdentifier,
    })
    .eq("id", sessionIdentifier)
    .eq("status", openSessionStatus);

  if (updateError) {
    throw new Error("Unable to close session");
  }

  await closeOpenRecreoSessionsForOperator(
    supabaseClient,
    authenticatedUserIdentifier,
    closedByUserIdentifier,
  );

  return {
    sessionIdentifier,
    expectedBalance,
    closingBalance: physicalCashAmount,
    cashDifference,
  };
}
