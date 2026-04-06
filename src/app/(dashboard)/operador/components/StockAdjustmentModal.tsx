"use client";

import { X } from "lucide-react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { Product } from "@/types/database";

const MODAL_CLOSE_BUTTON_CLASS =
  "shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

const MODAL_FIELD_CLASS =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100";

const MODAL_PRIMARY_ACTION_CLASS =
  "rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold uppercase tracking-tight text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const MODAL_SECONDARY_ACTION_CLASS =
  "rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

export interface StockAdjustmentModalProps {
  product: Product | null;
  stockAdjustmentModalBackdropVisible: boolean;
  onClose: () => void;
  stockAdjustmentNewStockInput: string;
  setStockAdjustmentNewStockInput: Dispatch<SetStateAction<string>>;
  stockAdjustmentReasonInput: string;
  setStockAdjustmentReasonInput: Dispatch<SetStateAction<string>>;
  stockAdjustmentIsReduction: boolean;
  stockAdjustmentErrorMessage: string;
  canSubmitStockAdjustment: boolean;
  isSavingStockAdjustment: boolean;
  onSubmit: () => Promise<void>;
}

export function StockAdjustmentModal({
  product,
  stockAdjustmentModalBackdropVisible,
  onClose,
  stockAdjustmentNewStockInput,
  setStockAdjustmentNewStockInput,
  stockAdjustmentReasonInput,
  setStockAdjustmentReasonInput,
  stockAdjustmentIsReduction,
  stockAdjustmentErrorMessage,
  canSubmitStockAdjustment,
  isSavingStockAdjustment,
  onSubmit,
}: StockAdjustmentModalProps): ReactElement | null {
  if (product === null) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-0 backdrop-blur-md transition-opacity duration-300 ease-out md:p-6 ${
        stockAdjustmentModalBackdropVisible
          ? "opacity-100"
          : "pointer-events-none opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-adjustment-title"
    >
      <div
        className={`flex h-full w-full max-h-dvh flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ease-out dark:bg-zinc-900 md:h-auto md:max-h-[min(95vh,900px)] md:max-w-md md:rounded-3xl md:border md:border-white/20 ${
          stockAdjustmentModalBackdropVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-[0.95] opacity-0"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 md:px-6 md:py-4">
          <h2
            id="stock-adjustment-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Ajustar stock
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={MODAL_CLOSE_BUTTON_CLASS}
            aria-label="Cerrar"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [-ms-overflow-style:none] [scrollbar-width:none] md:px-6 md:py-5 [&::-webkit-scrollbar]:hidden">
          <div className="space-y-4">
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {product.name}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Stock actual:{" "}
              <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {product.currentStock}
              </span>
            </p>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nuevo stock
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={stockAdjustmentNewStockInput}
                onChange={(event) =>
                  setStockAdjustmentNewStockInput(event.target.value)
                }
                className={`mt-1 w-full ${MODAL_FIELD_CLASS}`}
              />
            </label>
            {stockAdjustmentIsReduction ? (
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Motivo del ajuste (obligatorio)
                <textarea
                  value={stockAdjustmentReasonInput}
                  onChange={(event) =>
                    setStockAdjustmentReasonInput(event.target.value)
                  }
                  rows={3}
                  placeholder="Ej.: mercadería dañada, conteo incorrecto…"
                  className={`mt-1 w-full resize-y ${MODAL_FIELD_CLASS}`}
                />
              </label>
            ) : null}
            {stockAdjustmentErrorMessage.length > 0 ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {stockAdjustmentErrorMessage}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800 md:px-6 md:py-4">
          <button
            type="button"
            onClick={onClose}
            className={MODAL_SECONDARY_ACTION_CLASS}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSubmitStockAdjustment}
            onClick={() => void onSubmit()}
            className={MODAL_PRIMARY_ACTION_CLASS}
          >
            {isSavingStockAdjustment ? "Guardando…" : "Guardar ajuste"}
          </button>
        </div>
      </div>
    </div>
  );
}
