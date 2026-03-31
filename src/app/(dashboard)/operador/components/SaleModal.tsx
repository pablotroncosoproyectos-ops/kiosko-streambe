"use client";

import {
  Camera,
  CheckCircle2,
  Minus,
  Plus,
  ScanLine,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import type {
  Dispatch,
  FormEvent,
  ReactElement,
  RefObject,
  SetStateAction,
} from "react";
import { formatArgentinaPesos } from "@/lib/currencyFormat";
import {
  OPERATOR_GLASS_MODAL_BACKDROP,
  OPERATOR_GLASS_MODAL_PANEL,
  PAYMENT_METHOD_OPTIONS,
} from "../constants";
import {
  formatArgentinaSaleDate,
  formatPaymentMethodLabel,
} from "../formatters";
import type {
  CartItem,
  RecentSaleHistoryRecord,
  SaleHistoryTab,
  SelectedPaymentMethod,
} from "../types";

export interface SaleModalProps {
  saleModalBackdropVisible: boolean;
  onClose: () => void;
  scannerInputReference: RefObject<HTMLInputElement | null>;
  scannedBarcode: string;
  setScannedBarcode: Dispatch<SetStateAction<string>>;
  onScannerSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenBarcodeCameraScanner: () => void;
  scanFeedbackMessage: string;
  errorMessage: string;
  isSessionMissingError: boolean;
  onGoToOpenSessionFlow: () => void;
  selectedPaymentMethod: SelectedPaymentMethod;
  setSelectedPaymentMethod: Dispatch<SetStateAction<SelectedPaymentMethod>>;
  onFinalizeSale: () => void | Promise<void>;
  isSubmittingSale: boolean;
  saleItemsList: CartItem[];
  isSaleHistoryPanelOpen: boolean;
  setIsSaleHistoryPanelOpen: Dispatch<SetStateAction<boolean>>;
  isLoadingProductsCatalog: boolean;
  pagedCartItems: CartItem[];
  totalSaleAmount: number;
  onUpdateSaleItemQuantity: (
    productIdentifier: string,
    quantity: number,
  ) => void;
  onToggleSaleItemUseCostPrice: (productIdentifier: string) => void;
  onRemoveSaleItem: (productIdentifier: string) => void;
  cartPageIndex: number;
  cartTotalPages: number;
  setCartPageIndex: Dispatch<SetStateAction<number>>;
  recentSalesForActiveHistoryTab: RecentSaleHistoryRecord[];
  saleHistoryTab: SaleHistoryTab;
  setSaleHistoryTab: Dispatch<SetStateAction<SaleHistoryTab>>;
}

export function SaleModal({
  saleModalBackdropVisible,
  onClose,
  scannerInputReference,
  scannedBarcode,
  setScannedBarcode,
  onScannerSubmit,
  onOpenBarcodeCameraScanner,
  scanFeedbackMessage,
  errorMessage,
  isSessionMissingError,
  onGoToOpenSessionFlow,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  onFinalizeSale,
  isSubmittingSale,
  saleItemsList,
  isSaleHistoryPanelOpen,
  setIsSaleHistoryPanelOpen,
  isLoadingProductsCatalog,
  pagedCartItems,
  totalSaleAmount,
  onUpdateSaleItemQuantity,
  onToggleSaleItemUseCostPrice,
  onRemoveSaleItem,
  cartPageIndex,
  cartTotalPages,
  setCartPageIndex,
  recentSalesForActiveHistoryTab,
  saleHistoryTab,
  setSaleHistoryTab,
}: SaleModalProps): ReactElement {
  return (
    <div
      className={`${OPERATOR_GLASS_MODAL_BACKDROP} ${saleModalBackdropVisible ? "opacity-100" : "opacity-0"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-modal-title"
    >
      <div
        className={`${OPERATOR_GLASS_MODAL_PANEL} ${saleModalBackdropVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2
            id="sale-modal-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Cargar venta
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div
          className={`grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:min-h-[min(70vh,560px)] ${
            isSaleHistoryPanelOpen
              ? "lg:grid-cols-[22rem_1fr]"
              : "lg:grid-cols-[22rem_1fr_auto]"
          }`}
        >
          <div className="min-h-0 overflow-y-auto border-b border-zinc-200 p-4 dark:border-zinc-800 lg:border-b-0 lg:border-r">
            <section className="space-y-3">
              <form onSubmit={onScannerSubmit} className="space-y-2">
                <label
                  htmlFor="scanned-barcode-input"
                  className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  <ScanLine className="size-4" />
                  Escanear código de barras
                </label>
                <input
                  ref={scannerInputReference}
                  id="scanned-barcode-input"
                  value={scannedBarcode}
                  onChange={(event) => setScannedBarcode(event.target.value)}
                  autoComplete="off"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base outline-none ring-emerald-500/20 transition focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="Escanea y presiona Enter"
                />
                <button
                  type="button"
                  onClick={onOpenBarcodeCameraScanner}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <Camera className="size-4" aria-hidden />
                  Abrir cámara
                </button>
              </form>

              {scanFeedbackMessage.length > 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <CheckCircle2 className="size-4" />
                  {scanFeedbackMessage}
                </div>
              ) : null}
              {errorMessage.length > 0 ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                  <p>
                    {isSessionMissingError ? `⚠️ ${errorMessage}` : errorMessage}
                  </p>
                  {isSessionMissingError ? (
                    <button
                      type="button"
                      onClick={onGoToOpenSessionFlow}
                      className="mt-2 inline-flex items-center rounded-md border border-red-300 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-white dark:border-red-700 dark:bg-zinc-900/60 dark:text-red-200 dark:hover:bg-zinc-900"
                    >
                      Ir a Abrir caja
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Método de pago
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHOD_OPTIONS.map((method) => {
                  const MethodIcon = method.icon;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(method.value)}
                      aria-label={method.label}
                      title={method.label}
                      className={
                        selectedPaymentMethod === method.value
                          ? "inline-flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-emerald-600 bg-emerald-600 px-2 py-2 text-white"
                          : "inline-flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      }
                    >
                      <MethodIcon className="size-5" aria-hidden />
                      <span className="text-xs font-semibold leading-none">
                        {method.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => void onFinalizeSale()}
                disabled={isSubmittingSale || saleItemsList.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                <ShoppingCart className="size-4" aria-hidden />
                {isSubmittingSale ? "Procesando…" : "Cobrar"}
              </button>
            </div>
          </div>

          {!isSaleHistoryPanelOpen ? (
            <div className="min-h-0 overflow-y-auto p-4">
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Carrito
                  </h3>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Total:{" "}
                    <span className="font-semibold tabular-nums">
                      {formatArgentinaPesos(totalSaleAmount)}
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div className="max-h-[60vh] overflow-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/90">
                        <tr>
                          <th className="px-3 py-2">Producto</th>
                          <th className="px-3 py-2">Cantidad</th>
                          <th className="px-3 py-2">Total</th>
                          <th className="px-3 py-2">Precio Costo</th>
                          <th className="px-3 py-2 text-right">—</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                        {isLoadingProductsCatalog ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-6 text-center text-zinc-500"
                            >
                              Cargando…
                            </td>
                          </tr>
                        ) : saleItemsList.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-6 text-center text-zinc-500"
                            >
                              Sin ítems.
                            </td>
                          </tr>
                        ) : (
                          pagedCartItems.map((saleItem) => (
                            <tr key={saleItem.productIdentifier}>
                              <td className="px-3 py-2">
                                <div className="font-medium">{saleItem.name}</div>
                                <div className="text-xs text-zinc-500">
                                  {saleItem.sku || "—"}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateSaleItemQuantity(
                                        saleItem.productIdentifier,
                                        Math.max(1, saleItem.quantity - 1),
                                      )
                                    }
                                    className="inline-flex size-7 items-center justify-center rounded border border-zinc-300 dark:border-zinc-600"
                                  >
                                    <Minus className="size-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    value={saleItem.quantity}
                                    onChange={(event) =>
                                      onUpdateSaleItemQuantity(
                                        saleItem.productIdentifier,
                                        Number.parseInt(
                                          event.target.value || "1",
                                          10,
                                        ),
                                      )
                                    }
                                    className="w-14 rounded border border-zinc-300 px-1 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateSaleItemQuantity(
                                        saleItem.productIdentifier,
                                        saleItem.quantity + 1,
                                      )
                                    }
                                    className="inline-flex size-7 items-center justify-center rounded border border-zinc-300 dark:border-zinc-600"
                                  >
                                    <Plus className="size-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2 tabular-nums">
                                {formatArgentinaPesos(
                                  saleItem.quantity * saleItem.unitPrice,
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <label className="inline-flex items-center gap-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={saleItem.useCostPrice}
                                    disabled={saleItem.costPrice === null}
                                    onChange={() =>
                                      onToggleSaleItemUseCostPrice(
                                        saleItem.productIdentifier,
                                      )
                                    }
                                  />
                                  Precio Costo
                                </label>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRemoveSaleItem(saleItem.productIdentifier)
                                  }
                                  className="inline-flex size-8 items-center justify-center rounded border text-red-600"
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

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Página{" "}
                    {Math.min(cartPageIndex + 1, cartTotalPages)} /{" "}
                    {cartTotalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={cartPageIndex <= 0}
                      onClick={() =>
                        setCartPageIndex((previous) => Math.max(0, previous - 1))
                      }
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800"
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
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          <div
            className={
              isSaleHistoryPanelOpen
                ? "border-l border-zinc-200 dark:border-zinc-800"
                : ""
            }
          >
            <div
              className={
                isSaleHistoryPanelOpen
                  ? "flex h-full w-full flex-col overflow-hidden bg-white dark:bg-zinc-900"
                  : "flex h-full w-12 flex-col"
              }
            >
              {!isSaleHistoryPanelOpen ? (
                <button
                  type="button"
                  onClick={() => setIsSaleHistoryPanelOpen(true)}
                  className="flex h-full w-12 items-center justify-center border-l border-zinc-200 bg-white/80 text-zinc-700 backdrop-blur hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200"
                  aria-label="Abrir historial"
                >
                  <span
                    className="text-xs font-semibold uppercase tracking-[0.25em]"
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                    }}
                  >
                    H i s t o r i a l
                  </span>
                </button>
              ) : (
                <>
                  <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Historial
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsSaleHistoryPanelOpen(false)}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      >
                        Cerrar Historial
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSaleHistoryTab("ventaLibre")}
                        className={
                          saleHistoryTab === "ventaLibre"
                            ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                            : "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        }
                      >
                        Venta libre
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaleHistoryTab("recreo")}
                        className={
                          saleHistoryTab === "recreo"
                            ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                            : "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        }
                      >
                        Recreo
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaleHistoryTab("ventaTotal")}
                        className={
                          saleHistoryTab === "ventaTotal"
                            ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                            : "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        }
                      >
                        Venta total
                      </button>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/90">
                          <tr>
                            <th className="px-2 py-2 font-medium">Productos</th>
                            <th className="px-2 py-2 font-medium">Total</th>
                            <th className="px-2 py-2 font-medium">Pago</th>
                            <th className="px-2 py-2 font-medium">Fecha</th>
                            <th className="px-2 py-2 font-medium">Usuario</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                          {recentSalesForActiveHistoryTab.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-3 py-10 text-center text-zinc-500"
                              >
                                <p className="font-medium text-zinc-600 dark:text-zinc-400">
                                  Sin ventas
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {saleHistoryTab === "ventaLibre"
                                    ? "No hay ventas de venta libre."
                                    : saleHistoryTab === "recreo"
                                      ? "No hay ventas del recreo activo."
                                      : "No hay ventas registradas para hoy."}
                                </p>
                              </td>
                            </tr>
                          ) : (
                            recentSalesForActiveHistoryTab.map(
                              (record, index) => (
                                <tr key={`${record.saleIdentifier}-${index}`}>
                                  <td className="max-w-[200px] px-2 py-2 text-xs">
                                    {record.productNamesSummary}
                                  </td>
                                  <td className="px-2 py-2 tabular-nums">
                                    {formatArgentinaPesos(record.totalAmount)}
                                  </td>
                                  <td className="px-2 py-2 text-xs">
                                    {formatPaymentMethodLabel(
                                      record.paymentMethod,
                                    )}
                                  </td>
                                  <td className="whitespace-nowrap px-2 py-2 text-xs">
                                    {formatArgentinaSaleDate(record.createdAt)}
                                  </td>
                                  <td className="px-2 py-2 text-xs">
                                    <div className="font-medium">
                                      {record.sellerFullName}
                                    </div>
                                    <div className="text-zinc-500">
                                      {record.sellerRole}
                                    </div>
                                  </td>
                                </tr>
                              ),
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
