import { NextResponse } from "next/server";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";

interface RecentSaleHistoryRow {
  id: string;
  total_price: number;
  payment_method: "CASH" | "DEBIT" | "TRANSFER" | "QR";
  created_at: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const { data: authenticationData, error: authenticationError } =
      await supabaseServerClient.auth.getUser();
    if (authenticationError || !authenticationData.user) {
      return NextResponse.json(
        { message: "Autenticación requerida" },
        { status: 401 },
      );
    }

    const authenticatedUserIdentifier = authenticationData.user.id;

    const { data: recentSalesRows, error: recentSalesError } =
      await supabaseServerClient
        .from("sales")
        .select("id, total_price, payment_method, created_at, sales_sessions!inner(user_id)")
        .eq("sales_sessions.user_id", authenticatedUserIdentifier)
        .order("created_at", { ascending: false })
        .limit(10);

    if (recentSalesError) {
      return NextResponse.json(
        { message: "No se pudo cargar el historial de ventas" },
        { status: 500 },
      );
    }

    const recentSalesHistory = (recentSalesRows || []).map((recentSale) => {
      const typedRecentSale = recentSale as RecentSaleHistoryRow;
      return {
        saleIdentifier: typedRecentSale.id,
        totalAmount: typedRecentSale.total_price,
        paymentMethod: typedRecentSale.payment_method,
        createdAt: typedRecentSale.created_at,
      };
    });

    return NextResponse.json({ recentSalesHistory }, { status: 200 });
  } catch (error: unknown) {
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
