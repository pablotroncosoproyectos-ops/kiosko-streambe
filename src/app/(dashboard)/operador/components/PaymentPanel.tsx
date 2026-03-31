"use client";

import { Check, ShoppingCart } from "lucide-react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import { PAYMENT_METHOD_OPTIONS } from "../constants";
import type { SelectedPaymentMethod } from "../types";

export interface PaymentPanelProps {
  selectedPaymentMethod: SelectedPaymentMethod;
  setSelectedPaymentMethod: Dispatch<SetStateAction<SelectedPaymentMethod>>;
  saleNotesInput: string;
  setSaleNotesInput: (value: string) => void;
  onClose: () => void;
  onFinalizeSale: () => void | Promise<void>;
  isSubmittingSale: boolean;
  saleItemsCount: number;
}

export function PaymentPanel({
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  saleNotesInput,
  setSaleNotesInput,
  onClose,
  onFinalizeSale,
  isSubmittingSale,
  saleItemsCount,
}: PaymentPanelProps): ReactElement {
  return (
    <section className="mt-6 border-t border-zinc-100 pt-6 dark:border-zinc-800">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Métodos de Pago */}
        <div className="xl:col-span-7">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Método de pago
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {PAYMENT_METHOD_OPTIONS.map((method) => {
              const MethodIcon = method.icon;
              const isSelected = selectedPaymentMethod === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(method.value)}
                  className={
                    isSelected
                      ? "flex h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-emerald-600 bg-emerald-600 px-4 text-white shadow-lg shadow-emerald-600/30 transition-all scale-[1.02]"
                      : "flex h-16 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200/90 bg-zinc-100 px-4 text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  }
                >
                  <MethodIcon
                    className={
                      isSelected
                        ? "size-5 text-white"
                        : "size-5 text-zinc-600 dark:text-zinc-300"
                    }
                  />
                  <div className="flex items-center gap-2">
                    {isSelected && <Check className="size-4 text-white" strokeWidth={3} />}
                    <span className="text-sm font-bold">{method.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Observaciones */}
        <div className="xl:col-span-5">
          <label
            htmlFor="quick-load-sale-notes"
            className="text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
          >
            Observaciones
          </label>
          <textarea
            id="quick-load-sale-notes"
            value={saleNotesInput}
            onChange={(event) => setSaleNotesInput(event.target.value)}
            placeholder="Nota breve..."
            className="mt-3 h-16 w-full resize-none rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-2 text-sm text-zinc-700 focus:border-emerald-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200"
            maxLength={500}
          />
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-zinc-200 bg-white py-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={() => void onFinalizeSale()}
          disabled={isSubmittingSale || saleItemsCount === 0}
          className="flex-[2] flex items-center justify-center gap-3 rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-xl shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50"
        >
          <ShoppingCart className="size-6" />
          {isSubmittingSale ? "Procesando…" : "Cobrar"}
        </button>
      </div>
    </section>
  );
}