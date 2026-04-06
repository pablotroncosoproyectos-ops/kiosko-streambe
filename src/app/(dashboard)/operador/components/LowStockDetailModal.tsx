"use client";

import { AlertTriangle, X } from "lucide-react";
import type { ReactElement } from "react";
import type { Product } from "@/types/database";

const MODAL_CLOSE_BUTTON_CLASS =
  "shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

export interface LowStockDetailModalProps {
  lowStockDetailModalBackdropVisible: boolean;
  onClose: () => void;
  lowStockProductsList: Product[];
}

export function LowStockDetailModal({
  lowStockDetailModalBackdropVisible,
  onClose,
  lowStockProductsList,
}: LowStockDetailModalProps): ReactElement {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-0 backdrop-blur-md transition-opacity duration-300 ease-out md:p-6 ${
        lowStockDetailModalBackdropVisible
          ? "opacity-100"
          : "pointer-events-none opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="low-stock-detail-title"
    >
      <div
        className={`flex h-full w-full max-h-dvh flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ease-out dark:bg-zinc-900 md:max-h-[95vh] md:max-w-2xl md:rounded-3xl md:border md:border-white/20 ${
          lowStockDetailModalBackdropVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-[0.95] opacity-0"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 md:px-6 md:py-4">
          <div className="min-w-0">
            <h2
              id="low-stock-detail-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Detalle de stock bajo
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">
              Productos con menos de 5 unidades en inventario
            </p>
          </div>
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
          <ul className="space-y-3">
            {lowStockProductsList.map((product) => (
              <li
                key={product.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-800/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60">
                  <AlertTriangle
                    className="size-5 text-amber-600 dark:text-amber-400"
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-zinc-900 dark:text-zinc-100">
                    {product.name}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Stock actual:{" "}
                    <span className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                      {product.currentStock}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
