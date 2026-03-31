"use client";

import { Camera } from "lucide-react";
import type { ReactElement } from "react";
import type { Product } from "@/types/database";
import { formatArgentinaPesos } from "@/lib/currencyFormat";
import type { CatalogBrowseMode } from "../types";

export interface CatalogSectionProps {
  catalogBrowseMode: CatalogBrowseMode;
  onCatalogBrowseModeChange: (mode: CatalogBrowseMode) => void;
  quickLoadSelectedCategory: string | "ALL";
  onQuickLoadSelectedCategoryChange: (category: string | "ALL") => void;
  catalogUniqueCategoryList: string[];
  quickLoadSearchQuery: string;
  onQuickLoadSearchQueryChange: (value: string) => void;
  quickLoadDisplayedProducts: Product[];
  isLoadingProductsCatalog: boolean;
  onAddProductFromQuickLoad: (
    product: Product,
    quantity: number,
    lineSubtotal: number,
  ) => void;
}

export function CatalogSection({
  catalogBrowseMode,
  onCatalogBrowseModeChange,
  quickLoadSelectedCategory,
  onQuickLoadSelectedCategoryChange,
  catalogUniqueCategoryList,
  quickLoadSearchQuery,
  onQuickLoadSearchQueryChange,
  quickLoadDisplayedProducts,
  isLoadingProductsCatalog,
  onAddProductFromQuickLoad,
}: CatalogSectionProps): ReactElement {
  return (
    <div className="min-h-0 overflow-y-auto rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-7 py-7 shadow-lg dark:border-zinc-800 lg:col-span-4">
      <div className="mb-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => onCatalogBrowseModeChange("categories")}
            className={
              catalogBrowseMode === "categories"
                ? "rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/25"
                : "rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            }
          >
            Categorías
          </button>
          <button
            type="button"
            onClick={() => onCatalogBrowseModeChange("search")}
            className={
              catalogBrowseMode === "search"
                ? "rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/25"
                : "rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            }
          >
            Buscar nombre
          </button>
        </div>
        {catalogBrowseMode === "categories" ? (
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => onQuickLoadSelectedCategoryChange("ALL")}
              className={
                quickLoadSelectedCategory === "ALL"
                  ? "rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900"
                  : "rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              }
            >
              Todas
            </button>
            {catalogUniqueCategoryList.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => onQuickLoadSelectedCategoryChange(category)}
                className={
                  quickLoadSelectedCategory === category
                    ? "rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-amber-500/30"
                    : "rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                }
              >
                {category}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="search"
            value={quickLoadSearchQuery}
            onChange={(event) =>
              onQuickLoadSearchQueryChange(event.target.value)
            }
            placeholder="Buscar por nombre…"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm shadow-sm outline-none ring-emerald-500/20 transition focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        )}
      </div>
      {quickLoadDisplayedProducts.length === 0 ? (
        <p className="rounded-2xl bg-white px-6 py-16 text-center text-sm text-zinc-500 shadow-sm dark:bg-zinc-900/80">
          {isLoadingProductsCatalog
            ? "Cargando catálogo…"
            : catalogBrowseMode === "search" &&
                quickLoadSearchQuery.trim().length === 0
              ? "Escribe para buscar productos por nombre."
              : "No hay productos en esta vista."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {quickLoadDisplayedProducts.map((product) => {
            return (
              <div
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-md dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800/80">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800/60">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-inner dark:bg-zinc-900/50">
                        <Camera
                          className="size-7 text-zinc-400"
                          aria-hidden
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-zinc-900 dark:text-zinc-100">
                    {product.name}
                  </p>
                  {product.isBulk ? (
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      Venta por unidad
                    </p>
                  ) : null}
                  <p className="text-base font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                    {formatArgentinaPesos(product.price)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onAddProductFromQuickLoad(product, 1, product.price);
                    }}
                    className="mt-auto w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    Añadir al carrito
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
