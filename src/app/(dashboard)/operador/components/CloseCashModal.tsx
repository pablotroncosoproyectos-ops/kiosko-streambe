"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import { formatArgentinaPesos } from "@/lib/currencyFormat";
import { MAX_SHIFT_CLOSING_NOTES_INPUT_LENGTH } from "../constants";
import type { SalesByPaymentMethodBreakdown } from "@/services/salesSessionService";
import type { OperatorCloseCashSummaryPayload } from "../types";

const CASH_DIFFERENCE_EPSILON = 0.01;

const MODAL_CLOSE_BUTTON_CLASS =
  "shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

const MODAL_FIELD_CLASS =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100";

const MODAL_PRIMARY_ACTION_CLASS =
  "rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold uppercase tracking-tight text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const MODAL_SECONDARY_ACTION_CLASS =
  "rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

const SECTION_SEPARATOR_CLASS =
  "mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-700";

function DetailPaymentMethodRows(props: {
  breakdown: SalesByPaymentMethodBreakdown;
}): ReactElement {
  const { breakdown } = props;
  const rowClass =
    "flex justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-b-0 dark:border-zinc-700/80";
  const labelClass = "text-zinc-500 dark:text-zinc-400";
  const valueClass = "shrink-0 tabular-nums text-zinc-600 dark:text-zinc-300";
  return (
    <ul className="text-[11px] leading-snug">
      <li className={rowClass}>
        <span className={labelClass}>Efectivo</span>
        <span className={valueClass}>{formatArgentinaPesos(breakdown.cash)}</span>
      </li>
      <li className={rowClass}>
        <span className={labelClass}>Débito</span>
        <span className={valueClass}>{formatArgentinaPesos(breakdown.debit)}</span>
      </li>
      <li className={rowClass}>
        <span className={labelClass}>Transferencia</span>
        <span className={valueClass}>
          {formatArgentinaPesos(breakdown.transfer)}
        </span>
      </li>
      <li className={rowClass}>
        <span className={labelClass}>QR</span>
        <span className={valueClass}>{formatArgentinaPesos(breakdown.qr)}</span>
      </li>
    </ul>
  );
}

export interface CloseCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  canEditOpeningBalance: boolean;
  isLoadingCashSummary: boolean;
  cashSummaryPayload: OperatorCloseCashSummaryPayload | null;
  openingBalanceCashInput: string;
  setOpeningBalanceCashInput: Dispatch<SetStateAction<string>>;
  expensesCashInput: string;
  setExpensesCashInput: Dispatch<SetStateAction<string>>;
  physicalCashInput: string;
  setPhysicalCashInput: Dispatch<SetStateAction<string>>;
  shiftClosingNotesInput: string;
  setShiftClosingNotesInput: Dispatch<SetStateAction<string>>;
  closeCashErrorMessage: string;
  isSubmittingCloseCash: boolean;
  onSubmit: () => Promise<void>;
}

export function CloseCashModal({
  isOpen,
  onClose,
  canEditOpeningBalance,
  isLoadingCashSummary,
  cashSummaryPayload,
  openingBalanceCashInput,
  setOpeningBalanceCashInput,
  expensesCashInput,
  setExpensesCashInput,
  physicalCashInput,
  setPhysicalCashInput,
  shiftClosingNotesInput,
  setShiftClosingNotesInput,
  closeCashErrorMessage,
  isSubmittingCloseCash,
  onSubmit,
}: CloseCashModalProps): ReactElement | null {
  const [isDetailedSalesSummaryOpen, setIsDetailedSalesSummaryOpen] =
    useState(false);

  if (!isOpen) {
    return null;
  }

  const parsedOpeningBalance = Number.parseFloat(
    openingBalanceCashInput.replace(",", "."),
  );
  const parsedExpensesTotal = Number.parseFloat(expensesCashInput.replace(",", "."));
  const parsedPhysicalCash = Number.parseFloat(physicalCashInput.replace(",", "."));

  const safeOpeningBalance = Number.isFinite(parsedOpeningBalance)
    ? Math.max(0, parsedOpeningBalance)
    : cashSummaryPayload?.openingBalance ?? 0;
  const safeExpensesTotal = Number.isFinite(parsedExpensesTotal)
    ? Math.max(0, parsedExpensesTotal)
    : cashSummaryPayload?.expensesTotal ?? 0;
  const safePhysicalCash = Number.isFinite(parsedPhysicalCash)
    ? Math.max(0, parsedPhysicalCash)
    : 0;

  const realtimeExpectedCash = cashSummaryPayload
    ? safeOpeningBalance + cashSummaryPayload.cashSalesTotal - safeExpensesTotal
    : 0;
  const realtimeCashDifference = safePhysicalCash - realtimeExpectedCash;

  const hasPhysicalCashInput =
    physicalCashInput.trim().length > 0 && Number.isFinite(parsedPhysicalCash);
  const hasSignificantCashDifference =
    Math.abs(realtimeCashDifference) > CASH_DIFFERENCE_EPSILON;
  const requiresExpenseJustification = safeExpensesTotal > 0;
  const requiresClosingNotesArea =
    requiresExpenseJustification ||
    (hasPhysicalCashInput && hasSignificantCashDifference);
  const hasClosingNotesContent = shiftClosingNotesInput.trim().length > 0;
  const needsClosingNotesToSubmit =
    requiresExpenseJustification ||
    (hasPhysicalCashInput && hasSignificantCashDifference);

  const isCloseSubmitDisabled =
    isSubmittingCloseCash ||
    isLoadingCashSummary ||
    cashSummaryPayload === null ||
    (needsClosingNotesToSubmit && !hasClosingNotesContent);

  return (
    <div
      className="fixed inset-0 z-55 flex items-center justify-center bg-zinc-950/45 p-0 backdrop-blur-md transition-opacity duration-300 ease-out dark:bg-zinc-950/55 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-cash-title"
    >
      <div className="flex h-full w-full max-h-dvh flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ease-out dark:bg-zinc-900 md:h-auto md:max-h-[min(95vh,900px)] md:max-w-lg md:rounded-3xl md:border md:border-white/20">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80 md:px-6 md:py-4">
          <div>
            <h2
              id="close-cash-title"
              className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              Cierre de caja
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Arqueo de efectivo del turno
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={MODAL_CLOSE_BUTTON_CLASS}
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [-ms-overflow-style:none] [scrollbar-width:none] md:px-6 md:py-5 [&::-webkit-scrollbar]:hidden">
          {isLoadingCashSummary ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Cargando sesión abierta…
            </p>
          ) : cashSummaryPayload === null ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No hay sesión de venta abierta. Realice una venta o abra la caja
              para continuar.
            </p>
          ) : (
            <>
              {/* —— Movimientos (arqueo) —— */}
              <section aria-label="Movimientos de caja">
                <ul className="space-y-3">
                  <li>
                    <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Saldo inicial
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={openingBalanceCashInput}
                      onChange={(event) =>
                        setOpeningBalanceCashInput(event.target.value)
                      }
                      readOnly={!canEditOpeningBalance}
                      className={`mt-1 w-full ${MODAL_FIELD_CLASS} ${
                        canEditOpeningBalance
                          ? ""
                          : "cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/80"
                      }`}
                    />
                  </li>
                  <li>
                    <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Total ventas efectivo
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatArgentinaPesos(cashSummaryPayload.cashSalesTotal)}
                      className={`mt-1 w-full ${MODAL_FIELD_CLASS} cursor-not-allowed bg-zinc-50 font-medium tabular-nums dark:bg-zinc-800/80`}
                    />
                    <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                      Caja (sesión Venta libre abierta):{" "}
                      {formatArgentinaPesos(cashSummaryPayload.cashSalesVentaLibreTotal)}
                      . El arqueo no incluye efectivo de recreo (otra sesión); ver historial
                      Recreo.
                    </p>
                  </li>
                  <li>
                    <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Gastos (efectivo)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={expensesCashInput}
                      onChange={(event) => setExpensesCashInput(event.target.value)}
                      className={`mt-1 w-full ${MODAL_FIELD_CLASS}`}
                    />
                  </li>
                  <li className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-800/40">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Efectivo esperado
                    </p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatArgentinaPesos(realtimeExpectedCash)}
                    </p>
                  </li>
                </ul>
              </section>

              {/* —— Resumen detallado (consulta) —— */}
              <div className={SECTION_SEPARATOR_CLASS}>
                <button
                  type="button"
                  onClick={() =>
                    setIsDetailedSalesSummaryOpen((previous) => !previous)
                  }
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/90 px-3 py-2.5 text-left text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  aria-expanded={isDetailedSalesSummaryOpen}
                  aria-controls="close-cash-detailed-sales-panel"
                  id="close-cash-detailed-sales-trigger"
                >
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">
                    Resumen detallado de ventas
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
                      isDetailedSalesSummaryOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>

                {isDetailedSalesSummaryOpen ? (
                  <div
                    id="close-cash-detailed-sales-panel"
                    role="region"
                    aria-labelledby="close-cash-detailed-sales-trigger"
                    className="mt-3 space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
                  >
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Venta libre
                      </p>
                      <DetailPaymentMethodRows
                        breakdown={cashSummaryPayload.ventaLibreSalesByPaymentMethod}
                      />
                    </div>
                    <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Recreo (referencia)
                      </p>
                      <p className="mb-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                        El cierre de caja usa solo la sesión Venta libre. Las ventas en
                        recreo no se suman aquí; consulte el historial en la pestaña Recreo.
                      </p>
                      <DetailPaymentMethodRows
                        breakdown={cashSummaryPayload.recreoSalesByPaymentMethod}
                      />
                    </div>
                    <div className="border-t border-dashed border-zinc-200 pt-3 dark:border-zinc-700">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Total general (bruto)
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                          {formatArgentinaPesos(cashSummaryPayload.grossSalesTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* —— Cierre —— */}
              <div className={SECTION_SEPARATOR_CLASS}>
                <section aria-label="Cierre y conteo">
                  <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    Efectivo real contado
                    <input
                      type="text"
                      inputMode="decimal"
                      value={physicalCashInput}
                      onChange={(event) =>
                        setPhysicalCashInput(event.target.value)
                      }
                      placeholder="0,00"
                      className="mt-1.5 w-full rounded-xl border-2 border-emerald-200/80 bg-white px-3 py-3 text-base font-semibold tabular-nums text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 dark:border-emerald-900/50 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <div className="mt-4 rounded-2xl border-2 border-zinc-300 bg-zinc-100 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-800/70">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                      Diferencia de caja
                    </p>
                    <p
                      className={`mt-1 text-2xl font-bold tabular-nums ${
                        realtimeCashDifference > CASH_DIFFERENCE_EPSILON
                          ? "text-emerald-600 dark:text-emerald-400"
                          : realtimeCashDifference < -CASH_DIFFERENCE_EPSILON
                            ? "text-red-600 dark:text-red-400"
                            : "text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      {formatArgentinaPesos(realtimeCashDifference)}
                    </p>
                  </div>

                  {requiresClosingNotesArea ? (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Observaciones del cierre
                        <textarea
                          value={shiftClosingNotesInput}
                          onChange={(event) =>
                            setShiftClosingNotesInput(event.target.value)
                          }
                          rows={3}
                          maxLength={MAX_SHIFT_CLOSING_NOTES_INPUT_LENGTH}
                          placeholder="Gastos, diferencia de caja u otras observaciones…"
                          className={`mt-1.5 w-full resize-y ${MODAL_FIELD_CLASS}`}
                        />
                      </label>
                      {needsClosingNotesToSubmit && !hasClosingNotesContent ? (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                          Complete las observaciones para confirmar el cierre.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              </div>
            </>
          )}
          {closeCashErrorMessage.length > 0 ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {closeCashErrorMessage}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80 md:px-6 md:py-4">
          <button
            type="button"
            onClick={onClose}
            className={MODAL_SECONDARY_ACTION_CLASS}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isCloseSubmitDisabled}
            onClick={() => void onSubmit()}
            className={MODAL_PRIMARY_ACTION_CLASS}
          >
            {isSubmittingCloseCash ? "Cerrando…" : "Confirmar cierre"}
          </button>
        </div>
      </div>
    </div>
  );
}
