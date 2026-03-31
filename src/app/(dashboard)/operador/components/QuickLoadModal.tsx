"use client";

import { Package, X } from "lucide-react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { Product } from "@/types/database";
import type { CatalogBrowseMode, CartItem, SelectedPaymentMethod } from "../types";
import { CatalogSection } from "./CatalogSection";
import { CartSection } from "./CartSection";
import { PaymentPanel } from "./PaymentPanel";

export interface QuickLoadModalProps {
  quickLoadModalBackdropVisible: boolean;
  onClose: () => void;
  catalogBrowseMode: CatalogBrowseMode;
  setCatalogBrowseMode: Dispatch<SetStateAction<CatalogBrowseMode>>;
  quickLoadSelectedCategory: string | "ALL";
  setQuickLoadSelectedCategory: Dispatch<SetStateAction<string | "ALL">>;
  catalogUniqueCategoryList: string[];
  quickLoadSearchQuery: string;
  setQuickLoadSearchQuery: Dispatch<SetStateAction<string>>;
  quickLoadDisplayedProducts: Product[];
  isLoadingProductsCatalog: boolean;
  onAddProductFromQuickLoad: (
    product: Product,
    quantity: number,
    lineSubtotal: number,
  ) => void;
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
  selectedPaymentMethod: SelectedPaymentMethod;
  setSelectedPaymentMethod: Dispatch<SetStateAction<SelectedPaymentMethod>>;
  saleNotesInput: string;
  setSaleNotesInput: Dispatch<SetStateAction<string>>;
  onFinalizeSale: () => void | Promise<void>;
  isSubmittingSale: boolean;
}

export function QuickLoadModal({
  quickLoadModalBackdropVisible,
  onClose,
  catalogBrowseMode,
  setCatalogBrowseMode,
  quickLoadSelectedCategory,
  setQuickLoadSelectedCategory,
  catalogUniqueCategoryList,
  quickLoadSearchQuery,
  setQuickLoadSearchQuery,
  quickLoadDisplayedProducts,
  isLoadingProductsCatalog,
  onAddProductFromQuickLoad,
  totalSaleAmount,
  saleItemsList,
  pagedCartItems,
  cartPageIndex,
  cartTotalPages,
  setCartPageIndex,
  onUpdateSaleItemQuantity,
  onToggleSaleItemUseCostPrice,
  onRemoveSaleItem,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  saleNotesInput,
  setSaleNotesInput,
  onFinalizeSale,
  isSubmittingSale,
}: QuickLoadModalProps): ReactElement {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md transition-opacity duration-300 ease-out dark:bg-zinc-950/55 md:p-6 ${quickLoadModalBackdropVisible ? "opacity-100" : "opacity-0"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-load-title"
    >
      <div
        className={`flex max-h-[min(100dvh,100vh)] w-full max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/90 shadow-2xl ring-1 ring-black/5 transition-all duration-300 ease-out dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10 md:max-h-[min(92vh,920px)] md:max-w-7xl ${quickLoadModalBackdropVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/80 px-6 py-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Package className="size-6" aria-hidden />
            </div>
            <div>
              <h2
                id="quick-load-title"
                className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
              >
                Carga rápida
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Catálogo y cobro en un solo lugar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2.5 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-10 overflow-hidden p-8 lg:grid-cols-12">
          <CatalogSection
            catalogBrowseMode={catalogBrowseMode}
            onCatalogBrowseModeChange={setCatalogBrowseMode}
            quickLoadSelectedCategory={quickLoadSelectedCategory}
            onQuickLoadSelectedCategoryChange={setQuickLoadSelectedCategory}
            catalogUniqueCategoryList={catalogUniqueCategoryList}
            quickLoadSearchQuery={quickLoadSearchQuery}
            onQuickLoadSearchQueryChange={setQuickLoadSearchQuery}
            quickLoadDisplayedProducts={quickLoadDisplayedProducts}
            isLoadingProductsCatalog={isLoadingProductsCatalog}
            onAddProductFromQuickLoad={onAddProductFromQuickLoad}
          />

          <div className="flex h-full min-h-[600px] flex-col rounded-2xl border border-zinc-200/80 bg-white px-7 py-7 shadow-lg dark:border-zinc-800 dark:bg-zinc-950/40 lg:col-span-8">
            <CartSection
              totalSaleAmount={totalSaleAmount}
              saleItemsList={saleItemsList}
              pagedCartItems={pagedCartItems}
              cartPageIndex={cartPageIndex}
              cartTotalPages={cartTotalPages}
              setCartPageIndex={setCartPageIndex}
              onUpdateSaleItemQuantity={onUpdateSaleItemQuantity}
              onToggleSaleItemUseCostPrice={onToggleSaleItemUseCostPrice}
              onRemoveSaleItem={onRemoveSaleItem}
            />
            <PaymentPanel
              selectedPaymentMethod={selectedPaymentMethod}
              setSelectedPaymentMethod={setSelectedPaymentMethod}
              saleNotesInput={saleNotesInput}
              setSaleNotesInput={setSaleNotesInput}
              onClose={onClose}
              onFinalizeSale={onFinalizeSale}
              isSubmittingSale={isSubmittingSale}
              saleItemsCount={saleItemsList.length}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
