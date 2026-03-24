"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Landmark,
  LogOut,
  Package,
  Printer,
  QrCode,
  TrendingUp,
  Wallet,
  WalletCards,
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

interface MeApiResponse {
  userProfile?: {
    fullName: string;
    role: string;
  };
  message?: string;
}

type TrackedPaymentMethodKind = "CASH" | "QR" | "TRANSFER" | "DEBIT";

interface DominantPaymentMethodSummary {
  displayLabel: string;
  revenueTotal: number;
  transactionCount: number;
}

const REVENUE_BAR_CHART_COLORS = ["#0f172a", "#64748b"];

const STANDARD_CARD_CLASS_NAME =
  "rounded-xl border border-zinc-200 bg-white p-6 shadow-sm";

const SESSION_LOGOUT_BUTTON_CLASS_NAME =
  "inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 sm:w-auto";

function formatArgentinaCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

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
  const [loggedInUserFullName, setLoggedInUserFullName] = useState<string>("");
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
        fetch("/api/reports/top-products", {
          method: "GET",
          credentials: "include",
        }),
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
  }, []);

  const loadDailyClosureReportFromServer =
    useCallback(async (): Promise<void> => {
      setIsLoadingDailyClosureReport(true);
      setDailyClosureErrorMessage("");

      try {
        const requestUrl = `/api/reports/daily-closure?reportDate=${encodeURIComponent(selectedReportCalendarDate)}`;
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
    }, [selectedReportCalendarDate]);

  const loadInventoryMovementsFromServer =
    useCallback(async (): Promise<void> => {
      setIsLoadingInventoryMovements(true);
      setInventoryErrorMessage("");

      try {
        const response = await fetch("/api/reports/inventory-movements", {
          method: "GET",
          credentials: "include",
        });

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
    }, []);

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
    const loadLoggedInUserProfile = async (): Promise<void> => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });
        const responseBody = (await response.json()) as MeApiResponse;
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        if (response.ok && responseBody.userProfile) {
          setLoggedInUserFullName(responseBody.userProfile.fullName);
        }
      } catch {
        // El panel sigue siendo utilizable sin el nombre mostrado.
      }
    };
    void loadLoggedInUserProfile();
  }, []);

  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.assign("/login");
  }

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

  const isSelectedDateToday =
    selectedReportCalendarDate ===
    getCurrentBuenosAiresCalendarDateYyyyMmDd();

  return (
    <>
      <main className="min-h-full bg-slate-50 px-4 py-8 text-slate-900 print:hidden">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-col gap-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Panel de Informes
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Resumen operativo y métricas de ventas
                </p>
                {loggedInUserFullName.length > 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Usuario: {loggedInUserFullName}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className={SESSION_LOGOUT_BUTTON_CLASS_NAME}
              >
                <LogOut className="size-4" aria-hidden />
                Cerrar sesión
              </button>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Administración
                </Link>
                <Link
                  href="/operador"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Package className="size-4" aria-hidden />
                  Punto de Venta
                </Link>
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
                  Imprimir Arqueo
                </button>
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 lg:col-span-12">
              <article className={STANDARD_CARD_CLASS_NAME}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Ingresos Totales
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                      {isLoadingDailyClosureReport ||
                      dailyClosureReportMetrics === null
                        ? "…"
                        : formatArgentinaCurrency(
                            dailyClosureReportMetrics.totalRevenue,
                          )}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <TrendingUp className="size-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Suma de importes de venta para{" "}
                  <span className="font-medium text-slate-600">
                    {selectedReportCalendarDate}
                  </span>{" "}
                  (día según Buenos Aires).
                </p>
              </article>

              <article className={STANDARD_CARD_CLASS_NAME}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Ventas totales
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                      {isLoadingDailyClosureReport ||
                      dailyClosureReportMetrics === null
                        ? "…"
                        : formatIntegerForDisplay(
                            dailyClosureReportMetrics.totalTransactionCount,
                          )}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <BarChart3 className="size-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Cantidad de transacciones registradas en la fecha seleccionada.
                </p>
              </article>

              <article className={STANDARD_CARD_CLASS_NAME}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Alertas de Stock
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                      {isLoadingViewSummaryData || criticalStockAlertCount === null
                        ? "…"
                        : formatIntegerForDisplay(criticalStockAlertCount)}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <AlertTriangle className="size-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Productos con existencias por debajo del umbral definido para el
                  negocio.
                </p>
              </article>

              <article className={STANDARD_CARD_CLASS_NAME}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Medio de pago principal
                    </p>
                    <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
                      {isLoadingDailyClosureReport ||
                      dominantPaymentMethodSummary === null
                        ? "…"
                        : dominantPaymentMethodSummary.revenueTotal > 0
                          ? formatArgentinaCurrency(
                              dominantPaymentMethodSummary.revenueTotal,
                            )
                          : "—"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {isLoadingDailyClosureReport ||
                      dominantPaymentMethodSummary === null
                        ? ""
                        : dominantPaymentMethodSummary.displayLabel}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <CreditCard className="size-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  {isLoadingDailyClosureReport ||
                  dominantPaymentMethodSummary === null
                    ? ""
                    : dominantPaymentMethodSummary.transactionCount > 0
                      ? `${formatIntegerForDisplay(
                          dominantPaymentMethodSummary.transactionCount,
                        )} operaciones con este medio (mayor monto en el día).`
                      : "Sin operaciones registradas con efectivo, QR, transferencia ni débito en esta fecha."}
                </p>
              </article>
            </section>

            {dailyClosureReportMetrics !== null &&
            !isLoadingDailyClosureReport ? (
              <section className="space-y-6 lg:col-span-12">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Medios de pago
                </h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                  <article className={STANDARD_CARD_CLASS_NAME}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Wallet className="size-4 text-emerald-600" aria-hidden />
                      Efectivo
                    </div>
                    <p className="mt-3 text-xl font-semibold tabular-nums text-slate-900">
                      {formatArgentinaCurrency(
                        dailyClosureReportMetrics.revenueTotalCash,
                      )}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatIntegerForDisplay(
                        dailyClosureReportMetrics.transactionCountCash,
                      )}{" "}
                      operaciones
                    </p>
                  </article>
                  <article className={STANDARD_CARD_CLASS_NAME}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <QrCode className="size-4 text-indigo-600" aria-hidden />
                      QR
                    </div>
                    <p className="mt-3 text-xl font-semibold tabular-nums text-slate-900">
                      {formatArgentinaCurrency(
                        dailyClosureReportMetrics.revenueTotalQr,
                      )}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatIntegerForDisplay(
                        dailyClosureReportMetrics.transactionCountQr,
                      )}{" "}
                      operaciones
                    </p>
                  </article>
                  <article className={STANDARD_CARD_CLASS_NAME}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Landmark className="size-4 text-sky-600" aria-hidden />
                      Transferencia
                    </div>
                    <p className="mt-3 text-xl font-semibold tabular-nums text-slate-900">
                      {formatArgentinaCurrency(
                        dailyClosureReportMetrics.revenueTotalTransfer,
                      )}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatIntegerForDisplay(
                        dailyClosureReportMetrics.transactionCountTransfer,
                      )}{" "}
                      operaciones
                    </p>
                  </article>
                  <article className={STANDARD_CARD_CLASS_NAME}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <WalletCards
                        className="size-4 text-violet-600"
                        aria-hidden
                      />
                      Débito
                    </div>
                    <p className="mt-3 text-xl font-semibold tabular-nums text-slate-900">
                      {formatArgentinaCurrency(
                        dailyClosureReportMetrics.revenueTotalDebit,
                      )}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatIntegerForDisplay(
                        dailyClosureReportMetrics.transactionCountDebit,
                      )}{" "}
                      operaciones
                    </p>
                  </article>
                </div>
              </section>
            ) : null}

            <section
              className={`${STANDARD_CARD_CLASS_NAME} lg:col-span-7`}
            >
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="size-5 text-slate-600" aria-hidden />
                <h2 className="text-lg font-semibold text-slate-900">
                  Ingresos por sesión
                </h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                Comparación recreo y venta libre para{" "}
                <span className="font-medium text-slate-800">
                  {selectedReportCalendarDate}
                </span>
                .
              </p>
              <div className="h-[320px] w-full">
                {isLoadingDailyClosureReport ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Cargando gráfico…
                  </div>
                ) : revenueChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No hay datos para mostrar.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueChartData}
                      margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-zinc-200"
                      />
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
                        tickFormatter={(value: number) =>
                          formatIntegerForDisplay(value)
                        }
                      />
                      <Tooltip
                        formatter={(value) => {
                          const rawValue = Array.isArray(value)
                            ? value[0]
                            : value;
                          const numericRevenue =
                            typeof rawValue === "number"
                              ? rawValue
                              : Number(rawValue ?? 0);
                          return formatArgentinaCurrency(
                            Number.isFinite(numericRevenue) ? numericRevenue : 0,
                          );
                        }}
                        labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "1px solid #e4e4e7",
                          boxShadow: "0 10px 15px -3px rgb(24 24 27 / 0.08)",
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        name="Ingresos"
                        radius={[8, 8, 0, 0]}
                      >
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
                )}
              </div>
            </section>

            <section
              className={`${STANDARD_CARD_CLASS_NAME} lg:col-span-5`}
            >
              <div className="mb-4 flex items-center gap-2">
                <Package className="size-5 text-slate-600" aria-hidden />
                <h2 className="text-lg font-semibold text-slate-900">
                  Productos más vendidos
                </h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                Ranking según ventas registradas en el sistema (cinco primeros).
              </p>
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Producto</th>
                      <th className="px-4 py-3 font-medium">Unidades</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Ingresos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {isLoadingViewSummaryData ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          Cargando ranking…
                        </td>
                      </tr>
                    ) : topSellingProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No hay productos en el ranking.
                        </td>
                      </tr>
                    ) : (
                      topSellingProducts.map((productRow) => (
                        <tr
                          key={productRow.productIdentifier}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">
                              {productRow.productName}
                            </div>
                            {productRow.stockKeepingUnit ? (
                              <div className="text-xs text-slate-500">
                                Código: {productRow.stockKeepingUnit}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-slate-700">
                            {formatIntegerForDisplay(
                              productRow.totalUnitsSold,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                            {formatArgentinaCurrency(productRow.totalRevenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`${STANDARD_CARD_CLASS_NAME} lg:col-span-12`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ClipboardList
                    className="size-5 text-slate-600"
                    aria-hidden
                  />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Historial de movimientos
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Últimos 10 movimientos registrados
                </p>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                Control interno de cambios de stock (ventas, ajustes, ingresos y
                vencimientos).
              </p>
              {inventoryErrorMessage.length > 0 ? (
                <p
                  className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                  role="status"
                >
                  {inventoryErrorMessage}
                </p>
              ) : null}
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Producto</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {isLoadingInventoryMovements ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          Cargando movimientos…
                        </td>
                      </tr>
                    ) : recentInventoryMovements.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No hay movimientos para mostrar.
                        </td>
                      </tr>
                    ) : (
                      recentInventoryMovements.map((movementRow) => (
                        <tr
                          key={movementRow.movementIdentifier}
                          className="hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {movementRow.createdAtIso.length > 0
                              ? formatArgentinaDateTimeFromIso(
                                  movementRow.createdAtIso,
                                )
                              : "—"}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {movementRow.productName}
                          </td>
                          <td className="px-4 py-3">
                            <InventoryMovementTypeBadge
                              movementType={movementRow.movementType}
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {movementRow.reason.length > 0
                              ? translateInventoryMovementReasonForDisplay(
                                  movementRow.reason,
                                )
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>

      <DailyClosurePrintReceipt
        dailyClosureReportMetrics={dailyClosureReportMetrics}
        formatCurrencyAmount={formatArgentinaCurrency}
        formatIntegerForDisplay={formatIntegerForDisplay}
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
