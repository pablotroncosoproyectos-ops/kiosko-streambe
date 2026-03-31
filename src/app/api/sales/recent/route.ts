import { NextResponse } from "next/server";
import {
  getBuenosAiresZonedDayBoundsUtcIsoStrings,
  getCurrentBuenosAiresCalendarDateYyyyMmDd,
} from "@/lib/buenosAiresReportingCalendar";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";

const RECENT_SALES_LIMIT = 20;

type HistoryScope = "ventaLibre" | "recreo" | "ventaTotal";

interface SaleRow {
  id: string;
  total_price: number;
  payment_method: "CASH" | "DEBIT" | "TRANSFER" | "QR";
  created_at: string;
  session_id: string;
}

interface SalesSessionRow {
  id: string;
  user_id: string;
  session_type: "RECREO" | "VENTA_LIBRE" | string;
  status?: "OPEN" | "CLOSED" | string;
  started_at?: string;
}

interface UserRow {
  id: string;
  full_name: string;
  role: string;
}

interface SaleItemRow {
  sale_id: string;
  quantity: number;
  products:
    | { name: string }
    | { name: string }[]
    | null;
}

function resolveProductNameFromSaleItemRow(saleItemRow: SaleItemRow): string {
  const nested = saleItemRow.products;
  if (!nested) {
    return "Producto";
  }
  if (Array.isArray(nested)) {
    const first = nested[0];
    return typeof first?.name === "string" ? first.name : "Producto";
  }
  return typeof nested.name === "string" ? nested.name : "Producto";
}

function buildProductNamesSummaryFromSaleItems(
  saleItemRows: SaleItemRow[],
): string {
  if (saleItemRows.length === 0) {
    return "—";
  }
  const parts = saleItemRows.map((row) => {
    const productName = resolveProductNameFromSaleItemRow(row);
    return `${productName} ×${row.quantity}`;
  });
  return parts.join(", ");
}

function parseHistoryScope(raw: string | null): HistoryScope | null {
  if (raw === "ventaLibre" || raw === "recreo" || raw === "ventaTotal") {
    return raw;
  }
  return null;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // #region agent log
    fetch("http://127.0.0.1:7888/ingest/8d762643-e6ea-41f9-89b3-beaad44b477c",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"88aedb"},body:JSON.stringify({sessionId:"88aedb",runId:"initial",hypothesisId:"H1-H4",location:"src/app/api/sales/recent/route.ts:GET:start",message:"GET /api/sales/recent start",data:{url:request.url},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const requestUrl = new URL(request.url);
    const historyScope =
      parseHistoryScope(requestUrl.searchParams.get("historyScope")) ??
      "ventaTotal";

    const { data: authenticationData, error: authenticationError } =
      await supabaseServerClient.auth.getUser();
    if (authenticationError || !authenticationData.user) {
      return NextResponse.json(
        { message: "Autenticación requerida" },
        { status: 401 },
      );
    }

    const authenticatedUserIdentifier = authenticationData.user.id;

    const reportCalendarDateYyyyMmDd =
      getCurrentBuenosAiresCalendarDateYyyyMmDd();
    const { rangeStartInclusiveUtcIso, rangeEndExclusiveUtcIso } =
      getBuenosAiresZonedDayBoundsUtcIsoStrings(reportCalendarDateYyyyMmDd);

    const { data: daySessionRows, error: daySessionsError } =
      await supabaseServerClient
        .from("sales_sessions")
        .select("id, user_id, session_type, status, started_at")
        .gte("started_at", rangeStartInclusiveUtcIso)
        .lt("started_at", rangeEndExclusiveUtcIso);

    if (daySessionsError) {
      return NextResponse.json(
        { message: "No se pudo cargar el historial de ventas" },
        { status: 500 },
      );
    }

    const sessions = (daySessionRows ?? []) as SalesSessionRow[];
    const sessionIdentifiersByScope = new Set<string>();
    const activeRecreoSession = sessions
      .filter(
        (row) =>
          row.user_id === authenticatedUserIdentifier &&
          row.session_type === "RECREO" &&
          row.status === "OPEN",
      )
      .sort(
        (a, b) =>
          new Date(b.started_at ?? 0).getTime() -
          new Date(a.started_at ?? 0).getTime(),
      )[0];

    for (const row of sessions) {
      if (historyScope === "ventaLibre" && row.session_type !== "VENTA_LIBRE") {
        continue;
      }
      if (historyScope === "recreo") {
        if (!activeRecreoSession || row.id !== activeRecreoSession.id) {
          continue;
        }
      }
      sessionIdentifiersByScope.add(row.id);
    }

    if (sessionIdentifiersByScope.size === 0) {
      return NextResponse.json(
        { recentSalesHistory: [], historyScope },
        { status: 200 },
      );
    }

    const { data: recentSalesRows, error: recentSalesError } =
      await supabaseServerClient
        .from("sales")
        .select("id, total_price, payment_method, created_at, session_id")
        .in("session_id", Array.from(sessionIdentifiersByScope))
        .gte("created_at", rangeStartInclusiveUtcIso)
        .lt("created_at", rangeEndExclusiveUtcIso)
        .order("created_at", { ascending: false })
        .limit(RECENT_SALES_LIMIT);

    if (recentSalesError) {
      return NextResponse.json(
        { message: "No se pudo cargar el historial de ventas" },
        { status: 500 },
      );
    }

    const saleRows = (recentSalesRows ?? []) as SaleRow[];
    if (saleRows.length === 0) {
      return NextResponse.json(
        { recentSalesHistory: [], historyScope },
        { status: 200 },
      );
    }

    const sessionIdentifiers = [...new Set(saleRows.map((row) => row.session_id))];

    const { data: sessionRows, error: sessionsError } = await supabaseServerClient
      .from("sales_sessions")
      .select("id, user_id, session_type")
      .in("id", sessionIdentifiers);

    if (sessionsError) {
      return NextResponse.json(
        { message: "No se pudo cargar el historial de ventas" },
        { status: 500 },
      );
    }

    const salesSessionsForRows = (sessionRows ?? []) as SalesSessionRow[];
    const userIdentifiers = [
      ...new Set(salesSessionsForRows.map((session) => session.user_id)),
    ];

    const { data: userRows, error: usersError } = await supabaseServerClient
      .from("users")
      .select("id, full_name, role")
      .in("id", userIdentifiers);

    if (usersError) {
      return NextResponse.json(
        { message: "No se pudo cargar el historial de ventas" },
        { status: 500 },
      );
    }

    const users = (userRows ?? []) as UserRow[];
    const userByIdentifier = new Map(
      users.map((user) => [user.id, user] as const),
    );
    const sessionUserBySessionIdentifier = new Map<string, UserRow>();
    for (const session of salesSessionsForRows) {
      const user = userByIdentifier.get(session.user_id);
      if (user) {
        sessionUserBySessionIdentifier.set(session.id, user);
      }
    }

    const saleIdentifiers = saleRows.map((row) => row.id);

    const { data: saleItemRows, error: saleItemsError } =
      await supabaseServerClient
        .from("sale_items")
        .select("sale_id, quantity, products(name)")
        .in("sale_id", saleIdentifiers);

    if (saleItemsError) {
      return NextResponse.json(
        { message: "No se pudo cargar el historial de ventas" },
        { status: 500 },
      );
    }

    const saleItems = (saleItemRows ?? []) as SaleItemRow[];
    const saleItemsBySaleIdentifier = new Map<string, SaleItemRow[]>();
    for (const saleItem of saleItems) {
      const existingSaleItems = saleItemsBySaleIdentifier.get(saleItem.sale_id);
      if (existingSaleItems) {
        existingSaleItems.push(saleItem);
      } else {
        saleItemsBySaleIdentifier.set(saleItem.sale_id, [saleItem]);
      }
    }

    const recentSalesHistory = saleRows.map((saleRow) => {
      const sellerUser = sessionUserBySessionIdentifier.get(saleRow.session_id);
      const saleItemsForSale = saleItemsBySaleIdentifier.get(saleRow.id) ?? [];

      return {
        saleIdentifier: saleRow.id,
        totalAmount: saleRow.total_price,
        paymentMethod: saleRow.payment_method,
        createdAt: saleRow.created_at,
        productNamesSummary: buildProductNamesSummaryFromSaleItems(
          saleItemsForSale,
        ),
        sellerFullName: sellerUser?.full_name ?? "—",
        sellerRole: sellerUser?.role ?? "—",
      };
    });

    // #region agent log
    fetch("http://127.0.0.1:7888/ingest/8d762643-e6ea-41f9-89b3-beaad44b477c",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"88aedb"},body:JSON.stringify({sessionId:"88aedb",runId:"initial",hypothesisId:"H1-H4",location:"src/app/api/sales/recent/route.ts:GET:success",message:"GET /api/sales/recent success",data:{historyScope,saleRowsCount:saleRows.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ recentSalesHistory, historyScope }, { status: 200 });
  } catch (error: unknown) {
    // #region agent log
    fetch("http://127.0.0.1:7888/ingest/8d762643-e6ea-41f9-89b3-beaad44b477c",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"88aedb"},body:JSON.stringify({sessionId:"88aedb",runId:"initial",hypothesisId:"H1-H4",location:"src/app/api/sales/recent/route.ts:GET:catch",message:"GET /api/sales/recent failed",data:{errorMessage:error instanceof Error ? error.message : "unknown"},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        return NextResponse.json(
          { message: "Autenticación requerida" },
          { status: 401 },
        );
      }
      if (error.message === "Authorized role required") {
        return NextResponse.json(
          { message: "Se requiere un rol autorizado" },
          { status: 403 },
        );
      }
    }
    return NextResponse.json(
      { message: "No se pudo cargar el historial de ventas" },
      { status: 500 },
    );
  }
}
