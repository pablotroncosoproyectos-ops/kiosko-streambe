"use client";

import { X } from "lucide-react";
import type { ReactElement } from "react";
import type { Product } from "@/types/database";

export interface StockToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateProduct: () => void;
  productsCatalog: Product[];
  onSelectProductForAdjustment: (product: Product) => void;
}

export function StockToolsModal({
  isOpen,
  onClose,
  onOpenCreateProduct,
  productsCatalog,
  onSelectProductForAdjustment,
}: StockToolsModalProps): ReactElement | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-55 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-tools-title"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-white/25 bg-white/85 p-5 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="stock-tools-title" className="text-lg font-semibold">
            Crear o Ajustar stock
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={onOpenCreateProduct}
            className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <p className="text-base font-semibold">Nuevo producto</p>
            <p className="mt-1 text-sm text-zinc-500">
              Alta rápida de producto para el operador.
            </p>
          </button>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-400 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-base font-semibold">Ajustar stock</p>
            <p className="mt-1 text-sm text-zinc-500">
              Seleccione un producto y ajuste cantidad con justificación.
            </p>
            {productsCatalog.length > 0 ? (
              <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Producto para ajustar
                <select
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  onChange={(event) => {
                    const selected = productsCatalog.find(
                      (product) => product.id === event.target.value,
                    );
                    if (selected) {
                      onSelectProductForAdjustment(selected);
                    }
                  }}
                  defaultValue=""
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
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
