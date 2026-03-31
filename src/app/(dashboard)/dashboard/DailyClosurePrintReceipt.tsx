"use client";

import type { ReactElement } from "react";
import type { DailyClosureReportMetrics } from "@/services/reportService";

// Definimos el tipo para asegurar consistencia con el Dashboard
type TipoArqueo = "TOTAL" | "RECREO" | "LIBRE";

interface DailyClosurePrintReceiptProperties {
  dailyClosureReportMetrics: DailyClosureReportMetrics | null;
  formatCurrencyAmount: (amount: number) => string;
  formatIntegerForDisplay: (value: number) => string;
  printedAtDisplayText: string;
  filtroActivo: TipoArqueo; // Nueva propiedad añadida
}

export function DailyClosurePrintReceipt({
  dailyClosureReportMetrics,
  formatCurrencyAmount,
  formatIntegerForDisplay,
  printedAtDisplayText,
  filtroActivo,
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

  // Lógica para determinar qué montos mostrar según el filtro
  const tituloReporte = 
    filtroActivo === "RECREO" ? "Informe de cierre: RECREOS" :
    filtroActivo === "LIBRE" ? "Informe de cierre: VENTA LIBRE" :
    "Informe de cierre diario (GENERAL)";

  const montoPrincipal = 
    filtroActivo === "RECREO" ? metrics.recreationBreakSessionRevenueTotal :
    filtroActivo === "LIBRE" ? metrics.freeSaleSessionRevenueTotal :
    metrics.grandTotalReconciliationAmount;

  return (
    <div className="hidden print:block print:min-h-screen print:bg-white print:p-10 print:text-zinc-900">
      <header className="border-b border-zinc-300 pb-4 text-center">
        <h1 className="text-xl font-bold tracking-tight uppercase">
          KIOSKO STREAMBE — {tituloReporte}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Fecha del informe (Buenos Aires): {metrics.reportCalendarDateYyyyMmDd}
        </p>
      </header>

      <section className="mt-6 space-y-4 text-sm">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {filtroActivo === "TOTAL" ? "Gran arqueo (recreo + venta libre)" : `Arqueo de sesión: ${filtroActivo}`}
          </h2>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {formatCurrencyAmount(montoPrincipal)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            {filtroActivo === "TOTAL" 
              ? "Incluye todas las ventas del período agrupadas por tipo de sesión operativa."
              : `Este importe corresponde exclusivamente a las operaciones realizadas en modalidad de ${filtroActivo.toLowerCase()}.`}
          </p>
          
          {filtroActivo === "TOTAL" && (
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
          )}
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Totales generales del día
          </h2>
          <ul className="mt-2 space-y-1 text-zinc-700">
            <li className="flex justify-between gap-4 border-b border-zinc-100 py-1">
              <span>Ingresos totales brutos</span>
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
            <li className="flex justify-between gap-4 border-b border-zinc-100 py-1">
              <span>Utilidad bruta (día, Σ PVP − costo)</span>
              <span className="tabular-nums font-medium">
                {formatCurrencyAmount(metrics.grossProfitTotal)}
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Desglose por medio de pago (Día completo)
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
          <p className="mt-3 text-xs leading-relaxed text-zinc-500 italic">
            Documento para uso interno de conciliación y arqueo de caja. El filtro aplicado para la impresión es: <strong>{filtroActivo}</strong>.
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