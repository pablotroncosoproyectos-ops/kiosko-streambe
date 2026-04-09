"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Landmark,
  Package,
  Printer,
  QrCode,
  Search,
  TrendingUp,
  Users,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatArgentinaPesos } from "@/lib/currencyFormat";
import { useDashboardSession } from "@/components/layout/dashboard-session-context";

const UserManagementModal = dynamic(
  () =>
    import("@/components/admin/UserManagementModal").then((mod) => ({
      default: mod.UserManagementModal,
    })),
  { ssr: false, loading: () => null },
);
import { InventoryMovementTypeBadge } from "@/components/inventory/InventoryMovementTypeBadge";
import { DailyClosurePrintReceipt } from "./DailyClosurePrintReceipt";
import { getCurrentBuenosAiresCalendarDateYyyyMmDd } from "@/lib/buenosAiresReportingCalendar";
import type {
  DailyClosureReportMetrics,
  InventoryMovementReportRow,
  TopSellingProductReportRow,
} from "@/services/reportService";

interface CriticalStockAlertsApiResponse {
  criticalStockAlertCount?: number;
  message?: string;
}

interface TopProductsApiResponse {
  topSellingProducts?: TopSellingProductReportRow[];
  message?: string;
}

interface DailyClosureApiResponse {
  dailyClosureReportMetrics?: DailyClosureReportMetrics;
  message?: string;
}

interface InventoryMovementsApiResponse {
  recentInventoryMovements?: InventoryMovementReportRow[];
  message?: string;
}

type TrackedPaymentMethodKind = "CASH" | "QR" | "TRANSFER" | "DEBIT";
type TipoArqueo = "TOTAL" | "RECREO" | "LIBRE";

interface DominantPaymentMethodSummary {
  displayLabel: string;
  revenueTotal: number;
  transactionCount: number;
}

const REVENUE_BAR_CHART_COLORS = ["#10b981", "#059669"];

const STANDARD_CARD_CLASS_NAME = "rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm";

const REPORTS_LAUNCHER_CARD_BASE_CLASS =
  "flex min-h-[240px] w-full flex-col items-center justify-center gap-4 rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-sm transition-all duration-300 ease-out dark:border-zinc-800 dark:bg-zinc-900";

const REPORTS_LAUNCHER_CARD_HOVER_CLASS =
  "hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] active:scale-95";

function formatIntegerForDisplay(value: number): string {
  return new Intl.NumberFormat("es-AR").format(Math.round(value));
}

function formatArgentinaDateTimeFromIso(isoDateString: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDateString));
}

const INVENTORY_MOVEMENT_REASON_TRANSLATIONS: Readonly<
  Record<string, string>
> = {
  "OUT_SALE": "Salida por venta",
  "SALE": "Salida por venta",
  "ADJUSTMENT": "Ajuste de inventario",
  "IN": "Ingreso de stock",
  "EXPIRED": "Producto vencido",
};

function translateInventoryMovementReasonForDisplay(
  reason: string,
): string {
  const trimmedReason = reason.trim();
  if (trimmedReason.length === 0) {
    return "";
  }
  const upperKey = trimmedReason.toUpperCase().replaceAll(" ", "_");
  return (
    INVENTORY_MOVEMENT_REASON_TRANSLATIONS[upperKey] ??
    INVENTORY_MOVEMENT_REASON_TRANSLATIONS[trimmedReason] ??
    trimmedReason
  );
}

function resolveDominantPaymentMethodSummary(
  metrics: DailyClosureReportMetrics | null,
): DominantPaymentMethodSummary | null {
  if (metrics === null) {
    return null;
  }

  const paymentMethodCandidates: Array<{
    paymentMethodKind: TrackedPaymentMethodKind;
    displayLabel: string;
    revenueTotal: number;
    transactionCount: number;
  }> = [
    {
      paymentMethodKind: "CASH",
      displayLabel: "Efectivo",
      revenueTotal: metrics.revenueTotalCash,
      transactionCount: metrics.transactionCountCash,
    },
    {
      paymentMethodKind: "QR",
      displayLabel: "QR",
      revenueTotal: metrics.revenueTotalQr,
      transactionCount: metrics.transactionCountQr,
    },
    {
      paymentMethodKind: "TRANSFER",
      displayLabel: "Transferencia",
      revenueTotal: metrics.revenueTotalTransfer,
      transactionCount: metrics.transactionCountTransfer,
    },
    {
      paymentMethodKind: "DEBIT",
      displayLabel: "Débito",
      revenueTotal: metrics.revenueTotalDebit,
      transactionCount: metrics.transactionCountDebit,
    },
  ];

  const highestRevenueAmount = Math.max(
    ...paymentMethodCandidates.map((candidate) => candidate.revenueTotal),
  );

  if (!Number.isFinite(highestRevenueAmount) || highestRevenueAmount <= 0) {
    return {
      displayLabel: "Sin operaciones",
      revenueTotal: 0,
      transactionCount: 0,
    };
  }

  const candidatesMatchingHighestRevenue = paymentMethodCandidates.filter(
    (candidate) => candidate.revenueTotal === highestRevenueAmount,
  );

  if (candidatesMatchingHighestRevenue.length > 1) {
    return {
      displayLabel: candidatesMatchingHighestRevenue
        .map((candidate) => candidate.displayLabel)
        .join(" · "),
      revenueTotal: highestRevenueAmount,
      transactionCount: candidatesMatchingHighestRevenue.reduce(
        (accumulator, candidate) => accumulator + candidate.transactionCount,
        0,
      ),
    };
  }

  const singleDominantCandidate = candidatesMatchingHighestRevenue[0];
  if (!singleDominantCandidate) {
    return {
      displayLabel: "Sin operaciones",
      revenueTotal: 0,
      transactionCount: 0,
    };
  }

  return {
    displayLabel: singleDominantCandidate.displayLabel,
    revenueTotal: singleDominantCandidate.revenueTotal,
    transactionCount: singleDominantCandidate.transactionCount,
  };
}

const ReportsDashboardPage = (): ReactElement => {
  const { userIdentifier } = useDashboardSession();
  const [selectedReportCalendarDate, setSelectedReportCalendarDate] =
    useState<string>(() => getCurrentBuenosAiresCalendarDateYyyyMmDd());
  const [dailyClosureReportMetrics, setDailyClosureReportMetrics] =
    useState<DailyClosureReportMetrics | null>(null);
  const [printedAtDisplayText, setPrintedAtDisplayText] = useState<string>("");
  const [criticalStockAlertCount, setCriticalStockAlertCount] =
    useState<number | null>(null);
  const [topSellingProducts, setTopSellingProducts] = useState<
    TopSellingProductReportRow[]
  >([]);
  const [recentInventoryMovements, setRecentInventoryMovements] = useState<
    InventoryMovementReportRow[]
  >([]);
  const [filtroArqueo, setFiltroArqueo] = useState<TipoArqueo>("TOTAL");
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [canRenderChart, setCanRenderChart] = useState<boolean>(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState<boolean>(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState<boolean>(false);
  const [isUsersManagementPanelOpen, setIsUsersManagementPanelOpen] =
    useState<boolean>(false);
  const [isLoadingViewSummaryData, setIsLoadingViewSummaryData] =
    useState<boolean>(true);
  const [isLoadingDailyClosureReport, setIsLoadingDailyClosureReport] =
    useState<boolean>(true);
  const [isLoadingInventoryMovements, setIsLoadingInventoryMovements] =
    useState<boolean>(true);
  const [pageErrorMessage, setPageErrorMessage] = useState<string>("");
  const [dailyClosureErrorMessage, setDailyClosureErrorMessage] =
    useState<string>("");
  const [inventoryErrorMessage, setInventoryErrorMessage] =
    useState<string>("");

  const dominantPaymentMethodSummary = useMemo(
    () => resolveDominantPaymentMethodSummary(dailyClosureReportMetrics),
    [dailyClosureReportMetrics],
  );

  const loadViewSummaryDataFromServer = useCallback(async (): Promise<void> => {
    setIsLoadingViewSummaryData(true);
    setPageErrorMessage("");

    try {
      const [criticalStockResponse, topProductsResponse] = await Promise.all([
        fetch("/api/reports/critical-stock-alerts", {
          method: "GET",
          credentials: "include",
        }),
        fetch(
          `/api/reports/top-products?reportDate=${encodeURIComponent(selectedReportCalendarDate)}&sessionType=${encodeURIComponent(filtroArqueo)}`,
          {
            method: "GET",
            credentials: "include",
          },
        ),
      ]);

      if (
        criticalStockResponse.status === 401 ||
        topProductsResponse.status === 401
      ) {
        window.location.assign("/login");
        return;
      }

      const criticalStockBody =
        (await criticalStockResponse.json()) as CriticalStockAlertsApiResponse;
      const topProductsBody =
        (await topProductsResponse.json()) as TopProductsApiResponse;

      if (!criticalStockResponse.ok) {
        setPageErrorMessage(
          criticalStockBody.message ??
            "No se pudieron cargar las alertas de stock.",
        );
        return;
      }

      if (!topProductsResponse.ok) {
        setPageErrorMessage(
          topProductsBody.message ??
            "No se pudo cargar el ranking de productos más vendidos.",
        );
        return;
      }

      setCriticalStockAlertCount(criticalStockBody.criticalStockAlertCount ?? 0);
      setTopSellingProducts(topProductsBody.topSellingProducts ?? []);
    } catch {
      setPageErrorMessage(
        "No se pudieron cargar los datos complementarios del panel.",
      );
    } finally {
      setIsLoadingViewSummaryData(false);
    }
  }, [filtroArqueo, selectedReportCalendarDate]);

  const loadDailyClosureReportFromServer =
    useCallback(async (): Promise<void> => {
      setIsLoadingDailyClosureReport(true);
      setDailyClosureErrorMessage("");

      try {
        const requestUrl = `/api/reports/daily-closure?reportDate=${encodeURIComponent(selectedReportCalendarDate)}&sessionType=${encodeURIComponent(filtroArqueo)}`;
        const response = await fetch(requestUrl, {
          method: "GET",
          credentials: "include",
        });

        const responseBody = (await response.json()) as DailyClosureApiResponse;

        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }

        if (!response.ok) {
          setDailyClosureErrorMessage(
            responseBody.message ??
              "No se pudo cargar el informe de cierre para la fecha seleccionada.",
          );
          setDailyClosureReportMetrics(null);
          return;
        }

        setDailyClosureReportMetrics(
          responseBody.dailyClosureReportMetrics ?? null,
        );
      } catch {
        setDailyClosureErrorMessage(
          "No se pudo cargar el informe de cierre para la fecha seleccionada.",
        );
        setDailyClosureReportMetrics(null);
      } finally {
        setIsLoadingDailyClosureReport(false);
      }
    }, [filtroArqueo, selectedReportCalendarDate]);

  const loadInventoryMovementsFromServer =
    useCallback(async (): Promise<void> => {
      setIsLoadingInventoryMovements(true);
      setInventoryErrorMessage("");

      try {
        const response = await fetch(
          `/api/reports/inventory-movements?reportDate=${encodeURIComponent(selectedReportCalendarDate)}&sessionType=${encodeURIComponent(filtroArqueo)}`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        const responseBody =
          (await response.json()) as InventoryMovementsApiResponse;

        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }

        if (!response.ok) {
          setInventoryErrorMessage(
            responseBody.message ??
              "No se pudo cargar el historial de movimientos de inventario.",
          );
          setRecentInventoryMovements([]);
          return;
        }

        setRecentInventoryMovements(responseBody.recentInventoryMovements ?? []);
      } catch {
        setInventoryErrorMessage(
          "No se pudo cargar el historial de movimientos de inventario.",
        );
        setRecentInventoryMovements([]);
      } finally {
        setIsLoadingInventoryMovements(false);
      }
    }, [filtroArqueo, selectedReportCalendarDate]);

  useEffect(() => {
    void loadViewSummaryDataFromServer();
  }, [loadViewSummaryDataFromServer]);

  useEffect(() => {
    void loadDailyClosureReportFromServer();
  }, [loadDailyClosureReportFromServer]);

  useEffect(() => {
    void loadInventoryMovementsFromServer();
  }, [loadInventoryMovementsFromServer]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isSessionModalOpen) {
      const timer = setTimeout(() => setCanRenderChart(true), 300);
      return () => {
        clearTimeout(timer);
        setCanRenderChart(false);
      };
    }
    setCanRenderChart(false);
    return undefined;
  }, [isSessionModalOpen]);

  function handlePrintDailyClosureReport(): void {
    const formattedPrintedInstant = new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      dateStyle: "full",
      timeStyle: "long",
    }).format(new Date());
    setPrintedAtDisplayText(`Impreso: ${formattedPrintedInstant}`);
    window.requestAnimationFrame(() => {
      window.print();
    });
  }

  function handleReportCalendarDateInputChange(
    nextCalendarDateValue: string,
  ): void {
    setSelectedReportCalendarDate(nextCalendarDateValue);
  }

  function handleResetReportCalendarDateToToday(): void {
    setSelectedReportCalendarDate(getCurrentBuenosAiresCalendarDateYyyyMmDd());
  }

  const revenueChartData =
    dailyClosureReportMetrics === null
      ? []
      : [
          {
            categoryDisplayLabel: "Recreo",
            revenue: dailyClosureReportMetrics.recreationBreakSessionRevenueTotal,
          },
          {
            categoryDisplayLabel: "Venta libre",
            revenue: dailyClosureReportMetrics.freeSaleSessionRevenueTotal,
          },
        ];

  const filteredRevenueAmount =
    dailyClosureReportMetrics === null
      ? null
      : filtroArqueo === "RECREO"
        ? dailyClosureReportMetrics.recreationBreakSessionRevenueTotal
        : filtroArqueo === "LIBRE"
          ? dailyClosureReportMetrics.freeSaleSessionRevenueTotal
          : dailyClosureReportMetrics.totalRevenue;

  const filteredGrossProfitAmount =
    dailyClosureReportMetrics === null
      ? null
      : filtroArqueo === "RECREO"
        ? dailyClosureReportMetrics.grossProfitRecreationBreakTotal
        : filtroArqueo === "LIBRE"
          ? dailyClosureReportMetrics.grossProfitFreeSaleTotal
          : dailyClosureReportMetrics.grossProfitTotal;

  const averageTicketAmount =
    dailyClosureReportMetrics === null ||
    dailyClosureReportMetrics.totalTransactionCount <= 0
      ? null
      : dailyClosureReportMetrics.totalRevenue /
        dailyClosureReportMetrics.totalTransactionCount;

  const filtroLabel =
    filtroArqueo === "RECREO"
      ? "Recreo"
      : filtroArqueo === "LIBRE"
        ? "Venta Libre"
        : "Arqueo Total";

  function renderSessionChart(): ReactElement {
    const chartRevenueTotal = revenueChartData.reduce(
      (accumulator, row) => accumulator + row.revenue,
      0,
    );

    return (
      <div className="relative w-full min-w-0 overflow-hidden">
        {isLoadingDailyClosureReport ? (
          <div className="flex h-[350px] w-full items-center justify-center text-sm text-slate-500">
            Cargando gráfico…
          </div>
        ) : revenueChartData.length === 0 ? (
          <div className="flex h-[350px] w-full items-center justify-center text-sm text-slate-500">
            No hay datos para mostrar.
          </div>
        ) : canRenderChart && isMounted ? (
          <div className="h-[350px] w-full min-h-[350px]">
            {isClient ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueChartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" />
                  <XAxis
                    dataKey="categoryDisplayLabel"
                    tick={{ fill: "#52525b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) => formatIntegerForDisplay(value)}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      background: "rgba(255,255,255,0.96)",
                      boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
                    }}
                    labelStyle={{ color: "#065f46", fontWeight: 700 }}
                    formatter={(value) => {
                      const rawValue = Array.isArray(value) ? value[0] : value;
                      const numericRevenue =
                        typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);
                      const safeRevenue = Number.isFinite(numericRevenue)
                        ? numericRevenue
                        : 0;
                      const percentage =
                        chartRevenueTotal > 0
                          ? (safeRevenue / chartRevenueTotal) * 100
                          : 0;
                      return `${formatArgentinaPesos(safeRevenue)} (${percentage.toFixed(1)}%)`;
                    }}
                  />
                  <Bar dataKey="revenue" name="Ingresos" radius={[8, 8, 0, 0]}>
                    {revenueChartData.map((chartRow, chartRowIndex) => (
                      <Cell
                        key={chartRow.categoryDisplayLabel}
                        fill={
                          REVENUE_BAR_CHART_COLORS[
                            chartRowIndex % REVENUE_BAR_CHART_COLORS.length
                          ]
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="revenue"
                      position="top"
                      formatter={(value) => formatArgentinaPesos(Number(value ?? 0))}
                      className="fill-emerald-700 text-[11px] font-semibold dark:fill-emerald-300"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        ) : (
          <div className="flex h-[350px] w-full flex-col items-center justify-center gap-3">
            <span className="size-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
            <span className="text-sm text-slate-500">Inicializando gráfico…</span>
          </div>
        )}
      </div>
    );
  }

  function renderModal(
    title: string,
    onClose: () => void,
    content: ReactElement,
    widthClassName = "max-w-6xl",
    titleIcon?: ReactElement,
  ): ReactElement {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6">
        <div
          className={`flex max-h-[92vh] w-full ${widthClassName} flex-col overflow-hidden rounded-3xl border border-white/25 bg-white/85 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10`}
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-8 py-6 dark:border-zinc-700">
            <div className="flex min-w-0 items-center gap-3">
              {titleIcon ? (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {titleIcon}
                </span>
              ) : null}
              <h2 className="truncate text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-8">
            <div className="min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="flex min-h-0 w-full flex-1 flex-col [-ms-overflow-style:none] [scrollbar-width:none] print:hidden [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col gap-6 px-4 py-4 text-zinc-900 md:px-6 md:py-6 dark:text-zinc-100">
          <header className="flex shrink-0 flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 md:text-2xl dark:text-zinc-100">
                  Panel de Informes
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Resumen operativo y métricas de ventas
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      { value: "LIBRE", label: "Venta Libre" },
                      { value: "RECREO", label: "Recreo" },
                      { value: "TOTAL", label: "Arqueo Total" },
                    ] as const
                  ).map((filterButton) => (
                    <button
                      key={filterButton.value}
                      type="button"
                      onClick={() => setFiltroArqueo(filterButton.value)}
                      className={
                        filtroArqueo === filterButton.value
                          ? "rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                          : "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      }
                    >
                      {filterButton.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handlePrintDailyClosureReport}
                  disabled={
                    dailyClosureReportMetrics === null ||
                    isLoadingDailyClosureReport
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  <Printer className="size-4" aria-hidden />
                  Imprimir {filtroLabel}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="report-calendar-date-input"
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  <CalendarDays className="size-4 text-zinc-500 dark:text-zinc-400" aria-hidden />
                  Fecha del informe
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="report-calendar-date-input"
                    type="date"
                    value={selectedReportCalendarDate}
                    onChange={(event) =>
                      handleReportCalendarDateInputChange(event.target.value)
                    }
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={handleResetReportCalendarDateToToday}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Hoy
                  </button>
                </div>
              </div>
            </div>
          </header>

          {pageErrorMessage.length > 0 ? (
            <p
              className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {pageErrorMessage}
            </p>
          ) : null}

          {dailyClosureErrorMessage.length > 0 ? (
            <p
              className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {dailyClosureErrorMessage}
            </p>
          ) : null}

          <div className="pt-2">
            <section className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setIsGeneralModalOpen(true)}
              className={`${REPORTS_LAUNCHER_CARD_BASE_CLASS} ${REPORTS_LAUNCHER_CARD_HOVER_CLASS} hover:border-emerald-400 dark:hover:border-emerald-500`}
            >
              <TrendingUp
                className="size-16 shrink-0 text-emerald-600 dark:text-emerald-500"
                aria-hidden
              />
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Resumen General
              </span>
              <p className="max-w-xs px-2 text-sm text-zinc-500 dark:text-zinc-400">
                Ingresos, ventas, alertas y medio de pago principal.
              </p>
              <p className="max-w-xs px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Filtro activo: {filtroLabel}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className={`${REPORTS_LAUNCHER_CARD_BASE_CLASS} ${REPORTS_LAUNCHER_CARD_HOVER_CLASS} hover:border-indigo-400 dark:hover:border-indigo-500`}
            >
              <CreditCard
                className="size-16 shrink-0 text-indigo-600 dark:text-indigo-500"
                aria-hidden
              />
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Análisis de Medios de Pago
              </span>
              <p className="max-w-xs px-2 text-sm text-zinc-500 dark:text-zinc-400">
                Efectivo, QR, transferencia y débito con montos.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsSessionModalOpen(true)}
              className={`${REPORTS_LAUNCHER_CARD_BASE_CLASS} ${REPORTS_LAUNCHER_CARD_HOVER_CLASS} hover:border-zinc-400 dark:hover:border-zinc-500`}
            >
              <BarChart3
                className="size-16 shrink-0 text-zinc-700 dark:text-zinc-300"
                aria-hidden
              />
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Rendimiento por Sesión
              </span>
              <p className="max-w-xs px-2 text-sm text-zinc-500 dark:text-zinc-400">
                Comparativa visual de ingresos por tipo de sesión.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsProductsModalOpen(true)}
              className={`${REPORTS_LAUNCHER_CARD_BASE_CLASS} ${REPORTS_LAUNCHER_CARD_HOVER_CLASS} hover:border-amber-400 dark:hover:border-amber-500`}
            >
              <Package
                className="size-16 shrink-0 text-amber-600 dark:text-amber-500"
                aria-hidden
              />
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Ranking de Productos
              </span>
              <p className="max-w-xs px-2 text-sm text-zinc-500 dark:text-zinc-400">
                Tabla completa de productos más vendidos.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsInventoryModalOpen(true)}
              className={`${REPORTS_LAUNCHER_CARD_BASE_CLASS} ${REPORTS_LAUNCHER_CARD_HOVER_CLASS} hover:border-sky-400 dark:hover:border-sky-500`}
            >
              <ClipboardList
                className="size-16 shrink-0 text-sky-600 dark:text-sky-500"
                aria-hidden
              />
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Auditoría de Movimientos
              </span>
              <p className="max-w-xs px-2 text-sm text-zinc-500 dark:text-zinc-400">
                Historial de inventario para control y trazabilidad.
              </p>
            </button>

            {/*
              Ruta `/dashboard` restringida a ADMIN en proxy (RBAC). El perfil y el id
              vienen de `DashboardShell` vía `useDashboardSession` (un solo GET /api/auth/me).
            */}
            <button
              type="button"
              onClick={() => {
                if (userIdentifier.length === 0) {
                  return;
                }
                setIsUsersManagementPanelOpen(true);
              }}
              className={`${REPORTS_LAUNCHER_CARD_BASE_CLASS} ${REPORTS_LAUNCHER_CARD_HOVER_CLASS} hover:border-violet-400 dark:hover:border-violet-500`}
            >
              <Users
                className="size-16 shrink-0 text-violet-600 dark:text-violet-500"
                aria-hidden
              />
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Usuarios
              </span>
              <p className="max-w-xs px-2 text-sm text-zinc-500 dark:text-zinc-400">
                Roles, estado y permisos del equipo.
              </p>
            </button>
          </section>
          </div>
        </div>
      </main>

      {isGeneralModalOpen
        ? renderModal(
            "Resumen General",
            () => setIsGeneralModalOpen(false),
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <article className={STANDARD_CARD_CLASS_NAME}>
                <p className="text-sm font-semibold text-slate-600">Ingresos ({filtroLabel})</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {filteredRevenueAmount === null ? "…" : formatArgentinaPesos(filteredRevenueAmount)}
                </p>
              </article>
              <article className={STANDARD_CARD_CLASS_NAME}>
                <p className="text-sm font-semibold text-slate-600">Ventas totales del día</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {dailyClosureReportMetrics === null
                    ? "…"
                    : formatIntegerForDisplay(dailyClosureReportMetrics.totalTransactionCount)}
                </p>
              </article>
              <article className={STANDARD_CARD_CLASS_NAME}>
                <p className="text-sm font-semibold text-slate-600">Alertas de stock</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {criticalStockAlertCount === null ? "…" : formatIntegerForDisplay(criticalStockAlertCount)}
                </p>
              </article>
              <article className={STANDARD_CARD_CLASS_NAME}>
                <p className="text-sm font-semibold text-slate-600">
                  Utilidad real ({filtroLabel})
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {filteredGrossProfitAmount === null
                    ? "…"
                    : formatArgentinaPesos(filteredGrossProfitAmount)}
                </p>
              </article>
              <article className={STANDARD_CARD_CLASS_NAME}>
                <p className="text-sm font-semibold text-slate-600">Medio de pago principal</p>
                <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">
                  {dominantPaymentMethodSummary === null
                    ? "…"
                    : formatArgentinaPesos(dominantPaymentMethodSummary.revenueTotal)}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {dominantPaymentMethodSummary?.displayLabel ?? ""}
                </p>
              </article>
              <article className={STANDARD_CARD_CLASS_NAME}>
                <p className="text-sm font-semibold text-slate-600">Ticket promedio</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {averageTicketAmount === null
                    ? "…"
                    : formatArgentinaPesos(averageTicketAmount)}
                </p>
              </article>
            </div>,
            "max-w-6xl",
            <TrendingUp className="size-7" aria-hidden />,
          )
        : null}

      {isPaymentModalOpen
        ? renderModal(
            "Análisis de Medios de Pago",
            () => setIsPaymentModalOpen(false),
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {dailyClosureReportMetrics === null ? (
                <p className="text-sm text-slate-500">Cargando medios de pago…</p>
              ) : (
                ([
                  {
                    label: "Efectivo",
                    amount: dailyClosureReportMetrics.revenueTotalCash,
                    icon: <Wallet className="size-4 text-emerald-600" />,
                  },
                  {
                    label: "QR",
                    amount: dailyClosureReportMetrics.revenueTotalQr,
                    icon: <QrCode className="size-4 text-emerald-600" />,
                  },
                  {
                    label: "Transferencia",
                    amount: dailyClosureReportMetrics.revenueTotalTransfer,
                    icon: <Landmark className="size-4 text-emerald-600" />,
                  },
                  {
                    label: "Débito",
                    amount: dailyClosureReportMetrics.revenueTotalDebit,
                    icon: <WalletCards className="size-4 text-emerald-600" />,
                  },
                ] as const).map((paymentRow) => {
                  const totalRevenue = Math.max(
                    dailyClosureReportMetrics.totalRevenue,
                    0,
                  );
                  const percentage =
                    totalRevenue > 0
                      ? (paymentRow.amount / totalRevenue) * 100
                      : 0;
                  return (
                    <article key={paymentRow.label} className={STANDARD_CARD_CLASS_NAME}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {paymentRow.icon}
                          {paymentRow.label}
                        </div>
                        <span className="text-xs font-semibold text-zinc-500">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <p className="mt-3 text-xl font-bold tabular-nums">
                        {formatArgentinaPesos(paymentRow.amount)}
                      </p>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/30">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-700 transition-all duration-500"
                          style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}
                        />
                      </div>
                    </article>
                  );
                })
              )}
            </div>,
            "max-w-6xl",
            <CreditCard className="size-7" aria-hidden />,
          )
        : null}

      {isSessionModalOpen
        ? renderModal(
            "Rendimiento por Sesión",
            () => setIsSessionModalOpen(false),
            <div className="space-y-4">
              <article className={STANDARD_CARD_CLASS_NAME}>
                <p className="text-sm font-semibold text-slate-600">Utilidad bruta ({filtroLabel})</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {filteredGrossProfitAmount === null ? "…" : formatArgentinaPesos(filteredGrossProfitAmount)}
                </p>
              </article>
              <article className={STANDARD_CARD_CLASS_NAME}>{renderSessionChart()}</article>
            </div>,
            "max-w-6xl",
            <BarChart3 className="size-7" aria-hidden />,
          )
        : null}

      {isProductsModalOpen
        ? renderModal(
            "Ranking de Productos",
            () => setIsProductsModalOpen(false),
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="w-full min-w-[580px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Unidades</th>
                    <th className="px-4 py-3 text-right font-medium">Ingresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {isLoadingViewSummaryData ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        Cargando ranking…
                      </td>
                    </tr>
                  ) : topSellingProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        No hay productos en el ranking para este filtro.
                      </td>
                    </tr>
                  ) : (
                    topSellingProducts.map((productRow) => (
                      <tr key={productRow.productIdentifier} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {productRow.productName}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">
                          {formatIntegerForDisplay(productRow.totalUnitsSold)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {formatArgentinaPesos(productRow.totalRevenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>,
            "max-w-6xl",
            <Package className="size-7" aria-hidden />,
          )
        : null}

      {isInventoryModalOpen
        ? renderModal(
            "Auditoría de Movimientos",
            () => setIsInventoryModalOpen(false),
            <div className="space-y-4">
              {inventoryErrorMessage.length > 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {inventoryErrorMessage}
                </p>
              ) : null}
              {!isLoadingInventoryMovements &&
              recentInventoryMovements.length === 0 &&
              inventoryErrorMessage.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                    <Search className="size-7" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    No se encontraron movimientos para esta fecha
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Probá cambiando la fecha o el filtro de arqueo.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 dark:bg-zinc-800/50 dark:text-zinc-300">
                      <tr>
                        <th className="px-4 py-3 font-medium">Fecha</th>
                        <th className="px-4 py-3 font-medium">Producto</th>
                        <th className="px-4 py-3 font-medium">Operador</th>
                        <th className="px-4 py-3 font-medium">Rol</th>
                        <th className="px-4 py-3 font-medium">Tipo</th>
                        <th className="px-4 py-3 font-medium">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                      {isLoadingInventoryMovements ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-slate-500 dark:text-zinc-400">
                            Cargando movimientos…
                          </td>
                        </tr>
                      ) : (
                        recentInventoryMovements.map((movementRow) => (
                          <tr key={movementRow.movementIdentifier} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                            <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-zinc-200">
                              {movementRow.createdAtIso.length > 0
                                ? formatArgentinaDateTimeFromIso(movementRow.createdAtIso)
                                : "—"}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-zinc-100">
                              {movementRow.productName}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-zinc-200">
                              {movementRow.operatorFullName ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-zinc-200">
                              {movementRow.operatorRole === "ADMIN"
                                ? "Administrador"
                                : movementRow.operatorRole === "OPERATOR"
                                  ? "Operador"
                                  : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <InventoryMovementTypeBadge movementType={movementRow.movementType} />
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">
                              {movementRow.reason.length > 0
                                ? translateInventoryMovementReasonForDisplay(movementRow.reason)
                                : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>,
            "max-w-7xl",
            <ClipboardList className="size-7" aria-hidden />,
          )
        : null}

      {userIdentifier.length > 0 ? (
        <UserManagementModal
          isOpen={isUsersManagementPanelOpen}
          onClose={() => setIsUsersManagementPanelOpen(false)}
          currentAdministratorUserIdentifier={userIdentifier}
        />
      ) : null}

      <DailyClosurePrintReceipt
        dailyClosureReportMetrics={dailyClosureReportMetrics}
        formatCurrencyAmount={formatArgentinaPesos}
        formatIntegerForDisplay={formatIntegerForDisplay}
        filtroActivo={filtroArqueo}
        printedAtDisplayText={
          printedAtDisplayText.length > 0
            ? printedAtDisplayText
            : "Impreso: —"
        }
      />
    </>
  );
};

export default ReportsDashboardPage;
