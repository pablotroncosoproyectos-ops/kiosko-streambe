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
import { useDashboardSession } from "@/components/layout/dashboard-session-context";
import { ModalsContainer } from "./components/ModalsContainer";
import { useOperadorDashboard } from "./useOperadorDashboard";

const OperadorDashboardPage = (): ReactElement => {
  const dashboard = useOperadorDashboard();
  const { userRole, isProfileReady } = useDashboardSession();
  const showHistorialCard = isProfileReady && userRole === "ADMIN";
  const dashboardCardCount = 3 + (showHistorialCard ? 1 : 0);
  const dashboardGridClassName =
    dashboardCardCount >= 4
      ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
      : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col bg-slate-50 [-ms-overflow-style:none] [scrollbar-width:none] dark:bg-zinc-950 [&::-webkit-scrollbar]:hidden">
      {dashboard.operatorCashSessionState === "loading" ? (
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto py-24 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cargando sesión…
          </p>
        </div>
      ) : dashboard.operatorCashSessionState === "noSession" ? (
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-12 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col min-h-0 gap-4 py-4 md:py-6">
          <div className="flex w-full shrink-0 flex-nowrap items-start justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="rounded-lg bg-white p-2 shadow-sm dark:bg-zinc-900">
                <ShoppingCart className="size-6 text-zinc-700 dark:text-zinc-200" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 md:text-2xl">
                    Punto de venta
                  </h1>
                  {dashboard.isBreakActive ? (
                    <span
                      className="inline-flex shrink-0 items-center rounded-full bg-blue-600/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 animate-recreo-pulse dark:bg-blue-500/20 dark:text-blue-300"
                      role="status"
                    >
                      RECREO INICIADO
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">
                  Turno activo — desplazá el contenido si hace falta
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void dashboard.openCloseCashModal()}
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-100 sm:px-4 sm:py-2.5 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/60"
            >
              <Banknote className="size-4 shrink-0" aria-hidden />
              Cerrar caja
            </button>
          </div>

          <div className="flex flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
            <div
              className={`grid w-full items-stretch justify-items-stretch gap-4 ${dashboardGridClassName}`}
            >
              <button
                type="button"
                onClick={() => dashboard.setIsRecreoModalOpen(true)}
                className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-blue-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Clock
                  className="size-14 shrink-0 text-blue-600 dark:text-blue-500"
                  aria-hidden
                />
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Turno y recreo
                </span>
                <p className="max-w-sm px-1 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                  Gestión de recreos y tiempo restante del día.
                </p>
              </button>

              <button
                type="button"
                onClick={() => dashboard.setIsQuickLoadModalOpen(true)}
                className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-orange-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <LayoutGrid
                  className="size-14 shrink-0 text-orange-600 dark:text-orange-500"
                  aria-hidden
                />
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Carga rápida
                </span>
                <p className="max-w-sm px-1 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                  Venta por categorías e imágenes del catálogo.
                </p>
              </button>

              <button
                type="button"
                onClick={() => dashboard.setIsStockToolsModalOpen(true)}
                className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Warehouse
                  className="size-14 shrink-0 text-amber-600 dark:text-amber-500"
                  aria-hidden
                />
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Ajuste de stock
                </span>
                <p className="max-w-sm px-1 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                  Altas y correcciones de inventario al instante.
                </p>
              </button>

              {showHistorialCard ? (
                <button
                  type="button"
                  onClick={() => dashboard.setIsSaleModalOpen(true)}
                  className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <ShoppingCart
                    className="size-14 shrink-0 text-emerald-600 dark:text-emerald-500"
                    aria-hidden
                  />
                  <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Historial de operaciones
                  </span>
                  <p className="max-w-sm px-1 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                    Consulta de ventas y movimientos del turno.
                  </p>
                </button>
              ) : null}
            </div>

            {dashboard.lowStockProductsList.length > 0 ? (
              <button
                type="button"
                onClick={() => dashboard.openLowStockDetailModal()}
                className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-red-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <AlertTriangle
                  className="size-14 shrink-0 text-red-600 dark:text-red-500"
                  aria-hidden
                />
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Alerta de stock
                </span>
                <p className="max-w-md px-1 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                  Algunos productos están por terminarse. Haz clic para ver el
                  detalle
                </p>
              </button>
            ) : null}
            </div>
          </div>
        </div>
      )}

      <ModalsContainer
        isSaleModalOpen={dashboard.isSaleModalOpen}
        saleModalBackdropVisible={dashboard.saleModalBackdropVisible}
        closeSaleModal={dashboard.closeSaleModal}
        setIsBarcodeCameraScannerOpen={dashboard.setIsBarcodeCameraScannerOpen}
        selectedPaymentMethod={dashboard.selectedPaymentMethod}
        setSelectedPaymentMethod={dashboard.setSelectedPaymentMethod}
        handleFinalizeSale={dashboard.handleFinalizeSale}
        isSubmittingSale={dashboard.isSubmittingSale}
        saleItemsList={dashboard.saleItemsList}
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
        recentSalesHistoryPageSlice={dashboard.recentSalesHistoryPageSlice}
        historyTotalRowCount={dashboard.recentSalesForActiveHistoryTab.length}
        saleHistoryTab={dashboard.saleHistoryTab}
        setSaleHistoryTab={dashboard.setSaleHistoryTab}
        historyPageIndex={dashboard.historyPageIndex}
        historyTotalPages={dashboard.historyTotalPages}
        setHistoryPageIndex={dashboard.setHistoryPageIndex}
        downloadHistorySaleTicketPdf={dashboard.downloadHistorySaleTicketPdf}
        historyTicketPdfLoadingSaleId={
          dashboard.historyTicketPdfLoadingSaleId
        }
        downloadHistoryTabReportPdf={dashboard.downloadHistoryTabReportPdf}
        historyReportPdfLoading={dashboard.historyReportPdfLoading}
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
        stockToolsModalBackdropVisible={dashboard.stockToolsModalBackdropVisible}
        closeStockToolsModal={dashboard.closeStockToolsModal}
        closeStockToolsModalImmediately={dashboard.closeStockToolsModalImmediately}
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
        stockAdjustmentModalBackdropVisible={
          dashboard.stockAdjustmentModalBackdropVisible
        }
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
        isLowStockDetailModalOpen={dashboard.isLowStockDetailModalOpen}
        lowStockDetailModalBackdropVisible={
          dashboard.lowStockDetailModalBackdropVisible
        }
        closeLowStockDetailModal={dashboard.closeLowStockDetailModal}
        lowStockProductsList={dashboard.lowStockProductsList}
        isBarcodeCameraScannerOpen={dashboard.isBarcodeCameraScannerOpen}
        tryAddProductBySku={dashboard.tryAddProductBySku}
        isRecreoModalOpen={dashboard.isRecreoModalOpen}
        recreoModalBackdropVisible={dashboard.recreoModalBackdropVisible}
        closeRecreoModal={dashboard.closeRecreoModal}
        recreoBreakDisplay={dashboard.recreoBreakDisplay}
        breakDurationMinutes={dashboard.breakDurationMinutes}
        setBreakDurationMinutes={dashboard.setBreakDurationMinutes}
        isStartingRecreoSession={dashboard.isStartingRecreoSession}
        recreoStartErrorMessage={dashboard.recreoStartErrorMessage}
        remainingTimeSeconds={dashboard.remainingTimeSeconds}
        isBreakActive={dashboard.isBreakActive}
        handleStartBreak={dashboard.handleStartBreak}
        handleCancelBreak={dashboard.handleCancelBreak}
      />
    </main>
  );
};

export default OperadorDashboardPage;
