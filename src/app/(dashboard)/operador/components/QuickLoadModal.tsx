"use client";

import { useState, useRef, useEffect } from "react";
import { Package, X, Search, LayoutGrid, ChevronDown, Check, ShoppingCart, ScanLine } from "lucide-react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { Product } from "@/types/database";
import type { CatalogBrowseMode, CartItem, SelectedPaymentMethod } from "../types";
import { CatalogSection } from "./CatalogSection";
import { CartSection } from "./CartSection";
import { PaymentPanel } from "./PaymentPanel";
import { QuickLoadScannerSection } from "./QuickLoadScannerSection";

export interface QuickLoadModalProps {
  /** Si es falso, el modo escáner del header queda deshabilitado. */
  isBreakActive: boolean;
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
  /** Catálogo para resolver SKU en modo scanner; si no se envía, se usa quickLoadDisplayedProducts. */
  productsForBarcodeLookup?: Product[];
  isLoadingProductsCatalog: boolean;
  onAddProductFromQuickLoad: (product: Product, quantity: number, lineSubtotal: number) => void;
  totalSaleAmount: number;
  saleItemsList: CartItem[];
  pagedCartItems: CartItem[];
  cartPageIndex: number;
  cartTotalPages: number;
  setCartPageIndex: Dispatch<SetStateAction<number>>;
  onUpdateSaleItemQuantity: (productIdentifier: string, quantity: number) => void;
  onToggleSaleItemUseCostPrice: (productIdentifier: string) => void;
  onRemoveSaleItem: (productIdentifier: string) => void;
  selectedPaymentMethod: SelectedPaymentMethod;
  setSelectedPaymentMethod: Dispatch<SetStateAction<SelectedPaymentMethod>>;
  saleNotesInput: string;
  setSaleNotesInput: Dispatch<SetStateAction<string>>;
  onFinalizeSale: () => void | Promise<void>;
  isSubmittingSale: boolean;
}

export function QuickLoadModal(props: QuickLoadModalProps): ReactElement {
  const [activeTab, setActiveTab] = useState<"catalog" | "checkout">("catalog");
  const [activeView, setActiveView] = useState<"manual" | "scanner">("manual");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown de categorías al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** Sin recreo activo no se muestra el escáner aunque el estado interno siga en "scanner". */
  const displayView: "manual" | "scanner" =
    !props.isBreakActive && activeView === "scanner"
      ? "manual"
      : activeView;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-0 backdrop-blur-md transition-opacity duration-300 ease-out md:p-6 ${
        props.quickLoadModalBackdropVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ease-out dark:bg-zinc-900 md:h-[95vh] md:max-w-7xl md:rounded-3xl md:border md:border-white/20 ${
          props.quickLoadModalBackdropVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.95] opacity-0"
        }`}
      >
        {/* --- HEADER RESPONSIVO --- */}
        <header className="flex shrink-0 flex-col gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 md:flex-row md:items-center md:px-6 md:py-4">
          
          {/* Bloque Izquierdo: Selectores de Modo (Manual vs Scanner) */}
          <div className="flex items-center justify-between gap-3 md:justify-start">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView("manual")}
                className={`group flex items-center gap-2 rounded-xl p-1 pr-3 transition-all ${
                  displayView === "manual"
                  ? "bg-emerald-50 dark:bg-emerald-500/10" 
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <div className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
                  displayView === "manual"
                  ? "bg-emerald-500 text-white" 
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                }`}>
                  <Package className="size-5" />
                </div>
                <div className="text-left leading-tight">
                  <h2 className={`text-[13px] font-bold md:text-sm ${
                    displayView === "manual" ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                  }`}>Carga rápida</h2>
                  <p className="text-[10px] text-zinc-500">Manual</p>
                </div>
              </button>

              <button
                type="button"
                disabled={!props.isBreakActive}
                onClick={() => {
                  if (props.isBreakActive) {
                    setActiveView("scanner");
                  }
                }}
                title={
                  props.isBreakActive
                    ? undefined
                    : "Inicia un recreo para habilitar el scanner"
                }
                className={`group flex items-center gap-2 rounded-xl p-1 pr-3 transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  displayView === "scanner"
                  ? "bg-blue-50 dark:bg-blue-500/10" 
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <div className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
                  displayView === "scanner"
                  ? "bg-blue-500 text-white" 
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                }`}>
                  <ScanLine className="size-5" />
                </div>
                <div className="text-left leading-tight">
                  <h2 className={`text-[13px] font-bold md:text-sm ${
                    displayView === "scanner" ? "text-blue-600 dark:text-blue-400" : "text-zinc-900 dark:text-zinc-100"
                  }`}>Scanner QR</h2>
                  <p className="text-[10px] text-zinc-500">Automático</p>
                </div>
              </button>
            </div>

            <button onClick={props.onClose} className="shrink-0 rounded-lg p-1.5 text-zinc-400 md:hidden">
              <X className="size-5" />
            </button>
          </div>

          {/* Bloque Derecho: Controles de búsqueda (Solo en Manual) */}
          {displayView === "manual" && (
            <div className="flex w-full items-center gap-3 md:ml-auto md:w-auto md:flex-1 md:justify-end">
              {/* Toggle Categorías/Buscador (Escritorio) */}
              <div className="hidden items-center rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/50 md:flex">
                <button
                  onClick={() => { props.setCatalogBrowseMode("categories"); setIsDropdownOpen(false); }}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    props.catalogBrowseMode === "categories" ? "bg-white text-emerald-600 shadow-sm dark:bg-zinc-700" : "text-zinc-500"
                  }`}
                >
                  <LayoutGrid className="size-3.5" /> Categorías
                </button>
                <button
                  onClick={() => { props.setCatalogBrowseMode("search"); setIsDropdownOpen(false); }}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    props.catalogBrowseMode === "search" ? "bg-white text-emerald-600 shadow-sm dark:bg-zinc-700" : "text-zinc-500"
                  }`}
                >
                  <Search className="size-3.5" /> Buscador
                </button>
              </div>

              {/* Input Dinámico: Select de Categoría o Input de Texto */}
              <div className="flex-1 md:max-w-[320px] lg:max-w-[400px]">
                {props.catalogBrowseMode === "categories" ? (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold outline-none dark:border-zinc-700 dark:bg-zinc-800 md:py-2"
                    >
                      <span className="truncate uppercase">
                        {props.quickLoadSelectedCategory === "ALL" ? "TODAS LAS CATEGORÍAS" : props.quickLoadSelectedCategory}
                      </span>
                      <ChevronDown className={`size-4 ml-2 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    
                    <div className={`absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl transition-all dark:bg-zinc-800 ${
                      isDropdownOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
                    }`}>
                      <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
                        <button
                          onClick={() => { props.setQuickLoadSelectedCategory("ALL"); setIsDropdownOpen(false); }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-bold ${
                            props.quickLoadSelectedCategory === "ALL" ? "bg-emerald-500 text-white" : "hover:bg-zinc-50 dark:hover:bg-zinc-700"
                          }`}
                        >
                          TODAS LAS CATEGORÍAS {props.quickLoadSelectedCategory === "ALL" && <Check className="size-3.5" />}
                        </button>
                        {props.catalogUniqueCategoryList.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => { props.setQuickLoadSelectedCategory(cat); setIsDropdownOpen(false); }}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 mt-1 text-left text-xs font-bold ${
                              props.quickLoadSelectedCategory === cat ? "bg-emerald-500 text-white" : "hover:bg-zinc-50 dark:hover:bg-zinc-700"
                            }`}
                          >
                            {cat.toUpperCase()} {props.quickLoadSelectedCategory === cat && <Check className="size-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={props.quickLoadSearchQuery}
                      onChange={(e) => props.setQuickLoadSearchQuery(e.target.value)}
                      placeholder="Buscar producto..."
                      className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 md:py-2"
                    />
                  </div>
                )}
              </div>

              <button onClick={props.onClose} className="hidden shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:flex">
                <X className="size-5" />
              </button>
            </div>
          )}
        </header>

        {/* --- TABS PARA MÓVIL --- */}
        <div className="flex shrink-0 border-b border-zinc-100 dark:border-zinc-800 lg:hidden">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold transition ${
              activeTab === "catalog" ? "border-b-2 border-emerald-500 text-emerald-600" : "text-zinc-500"
            }`}
          >
            <LayoutGrid className="size-4" /> Productos
          </button>
          <button
            onClick={() => setActiveTab("checkout")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold transition ${
              activeTab === "checkout" ? "border-b-2 border-emerald-500 text-emerald-600" : "text-zinc-500"
            }`}
          >
            <ShoppingCart className="size-4" /> Carrito
            {props.saleItemsList.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
                {props.saleItemsList.length}
              </span>
            )}
          </button>
        </div>

        {/* --- CONTENIDO PRINCIPAL --- */}
        <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
          {displayView === "manual" ? (
            <>
              {/* Sección de Catálogo */}
              <section className={`flex flex-col h-full min-h-0 border-r border-zinc-100 dark:border-zinc-800 lg:col-span-5 xl:col-span-4 overflow-hidden ${
                activeTab === "catalog" ? "flex" : "hidden lg:flex"
              }`}>
                <CatalogSection
                  quickLoadDisplayedProducts={props.quickLoadDisplayedProducts}
                  isLoadingProductsCatalog={props.isLoadingProductsCatalog}
                  onAddProductFromQuickLoad={props.onAddProductFromQuickLoad}
                />
              </section>

              {/* Sección de Carrito y Pago */}
              <section className={`flex flex-col h-full min-h-0 bg-zinc-50/50 dark:bg-zinc-950/20 lg:col-span-7 xl:col-span-8 overflow-hidden ${
                activeTab === "checkout" ? "flex" : "hidden lg:flex"
              }`}>
                <div className="flex flex-1 flex-col overflow-y-auto p-3 custom-scrollbar md:p-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                  <div className="mx-auto w-full max-w-4xl space-y-6">
                    <CartSection
                      totalSaleAmount={props.totalSaleAmount}
                      saleItemsList={props.saleItemsList}
                      pagedCartItems={props.pagedCartItems}
                      cartPageIndex={props.cartPageIndex}
                      cartTotalPages={props.cartTotalPages}
                      setCartPageIndex={props.setCartPageIndex}
                      onUpdateSaleItemQuantity={props.onUpdateSaleItemQuantity}
                      onToggleSaleItemUseCostPrice={props.onToggleSaleItemUseCostPrice}
                      onRemoveSaleItem={props.onRemoveSaleItem}
                    />
                    
                    <PaymentPanel
                      selectedPaymentMethod={props.selectedPaymentMethod}
                      setSelectedPaymentMethod={props.setSelectedPaymentMethod}
                      saleNotesInput={props.saleNotesInput}
                      setSaleNotesInput={props.setSaleNotesInput}
                      onClose={props.onClose}
                      onFinalizeSale={props.onFinalizeSale}
                      isSubmittingSale={props.isSubmittingSale}
                      saleItemsCount={props.saleItemsList.length}
                    />
                  </div>
                </div>
              </section>
            </>
          ) : (
            <QuickLoadScannerSection
              isActive={displayView === "scanner"}
              modalVisible={props.quickLoadModalBackdropVisible}
              productsForLookup={
                props.productsForBarcodeLookup ?? props.quickLoadDisplayedProducts
              }
              onAddProduct={props.onAddProductFromQuickLoad}
            />
          )}
        </main>
      </div>
    </div>
  );
}