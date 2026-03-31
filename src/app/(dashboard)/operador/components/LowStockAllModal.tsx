"use client";

import { X } from "lucide-react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { Product } from "@/types/database";

export interface LowStockAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  lowStockModalSlice: Product[];
  lowStockModalPageIndex: number;
  setLowStockModalPageIndex: Dispatch<SetStateAction<number>>;
  lowStockModalTotalPages: number;
}

export function LowStockAllModal({
  isOpen,
  onClose,
  lowStockModalSlice,
  lowStockModalPageIndex,
  setLowStockModalPageIndex,
  lowStockModalTotalPages,
}: LowStockAllModalProps): ReactElement | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="low-stock-all-title"
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-transform duration-200 ease-out dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2
            id="low-stock-all-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Stock bajo — listado completo
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <ul className="space-y-2">
            {lowStockModalSlice.map((product) => (
              <li
                key={product.id}
                className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50"
              >
                <p className="font-medium text-red-900 dark:text-red-100">
                  {product.name}
                </p>
                <p className="text-sm text-red-800 dark:text-red-200">
                  Stock: {product.currentStock}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            disabled={lowStockModalPageIndex <= 0}
            onClick={() =>
              setLowStockModalPageIndex((previous) =>
                Math.max(0, previous - 1),
              )
            }
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-zinc-600"
          >
            Anterior
          </button>
          <span className="text-sm text-zinc-600">
            Página {lowStockModalPageIndex + 1} / {lowStockModalTotalPages}
          </span>
          <button
            type="button"
            disabled={lowStockModalPageIndex >= lowStockModalTotalPages - 1}
            onClick={() =>
              setLowStockModalPageIndex((previous) =>
                Math.min(lowStockModalTotalPages - 1, previous + 1),
              )
            }
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-zinc-600"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
