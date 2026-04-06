"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";
import type { Product } from "@/types/database";

const MODAL_CLOSE_BUTTON_CLASS =
  "shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

const MODAL_FIELD_CLASS =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100";

const MODAL_PRIMARY_ACTION_CLASS =
  "w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold uppercase tracking-tight text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export interface StockToolsModalProps {
  isOpen: boolean;
  stockToolsModalBackdropVisible: boolean;
  onClose: () => void;
  onOpenCreateProduct: () => void;
  productsCatalog: Product[];
  onSelectProductForAdjustment: (product: Product) => void;
}

export function StockToolsModal({
  isOpen,
  stockToolsModalBackdropVisible,
  onClose,
  onOpenCreateProduct,
  productsCatalog,
  onSelectProductForAdjustment,
}: StockToolsModalProps): ReactElement | null {
  const [selectedProductId, setSelectedProductId] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedProductId("");
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-0 backdrop-blur-md transition-opacity duration-300 ease-out md:p-6 ${
        stockToolsModalBackdropVisible
          ? "opacity-100"
          : "pointer-events-none opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-tools-title"
    >
      <div
        className={`flex h-full w-full max-h-dvh flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ease-out dark:bg-zinc-900 md:max-h-[95vh] md:max-w-2xl md:rounded-3xl md:border md:border-white/20 ${
          stockToolsModalBackdropVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-[0.95] opacity-0"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 md:px-6 md:py-4">
          <h2
            id="stock-tools-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Crear o Ajustar stock
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={onOpenCreateProduct}
              className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Nuevo producto
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Alta rápida de producto para el operador.
              </p>
            </button>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Ajustar stock
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Seleccione un producto y ajuste cantidad con justificación.
              </p>
              {productsCatalog.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Producto para ajustar
                    <select
                      value={selectedProductId}
                      onChange={(event) =>
                        setSelectedProductId(event.target.value)
                      }
                      className={`mt-1 w-full ${MODAL_FIELD_CLASS}`}
                    >
                      <option value="" disabled>
                        Elegir producto…
                      </option>
                      {productsCatalog.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.currentStock})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={selectedProductId.length === 0}
                    onClick={() => {
                      const selected = productsCatalog.find(
                        (product) => product.id === selectedProductId,
                      );
                      if (selected) {
                        onSelectProductForAdjustment(selected);
                      }
                    }}
                    className={MODAL_PRIMARY_ACTION_CLASS}
                  >
                    Ajustar
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
