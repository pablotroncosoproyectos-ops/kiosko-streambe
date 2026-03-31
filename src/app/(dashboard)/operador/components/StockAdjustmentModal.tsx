"use client";

import { X } from "lucide-react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { Product } from "@/types/database";

export interface StockAdjustmentModalProps {
  product: Product | null;
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
      className="fixed inset-0 z-55 flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-adjustment-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2
            id="stock-adjustment-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Ajustar stock
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
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">{product.name}</span>
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Stock actual:{" "}
            <span className="font-semibold tabular-nums">
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
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
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
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
              />
            </label>
          ) : null}
          {stockAdjustmentErrorMessage.length > 0 ? (
            <p className="text-sm text-red-600" role="alert">
              {stockAdjustmentErrorMessage}
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
            disabled={!canSubmitStockAdjustment}
            onClick={() => void onSubmit()}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingStockAdjustment ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
