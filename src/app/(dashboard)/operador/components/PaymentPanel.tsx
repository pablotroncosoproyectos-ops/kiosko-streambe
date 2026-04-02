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
  onFinalizeSale,
  isSubmittingSale,
  saleItemsCount,
}: PaymentPanelProps): ReactElement {
  return (
    <section className="mt-auto border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Métodos de Pago */}
        <div className="xl:col-span-7">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
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
                      ? "flex h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-emerald-600 bg-emerald-600 px-4 text-white shadow-lg shadow-emerald-600/30 transition-all scale-[1.02]"
                      : "flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }
                >
                  <MethodIcon
                    className={
                      isSelected
                        ? "size-5 text-white"
                        : "size-5 text-zinc-500 dark:text-zinc-400"
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

        {/* Observaciones - Alineado con la altura de las 2 filas de botones */}
        <div className="xl:col-span-5 flex flex-col">
          <label
            htmlFor="quick-load-sale-notes"
            className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
          >
            Observaciones
          </label>
          <textarea
            id="quick-load-sale-notes"
            value={saleNotesInput}
            onChange={(event) => setSaleNotesInput(event.target.value)}
            placeholder="¿Algún detalle para esta venta?..."
            // h-[124px] equivale a (h-14 * 2) + gap-3
            className="mt-3 h-[124px] w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200 transition-all"
            maxLength={500}
          />
        </div>
      </div>

      {/* Botón de Acción Principal */}
      <div className="mt-8">
        <button
          type="button"
          onClick={() => void onFinalizeSale()}
          disabled={isSubmittingSale || saleItemsCount === 0}
          className="group relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-2xl bg-emerald-600 py-5 text-xl font-black uppercase tracking-tight text-white shadow-2xl shadow-emerald-600/40 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isSubmittingSale ? (
            <div className="flex items-center gap-3">
              <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Procesando...</span>
            </div>
          ) : (
            <>
              <ShoppingCart className="size-7 transition-transform group-hover:-rotate-12" />
              <span>Finalizar y Cobrar</span>
            </>
          )}
        </button>
        
        {saleItemsCount === 0 && (
          <p className="mt-3 text-center text-xs font-medium text-zinc-400">
            Agregá productos al carrito para habilitar el cobro
          </p>
        )}
      </div>
    </section>
  );
}