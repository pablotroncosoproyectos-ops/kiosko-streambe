"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  MailPlus,
  Landmark,
  Package,
  Printer,
  QrCode,
  TrendingUp,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatArgentinaPesos } from "@/lib/currencyFormat";
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

interface InviteUserApiResponse {
  message?: string;
}

type TrackedPaymentMethodKind = "CASH" | "QR" | "TRANSFER" | "DEBIT";
type TipoArqueo = "TOTAL" | "RECREO" | "LIBRE";
type InviteRole = "ADMIN" | "OPERADOR";

interface DominantPaymentMethodSummary {
  displayLabel: string;
  revenueTotal: number;
  transactionCount: number;
}

const REVENUE_BAR_CHART_COLORS = ["#0f172a", "#64748b"];

const STANDARD_CARD_CLASS_NAME = "rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm";
const LAUNCHER_CARD_CLASS_NAME =
  "group flex min-h-[160px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-zinc-400 hover:shadow-md";

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
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [canRenderChart, setCanRenderChart] = useState<boolean>(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState<boolean>(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState<boolean>(false);
  const [isInviteUserModalOpen, setIsInviteUserModalOpen] =
    useState<boolean>(false);
  const [inviteEmailInput, setInviteEmailInput] = useState<string>("");
  const [inviteRoleInput, setInviteRoleInput] = useState<InviteRole>("OPERADOR");
  const [isSendingInvitation, setIsSendingInvitation] =
    useState<boolean>(false);
  const [inviteUserErrorMessage, setInviteUserErrorMessage] =
    useState<string>("");
  const [inviteUserSuccessMessage, setInviteUserSuccessMessage] =
    useState<string>("");
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

  function openInviteUserModal(): void {
    setInviteEmailInput("");
    setInviteRoleInput("OPERADOR");
    setInviteUserErrorMessage("");
    setInviteUserSuccessMessage("");
    setIsInviteUserModalOpen(true);
  }

  async function handleInviteUserSubmit(): Promise<void> {
    const normalizedEmail = inviteEmailInput.trim().toLowerCase();
    if (normalizedEmail.length === 0) {
      setInviteUserErrorMessage("El email es obligatorio.");
      return;
    }

    setIsSendingInvitation(true);
    setInviteUserErrorMessage("");
    setInviteUserSuccessMessage("");
    try {
      const payload = {
        email: normalizedEmail,
        role: inviteRoleInput,
      };
      const response = await fetch("/api/users/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseBody = (await response.json()) as InviteUserApiResponse;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setInviteUserErrorMessage(
          responseBody.message || "No se pudo enviar la invitación.",
        );
        return;
      }

      setInviteUserSuccessMessage(
        responseBody.message || "Invitación enviada correctamente.",
      );
    } catch {
      setInviteUserErrorMessage("Error inesperado al enviar la invitación.");
    } finally {
      setIsSendingInvitation(false);
    }
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

  const isSelectedDateToday =
    selectedReportCalendarDate ===
    getCurrentBuenosAiresCalendarDateYyyyMmDd();

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

  const filtroLabel =
    filtroArqueo === "RECREO"
      ? "Recreo"
      : filtroArqueo === "LIBRE"
        ? "Venta Libre"
        : "Arqueo Total";

  function renderSessionChart(): ReactElement {
    return (
      <div className="relative h-[400px] min-h-[400px] w-full min-w-0 overflow-hidden">
        {isLoadingDailyClosureReport ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Cargando gráfico…
          </div>
        ) : revenueChartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No hay datos para mostrar.
          </div>
        ) : canRenderChart && isMounted ? (
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
                formatter={(value) => {
                  const rawValue = Array.isArray(value) ? value[0] : value;
                  const numericRevenue =
                    typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);
                  return formatArgentinaPesos(
                    Number.isFinite(numericRevenue) ? numericRevenue : 0,
                  );
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
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
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
  ): ReactElement {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6">
        <div
          className={`flex max-h-[92vh] w-full ${widthClassName} flex-col overflow-hidden rounded-2xl border border-white/25 bg-white/85 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10`}
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto h-screen w-full max-w-7xl overflow-hidden space-y-4 px-4 py-4 text-slate-900 print:hidden">
        <div className="mx-auto flex h-full max-w-7xl min-h-0 flex-col gap-4">
          <header className="flex flex-col gap-3">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Panel de Informes
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Resumen operativo y métricas de ventas
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openInviteUserModal}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <MailPlus className="size-4" aria-hidden />
                  Invitación de Usuario
                </button>
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
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  <CalendarDays className="size-4 text-slate-500" aria-hidden />
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
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleResetReportCalendarDateToToday}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Hoy
                  </button>
                </div>
                {isSelectedDateToday ? (
                  <p className="max-w-xl text-xs leading-relaxed text-slate-500">
                    Filtro de hoy activo: el arqueo impreso corresponde a este
                    día calendario (Buenos Aires).
                  </p>
                ) : (
                  <p className="max-w-xl text-xs leading-relaxed text-slate-500">
                    Fecha histórica: las métricas agrupan ventas solo para el día
                    seleccionado.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
                        : "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    }
                  >
                    {filterButton.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {pageErrorMessage.length > 0 ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm"
              role="alert"
            >
              {pageErrorMessage}
            </p>
          ) : null}

          {dailyClosureErrorMessage.length > 0 ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm"
              role="alert"
            >
              {dailyClosureErrorMessage}
            </p>
          ) : null}

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={() => setIsGeneralModalOpen(true)}
              className={LAUNCHER_CARD_CLASS_NAME}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Resumen General</h3>
                <TrendingUp className="size-8 text-emerald-600" />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Ingresos, ventas, alertas y medio de pago principal.
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Filtro activo: {filtroLabel}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className={LAUNCHER_CARD_CLASS_NAME}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Análisis de Medios de Pago</h3>
                <CreditCard className="size-8 text-indigo-600" />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Efectivo, QR, transferencia y débito con montos.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsSessionModalOpen(true)}
              className={LAUNCHER_CARD_CLASS_NAME}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Rendimiento por Sesión</h3>
                <BarChart3 className="size-8 text-zinc-700" />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Comparativa visual de ingresos por tipo de sesión.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsProductsModalOpen(true)}
              className={LAUNCHER_CARD_CLASS_NAME}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Ranking de Productos</h3>
                <Package className="size-8 text-amber-600" />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Tabla completa de productos más vendidos.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsInventoryModalOpen(true)}
              className={LAUNCHER_CARD_CLASS_NAME}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Auditoría de Movimientos</h3>
                <ClipboardList className="size-8 text-sky-600" />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Historial de inventario para control y trazabilidad.
              </p>
            </button>
          </section>
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
            </div>,
          )
        : null}

      {isPaymentModalOpen
        ? renderModal(
            "Análisis de Medios de Pago",
            () => setIsPaymentModalOpen(false),
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {dailyClosureReportMetrics === null ? (
                <p className="text-sm text-slate-500">Cargando medios de pago…</p>
              ) : (
                <>
                  <article className={STANDARD_CARD_CLASS_NAME}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Wallet className="size-4 text-emerald-600" /> Efectivo
                    </div>
                    <p className="mt-3 text-xl font-bold tabular-nums">
                      {formatArgentinaPesos(dailyClosureReportMetrics.revenueTotalCash)}
                    </p>
                  </article>
                  <article className={STANDARD_CARD_CLASS_NAME}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <QrCode className="size-4 text-indigo-600" /> QR
                    </div>
                    <p className="mt-3 text-xl font-bold tabular-nums">
                      {formatArgentinaPesos(dailyClosureReportMetrics.revenueTotalQr)}
                    </p>
                  </article>
                  <article className={STANDARD_CARD_CLASS_NAME}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Landmark className="size-4 text-sky-600" /> Transferencia
                    </div>
                    <p className="mt-3 text-xl font-bold tabular-nums">
                      {formatArgentinaPesos(dailyClosureReportMetrics.revenueTotalTransfer)}
                    </p>
                  </article>
                  <article className={STANDARD_CARD_CLASS_NAME}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <WalletCards className="size-4 text-violet-600" /> Débito
                    </div>
                    <p className="mt-3 text-xl font-bold tabular-nums">
                      {formatArgentinaPesos(dailyClosureReportMetrics.revenueTotalDebit)}
                    </p>
                  </article>
                </>
              )}
            </div>,
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
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Producto</th>
                      <th className="px-4 py-3 font-medium">Operador</th>
                      <th className="px-4 py-3 font-medium">Rol</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {isLoadingInventoryMovements ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          Cargando movimientos…
                        </td>
                      </tr>
                    ) : recentInventoryMovements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          No hay movimientos para mostrar.
                        </td>
                      </tr>
                    ) : (
                      recentInventoryMovements.map((movementRow) => (
                        <tr key={movementRow.movementIdentifier} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {movementRow.createdAtIso.length > 0
                              ? formatArgentinaDateTimeFromIso(movementRow.createdAtIso)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {movementRow.productName}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {movementRow.operatorFullName ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {movementRow.operatorRole === "ADMIN"
                              ? "Administrador"
                              : movementRow.operatorRole === "OPERATOR"
                                ? "Operador"
                                : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <InventoryMovementTypeBadge movementType={movementRow.movementType} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
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
            </div>,
            "max-w-7xl",
          )
        : null}

      {isInviteUserModalOpen
        ? renderModal(
            "Invitación de Usuario",
            () => setIsInviteUserModalOpen(false),
            <div className="mx-auto w-full max-w-xl space-y-4">
              <p className="text-sm text-slate-600">
                Enviá una invitación oficial y preasigná el rol para el acceso al
                sistema.
              </p>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={inviteEmailInput}
                  onChange={(event) => setInviteEmailInput(event.target.value)}
                  placeholder="usuario@dominio.com"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Rol</span>
                <select
                  value={inviteRoleInput}
                  onChange={(event) =>
                    setInviteRoleInput(event.target.value as InviteRole)
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="OPERADOR">OPERADOR</option>
                </select>
              </label>

              {inviteUserErrorMessage.length > 0 ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {inviteUserErrorMessage}
                </p>
              ) : null}
              {inviteUserSuccessMessage.length > 0 ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {inviteUserSuccessMessage}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteUserModalOpen(false)}
                  disabled={isSendingInvitation}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleInviteUserSubmit();
                  }}
                  disabled={isSendingInvitation}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isSendingInvitation ? "Enviando…" : "Enviar invitación"}
                </button>
              </div>
            </div>,
            "max-w-2xl",
          )
        : null}

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
