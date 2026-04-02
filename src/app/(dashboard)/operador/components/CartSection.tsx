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
    <section className="flex flex-col">
      {/* Encabezado con Título y Total alineados */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Carrito en vivo
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ajustá cantidades y confirmá el cobro
          </p>
        </div>

        {/* Total alineado a la derecha */}
        <div className="rounded-2xl bg-emerald-50 px-4 py-2 border border-emerald-100 shadow-sm dark:bg-emerald-950/40 dark:border-emerald-900/50">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 text-right">
            Total
          </span>
          <span className="text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatArgentinaPesos(totalSaleAmount)}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        {/* 
            CONTENEDOR CON SCROLL OCULTO 
            Se eliminaron las clases de scrollbar-thin y se agregaron las de ocultación total
        */}
        <div className="max-h-[308px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full min-w-[280px] border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-100/95 backdrop-blur-sm dark:bg-zinc-800/95">
              <tr>
                <th className="px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-700">
                  Producto
                </th>
                <th className="px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-700">
                  Cant.
                </th>
                <th className="px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-700">
                  Total
                </th>
                <th className="px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-700">
                  Costo
                </th>
                <th className="px-4 py-4 text-right font-semibold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-700">
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
                    <td className="max-w-[140px] px-4 py-3.5 align-middle border-b border-zinc-100 dark:border-zinc-800/50">
                      <div className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {saleItem.name}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle border-b border-zinc-100 dark:border-zinc-800/50">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSaleItemQuantity(
                              saleItem.productIdentifier,
                              Math.max(1, saleItem.quantity - 1),
                            )
                          }
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/80"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-6 text-center font-bold tabular-nums">
                          {saleItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSaleItemQuantity(
                              saleItem.productIdentifier,
                              saleItem.quantity + 1,
                            )
                          }
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/80"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800/50">
                      {formatArgentinaPesos(
                        saleItem.quantity * saleItem.unitPrice,
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-middle border-b border-zinc-100 dark:border-zinc-800/50">
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
                    </td>
                    <td className="px-4 py-3.5 text-right align-middle border-b border-zinc-100 dark:border-zinc-800/50">
                      <button
                        type="button"
                        onClick={() =>
                          onRemoveSaleItem(saleItem.productIdentifier)
                        }
                        className="inline-flex size-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/40"
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

      {/* Paginación ULTRA COMPACTA */}
      <div className="mt-1 flex items-center justify-between px-1 text-[11px]">
        <span className="font-medium text-zinc-400">
          Pág. {Math.min(cartPageIndex + 1, cartTotalPages)} de {cartTotalPages}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={cartPageIndex <= 0}
            onClick={() =>
              setCartPageIndex((previous) => Math.max(0, previous - 1))
            }
            className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-bold shadow-sm disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-800"
          >
            Ant.
          </button>
          <button
            type="button"
            disabled={cartPageIndex >= cartTotalPages - 1}
            onClick={() =>
              setCartPageIndex((previous) =>
                Math.min(cartTotalPages - 1, previous + 1),
              )
            }
            className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-bold shadow-sm disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-800"
          >
            Sig.
          </button>
        </div>
      </div>
    </section>
  );
}