"use client";

import { X } from "lucide-react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import { formatArgentinaPesos } from "@/lib/currencyFormat";
import { MAX_SHIFT_CLOSING_NOTES_INPUT_LENGTH } from "../constants";

const MODAL_FIELD_CLASS =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100";

export interface CloseCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoadingCashSummary: boolean;
  cashSummaryPayload: {
    sessionIdentifier: string;
    sessionType: string;
    openingBalance: number;
    expensesTotal: number;
    cashSalesTotal: number;
    expectedCashBalance: number;
  } | null;
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
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-55 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-cash-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/25 bg-white/85 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2
            id="close-cash-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Cerrar caja (arqueo)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-4 px-4 py-4">
          {isLoadingCashSummary ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Cargando sesión abierta…
            </p>
          ) : cashSummaryPayload === null ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No hay sesión de venta abierta. Realice una venta o inicie recreo
              para abrir una sesión.
            </p>
          ) : (
            <>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sesión:{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  {cashSummaryPayload.sessionType}
                </span>
              </p>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-zinc-700 dark:text-zinc-200">
                  Ventas en efectivo acumuladas:{" "}
                  <span className="font-semibold tabular-nums">
                    {formatArgentinaPesos(cashSummaryPayload.cashSalesTotal)}
                  </span>
                </p>
                <p className="mt-2 text-zinc-700 dark:text-zinc-200">
                  Efectivo esperado (preliminar):{" "}
                  <span className="font-semibold tabular-nums">
                    {formatArgentinaPesos(cashSummaryPayload.expectedCashBalance)}
                  </span>
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Fórmula: saldo inicial + ventas efectivo − gastos. Se recalcula
                  al guardar con los valores editados.
                </p>
              </div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Saldo inicial (efectivo de apertura)
                <input
                  type="text"
                  inputMode="decimal"
                  value={openingBalanceCashInput}
                  onChange={(event) =>
                    setOpeningBalanceCashInput(event.target.value)
                  }
                  className={`mt-1 w-full ${MODAL_FIELD_CLASS}`}
                />
              </label>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Gastos (efectivo)
                <input
                  type="text"
                  inputMode="decimal"
                  value={expensesCashInput}
                  onChange={(event) => setExpensesCashInput(event.target.value)}
                  className={`mt-1 w-full ${MODAL_FIELD_CLASS}`}
                />
              </label>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Efectivo real contado (obligatorio)
                <input
                  type="text"
                  inputMode="decimal"
                  value={physicalCashInput}
                  onChange={(event) =>
                    setPhysicalCashInput(event.target.value)
                  }
                  placeholder="0,00"
                  className={`mt-1 w-full ${MODAL_FIELD_CLASS}`}
                />
              </label>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Observaciones del turno (opcional)
                <textarea
                  value={shiftClosingNotesInput}
                  onChange={(event) =>
                    setShiftClosingNotesInput(event.target.value)
                  }
                  rows={3}
                  maxLength={MAX_SHIFT_CLOSING_NOTES_INPUT_LENGTH}
                  placeholder="Incidencias, diferencias, comentarios del cierre…"
                  className={`mt-1 w-full resize-y ${MODAL_FIELD_CLASS}`}
                />
              </label>
            </>
          )}
          {closeCashErrorMessage.length > 0 ? (
            <p className="text-sm text-red-600" role="alert">
              {closeCashErrorMessage}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={
              isSubmittingCloseCash ||
              isLoadingCashSummary ||
              cashSummaryPayload === null
            }
            onClick={() => void onSubmit()}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmittingCloseCash ? "Cerrando…" : "Confirmar cierre"}
          </button>
        </div>
      </div>
    </div>
  );
}
