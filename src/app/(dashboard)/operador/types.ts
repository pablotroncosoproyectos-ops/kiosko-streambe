import type { SalesByPaymentMethodBreakdown } from "@/services/salesSessionService";
import type { Product } from "@/types/database";

export interface CartItem {
  productIdentifier: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number | null;
  useCostPrice: boolean;
}

export interface ProductsApiResponse {
  products?: Product[];
  message?: string;
}

export interface SalesApiResponse {
  message: string;
  saleIdentifier?: string;
  totalSaleAmount?: number;
}

export interface RecentSaleHistoryRecord {
  saleIdentifier: string;
  totalAmount: number;
  paymentMethod: "CASH" | "DEBIT" | "TRANSFER" | "QR";
  createdAt: string;
  productNamesSummary: string;
  sellerFullName: string;
  sellerRole: string;
}

export interface RecentSalesHistoryApiResponse {
  recentSalesHistory?: RecentSaleHistoryRecord[];
  historyScope?: "ventaLibre" | "recreo" | "ventaTotal";
  message?: string;
}

export type SelectedPaymentMethod =
  | "EFECTIVO"
  | "DEBITO"
  | "TRANSFERENCIA"
  | "QR";

export type CatalogBrowseMode = "categories" | "search";
export type SaleHistoryTab = "ventaLibre" | "recreo" | "ventaTotal";
export type OperatorCashSessionState = "loading" | "noSession" | "hasSession";

/** Alineado con `OpenSessionCashSummaryPayload` del API GET /api/sales-sessions/cash-summary */
export interface OperatorCloseCashSummaryPayload {
  sessionIdentifier: string;
  sessionType: string;
  openingBalance: number;
  expensesTotal: number;
  cashSalesTotal: number;
  cashSalesVentaLibreTotal: number;
  cashSalesRecreoTotal: number;
  ventaLibreSalesByPaymentMethod: SalesByPaymentMethodBreakdown;
  recreoSalesByPaymentMethod: SalesByPaymentMethodBreakdown;
  grossSalesTotal: number;
  expectedCashBalance: number;
}
