"use client";

import type { ReactElement } from "react";
import type { DailyClosureReportMetrics } from "@/services/reportService";

interface DailyClosurePrintReceiptProperties {
  dailyClosureReportMetrics: DailyClosureReportMetrics | null;
  formatCurrencyAmount: (amount: number) => string;
  formatIntegerForDisplay: (value: number) => string;
  printedAtDisplayText: string;
}

export function DailyClosurePrintReceipt({
  dailyClosureReportMetrics,
  formatCurrencyAmount,
  formatIntegerForDisplay,
  printedAtDisplayText,
}: DailyClosurePrintReceiptProperties): ReactElement | null {
  if (!dailyClosureReportMetrics) {
    return (
      <div className="hidden print:block print:min-h-screen print:bg-white print:p-8 print:text-zinc-900">
        <p className="text-sm">
          No hay datos de cierre disponibles para imprimir.
        </p>
      </div>
    );
  }

  const metrics = dailyClosureReportMetrics;

  return (
    <div className="hidden print:block print:min-h-screen print:bg-white print:p-10 print:text-zinc-900">
      <header className="border-b border-zinc-300 pb-4 text-center">
        <h1 className="text-xl font-bold tracking-tight">
          KIOSKO STREAMBE — Informe de cierre diario
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Fecha del informe (Buenos Aires): {metrics.reportCalendarDateYyyyMmDd}
        </p>
      </header>

      <section className="mt-6 space-y-4 text-sm">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Gran arqueo (recreo + venta libre)
          </h2>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {formatCurrencyAmount(metrics.grandTotalReconciliationAmount)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            Incluye todas las ventas del período (efectivo, QR, transferencia y
            débito), agrupadas por tipo de sesión operativa.
          </p>
          <ul className="mt-2 space-y-1 text-zinc-700">
            <li className="flex justify-between gap-4 border-b border-zinc-100 py-1">
              <span>Total recreo</span>
              <span className="tabular-nums font-medium">
                {formatCurrencyAmount(metrics.recreationBreakSessionRevenueTotal)}
              </span>
            </li>
            <li className="flex justify-between gap-4 border-b border-zinc-100 py-1">
              <span>Total venta libre</span>
              <span className="tabular-nums font-medium">
                {formatCurrencyAmount(metrics.freeSaleSessionRevenueTotal)}
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Totales generales
          </h2>
          <ul className="mt-2 space-y-1 text-zinc-700">
            <li className="flex justify-between gap-4 border-b border-zinc-100 py-1">
              <span>Ingresos totales</span>
              <span className="tabular-nums font-medium">
                {formatCurrencyAmount(metrics.totalRevenue)}
              </span>
            </li>
            <li className="flex justify-between gap-4 border-b border-zinc-100 py-1">
              <span>Cantidad de transacciones</span>
              <span className="tabular-nums font-medium">
                {formatIntegerForDisplay(metrics.totalTransactionCount)}
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Desglose por medio de pago
          </h2>
          <ul className="mt-2 space-y-1 text-zinc-700">
            <li className="flex justify-between gap-4 border-b border-zinc-100 py-1">
              <span>Efectivo</span>
              <span className="tabular-nums font-medium">
                {formatCurrencyAmount(metrics.revenueTotalCash)}
              </span>
            </li>
            <li className="flex justify-between gap-4 border-b border-zinc-100 py-1">
              <span>QR</span>
              <span className="tabular-nums font-medium">
                {formatCurrencyAmount(metrics.revenueTotalQr)}
              </span>
            </li>
            <li className="flex justify-between gap-4 border-b border-zinc-100 py-1">
              <span>Transferencia</span>
              <span className="tabular-nums font-medium">
                {formatCurrencyAmount(metrics.revenueTotalTransfer)}
              </span>
            </li>
            <li className="flex justify-between gap-4 border-b border-zinc-100 py-1">
              <span>Débito</span>
              <span className="tabular-nums font-medium">
                {formatCurrencyAmount(metrics.revenueTotalDebit)}
              </span>
            </li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            Documento para uso interno de conciliación y arqueo de caja. Verifique
            los importes contra los comprobantes físicos y electrónicos
            correspondientes.
          </p>
        </div>
      </section>

      <footer className="mt-10 border-t border-zinc-300 pt-4 text-center text-xs text-zinc-600">
        <p className="font-medium text-zinc-500">{printedAtDisplayText}</p>
        <p className="mt-2 uppercase tracking-wide">
          Solo control interno — No válido como comprobante fiscal
        </p>
      </footer>
    </div>
  );
}
