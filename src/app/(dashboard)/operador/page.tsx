"use client";

import {
  AlertTriangle,
  Banknote,
  Clock,
  LayoutGrid,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import type { ReactElement } from "react";
import { ModalsContainer } from "./components/ModalsContainer";
import { LOW_STOCK_PREVIEW_COUNT } from "./constants";
import { formatRemainingTime } from "./formatters";
import { useOperadorDashboard } from "./useOperadorDashboard";

const OperadorDashboardPage = (): ReactElement => {
  const dashboard = useOperadorDashboard();

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {dashboard.operatorCashSessionState === "loading" ? (
        <div className="flex flex-1 flex-col items-center justify-center py-24">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cargando sesión…
          </p>
        </div>
      ) : dashboard.operatorCashSessionState === "noSession" ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-white/25 bg-white/85 p-8 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10 md:p-10">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-2xl bg-amber-100/80 p-4 dark:bg-amber-950/50">
                <Banknote
                  className="size-12 text-amber-800 dark:text-amber-200"
                  aria-hidden
                />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Abrir caja
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Ingrese el efectivo inicial del turno para comenzar a operar.
              </p>
              <label className="mt-6 w-full text-left">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Saldo inicial (efectivo)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={dashboard.openingBalanceInitialInput}
                  onChange={(event) =>
                    dashboard.setOpeningBalanceInitialInput(event.target.value)
                  }
                  placeholder="0,00"
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none ring-amber-500/20 transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </label>
              {dashboard.openCashErrorMessage.length > 0 ? (
                <p
                  className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                  role="alert"
                >
                  {dashboard.openCashErrorMessage}
                </p>
              ) : null}
              <button
                type="button"
                disabled={dashboard.isOpeningCashSession}
                onClick={() => void dashboard.handleOpenCashSessionSubmit()}
                className="mt-6 w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {dashboard.isOpeningCashSession ? "Abriendo…" : "Abrir caja"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
          <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-lg bg-white p-2 shadow-sm dark:bg-zinc-900">
                <ShoppingCart className="size-6 text-zinc-700 dark:text-zinc-200" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 md:text-2xl">
                  Punto de venta
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">
                  Turno activo — sin desplazamiento de página
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => dashboard.setIsStockToolsModalOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                <Warehouse className="size-4 shrink-0" aria-hidden />
                Crear o Ajustar stock
              </button>
              <button
                type="button"
                onClick={() => void dashboard.openCloseCashModal()}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/60"
              >
                <Banknote className="size-4 shrink-0" aria-hidden />
                Cerrar caja
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
            <div className="flex min-h-[220px] flex-col rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-1 flex-col items-center justify-center gap-3">
                <Clock
                  className="size-12 shrink-0 text-zinc-700 dark:text-zinc-200"
                  aria-hidden
                />
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Turno y recreo
                </h3>
                {dashboard.recreoBreakDisplay !== null ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Recreos hoy (colegio):{" "}
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">
                      {dashboard.recreoBreakDisplay.recreoSessionsStartedTodayCount}{" "}
                      / {dashboard.recreoBreakDisplay.maxBreaksPerDay}
                    </span>
                  </p>
                ) : null}
                {dashboard.recreoStartErrorMessage.length > 0 ? (
                  <p className="max-w-md rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                    {dashboard.recreoStartErrorMessage}
                  </p>
                ) : null}
                <div className="flex w-full max-w-xs flex-col items-center gap-4">
                  <div className="flex flex-wrap items-end justify-center gap-3">
                    <label className="flex flex-col items-center gap-1">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Duración (min)
                      </span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={dashboard.breakDurationMinutes}
                        onChange={(event) =>
                          dashboard.setBreakDurationMinutes(
                            Number.parseInt(event.target.value || "0", 10),
                          )
                        }
                        className="w-36 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-center text-sm outline-none ring-zinc-900/10 transition focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:ring-zinc-100"
                      />
                    </label>
                    {!dashboard.isBreakActive &&
                    dashboard.remainingTimeSeconds === 0 ? (
                      <button
                        type="button"
                        disabled={dashboard.isStartingRecreoSession}
                        onClick={() => void dashboard.handleStartBreak()}
                        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        {dashboard.isStartingRecreoSession
                          ? "Registrando…"
                          : "Iniciar recreo"}
                      </button>
                    ) : null}
                  </div>
                  {dashboard.isBreakActive ||
                  dashboard.remainingTimeSeconds > 0 ? (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        Termina en:{" "}
                        {formatRemainingTime(dashboard.remainingTimeSeconds)}
                      </p>
                      <button
                        type="button"
                        onClick={dashboard.handleCancelBreak}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => dashboard.setIsQuickLoadModalOpen(true)}
              className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <LayoutGrid
                className="size-14 shrink-0 text-amber-600"
                aria-hidden
              />
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Carga rápida
              </span>
              <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                Catálogo visual por categoría con imágenes
              </p>
            </button>

            <button
              type="button"
              onClick={() => dashboard.setIsSaleModalOpen(true)}
              className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <ShoppingCart
                className="size-14 shrink-0 text-emerald-600"
                aria-hidden
              />
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Cargar venta
              </span>
              <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                Escanear, carrito, pago e historial
              </p>
            </button>
          </div>

          {dashboard.lowStockProductsList.length > 0 ? (
            <div className="min-w-0 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-5 text-amber-800 dark:text-amber-200" />
                  <h3 className="text-base font-semibold text-amber-950 dark:text-amber-100">
                    Alertas de stock bajo
                  </h3>
                </div>
                {dashboard.lowStockProductsList.length >
                LOW_STOCK_PREVIEW_COUNT ? (
                  <button
                    type="button"
                    onClick={dashboard.openLowStockAllModal}
                    className="rounded-lg border border-amber-700 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-900/80"
                  >
                    Ver todos
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {dashboard.lowStockPreviewList.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950"
                  >
                    <p className="truncate text-sm font-semibold text-red-800 dark:text-red-200">
                      {product.name}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      Stock: {product.currentStock}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <ModalsContainer
        isSaleModalOpen={dashboard.isSaleModalOpen}
        saleModalBackdropVisible={dashboard.saleModalBackdropVisible}
        closeSaleModal={dashboard.closeSaleModal}
        scannerInputReference={dashboard.scannerInputReference}
        scannedBarcode={dashboard.scannedBarcode}
        setScannedBarcode={dashboard.setScannedBarcode}
        onScannerSubmit={dashboard.handleScannerSubmit}
        setIsBarcodeCameraScannerOpen={dashboard.setIsBarcodeCameraScannerOpen}
        scanFeedbackMessage={dashboard.scanFeedbackMessage}
        errorMessage={dashboard.errorMessage}
        isSessionMissingError={dashboard.isSessionMissingError}
        handleGoToOpenSessionFlow={dashboard.handleGoToOpenSessionFlow}
        selectedPaymentMethod={dashboard.selectedPaymentMethod}
        setSelectedPaymentMethod={dashboard.setSelectedPaymentMethod}
        handleFinalizeSale={dashboard.handleFinalizeSale}
        isSubmittingSale={dashboard.isSubmittingSale}
        saleItemsList={dashboard.saleItemsList}
        isSaleHistoryPanelOpen={dashboard.isSaleHistoryPanelOpen}
        setIsSaleHistoryPanelOpen={dashboard.setIsSaleHistoryPanelOpen}
        isLoadingProductsCatalog={dashboard.isLoadingProductsCatalog}
        pagedCartItems={dashboard.pagedCartItems}
        totalSaleAmount={dashboard.totalSaleAmount}
        updateSaleItemQuantity={dashboard.updateSaleItemQuantity}
        toggleSaleItemUseCostPrice={dashboard.toggleSaleItemUseCostPrice}
        removeSaleItem={dashboard.removeSaleItem}
        cartPageIndex={dashboard.cartPageIndex}
        cartTotalPages={dashboard.cartTotalPages}
        setCartPageIndex={dashboard.setCartPageIndex}
        recentSalesForActiveHistoryTab={
          dashboard.recentSalesForActiveHistoryTab
        }
        saleHistoryTab={dashboard.saleHistoryTab}
        setSaleHistoryTab={dashboard.setSaleHistoryTab}
        isQuickLoadModalOpen={dashboard.isQuickLoadModalOpen}
        quickLoadModalBackdropVisible={dashboard.quickLoadModalBackdropVisible}
        closeQuickLoadModal={dashboard.closeQuickLoadModal}
        catalogBrowseMode={dashboard.catalogBrowseMode}
        setCatalogBrowseMode={dashboard.setCatalogBrowseMode}
        quickLoadSelectedCategory={dashboard.quickLoadSelectedCategory}
        setQuickLoadSelectedCategory={dashboard.setQuickLoadSelectedCategory}
        catalogUniqueCategoryList={dashboard.catalogUniqueCategoryList}
        quickLoadSearchQuery={dashboard.quickLoadSearchQuery}
        setQuickLoadSearchQuery={dashboard.setQuickLoadSearchQuery}
        quickLoadDisplayedProducts={dashboard.quickLoadDisplayedProducts}
        addProductFromQuickLoadWithLineSubtotal={
          dashboard.addProductFromQuickLoadWithLineSubtotal
        }
        saleNotesInput={dashboard.saleNotesInput}
        setSaleNotesInput={dashboard.setSaleNotesInput}
        isStockToolsModalOpen={dashboard.isStockToolsModalOpen}
        setIsStockToolsModalOpen={dashboard.setIsStockToolsModalOpen}
        openCreateProductModal={dashboard.openCreateProductModal}
        productsCatalog={dashboard.productsCatalog}
        openStockAdjustmentModal={dashboard.openStockAdjustmentModal}
        isCreateProductModalOpen={dashboard.isCreateProductModalOpen}
        setIsCreateProductModalOpen={dashboard.setIsCreateProductModalOpen}
        loadProductsCatalog={dashboard.loadProductsCatalog}
        isCloseCashModalOpen={dashboard.isCloseCashModalOpen}
        closeCloseCashModal={dashboard.closeCloseCashModal}
        isLoadingCashSummary={dashboard.isLoadingCashSummary}
        cashSummaryPayload={dashboard.cashSummaryPayload}
        openingBalanceCashInput={dashboard.openingBalanceCashInput}
        setOpeningBalanceCashInput={dashboard.setOpeningBalanceCashInput}
        expensesCashInput={dashboard.expensesCashInput}
        setExpensesCashInput={dashboard.setExpensesCashInput}
        physicalCashInput={dashboard.physicalCashInput}
        setPhysicalCashInput={dashboard.setPhysicalCashInput}
        shiftClosingNotesInput={dashboard.shiftClosingNotesInput}
        setShiftClosingNotesInput={dashboard.setShiftClosingNotesInput}
        closeCashErrorMessage={dashboard.closeCashErrorMessage}
        isSubmittingCloseCash={dashboard.isSubmittingCloseCash}
        handleSubmitCloseCash={dashboard.handleSubmitCloseCash}
        stockAdjustmentProduct={dashboard.stockAdjustmentProduct}
        closeStockAdjustmentModal={dashboard.closeStockAdjustmentModal}
        stockAdjustmentNewStockInput={dashboard.stockAdjustmentNewStockInput}
        setStockAdjustmentNewStockInput={
          dashboard.setStockAdjustmentNewStockInput
        }
        stockAdjustmentReasonInput={dashboard.stockAdjustmentReasonInput}
        setStockAdjustmentReasonInput={
          dashboard.setStockAdjustmentReasonInput
        }
        stockAdjustmentIsReduction={dashboard.stockAdjustmentIsReduction}
        stockAdjustmentErrorMessage={dashboard.stockAdjustmentErrorMessage}
        canSubmitStockAdjustment={dashboard.canSubmitStockAdjustment}
        isSavingStockAdjustment={dashboard.isSavingStockAdjustment}
        handleStockAdjustmentSubmit={dashboard.handleStockAdjustmentSubmit}
        isLowStockAllModalOpen={dashboard.isLowStockAllModalOpen}
        setIsLowStockAllModalOpen={dashboard.setIsLowStockAllModalOpen}
        lowStockModalSlice={dashboard.lowStockModalSlice}
        lowStockModalPageIndex={dashboard.lowStockModalPageIndex}
        setLowStockModalPageIndex={dashboard.setLowStockModalPageIndex}
        lowStockModalTotalPages={dashboard.lowStockModalTotalPages}
        isBarcodeCameraScannerOpen={dashboard.isBarcodeCameraScannerOpen}
        tryAddProductBySku={dashboard.tryAddProductBySku}
      />
    </main>
  );
};

export default OperadorDashboardPage;
