"use client";

import { FileText, Loader2, Printer, X } from "lucide-react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import { formatArgentinaPesos } from "@/lib/currencyFormat";
import {
  formatArgentinaSaleDate,
  formatPaymentMethodLabel,
} from "../formatters";
import type { RecentSaleHistoryRecord, SaleHistoryTab } from "../types";

export interface SaleModalProps {
  saleModalBackdropVisible: boolean;
  onClose: () => void;
  recentSalesForActiveHistoryTab: RecentSaleHistoryRecord[];
  recentSalesHistoryPageSlice: RecentSaleHistoryRecord[];
  historyTotalRowCount: number;
  saleHistoryTab: SaleHistoryTab;
  setSaleHistoryTab: Dispatch<SetStateAction<SaleHistoryTab>>;
  historyPageIndex: number;
  historyTotalPages: number;
  setHistoryPageIndex: Dispatch<SetStateAction<number>>;
  onDownloadHistorySaleTicketPdf: (record: RecentSaleHistoryRecord) => void;
  historyTicketPdfLoadingSaleId: string | null;
  onDownloadHistoryTabReportPdf: () => void;
  historyReportPdfLoading: boolean;
}

export function SaleModal({
  saleModalBackdropVisible,
  onClose,
  recentSalesForActiveHistoryTab,
  recentSalesHistoryPageSlice,
  historyTotalRowCount,
  saleHistoryTab,
  setSaleHistoryTab,
  historyPageIndex,
  historyTotalPages,
  setHistoryPageIndex,
  onDownloadHistorySaleTicketPdf,
  historyTicketPdfLoadingSaleId,
  onDownloadHistoryTabReportPdf,
  historyReportPdfLoading,
}: SaleModalProps): ReactElement {
  const pdfBusy =
    historyTicketPdfLoadingSaleId !== null || historyReportPdfLoading;

  const historySessionHint =
    saleHistoryTab === "recreo"
      ? "Solo ventas del recreo abierto (misma sesión activa)."
      : "Solo ventas de la sesión de caja abierta (Venta libre).";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-0 backdrop-blur-md transition-opacity duration-300 ease-out md:p-6 ${
        saleModalBackdropVisible
          ? "opacity-100"
          : "pointer-events-none opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-history-modal-title"
    >
      <div
        className={`flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ease-out dark:bg-zinc-900 md:h-[95vh] md:max-w-[min(calc(100vw-3rem),1600px)] md:rounded-3xl md:border md:border-white/20 ${
          saleModalBackdropVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-[0.95] opacity-0"
        }`}
      >
        <header className="flex shrink-0 flex-col gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 md:px-6 md:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id="sale-history-modal-title"
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100 md:text-base"
              >
                Historial de operaciones
              </h2>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {recentSalesForActiveHistoryTab.length} venta
                {recentSalesForActiveHistoryTab.length === 1 ? "" : "s"} ·{" "}
                {historySessionHint}
              </p>
              <button
                type="button"
                onClick={onDownloadHistoryTabReportPdf}
                disabled={
                  historyTotalRowCount === 0 ||
                  historyReportPdfLoading ||
                  historyTicketPdfLoadingSaleId !== null
                }
                className="mt-2 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                {historyReportPdfLoading ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Printer className="size-4 shrink-0" aria-hidden />
                )}
                Imprimir reporte
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 flex-wrap gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 md:px-6">
            <button
              type="button"
              onClick={() => setSaleHistoryTab("ventaLibre")}
              className={
                saleHistoryTab === "ventaLibre"
                  ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                  : "rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              }
            >
              Venta libre
            </button>
            <button
              type="button"
              onClick={() => setSaleHistoryTab("recreo")}
              className={
                saleHistoryTab === "recreo"
                  ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                  : "rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              }
            >
              Recreo
            </button>
            <button
              type="button"
              onClick={() => setSaleHistoryTab("ventaTotal")}
              className={
                saleHistoryTab === "ventaTotal"
                  ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                  : "rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              }
            >
              Venta total
            </button>
          </div>

          <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin]">
                <table className="w-full min-w-[560px] text-left">
                  <thead className="sticky top-0 z-1 bg-zinc-50 dark:bg-zinc-800/95">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Productos
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Total
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Pago
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Usuario
                      </th>
                      <th className="w-14 px-2 py-3 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        <span className="sr-only">Ticket PDF</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {historyTotalRowCount === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-sm text-zinc-500"
                        >
                          <p className="font-medium text-zinc-600 dark:text-zinc-400">
                            Sin ventas
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {saleHistoryTab === "ventaLibre"
                              ? "No hay ventas de venta libre."
                              : saleHistoryTab === "recreo"
                                ? "No hay ventas del recreo activo."
                                : "No hay ventas registradas para hoy."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      recentSalesHistoryPageSlice.map((record, index) => {
                        const rowLoading =
                          historyTicketPdfLoadingSaleId ===
                          record.saleIdentifier;
                        return (
                          <tr key={`${record.saleIdentifier}-${index}`}>
                            <td className="max-w-[200px] px-4 py-3 text-xs text-zinc-800 dark:text-zinc-200">
                              {record.productNamesSummary}
                            </td>
                            <td className="px-4 py-3 text-xs tabular-nums text-zinc-800 dark:text-zinc-200">
                              {formatArgentinaPesos(record.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-800 dark:text-zinc-200">
                              {formatPaymentMethodLabel(record.paymentMethod)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-800 dark:text-zinc-200">
                              {formatArgentinaSaleDate(record.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-800 dark:text-zinc-200">
                              <div className="font-medium">
                                {record.sellerFullName}
                              </div>
                              <div className="text-zinc-500 dark:text-zinc-400">
                                {record.sellerRole}
                              </div>
                            </td>
                            <td className="px-2 py-3 text-center align-middle">
                              <button
                                type="button"
                                onClick={() =>
                                  onDownloadHistorySaleTicketPdf(record)
                                }
                                disabled={pdfBusy}
                                aria-label={`Descargar ticket PDF de la venta ${record.saleIdentifier}`}
                                className="inline-flex size-11 items-center justify-center rounded-full border border-zinc-200/80 bg-zinc-50 text-zinc-600 transition hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-45 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
                              >
                                {rowLoading ? (
                                  <Loader2
                                    className="size-5 animate-spin"
                                    aria-hidden
                                  />
                                ) : (
                                  <FileText className="size-5" aria-hidden />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {historyTotalRowCount > 0 ? (
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <button
                    type="button"
                    onClick={() =>
                      setHistoryPageIndex((previous) =>
                        Math.max(1, previous - 1),
                      )
                    }
                    disabled={historyPageIndex <= 1}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Anterior
                  </button>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Página{" "}
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {historyPageIndex}
                    </span>{" "}
                    de{" "}
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {historyTotalPages}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setHistoryPageIndex((previous) =>
                        Math.min(historyTotalPages, previous + 1),
                      )
                    }
                    disabled={historyPageIndex >= historyTotalPages}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Siguiente
                  </button>
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
