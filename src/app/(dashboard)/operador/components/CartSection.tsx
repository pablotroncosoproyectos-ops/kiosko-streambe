"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import { formatArgentinaPesos } from "@/lib/currencyFormat";
import type { CartItem } from "../types";

export interface CartSectionProps {
  totalSaleAmount: number;
  saleItemsList: CartItem[];
  pagedCartItems: CartItem[];
  cartPageIndex: number;
  cartTotalPages: number;
  setCartPageIndex: Dispatch<SetStateAction<number>>;
  onUpdateSaleItemQuantity: (
    productIdentifier: string,
    quantity: number,
  ) => void;
  onToggleSaleItemUseCostPrice: (productIdentifier: string) => void;
  onRemoveSaleItem: (productIdentifier: string) => void;
}

export function CartSection({
  totalSaleAmount,
  saleItemsList,
  pagedCartItems,
  cartPageIndex,
  cartTotalPages,
  setCartPageIndex,
  onUpdateSaleItemQuantity,
  onToggleSaleItemUseCostPrice,
  onRemoveSaleItem,
}: CartSectionProps): ReactElement {
  return (
    <section className="min-h-[300px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Carrito en vivo
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ajustá cantidades y confirmá el cobro
          </p>
        </div>
      </div>

      <div className="min-h-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-end border-b border-zinc-200/80 bg-zinc-50/90 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800/80">
          <div className="rounded-2xl bg-emerald-50 px-3 py-1 text-right dark:bg-emerald-950/40">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Total
            </span>
            <span className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatArgentinaPesos(totalSaleAmount)}
            </span>
          </div>
        </div>
        <div>
          <table className="w-full min-w-[280px] border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-100/95 dark:bg-zinc-800/95">
              <tr>
                <th className="rounded-tl-2xl px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200">
                  Producto
                </th>
                <th className="px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200">
                  Cantidad
                </th>
                <th className="px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200">
                  Total
                </th>
                <th className="px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200">
                  Precio costo
                </th>
                <th className="rounded-tr-2xl px-4 py-4 text-right font-semibold text-zinc-700 dark:text-zinc-200">
                  —
                </th>
              </tr>
            </thead>
            <tbody>
              {saleItemsList.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-14 text-center text-sm text-zinc-500"
                  >
                    El carrito está vacío.
                  </td>
                </tr>
              ) : (
                pagedCartItems.map((saleItem, rowIndex) => (
                  <tr
                    key={saleItem.productIdentifier}
                    className={
                      rowIndex % 2 === 0
                        ? "bg-white dark:bg-zinc-900"
                        : "bg-zinc-50 dark:bg-zinc-800/50"
                    }
                  >
                    <td className="max-w-[140px] px-4 py-3.5 align-middle">
                      <div className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {saleItem.name}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSaleItemQuantity(
                              saleItem.productIdentifier,
                              Math.max(1, saleItem.quantity - 1),
                            )
                          }
                          className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/80"
                        >
                          <Minus className="size-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={saleItem.quantity}
                          onChange={(event) =>
                            onUpdateSaleItemQuantity(
                              saleItem.productIdentifier,
                              Number.parseInt(event.target.value || "1", 10),
                            )
                          }
                          className="w-12 rounded-xl border border-zinc-200 bg-white px-1 py-2 text-center text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSaleItemQuantity(
                              saleItem.productIdentifier,
                              saleItem.quantity + 1,
                            )
                          }
                          className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/80"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                      {formatArgentinaPesos(
                        saleItem.quantity * saleItem.unitPrice,
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={saleItem.useCostPrice}
                          disabled={saleItem.costPrice === null}
                          onChange={() =>
                            onToggleSaleItemUseCostPrice(
                              saleItem.productIdentifier,
                            )
                          }
                          className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Usar costo
                      </label>
                    </td>
                    <td className="px-4 py-3.5 text-right align-middle">
                      <button
                        type="button"
                        onClick={() =>
                          onRemoveSaleItem(saleItem.productIdentifier)
                        }
                        className="inline-flex size-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="font-medium text-zinc-600 dark:text-zinc-400">
          Página {Math.min(cartPageIndex + 1, cartTotalPages)} / {cartTotalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={cartPageIndex <= 0}
            onClick={() =>
              setCartPageIndex((previous) => Math.max(0, previous - 1))
            }
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold shadow-sm disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={cartPageIndex >= cartTotalPages - 1}
            onClick={() =>
              setCartPageIndex((previous) =>
                Math.min(cartTotalPages - 1, previous + 1),
              )
            }
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold shadow-sm disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}
